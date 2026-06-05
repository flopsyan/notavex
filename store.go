package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"
)

// ErrNotFound is returned when a memo does not exist.
var ErrNotFound = errors.New("memo not found")

// Memo is a single note.
type Memo struct {
	ID        int64     `json:"id"`
	Content   string    `json:"content"`
	Tags      []string  `json:"tags"`
	Pinned    bool      `json:"pinned"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// snapshot is the on-disk representation of the whole store.
type snapshot struct {
	NextID int64   `json:"nextId"`
	Memos  []*Memo `json:"memos"`
}

// Store is an in-memory, JSON-file-backed collection of memos. Every change is
// persisted atomically to a single file, which makes backups trivial (just copy
// the file). All exported methods are safe for concurrent use.
type Store struct {
	mu     sync.RWMutex
	path   string
	nextID int64
	memos  map[int64]*Memo
}

// tagPattern matches "#tag" tokens at the start of the string or right after
// whitespace. Tags may contain letters, numbers, "_", "-" and "/" (for nested
// tags such as #work/today) and must start with a letter or number, so that
// ATX headings ("# Title") and URL fragments are not picked up as tags.
var tagPattern = regexp.MustCompile(`(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_/-]*)`)

// NewStore opens (or creates) a JSON-backed store at path.
func NewStore(path string) (*Store, error) {
	s := &Store{
		path:   path,
		nextID: 1,
		memos:  make(map[int64]*Memo),
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil // fresh store
	}
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return nil
	}
	var snap snapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return err
	}
	if snap.NextID > s.nextID {
		s.nextID = snap.NextID
	}
	for _, m := range snap.Memos {
		s.memos[m.ID] = m
		if m.ID >= s.nextID {
			s.nextID = m.ID + 1
		}
	}
	return nil
}

// save writes the current state to disk atomically (write to a temp file in the
// same directory, fsync, then rename). Callers must hold s.mu.
func (s *Store) save() error {
	snap := snapshot{NextID: s.nextID, Memos: make([]*Memo, 0, len(s.memos))}
	for _, m := range s.memos {
		snap.Memos = append(snap.Memos, m)
	}
	sort.Slice(snap.Memos, func(i, j int) bool {
		return snap.Memos[i].ID < snap.Memos[j].ID
	})

	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}

	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".jot-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op once the rename below succeeds

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
	return os.Rename(tmpName, s.path)
}

// extractTags returns the unique, lower-cased tags referenced in content.
func extractTags(content string) []string {
	matches := tagPattern.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return nil
	}
	seen := make(map[string]bool)
	var tags []string
	for _, m := range matches {
		tag := strings.Trim(strings.ToLower(m[2]), "/")
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		tags = append(tags, tag)
	}
	sort.Strings(tags)
	return tags
}

func cloneMemo(m *Memo) *Memo {
	c := *m
	if m.Tags != nil {
		c.Tags = slices.Clone(m.Tags)
	}
	return &c
}

// Create stores a new memo and returns it.
func (s *Store) Create(content, color string) (*Memo, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, errors.New("content must not be empty")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	m := &Memo{
		ID:        s.nextID,
		Content:   content,
		Tags:      extractTags(content),
		Color:     color,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.memos[m.ID] = m
	s.nextID++

	if err := s.save(); err != nil {
		delete(s.memos, m.ID) // roll back to stay consistent with disk
		s.nextID--
		return nil, err
	}
	return cloneMemo(m), nil
}

// Update replaces the content (and re-derives the tags) of an existing memo.
func (s *Store) Update(id int64, content string) (*Memo, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, errors.New("content must not be empty")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prevContent, prevTags, prevUpdated := m.Content, m.Tags, m.UpdatedAt
	m.Content = content
	m.Tags = extractTags(content)
	m.UpdatedAt = time.Now().UTC()

	if err := s.save(); err != nil {
		m.Content, m.Tags, m.UpdatedAt = prevContent, prevTags, prevUpdated
		return nil, err
	}
	return cloneMemo(m), nil
}

// SetPinned pins or unpins a memo. Pinning does not change UpdatedAt.
func (s *Store) SetPinned(id int64, pinned bool) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prev := m.Pinned
	m.Pinned = pinned

	if err := s.save(); err != nil {
		m.Pinned = prev
		return nil, err
	}
	return cloneMemo(m), nil
}

// SetColor changes a memo's color label. Color does not change UpdatedAt.
func (s *Store) SetColor(id int64, color string) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prev := m.Color
	m.Color = color

	if err := s.save(); err != nil {
		m.Color = prev
		return nil, err
	}
	return cloneMemo(m), nil
}

// Delete removes a memo.
func (s *Store) Delete(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return ErrNotFound
	}
	delete(s.memos, id)

	if err := s.save(); err != nil {
		s.memos[id] = m // restore
		return err
	}
	return nil
}

// Get returns a single memo by ID.
func (s *Store) Get(id int64) (*Memo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneMemo(m), nil
}

// Count returns the total number of memos.
func (s *Store) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.memos)
}

// ListOptions controls filtering and pagination for List.
type ListOptions struct {
	Query  string // case-insensitive substring match on content
	Tag    string // exact (case-insensitive) tag match
	Limit  int    // 0 means no limit
	Offset int
}

// ListResult is the outcome of a List call. Total is the number of memos that
// match the filter before pagination is applied.
type ListResult struct {
	Memos []*Memo `json:"memos"`
	Total int     `json:"total"`
}

// List returns memos matching opt, sorted pinned-first and then newest-first.
func (s *Store) List(opt ListOptions) ListResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := strings.ToLower(strings.TrimSpace(opt.Query))
	tag := strings.ToLower(strings.TrimSpace(opt.Tag))

	var filtered []*Memo
	for _, m := range s.memos {
		if query != "" && !strings.Contains(strings.ToLower(m.Content), query) {
			continue
		}
		if tag != "" && !slices.Contains(m.Tags, tag) {
			continue
		}
		filtered = append(filtered, m)
	}

	sort.Slice(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		if a.Pinned != b.Pinned {
			return a.Pinned // pinned memos first
		}
		if !a.CreatedAt.Equal(b.CreatedAt) {
			return a.CreatedAt.After(b.CreatedAt) // newest first
		}
		return a.ID > b.ID
	})

	total := len(filtered)
	start := min(max(opt.Offset, 0), total)
	end := total
	if opt.Limit > 0 && start+opt.Limit < end {
		end = start + opt.Limit
	}

	result := ListResult{Memos: make([]*Memo, 0, end-start), Total: total}
	for _, m := range filtered[start:end] {
		result.Memos = append(result.Memos, cloneMemo(m))
	}
	return result
}

// TagInfo is a tag together with how many memos reference it.
type TagInfo struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// Tags returns all tags ordered by descending usage, then alphabetically.
func (s *Store) Tags() []TagInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	counts := make(map[string]int)
	for _, m := range s.memos {
		for _, t := range m.Tags {
			counts[t]++
		}
	}
	tags := make([]TagInfo, 0, len(counts))
	for name, count := range counts {
		tags = append(tags, TagInfo{Name: name, Count: count})
	}
	sort.Slice(tags, func(i, j int) bool {
		if tags[i].Count != tags[j].Count {
			return tags[i].Count > tags[j].Count
		}
		return tags[i].Name < tags[j].Name
	})
	return tags
}
