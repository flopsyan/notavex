package main

import (
	"crypto/sha256"
	"encoding/hex"
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
	logins *loginLimiter
}

// NewServer creates a Server. static must be a filesystem rooted at the web
// assets (index.html, app.js, ...).
func NewServer(store *Store, auth *Auth, static fs.FS) *Server {
	return &Server{store: store, auth: auth, static: static, logins: newLoginLimiter()}
}

// Routes builds the HTTP handler for the whole application.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Static assets (CSS/JS) are always public.
	mux.Handle("GET /static/", http.StripPrefix("/static/", s.staticHandler()))

	// Auth + account endpoints.
	mux.HandleFunc("POST /api/login", s.handleLogin)
	mux.HandleFunc("POST /api/logout", s.handleLogout)
	mux.HandleFunc("GET /api/config", s.handleConfig)
	mux.HandleFunc("POST /api/password", s.requireAuth(s.handlePassword))
	mux.HandleFunc("POST /api/profile", s.requireAuth(s.handleProfile))
	mux.HandleFunc("GET /api/users", s.requireAuth(s.handleListUsers))
	mux.HandleFunc("POST /api/users", s.requireAdmin(s.handleCreateUser))
	mux.HandleFunc("DELETE /api/users/{id}", s.requireAdmin(s.handleDeleteUser))

	// Memo API (requires authentication when enabled).
	mux.HandleFunc("GET /api/memos", s.requireAuth(s.handleListMemos))
	mux.HandleFunc("POST /api/memos", s.requireAuth(s.handleCreateMemo))
	mux.HandleFunc("POST /api/memos/trash/empty", s.requireAuth(s.handleEmptyTrash))
	mux.HandleFunc("GET /api/memos/{id}", s.requireAuth(s.handleGetMemo))
	mux.HandleFunc("PUT /api/memos/{id}", s.requireAuth(s.handleUpdateMemo))
	mux.HandleFunc("DELETE /api/memos/{id}", s.requireAuth(s.handleDeleteMemo))
	mux.HandleFunc("POST /api/memos/{id}/pin", s.requireAuth(s.handleMemoFlag("pinned", s.store.SetPinned)))
	mux.HandleFunc("POST /api/memos/{id}/color", s.requireAuth(s.handleSetColor))
	mux.HandleFunc("POST /api/memos/{id}/archive", s.requireAuth(s.handleMemoFlag("archived", s.store.SetArchived)))
	mux.HandleFunc("POST /api/memos/{id}/trash", s.requireAuth(s.handleMemoFlag("trashed", s.store.SetTrashed)))
	mux.HandleFunc("POST /api/memos/{id}/duplicate", s.requireAuth(s.handleDuplicateMemo))
	mux.HandleFunc("POST /api/memos/{id}/move", s.requireAuth(s.handleMoveMemo))
	mux.HandleFunc("POST /api/memos/{id}/collapsed", s.requireAuth(s.handleMemoFlag("collapsed", s.store.SetCompletedCollapsed)))
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
		if s.auth.secure {
			// NOTAVEX_SECURE means HTTPS terminates in front of Notavex.
			h.Set("Strict-Transport-Security", "max-age=31536000")
		}

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}

// staticHandler serves the embedded web assets with content-hash ETags, so
// browsers revalidate with a cheap 304 instead of re-downloading each asset on
// every page load (embedded files carry no modification time to cache by).
func (s *Server) staticHandler() http.Handler {
	etags := make(map[string]string)
	fs.WalkDir(s.static, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		data, err := fs.ReadFile(s.static, path)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(data)
		etags[path] = `"` + hex.EncodeToString(sum[:16]) + `"`
		return nil
	})
	files := http.FileServerFS(s.static)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if tag, ok := etags[r.URL.Path]; ok {
			w.Header().Set("ETag", tag) // ServeContent answers If-None-Match with 304
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	})
}

// requireAuth guards JSON API handlers, returning 401 when a login is required
// (i.e. accounts exist) and the request carries no valid session.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.auth.enabled() && s.auth.currentUser(r) == nil {
			writeJSONError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next(w, r)
	}
}

// requireAdmin guards admin-only JSON API handlers (user management).
func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := s.auth.currentUser(r)
		if u == nil {
			writeJSONError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		if !u.IsAdmin {
			writeJSONError(w, http.StatusForbidden, "admin only")
			return
		}
		next(w, r)
	}
}

// ---------- pages ----------

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if s.auth.enabled() && s.auth.currentUser(r) == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	s.serveFile(w, r, "index.html")
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled() || s.auth.currentUser(r) != nil {
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

// ---------- auth + account handlers ----------

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled() {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	ip := clientIP(r)
	if s.logins.blocked(ip) {
		writeJSONError(w, http.StatusTooManyRequests, "too many failed attempts")
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !readJSON(w, r, &req, 4096) {
		return
	}
	u, ok := s.auth.users.Authenticate(req.Username, req.Password)
	if !ok {
		s.logins.fail(ip)
		writeJSONError(w, http.StatusUnauthorized, "wrong username or password")
		return
	}
	s.logins.reset(ip)
	s.setSessionCookie(w, u)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
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
	u := s.auth.currentUser(r)
	resp := map[string]any{
		"authEnabled": s.auth.enabled(),
		"authed":      !s.auth.enabled() || u != nil,
		"user":        nil,
	}
	if u != nil {
		resp["user"] = u.public()
	}
	writeJSON(w, http.StatusOK, resp)
}

// handlePassword changes the logged-in user's own password. It verifies the
// current password, stores the new one and re-issues the session cookie (the old
// token is invalidated because it was bound to the previous hash), so the user
// stays logged in.
func (s *Server) handlePassword(w http.ResponseWriter, r *http.Request) {
	u := s.auth.currentUser(r)
	if u == nil {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if !readJSON(w, r, &req, 4096) {
		return
	}
	if !verifySaltedHash(req.CurrentPassword, u.PassHash, u.PassSalt, u.Iter) {
		writeJSONError(w, http.StatusUnauthorized, "current")
		return
	}
	if err := s.auth.users.ChangePassword(u.ID, req.NewPassword); err != nil {
		if errors.Is(err, ErrWeakPassword) {
			writeJSONError(w, http.StatusBadRequest, "weak_password")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "error")
		return
	}
	if nu, ok := s.auth.users.ByID(u.ID); ok {
		s.setSessionCookie(w, nu)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// handleProfile updates the logged-in user's own display name.
func (s *Server) handleProfile(w http.ResponseWriter, r *http.Request) {
	u := s.auth.currentUser(r)
	if u == nil {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req struct {
		DisplayName string `json:"displayName"`
	}
	if !readJSON(w, r, &req, 4096) {
		return
	}
	pu, err := s.auth.users.UpdateDisplayName(u.ID, req.DisplayName)
	if err != nil {
		s.writeUserError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, pu)
}

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.auth.users.List())
}

// handleCreateUser adds a new (non-admin) account. Admin-only.
func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		DisplayName string `json:"displayName"`
		Password    string `json:"password"`
	}
	if !readJSON(w, r, &req, 4096) {
		return
	}
	pu, err := s.auth.users.Create(req.Username, req.DisplayName, req.Password, false)
	if err != nil {
		s.writeUserError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, pu)
}

// handleDeleteUser removes an account. Admin-only.
func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := s.auth.users.Delete(id); err != nil {
		s.writeUserError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// setSessionCookie issues a fresh, hash-bound session cookie for u.
func (s *Server) setSessionCookie(w http.ResponseWriter, u *User) {
	expiry := time.Now().Add(sessionMaxAge)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    s.auth.issueToken(u, expiry),
		Path:     "/",
		Expires:  expiry,
		MaxAge:   int(sessionMaxAge.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.auth.secure,
	})
}

// writeUserError maps a user-store error to an HTTP status + a stable error code
// the browser maps to a localized message.
func (s *Server) writeUserError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidUsername):
		writeJSONError(w, http.StatusBadRequest, "invalid_username")
	case errors.Is(err, ErrWeakPassword):
		writeJSONError(w, http.StatusBadRequest, "weak_password")
	case errors.Is(err, ErrUsernameTaken):
		writeJSONError(w, http.StatusConflict, "taken")
	case errors.Is(err, ErrLastUser):
		writeJSONError(w, http.StatusBadRequest, "last_user")
	case errors.Is(err, ErrLastAdmin):
		writeJSONError(w, http.StatusBadRequest, "last_admin")
	case errors.Is(err, ErrUserNotFound):
		writeJSONError(w, http.StatusNotFound, "not_found")
	default:
		writeJSONError(w, http.StatusInternalServerError, "error")
	}
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
	if !readJSON(w, r, &req, maxMemoBody) {
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
	if !readJSON(w, r, &req, maxMemoBody) {
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

// handleMemoFlag builds a handler for the single-bool memo actions (pin,
// archive, trash, collapsed): it decodes {<field>: bool} and applies it.
func (s *Server) handleMemoFlag(field string, apply func(id int64, v bool) (*Memo, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var req map[string]bool
		if !readJSON(w, r, &req, 4096) {
			return
		}
		m, err := apply(id, req[field])
		if err != nil {
			s.writeStoreError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, m)
	}
}

func (s *Server) handleSetColor(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req struct {
		Color string `json:"color"`
	}
	if !readJSON(w, r, &req, 4096) {
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
	if !readJSON(w, r, &req, 4096) {
		return
	}
	m, err := s.store.Move(id, req.AfterID)
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

// readJSON decodes a size-limited JSON request body into dst, answering with a
// 400 on failure. Returns false when the request was rejected.
func readJSON(w http.ResponseWriter, r *http.Request, dst any, limit int64) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, limit)).Decode(dst); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

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

// imageDataURL matches a base64-encoded image data URL - the only image form the
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
