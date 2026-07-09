package main

import (
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Password hashing parameters. PBKDF2-HMAC-SHA256 keeps Notavex dependency-free
// (crypto/pbkdf2 is part of the Go standard library since 1.24) while storing
// only a salted hash on disk.
const (
	pbkdf2Iter   = 210_000
	pbkdf2KeyLen = 32
	minPassword  = 4
)

// ErrWeakPassword is returned when a password is shorter than minPassword.
var ErrWeakPassword = errors.New("password too short")

// hashPassword derives a key from password with the given salt and iterations.
func hashPassword(password string, salt []byte, iter int) ([]byte, error) {
	return pbkdf2.Key(sha256.New, password, salt, iter, pbkdf2KeyLen)
}

// makeSaltedHash hashes password with a fresh random salt, returning hex strings.
func makeSaltedHash(password string) (hashHex, saltHex string, err error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}
	h, err := hashPassword(password, salt, pbkdf2Iter)
	if err != nil {
		return "", "", err
	}
	return hex.EncodeToString(h), hex.EncodeToString(salt), nil
}

// verifySaltedHash reports whether password matches a stored hex hash/salt.
func verifySaltedHash(password, hashHex, saltHex string, iter int) bool {
	want, err := hex.DecodeString(hashHex)
	if err != nil || len(want) == 0 || iter <= 0 {
		return false
	}
	salt, err := hex.DecodeString(saltHex)
	if err != nil {
		return false
	}
	got, err := hashPassword(password, salt, iter)
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

// Auth issues and validates stateless, signed session cookies for the user store.
// A session token is "<userID>.<expiryUnix>.<signature>", where the signature
// binds the user's current password hash — so changing a password invalidates
// that user's existing sessions. Authentication is required whenever at least
// one account exists; with no accounts the app runs open.
type Auth struct {
	users  *UserStore
	secret []byte
	secure bool // mark the session cookie Secure (serve only over HTTPS)
}

// newAuth wires up sessions for the user store. The signing secret comes from
// NOTAVEX_SECRET if set, otherwise a random one persisted in the data dir.
func newAuth(users *UserStore, secure bool, dataDir string) (*Auth, error) {
	a := &Auth{users: users, secure: secure}
	if env := os.Getenv("NOTAVEX_SECRET"); env != "" {
		sum := sha256.Sum256([]byte(env))
		a.secret = sum[:]
		return a, nil
	}
	secret, err := loadOrCreateSecret(filepath.Join(dataDir, ".secret"))
	if err != nil {
		return nil, err
	}
	a.secret = secret
	return a, nil
}

// enabled reports whether a login is required (true once an account exists).
func (a *Auth) enabled() bool { return a.users.Count() > 0 }

// bindOf returns the part of a user's password hash mixed into the session
// signature, so a password change invalidates that user's tokens.
func (a *Auth) bindOf(u *User) string {
	if len(u.PassHash) >= 16 {
		return u.PassHash[:16]
	}
	return u.PassHash
}

// sign returns the hex-encoded HMAC-SHA256 of msg using the server secret.
func (a *Auth) sign(msg string) string {
	mac := hmac.New(sha256.New, a.secret)
	mac.Write([]byte(msg))
	return hex.EncodeToString(mac.Sum(nil))
}

// issueToken creates a signed session token for u, valid until expiry.
func (a *Auth) issueToken(u *User, expiry time.Time) string {
	payload := strconv.FormatInt(u.ID, 10) + "." + strconv.FormatInt(expiry.Unix(), 10)
	return payload + "." + a.sign(payload+"."+a.bindOf(u))
}

// userFromToken returns the account a valid, unexpired token belongs to, or nil.
func (a *Auth) userFromToken(token string) *User {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil
	}
	id, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return nil
	}
	exp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || time.Now().Unix() >= exp {
		return nil
	}
	u, ok := a.users.ByID(id)
	if !ok {
		return nil
	}
	expected := a.sign(parts[0] + "." + parts[1] + "." + a.bindOf(u))
	if subtle.ConstantTimeCompare([]byte(parts[2]), []byte(expected)) != 1 {
		return nil
	}
	return u
}

// currentUser resolves the account for a request from its session cookie, or nil.
func (a *Auth) currentUser(r *http.Request) *User {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return nil
	}
	return a.userFromToken(c.Value)
}

// Failed-login throttling: after loginMaxFails failed attempts from one client
// within loginFailWindow, further attempts are rejected until the window ends.
// This keeps online password guessing (and the PBKDF2 CPU cost per guess) in
// check without any persistent state.
const (
	loginMaxFails   = 10
	loginFailWindow = 15 * time.Minute
)

type failWindow struct {
	count int
	start time.Time
}

// loginLimiter tracks failed login attempts per client IP. Safe for concurrent use.
type loginLimiter struct {
	mu    sync.Mutex
	fails map[string]failWindow
}

func newLoginLimiter() *loginLimiter {
	return &loginLimiter{fails: make(map[string]failWindow)}
}

// blocked reports whether ip has exhausted its attempts for the current window.
func (l *loginLimiter) blocked(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	w, ok := l.fails[ip]
	if !ok {
		return false
	}
	if time.Since(w.start) > loginFailWindow {
		delete(l.fails, ip)
		return false
	}
	return w.count >= loginMaxFails
}

// fail records a failed attempt for ip.
func (l *loginLimiter) fail(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	// Sweep stale entries once the map grows, so rotating IPs cannot leak memory.
	if len(l.fails) > 1000 {
		for k, w := range l.fails {
			if time.Since(w.start) > loginFailWindow {
				delete(l.fails, k)
			}
		}
	}
	w := l.fails[ip]
	if w.count == 0 || time.Since(w.start) > loginFailWindow {
		l.fails[ip] = failWindow{count: 1, start: time.Now()}
		return
	}
	w.count++
	l.fails[ip] = w
}

// reset clears ip's failed attempts (after a successful login).
func (l *loginLimiter) reset(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.fails, ip)
}

// clientIP returns the request's remote IP without the port. Behind a reverse
// proxy every request shares the proxy's IP, which degrades to a global limit;
// that fails safe (never open).
func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// credentials is the on-disk shape of the legacy single-user password (auth.json),
// kept only so an old install can be migrated into an admin account.
type credentials struct {
	Hash string `json:"hash"`
	Salt string `json:"salt"`
	Iter int    `json:"iter"`
}

// loadLegacyCredentials reads a legacy auth.json, or (nil, nil) if absent/empty.
func loadLegacyCredentials(path string) (*credentials, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var c credentials
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	if c.Hash == "" || c.Salt == "" || c.Iter <= 0 {
		return nil, nil
	}
	return &c, nil
}

// loadOrCreateSecret reads a hex-encoded signing secret from path, creating a
// new random one (0600) if it does not yet exist or is invalid.
func loadOrCreateSecret(path string) ([]byte, error) {
	if data, err := os.ReadFile(path); err == nil {
		if b, err := hex.DecodeString(strings.TrimSpace(string(data))); err == nil && len(b) >= 16 {
			return b, nil
		}
	}
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}
	if err := writeFileAtomic(path, []byte(hex.EncodeToString(secret)), 0o600); err != nil {
		return nil, err
	}
	return secret, nil
}

// writeFileAtomic writes data to path via a temp file + rename so a crash can
// never leave a half-written file behind.
func writeFileAtomic(path string, data []byte, perm os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op once the rename below succeeds

	if err := tmp.Chmod(perm); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
