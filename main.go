// Command notavex is a tiny, self-hosted notes app with Markdown support.
//
// It serves a single-page web UI and a small JSON API, storing every note in
// one JSON file. It depends only on the Go standard library, so it builds into
// a single static binary with no external services.
package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

//go:embed web
var webFS embed.FS

func main() {
	addr := envOr("NOTAVEX_ADDR", ":8080")
	dataDir := envOr("NOTAVEX_DATA_DIR", "data")
	password := os.Getenv("NOTAVEX_PASSWORD")
	secure := strings.EqualFold(os.Getenv("NOTAVEX_SECURE"), "true")

	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatalf("create data dir %q: %v", dataDir, err)
	}

	store, err := NewStore(filepath.Join(dataDir, "notavex.json"))
	if err != nil {
		log.Fatalf("open store: %v", err)
	}

	auth, err := newAuth(password, secure, dataDir)
	if err != nil {
		log.Fatalf("init auth: %v", err)
	}
	if auth.enabled {
		log.Print("authentication: ENABLED (single-user password login)")
	} else {
		log.Print("authentication: DISABLED — set NOTAVEX_PASSWORD to require a login. " +
			"Do not expose Notavex to the internet without it!")
	}

	static, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatalf("prepare embedded assets: %v", err)
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           NewServer(store, auth, static).Routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Notavex listening on http://localhost%s  (data dir: %s, %d notes)", addr, dataDir, store.Count())
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Print("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func newAuth(password string, secure bool, dataDir string) (*Auth, error) {
	a := &Auth{
		enabled:  password != "",
		password: password,
		secure:   secure,
	}
	// A fixed secret from the environment lets sessions survive restarts and
	// work across multiple instances; otherwise we persist a random one.
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
	if err := os.WriteFile(path, []byte(hex.EncodeToString(secret)), 0o600); err != nil {
		return nil, err
	}
	return secret, nil
}
