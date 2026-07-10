// Command notavex is a tiny, self-hosted notes app with Markdown support.
//
// It serves a single-page web UI and a small JSON API, storing every note in
// one JSON file. It depends only on the Go standard library, so it builds into
// a single static binary with no external services.
package main

import (
	"context"
	"embed"
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

	users, err := NewUserStore(filepath.Join(dataDir, "users.json"))
	if err != nil {
		log.Fatalf("open user store: %v", err)
	}

	auth, err := newAuth(users, secure, dataDir)
	if err != nil {
		log.Fatalf("init auth: %v", err)
	}

	// On first run, seed the first admin account: migrate a legacy single-user
	// password if present, otherwise bootstrap one from NOTAVEX_PASSWORD.
	if users.Count() == 0 {
		switch {
		case migrateLegacyPassword(users, dataDir):
			log.Print(`authentication: migrated the existing password into an admin account`)
		case password != "":
			username := envOr("NOTAVEX_USER", "admin")
			if _, err := users.Create(username, username, password, true); err != nil {
				log.Fatalf("bootstrap admin %q: %v", username, err)
			}
			log.Printf("authentication: bootstrapped admin account %q from NOTAVEX_PASSWORD", username)
		}
	}

	if auth.enabled() {
		log.Printf("authentication: ENABLED - %d account(s); login required.", users.Count())
	} else {
		log.Print("authentication: DISABLED - set NOTAVEX_PASSWORD (and optionally NOTAVEX_USER) " +
			"to create the admin account and require a login. Do not expose Notavex without it!")
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

// migrateLegacyPassword converts a legacy single-user auth.json into the first
// admin account ("admin", or NOTAVEX_USER). Returns true if a migration ran.
func migrateLegacyPassword(users *UserStore, dataDir string) bool {
	path := filepath.Join(dataDir, "auth.json")
	cred, err := loadLegacyCredentials(path)
	if err != nil || cred == nil {
		return false
	}
	username := envOr("NOTAVEX_USER", "admin")
	if err := users.createWithHash(username, username, cred.Hash, cred.Salt, cred.Iter, true); err != nil {
		log.Printf("could not migrate legacy password: %v", err)
		return false
	}
	// Rename so it is clearly superseded and never picked up again.
	_ = os.Rename(path, path+".migrated")
	return true
}
