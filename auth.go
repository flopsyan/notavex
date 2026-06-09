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

// ErrWeakPassword is returned when a new password is shorter than minPassword.
var ErrWeakPassword = errors.New("password too short")

// Auth holds single-user authentication state. When enabled is false the whole
// app is open and no login is required.
//
// The password is kept as a salted PBKDF2-HMAC-SHA256 hash in auth.json inside
// the data dir, so it can be changed at runtime (Profile → change password) and
// survives restarts. The session signature binds the current hash, so changing
// the password invalidates every existing session.
type Auth struct {
	enabled  bool
	secret   []byte
	secure   bool   // mark the session cookie Secure (serve only over HTTPS)
	credPath string // path to the credential file (auth.json)

	mu   sync.RWMutex
	hash []byte
	salt []byte
	iter int
}

// credentials is the on-disk representation of the stored password.
type credentials struct {
	Hash string `json:"hash"`
	Salt string `json:"salt"`
	Iter int    `json:"iter"`
}

// newAuth wires up authentication for the data dir. A stored password (auth.json)
// always wins and is what the Profile page edits. On first run a password is
// bootstrapped from NOTAVEX_PASSWORD; afterwards the env var is ignored (delete
// auth.json to fall back to it again). With neither, the app runs open.
func newAuth(password string, secure bool, dataDir string) (*Auth, error) {
	a := &Auth{
		secure:   secure,
		credPath: filepath.Join(dataDir, "auth.json"),
		iter:     pbkdf2Iter,
	}

	// Signing secret: a fixed env secret lets sessions survive restarts and work
	// across multiple instances; otherwise persist a random one.
	if env := os.Getenv("NOTAVEX_SECRET"); env != "" {
		sum := sha256.Sum256([]byte(env))
		a.secret = sum[:]
	} else {
		secret, err := loadOrCreateSecret(filepath.Join(dataDir, ".secret"))
		if err != nil {
			return nil, err
		}
		a.secret = secret
	}

	cred, err := loadCredentials(a.credPath)
	if err != nil {
		return nil, err
	}
	if cred != nil {
		if err := a.applyCredentials(cred); err != nil {
			return nil, err
		}
		a.enabled = true
		return a, nil
	}
	if password != "" {
		// Bootstrap: store whatever password the operator configured (the minimum
		// length is only enforced for later changes made through the UI).
		if err := a.storePassword(password); err != nil {
			return nil, err
		}
	}
	return a, nil
}

// loadCredentials reads stored credentials from path. A missing or empty/invalid
// file yields (nil, nil) so the caller can fall back to bootstrapping.
func loadCredentials(path string) (*credentials, error) {
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

// applyCredentials decodes c and stores it as the in-memory password state.
func (a *Auth) applyCredentials(c *credentials) error {
	hash, err := hex.DecodeString(c.Hash)
	if err != nil {
		return err
	}
	salt, err := hex.DecodeString(c.Salt)
	if err != nil {
		return err
	}
	a.mu.Lock()
	a.hash, a.salt, a.iter = hash, salt, c.Iter
	a.mu.Unlock()
	return nil
}

// setPassword changes the password through the UI: it enforces the minimum
// length before persisting.
func (a *Auth) setPassword(password string) error {
	if len([]rune(password)) < minPassword {
		return ErrWeakPassword
	}
	return a.storePassword(password)
}

// storePassword hashes password with a fresh salt, persists it atomically (0600)
// and updates the in-memory state. Because the session signature binds the hash,
// this invalidates all existing sessions.
func (a *Auth) storePassword(password string) error {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	hash, err := pbkdf2.Key(sha256.New, password, salt, pbkdf2Iter, pbkdf2KeyLen)
	if err != nil {
		return err
	}
	c := credentials{
		Hash: hex.EncodeToString(hash),
		Salt: hex.EncodeToString(salt),
		Iter: pbkdf2Iter,
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	if err := writeFileAtomic(a.credPath, data, 0o600); err != nil {
		return err
	}
	a.mu.Lock()
	a.hash, a.salt, a.iter = hash, salt, pbkdf2Iter
	a.enabled = true
	a.mu.Unlock()
	return nil
}

// verifyPassword reports whether password matches the stored hash.
func (a *Auth) verifyPassword(password string) bool {
	a.mu.RLock()
	salt, iter, want := a.salt, a.iter, a.hash
	a.mu.RUnlock()
	if len(want) == 0 || iter <= 0 {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iter, len(want))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

// bind returns a short value derived from the current password hash. It is mixed
// into the session signature so that changing the password (a new hash)
// invalidates every previously issued token.
func (a *Auth) bind() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if len(a.hash) == 0 {
		return ""
	}
	return hex.EncodeToString(a.hash[:min(8, len(a.hash))])
}

// sign returns the hex-encoded HMAC-SHA256 of msg using the server secret.
func (a *Auth) sign(msg string) string {
	mac := hmac.New(sha256.New, a.secret)
	mac.Write([]byte(msg))
	return hex.EncodeToString(mac.Sum(nil))
}

// issueToken creates a signed session token, bound to the current password,
// valid until expiry.
func (a *Auth) issueToken(expiry time.Time) string {
	exp := strconv.FormatInt(expiry.Unix(), 10)
	return exp + "." + a.sign(exp+"."+a.bind())
}

// validToken reports whether token carries a valid, unexpired signature bound to
// the current password.
func (a *Auth) validToken(token string) bool {
	exp, mac, ok := strings.Cut(token, ".")
	if !ok {
		return false
	}
	expected := a.sign(exp + "." + a.bind())
	if subtle.ConstantTimeCompare([]byte(mac), []byte(expected)) != 1 {
		return false
	}
	unix, err := strconv.ParseInt(exp, 10, 64)
	if err != nil {
		return false
	}
	return time.Now().Unix() < unix
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
