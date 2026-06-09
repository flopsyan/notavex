package main

import (
	"encoding/json"
	"errors"
	"os"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// User-store errors. They map to specific HTTP statuses and i18n keys in the UI.
var (
	ErrInvalidUsername = errors.New("invalid username")
	ErrUsernameTaken   = errors.New("username already taken")
	ErrUserNotFound    = errors.New("user not found")
	ErrLastUser        = errors.New("cannot remove the last account")
	ErrLastAdmin       = errors.New("cannot remove the last admin account")
)

// usernameRe matches 2–32 chars of letters, digits and . _ - (same as epulonis).
var usernameRe = regexp.MustCompile(`^[A-Za-z0-9._-]{2,32}$`)

const maxDisplayName = 64

// User is a single account. Password material (PassHash/PassSalt) is never sent
// to the browser — use public() for that.
type User struct {
	ID          int64     `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	PassHash    string    `json:"passHash"`
	PassSalt    string    `json:"passSalt"`
	Iter        int       `json:"iter"`
	IsAdmin     bool      `json:"isAdmin"`
	CreatedAt   time.Time `json:"createdAt"`
}

// PublicUser is the browser-safe projection of a User.
type PublicUser struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	IsAdmin     bool   `json:"isAdmin"`
}

func (u *User) public() PublicUser {
	return PublicUser{ID: u.ID, Username: u.Username, DisplayName: u.DisplayName, IsAdmin: u.IsAdmin}
}

func cloneUser(u *User) *User { c := *u; return &c }

func cleanDisplayName(name, fallback string) string {
	s := strings.TrimSpace(name)
	if s == "" {
		s = fallback
	}
	if r := []rune(s); len(r) > maxDisplayName {
		s = string(r[:maxDisplayName])
	}
	return s
}

type usersSnapshot struct {
	NextID int64   `json:"nextId"`
	Users  []*User `json:"users"`
}

// UserStore is an in-memory, JSON-file-backed set of accounts. Like the note
// store, every change is persisted atomically to a single file.
type UserStore struct {
	mu     sync.RWMutex
	path   string
	nextID int64
	users  map[int64]*User
}

// NewUserStore opens (or creates) a JSON-backed user store at path.
func NewUserStore(path string) (*UserStore, error) {
	s := &UserStore{path: path, nextID: 1, users: make(map[int64]*User)}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) || (err == nil && len(data) == 0) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	var snap usersSnapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return nil, err
	}
	if snap.NextID > s.nextID {
		s.nextID = snap.NextID
	}
	for _, u := range snap.Users {
		s.users[u.ID] = u
		if u.ID >= s.nextID {
			s.nextID = u.ID + 1
		}
	}
	return s, nil
}

// save writes the store to disk atomically. Callers must hold s.mu.
func (s *UserStore) save() error {
	snap := usersSnapshot{NextID: s.nextID, Users: make([]*User, 0, len(s.users))}
	for _, u := range s.users {
		snap.Users = append(snap.Users, u)
	}
	sort.Slice(snap.Users, func(i, j int) bool { return snap.Users[i].ID < snap.Users[j].ID })
	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(s.path, data, 0o600)
}

// Count returns the number of accounts.
func (s *UserStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.users)
}

func (s *UserStore) byUsernameLocked(username string) *User {
	for _, u := range s.users {
		if strings.EqualFold(u.Username, username) {
			return u
		}
	}
	return nil
}

func (s *UserStore) countAdminsLocked() int {
	n := 0
	for _, u := range s.users {
		if u.IsAdmin {
			n++
		}
	}
	return n
}

// ByID returns a copy of the account with the given id.
func (s *UserStore) ByID(id int64) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	if !ok {
		return nil, false
	}
	return cloneUser(u), true
}

// List returns all accounts (browser-safe), ordered by username.
func (s *UserStore) List() []PublicUser {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]PublicUser, 0, len(s.users))
	for _, u := range s.users {
		out = append(out, u.public())
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Username) < strings.ToLower(out[j].Username)
	})
	return out
}

// Authenticate verifies credentials and returns a copy of the matching account.
func (s *UserStore) Authenticate(username, password string) (*User, bool) {
	s.mu.RLock()
	u := s.byUsernameLocked(strings.TrimSpace(username))
	s.mu.RUnlock()
	if u == nil {
		// Equalize timing a little so a missing user looks like a wrong password.
		_, _ = hashPassword(password, []byte("notavex"), pbkdf2Iter)
		return nil, false
	}
	if verifySaltedHash(password, u.PassHash, u.PassSalt, u.Iter) {
		return cloneUser(u), true
	}
	return nil, false
}

// Create adds a new account. New accounts are non-admin unless isAdmin is set
// (only the bootstrapped admin uses that).
func (s *UserStore) Create(username, displayName, password string, isAdmin bool) (PublicUser, error) {
	uname := strings.TrimSpace(username)
	if !usernameRe.MatchString(uname) {
		return PublicUser{}, ErrInvalidUsername
	}
	if len([]rune(password)) < minPassword {
		return PublicUser{}, ErrWeakPassword
	}
	hashHex, saltHex, err := makeSaltedHash(password)
	if err != nil {
		return PublicUser{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.byUsernameLocked(uname) != nil {
		return PublicUser{}, ErrUsernameTaken
	}
	return s.insertLocked(uname, displayName, hashHex, saltHex, pbkdf2Iter, isAdmin)
}

// createWithHash adds an account from an already-computed hash (used to migrate a
// legacy single-user password into an admin account).
func (s *UserStore) createWithHash(username, displayName, hashHex, saltHex string, iter int, isAdmin bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	uname := strings.TrimSpace(username)
	if s.byUsernameLocked(uname) != nil {
		return ErrUsernameTaken
	}
	_, err := s.insertLocked(uname, displayName, hashHex, saltHex, iter, isAdmin)
	return err
}

func (s *UserStore) insertLocked(username, displayName, hashHex, saltHex string, iter int, isAdmin bool) (PublicUser, error) {
	u := &User{
		ID:          s.nextID,
		Username:    username,
		DisplayName: cleanDisplayName(displayName, username),
		PassHash:    hashHex,
		PassSalt:    saltHex,
		Iter:        iter,
		IsAdmin:     isAdmin,
		CreatedAt:   time.Now().UTC(),
	}
	s.users[u.ID] = u
	s.nextID++
	if err := s.save(); err != nil {
		delete(s.users, u.ID)
		s.nextID--
		return PublicUser{}, err
	}
	return u.public(), nil
}

// ChangePassword sets a new password for an account (invalidating its sessions,
// since the session signature binds the password hash).
func (s *UserStore) ChangePassword(id int64, newPassword string) error {
	if len([]rune(newPassword)) < minPassword {
		return ErrWeakPassword
	}
	hashHex, saltHex, err := makeSaltedHash(newPassword)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return ErrUserNotFound
	}
	oldH, oldS, oldI := u.PassHash, u.PassSalt, u.Iter
	u.PassHash, u.PassSalt, u.Iter = hashHex, saltHex, pbkdf2Iter
	if err := s.save(); err != nil {
		u.PassHash, u.PassSalt, u.Iter = oldH, oldS, oldI
		return err
	}
	return nil
}

// UpdateDisplayName changes an account's display name.
func (s *UserStore) UpdateDisplayName(id int64, displayName string) (PublicUser, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return PublicUser{}, ErrUserNotFound
	}
	old := u.DisplayName
	u.DisplayName = cleanDisplayName(displayName, u.Username)
	if err := s.save(); err != nil {
		u.DisplayName = old
		return PublicUser{}, err
	}
	return u.public(), nil
}

// Delete removes an account, refusing to remove the last account or the last
// admin so the install can never lock itself out.
func (s *UserStore) Delete(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.users) <= 1 {
		return ErrLastUser
	}
	u, ok := s.users[id]
	if !ok {
		return ErrUserNotFound
	}
	if u.IsAdmin && s.countAdminsLocked() <= 1 {
		return ErrLastAdmin
	}
	delete(s.users, id)
	if err := s.save(); err != nil {
		s.users[id] = u
		return err
	}
	return nil
}
