package main

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"time"
)

const (
	sessionCookie = "notavex_session"
	sessionMaxAge = 30 * 24 * time.Hour
	maxContentLen = 1 << 20 // 1 MiB per memo
	maxTitleLen   = 1024    // characters in a memo title
	maxImages     = 12      // images attached to a single memo
	maxImageBytes = 2 << 20 // 2 MiB per image (base64 data URL length)
	// Upper bound on a create/update request body: content + all images + slack.
	maxMemoBody = maxContentLen + maxImages*maxImageBytes + 8192
)

// Server wires the HTTP API and the embedded web UI to the store.
type Server struct {
	store  *Store
	auth   *Auth
	static fs.FS
}

// NewServer creates a Server. static must be a filesystem rooted at the web
// assets (index.html, app.js, ...).
func NewServer(store *Store, auth *Auth, static fs.FS) *Server {
	return &Server{store: store, auth: auth, static: static}
}

// Routes builds the HTTP handler for the whole application.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Static assets (CSS/JS) are always public.
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServerFS(s.static)))

	// Auth + meta endpoints.
	mux.HandleFunc("POST /api/login", s.handleLogin)
	mux.HandleFunc("POST /api/logout", s.handleLogout)
	mux.HandleFunc("POST /api/password", s.requireAuth(s.handlePassword))
	mux.HandleFunc("GET /api/config", s.handleConfig)

	// Memo API (requires authentication when enabled).
	mux.HandleFunc("GET /api/memos", s.requireAuth(s.handleListMemos))
	mux.HandleFunc("POST /api/memos", s.requireAuth(s.handleCreateMemo))
	mux.HandleFunc("POST /api/memos/trash/empty", s.requireAuth(s.handleEmptyTrash))
	mux.HandleFunc("GET /api/memos/{id}", s.requireAuth(s.handleGetMemo))
	mux.HandleFunc("PUT /api/memos/{id}", s.requireAuth(s.handleUpdateMemo))
	mux.HandleFunc("DELETE /api/memos/{id}", s.requireAuth(s.handleDeleteMemo))
	mux.HandleFunc("POST /api/memos/{id}/pin", s.requireAuth(s.handlePinMemo))
	mux.HandleFunc("POST /api/memos/{id}/color", s.requireAuth(s.handleSetColor))
	mux.HandleFunc("POST /api/memos/{id}/archive", s.requireAuth(s.handleArchiveMemo))
	mux.HandleFunc("POST /api/memos/{id}/trash", s.requireAuth(s.handleTrashMemo))
	mux.HandleFunc("POST /api/memos/{id}/duplicate", s.requireAuth(s.handleDuplicateMemo))
	mux.HandleFunc("POST /api/memos/{id}/move", s.requireAuth(s.handleMoveMemo))
	mux.HandleFunc("POST /api/memos/{id}/collapsed", s.requireAuth(s.handleCollapseMemo))
	mux.HandleFunc("GET /api/labels", s.requireAuth(s.handleLabels))
	mux.HandleFunc("GET /api/stats", s.requireAuth(s.handleStats))

	// Pages.
	mux.HandleFunc("GET /login", s.handleLoginPage)
	mux.HandleFunc("GET /{$}", s.handleIndex)

	return s.withCommon(mux)
}

// ---------- middleware ----------

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (s *Server) withCommon(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("Content-Security-Policy",
			"default-src 'self'; img-src 'self' https: data:; "+
				"style-src 'self' 'unsafe-inline'; script-src 'self'; "+
				"base-uri 'none'; frame-ancestors 'none'")

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}

func (s *Server) authed(r *http.Request) bool {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return false
	}
	return s.auth.validToken(c.Value)
}

// requireAuth guards JSON API handlers, returning 401 when a login is required.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.auth.enabled && !s.authed(r) {
			writeJSONError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next(w, r)
	}
}

// ---------- pages ----------

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if s.auth.enabled && !s.authed(r) {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	s.serveFile(w, r, "index.html")
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled || s.authed(r) {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	s.serveFile(w, r, "login.html")
}

func (s *Server) serveFile(w http.ResponseWriter, r *http.Request, name string) {
	f, err := s.static.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(data)
}

// ---------- auth handlers ----------

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !s.auth.verifyPassword(req.Password) {
		writeJSONError(w, http.StatusUnauthorized, "wrong password")
		return
	}
	s.setSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// handlePassword changes the single-user password. It verifies the current
// password, stores the new one and re-issues the session cookie (the old token
// is invalidated because it was bound to the previous hash), so the user stays
// logged in.
func (s *Server) handlePassword(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled {
		writeJSONError(w, http.StatusBadRequest, "login is not enabled")
		return
	}
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !s.auth.verifyPassword(req.CurrentPassword) {
		writeJSONError(w, http.StatusUnauthorized, "current password is wrong")
		return
	}
	if err := s.auth.setPassword(req.NewPassword); err != nil {
		if errors.Is(err, ErrWeakPassword) {
			writeJSONError(w, http.StatusBadRequest, "password too short")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "could not change password")
		return
	}
	s.setSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// setSessionCookie issues a fresh, hash-bound session cookie.
func (s *Server) setSessionCookie(w http.ResponseWriter) {
	expiry := time.Now().Add(sessionMaxAge)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    s.auth.issueToken(expiry),
		Path:     "/",
		Expires:  expiry,
		MaxAge:   int(sessionMaxAge.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.auth.secure,
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.auth.secure,
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{
		"authEnabled": s.auth.enabled,
		"authed":      !s.auth.enabled || s.authed(r),
	})
}

// ---------- memo handlers ----------

func (s *Server) handleListMemos(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	writeJSON(w, http.StatusOK, s.store.List(ListOptions{
		Query:  q.Get("q"),
		Label:  q.Get("label"),
		View:   q.Get("view"),
		Limit:  atoiDefault(q.Get("limit"), 0),
		Offset: atoiDefault(q.Get("offset"), 0),
	}))
}

func (s *Server) handleCreateMemo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title     string   `json:"title"`
		Content   string   `json:"content"`
		Color     string   `json:"color"`
		Labels    []string `json:"labels"`
		Checklist bool     `json:"checklist"`
		Images    []string `json:"images"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxMemoBody)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Content) > maxContentLen {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "content too large")
		return
	}
	if len(req.Title) > maxTitleLen {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "title too large")
		return
	}
	if !validColor(req.Color) {
		writeJSONError(w, http.StatusBadRequest, "invalid color")
		return
	}
	if err := validateImages(req.Images); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	m, err := s.store.Create(NewMemo{
		Title:     req.Title,
		Content:   req.Content,
		Color:     req.Color,
		Labels:    req.Labels,
		Checklist: req.Checklist,
		Images:    req.Images,
	})
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (s *Server) handleGetMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	m, err := s.store.Get(id)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleUpdateMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Title     *string   `json:"title"`
		Content   *string   `json:"content"`
		Labels    *[]string `json:"labels"`
		Checklist *bool     `json:"checklist"`
		Images    *[]string `json:"images"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxMemoBody)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Content != nil && len(*req.Content) > maxContentLen {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "content too large")
		return
	}
	if req.Title != nil && len(*req.Title) > maxTitleLen {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "title too large")
		return
	}
	if req.Images != nil {
		if err := validateImages(*req.Images); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	m, err := s.store.Update(id, UpdateMemo{
		Title:     req.Title,
		Content:   req.Content,
		Labels:    req.Labels,
		Checklist: req.Checklist,
		Images:    req.Images,
	})
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleDeleteMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := s.store.Delete(id); err != nil {
		s.writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handlePinMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Pinned bool `json:"pinned"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	m, err := s.store.SetPinned(id, req.Pinned)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleSetColor(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Color string `json:"color"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validColor(req.Color) {
		writeJSONError(w, http.StatusBadRequest, "invalid color")
		return
	}
	m, err := s.store.SetColor(id, req.Color)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleArchiveMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Archived bool `json:"archived"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	m, err := s.store.SetArchived(id, req.Archived)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleTrashMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Trashed bool `json:"trashed"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	m, err := s.store.SetTrashed(id, req.Trashed)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleDuplicateMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	m, err := s.store.Duplicate(id)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (s *Server) handleMoveMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		AfterID int64 `json:"afterId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	m, err := s.store.Move(id, req.AfterID)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleCollapseMemo(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Collapsed bool `json:"collapsed"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	m, err := s.store.SetCompletedCollapsed(id, req.Collapsed)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleEmptyTrash(w http.ResponseWriter, r *http.Request) {
	if _, err := s.store.EmptyTrash(); err != nil {
		s.writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleLabels(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Labels())
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	notes, archived, trashed := s.store.Stats()
	writeJSON(w, http.StatusOK, map[string]int{
		"notes":    notes,
		"archived": archived,
		"trashed":  trashed,
		"labels":   len(s.store.Labels()),
	})
}

// ---------- helpers ----------

func (s *Server) writeStoreError(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		writeJSONError(w, http.StatusNotFound, "memo not found")
		return
	}
	writeJSONError(w, http.StatusBadRequest, err.Error())
}

// allowedColors is the set of note color labels the UI offers ("" = default).
// These names map to the pastel palette defined in the stylesheet.
var allowedColors = map[string]bool{
	"": true, "coral": true, "peach": true, "sand": true, "mint": true,
	"sage": true, "fog": true, "storm": true, "dusk": true, "blossom": true,
	"clay": true, "chalk": true,
}

func validColor(c string) bool { return allowedColors[c] }

// imageDataURL matches a base64-encoded image data URL — the only image form the
// browser produces. Anything else (e.g. javascript:/http(s): URLs) is rejected so
// the value is safe to drop straight into an <img src>.
var imageDataURL = regexp.MustCompile(`^data:image/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$`)

// validateImages checks an attachment list: at most maxImages entries, each a
// well-formed image data URL no larger than maxImageBytes.
func validateImages(images []string) error {
	if len(images) > maxImages {
		return errors.New("too many images")
	}
	for _, img := range images {
		if len(img) > maxImageBytes {
			return errors.New("image too large")
		}
		if !imageDataURL.MatchString(img) {
			return errors.New("invalid image")
		}
	}
	return nil
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		writeJSONError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write json response: %v", err)
	}
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func atoiDefault(s string, def int) int {
	if n, err := strconv.Atoi(s); err == nil {
		return n
	}
	return def
}
