package main

import (
	"path/filepath"
	"testing"
	"time"
)

func newTestUsers(t *testing.T) *UserStore {
	t.Helper()
	us, err := NewUserStore(filepath.Join(t.TempDir(), "users.json"))
	if err != nil {
		t.Fatalf("NewUserStore: %v", err)
	}
	return us
}

func TestUserCreateAndAuthenticate(t *testing.T) {
	us := newTestUsers(t)
	if _, err := us.Create("alice", "Alice", "hunter2", true); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if us.Count() != 1 {
		t.Fatalf("Count = %d, want 1", us.Count())
	}
	u, ok := us.Authenticate("alice", "hunter2")
	if !ok || u.Username != "alice" || !u.IsAdmin {
		t.Fatalf("Authenticate failed: ok=%v u=%+v", ok, u)
	}
	if _, ok := us.Authenticate("alice", "wrong"); ok {
		t.Error("wrong password should not authenticate")
	}
	if _, ok := us.Authenticate("ALICE", "hunter2"); !ok {
		t.Error("username match should be case-insensitive")
	}
	if _, ok := us.Authenticate("bob", "hunter2"); ok {
		t.Error("unknown user should not authenticate")
	}
}

func TestUserCreateValidation(t *testing.T) {
	us := newTestUsers(t)
	if _, err := us.Create("a b", "x", "password", false); err != ErrInvalidUsername {
		t.Errorf("invalid username: got %v, want ErrInvalidUsername", err)
	}
	if _, err := us.Create("bob", "x", "ab", false); err != ErrWeakPassword {
		t.Errorf("weak password: got %v, want ErrWeakPassword", err)
	}
	if _, err := us.Create("bob", "Bob", "password", false); err != nil {
		t.Fatalf("create bob: %v", err)
	}
	if _, err := us.Create("BOB", "Bob2", "password", false); err != ErrUsernameTaken {
		t.Errorf("duplicate (case-insensitive) username: got %v, want ErrUsernameTaken", err)
	}
}

func TestChangePassword(t *testing.T) {
	us := newTestUsers(t)
	pu, _ := us.Create("alice", "Alice", "oldpass", true)
	if err := us.ChangePassword(pu.ID, "ab"); err != ErrWeakPassword {
		t.Errorf("weak new password: got %v", err)
	}
	if err := us.ChangePassword(pu.ID, "newpass1"); err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}
	if _, ok := us.Authenticate("alice", "oldpass"); ok {
		t.Error("old password should no longer work")
	}
	if _, ok := us.Authenticate("alice", "newpass1"); !ok {
		t.Error("new password should work")
	}
}

func TestDeleteGuards(t *testing.T) {
	us := newTestUsers(t)
	admin, _ := us.Create("admin", "Admin", "password", true)
	if err := us.Delete(admin.ID); err != ErrLastUser {
		t.Errorf("delete last user: got %v, want ErrLastUser", err)
	}
	bob, _ := us.Create("bob", "Bob", "password", false)
	if err := us.Delete(admin.ID); err != ErrLastAdmin {
		t.Errorf("delete last admin: got %v, want ErrLastAdmin", err)
	}
	if err := us.Delete(bob.ID); err != nil {
		t.Errorf("delete normal user: got %v", err)
	}
}

func TestUsersPersistAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "users.json")
	us, err := NewUserStore(path)
	if err != nil {
		t.Fatalf("NewUserStore: %v", err)
	}
	if _, err := us.Create("alice", "Alice", "hunter2", true); err != nil {
		t.Fatalf("Create: %v", err)
	}
	us2, err := NewUserStore(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if us2.Count() != 1 {
		t.Fatalf("Count after reopen = %d, want 1", us2.Count())
	}
	if _, ok := us2.Authenticate("alice", "hunter2"); !ok {
		t.Error("password should survive reopen")
	}
}

func TestSessionTokenRoundTripAndTamper(t *testing.T) {
	us := newTestUsers(t)
	us.Create("alice", "Alice", "hunter2", true)
	u, _ := us.Authenticate("alice", "hunter2")
	a, err := newAuth(us, false, t.TempDir())
	if err != nil {
		t.Fatalf("newAuth: %v", err)
	}
	tok := a.issueToken(u, time.Now().Add(time.Hour))
	if got := a.userFromToken(tok); got == nil || got.ID != u.ID {
		t.Fatalf("round-trip failed: %v", got)
	}
	if a.userFromToken(tok+"x") != nil {
		t.Error("tampered token should be rejected")
	}
	if a.userFromToken(a.issueToken(u, time.Now().Add(-time.Minute))) != nil {
		t.Error("expired token should be rejected")
	}
}

func TestPasswordChangeInvalidatesSession(t *testing.T) {
	us := newTestUsers(t)
	pu, _ := us.Create("alice", "Alice", "hunter2", true)
	u, _ := us.Authenticate("alice", "hunter2")
	a, _ := newAuth(us, false, t.TempDir())
	tok := a.issueToken(u, time.Now().Add(time.Hour))
	if a.userFromToken(tok) == nil {
		t.Fatal("token should start valid")
	}
	if err := us.ChangePassword(pu.ID, "newpass1"); err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}
	if a.userFromToken(tok) != nil {
		t.Error("changing the password must invalidate existing tokens")
	}
	u2, _ := us.Authenticate("alice", "newpass1")
	if a.userFromToken(a.issueToken(u2, time.Now().Add(time.Hour))) == nil {
		t.Error("token issued after the change should be valid")
	}
}

func TestAuthEnabledFollowsAccounts(t *testing.T) {
	us := newTestUsers(t)
	a, _ := newAuth(us, false, t.TempDir())
	if a.enabled() {
		t.Error("auth should be disabled with no accounts")
	}
	us.Create("alice", "Alice", "hunter2", true)
	if !a.enabled() {
		t.Error("auth should be enabled once an account exists")
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

func TestLoginLimiter(t *testing.T) {
	l := newLoginLimiter()
	if l.blocked("a") {
		t.Fatal("fresh IP must not be blocked")
	}
	for i := 0; i < loginMaxFails; i++ {
		if l.blocked("a") {
			t.Fatalf("blocked after only %d failures", i)
		}
		l.fail("a")
	}
	if !l.blocked("a") {
		t.Fatal("must be blocked after loginMaxFails failures")
	}
	if l.blocked("b") {
		t.Fatal("other IP must not be blocked")
	}
	l.reset("a")
	if l.blocked("a") {
		t.Fatal("reset must unblock")
	}
	// An expired window no longer blocks.
	l.fails["c"] = failWindow{count: loginMaxFails, start: time.Now().Add(-loginFailWindow - time.Second)}
	if l.blocked("c") {
		t.Fatal("expired window must not block")
	}
}
