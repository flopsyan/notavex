package main

import (
	"testing"
	"time"
)

func TestNewAuthBootstrapAndVerify(t *testing.T) {
	dir := t.TempDir()
	a, err := newAuth("hunter2", false, dir)
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	if !a.enabled {
		t.Fatal("auth should be enabled after bootstrap")
	}
	if !a.verifyPassword("hunter2") {
		t.Error("correct password should verify")
	}
	if a.verifyPassword("wrong") {
		t.Error("wrong password should not verify")
	}
}

func TestNewAuthDisabledWithoutPassword(t *testing.T) {
	a, err := newAuth("", false, t.TempDir())
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	if a.enabled {
		t.Error("auth should be disabled without a configured or stored password")
	}
}

func TestStoredPasswordWinsOverEnv(t *testing.T) {
	dir := t.TempDir()
	a, err := newAuth("first", false, dir)
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	if err := a.setPassword("changed-in-ui"); err != nil {
		t.Fatalf("setPassword: %v", err)
	}

	// A fresh start with a *different* env password must keep the stored one.
	b, err := newAuth("a-different-env-password", false, dir)
	if err != nil {
		t.Fatalf("newAuth (restart): %v", err)
	}
	if !b.verifyPassword("changed-in-ui") {
		t.Error("stored password should survive restart and win over env")
	}
	if b.verifyPassword("a-different-env-password") {
		t.Error("env password must not override a stored one")
	}
}

func TestTokenRoundTripAndTamper(t *testing.T) {
	a, err := newAuth("pw", false, t.TempDir())
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	tok := a.issueToken(time.Now().Add(time.Hour))
	if !a.validToken(tok) {
		t.Error("freshly issued token should be valid")
	}
	if a.validToken(tok + "x") {
		t.Error("tampered token should be rejected")
	}
	if a.validToken(a.issueToken(time.Now().Add(-time.Minute))) {
		t.Error("expired token should be rejected")
	}
}

func TestPasswordChangeInvalidatesSessions(t *testing.T) {
	a, err := newAuth("pw", false, t.TempDir())
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	tok := a.issueToken(time.Now().Add(time.Hour))
	if !a.validToken(tok) {
		t.Fatal("token should start valid")
	}
	if err := a.setPassword("new-password"); err != nil {
		t.Fatalf("setPassword: %v", err)
	}
	if a.validToken(tok) {
		t.Error("changing the password must invalidate previously issued tokens")
	}
	// A token issued after the change is valid again.
	if !a.validToken(a.issueToken(time.Now().Add(time.Hour))) {
		t.Error("token issued after change should be valid")
	}
}

func TestSetPasswordRejectsTooShort(t *testing.T) {
	a, err := newAuth("pw", false, t.TempDir())
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	if err := a.setPassword("ab"); err != ErrWeakPassword {
		t.Errorf("setPassword(short) = %v, want ErrWeakPassword", err)
	}
}

func TestValidateImages(t *testing.T) {
	const okPNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
	if err := validateImages([]string{okPNG, okPNG}); err != nil {
		t.Errorf("valid images rejected: %v", err)
	}
	if err := validateImages([]string{"data:text/html;base64,xxxx"}); err == nil {
		t.Error("non-image data URL should be rejected")
	}
	if err := validateImages([]string{"javascript:alert(1)"}); err == nil {
		t.Error("script URL should be rejected")
	}
	tooMany := make([]string, maxImages+1)
	for i := range tooMany {
		tooMany[i] = okPNG
	}
	if err := validateImages(tooMany); err == nil {
		t.Error("over-limit image list should be rejected")
	}
}
