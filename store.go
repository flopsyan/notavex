package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"
)

// ErrNotFound is returned when a memo does not exist.
var ErrNotFound = errors.New("memo not found")

// Memo is a single note. Labels are explicit (set by the user), never parsed
// from the text. Position orders the board: higher sorts first (top).
type Memo struct {
	ID                 int64      `json:"id"`
	Title              string     `json:"title"`
	Content            string     `json:"content"`
	Labels             []string   `json:"labels"`
	Pinned             bool       `json:"pinned"`
	Color              string     `json:"color"`
	Archived           bool       `json:"archived"`
	Trashed            bool       `json:"trashed"`
	Checklist          bool       `json:"checklist"`
	CompletedCollapsed bool       `json:"completedCollapsed"`
	Position           float64    `json:"position"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	TrashedAt          *time.Time `json:"trashedAt,omitempty"`
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
	s.migratePositions(snap.Memos)
	return nil
}

// migratePositions assigns positions to legacy snapshots that predate the
// Position field. If there is at least one memo and every memo has Position==0,
// we reconstruct the old "newest first" order by sorting on CreatedAt (then ID)
// ascending and numbering oldest=1 … newest=highest. This runs in memory only;
// the new values are persisted on the next change.
func (s *Store) migratePositions(memos []*Memo) {
	if len(memos) == 0 {
		return
	}
	for _, m := range memos {
		if m.Position != 0 {
			return // already positioned
		}
	}
	ordered := slices.Clone(memos)
	sort.Slice(ordered, func(i, j int) bool {
		a, b := ordered[i], ordered[j]
		if !a.CreatedAt.Equal(b.CreatedAt) {
			return a.CreatedAt.Before(b.CreatedAt) // oldest first
		}
		return a.ID < b.ID
	})
	for i, m := range ordered {
		m.Position = float64(i + 1)
	}
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

	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".notavex-*.tmp")
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

// normalizeLabels cleans a user-supplied label list: it trims each entry, drops
// empties, dedupes case-insensitively (keeping the first occurrence's casing),
// truncates each label to 64 runes and caps the slice at 50 labels. Input order
// is preserved after dedupe. It returns nil when nothing remains.
func normalizeLabels(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	seen := make(map[string]bool)
	var out []string
	for _, raw := range in {
		label := strings.TrimSpace(raw)
		if label == "" {
			continue
		}
		if r := []rune(label); len(r) > 64 {
			label = string(r[:64])
		}
		key := strings.ToLower(label)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, label)
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func cloneMemo(m *Memo) *Memo {
	c := *m
	if m.Labels != nil {
		c.Labels = slices.Clone(m.Labels)
	}
	if m.TrashedAt != nil {
		t := *m.TrashedAt
		c.TrashedAt = &t
	}
	return &c
}

// maxPosition returns the highest Position over all memos (0 if there are none).
// Callers must hold s.mu.
func (s *Store) maxPosition() float64 {
	var max float64
	for _, m := range s.memos {
		if m.Position > max {
			max = m.Position
		}
	}
	return max
}

// NewMemo carries the fields accepted when creating a memo.
type NewMemo struct {
	Title     string
	Content   string
	Color     string
	Labels    []string
	Checklist bool
}

// Create stores a new memo and returns it.
func (s *Store) Create(in NewMemo) (*Memo, error) {
	title := strings.TrimSpace(in.Title)
	content := strings.TrimSpace(in.Content)
	if title == "" && content == "" {
		return nil, errors.New("title or content required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	m := &Memo{
		ID:        s.nextID,
		Title:     title,
		Content:   content,
		Labels:    normalizeLabels(in.Labels),
		Color:     in.Color,
		Checklist: in.Checklist,
		Position:  s.maxPosition() + 1,
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

// UpdateMemo carries the partially-updatable fields of a memo. Only the non-nil
// fields are applied.
type UpdateMemo struct {
	Title     *string
	Content   *string
	Labels    *[]string
	Checklist *bool
}

// Update applies the supplied non-nil fields to an existing memo and bumps
// UpdatedAt. The resulting memo must still have a title or content.
func (s *Store) Update(id int64, in UpdateMemo) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}

	prevTitle, prevContent := m.Title, m.Content
	prevLabels, prevChecklist := m.Labels, m.Checklist
	prevUpdated := m.UpdatedAt

	if in.Title != nil {
		m.Title = strings.TrimSpace(*in.Title)
	}
	if in.Content != nil {
		m.Content = strings.TrimSpace(*in.Content)
	}
	if in.Labels != nil {
		m.Labels = normalizeLabels(*in.Labels)
	}
	if in.Checklist != nil {
		m.Checklist = *in.Checklist
	}

	if m.Title == "" && m.Content == "" {
		m.Title, m.Content = prevTitle, prevContent
		m.Labels, m.Checklist = prevLabels, prevChecklist
		return nil, errors.New("title or content required")
	}

	m.UpdatedAt = time.Now().UTC()

	if err := s.save(); err != nil {
		m.Title, m.Content = prevTitle, prevContent
		m.Labels, m.Checklist = prevLabels, prevChecklist
		m.UpdatedAt = prevUpdated
		return nil, err
	}
	return cloneMemo(m), nil
}

// SetPinned pins or unpins a memo. Pinning a memo un-archives it. This does not
// change UpdatedAt.
func (s *Store) SetPinned(id int64, pinned bool) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prevPinned, prevArchived := m.Pinned, m.Archived
	m.Pinned = pinned
	if pinned {
		m.Archived = false
	}

	if err := s.save(); err != nil {
		m.Pinned, m.Archived = prevPinned, prevArchived
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

// SetArchived archives or unarchives a memo. Archiving a memo unpins it. This
// does not change UpdatedAt.
func (s *Store) SetArchived(id int64, archived bool) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prevArchived, prevPinned := m.Archived, m.Pinned
	m.Archived = archived
	if archived {
		m.Pinned = false
	}

	if err := s.save(); err != nil {
		m.Archived, m.Pinned = prevArchived, prevPinned
		return nil, err
	}
	return cloneMemo(m), nil
}

// SetTrashed moves a memo to the trash or restores it. Trashing also unpins;
// restoring also unarchives. This does not change UpdatedAt.
func (s *Store) SetTrashed(id int64, trashed bool) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prevTrashed, prevTrashedAt := m.Trashed, m.TrashedAt
	prevPinned, prevArchived := m.Pinned, m.Archived

	if trashed {
		now := time.Now().UTC()
		m.Trashed = true
		m.TrashedAt = &now
		m.Pinned = false
	} else {
		m.Trashed = false
		m.TrashedAt = nil
		m.Archived = false
	}

	if err := s.save(); err != nil {
		m.Trashed, m.TrashedAt = prevTrashed, prevTrashedAt
		m.Pinned, m.Archived = prevPinned, prevArchived
		return nil, err
	}
	return cloneMemo(m), nil
}

// SetCompletedCollapsed toggles whether a checklist's completed items are hidden.
// This does not change UpdatedAt.
func (s *Store) SetCompletedCollapsed(id int64, collapsed bool) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}
	prev := m.CompletedCollapsed
	m.CompletedCollapsed = collapsed

	if err := s.save(); err != nil {
		m.CompletedCollapsed = prev
		return nil, err
	}
	return cloneMemo(m), nil
}

// Delete permanently removes a memo.
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

// EmptyTrash permanently deletes every trashed memo and returns how many were
// removed.
func (s *Store) EmptyTrash() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	removed := make(map[int64]*Memo)
	for id, m := range s.memos {
		if m.Trashed {
			removed[id] = m
		}
	}
	if len(removed) == 0 {
		return 0, nil
	}
	for id := range removed {
		delete(s.memos, id)
	}

	if err := s.save(); err != nil {
		for id, m := range removed { // restore
			s.memos[id] = m
		}
		return 0, err
	}
	return len(removed), nil
}

// Duplicate creates an independent copy of a memo on top of the board. The copy
// is never pinned, archived or trashed.
func (s *Store) Duplicate(id int64) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	src, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}

	now := time.Now().UTC()
	m := &Memo{
		ID:                 s.nextID,
		Title:              src.Title,
		Content:            src.Content,
		Labels:             slices.Clone(src.Labels),
		Color:              src.Color,
		Checklist:          src.Checklist,
		CompletedCollapsed: src.CompletedCollapsed,
		Position:           s.maxPosition() + 1,
		CreatedAt:          now,
		UpdatedAt:          now,
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

// Move reorders a memo within its group. A group is the set of active
// (non-archived, non-trashed) memos that share the moved memo's Pinned value.
// The memo is re-inserted immediately after afterID; when afterID is 0 or not in
// the group it goes to the front (top). The whole group is then renumbered top
// to bottom. This does not change UpdatedAt.
func (s *Store) Move(id, afterID int64) (*Memo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, ok := s.memos[id]
	if !ok {
		return nil, ErrNotFound
	}

	// Collect the moved memo's group in current visual order.
	group := make([]*Memo, 0)
	for _, other := range s.memos {
		if !other.Archived && !other.Trashed && other.Pinned == m.Pinned {
			group = append(group, other)
		}
	}
	sort.Slice(group, func(i, j int) bool {
		a, b := group[i], group[j]
		if a.Position != b.Position {
			return a.Position > b.Position // higher first
		}
		if !a.CreatedAt.Equal(b.CreatedAt) {
			return a.CreatedAt.After(b.CreatedAt) // newest first
		}
		return a.ID > b.ID
	})

	// Snapshot positions so we can roll back on save failure.
	prev := make(map[int64]float64, len(group))
	for _, g := range group {
		prev[g.ID] = g.Position
	}

	// Remove the moved memo, then re-insert after afterID (or at the front).
	group = slices.DeleteFunc(group, func(g *Memo) bool { return g.ID == id })
	insertAt := 0
	if afterID != 0 {
		for i, g := range group {
			if g.ID == afterID {
				insertAt = i + 1
				break
			}
		}
	}
	group = slices.Insert(group, insertAt, m)

	// Renumber top to bottom so higher positions stay on top.
	for i, g := range group {
		g.Position = float64(len(group) - i)
	}

	if err := s.save(); err != nil {
		for _, g := range group {
			g.Position = prev[g.ID] // restore
		}
		return nil, err
	}
	return cloneMemo(m), nil
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
	Query  string // case-insensitive substring match on title+content
	Label  string // exact (case-insensitive) label match
	View   string // "active" (default), "archived" or "trash"
	Limit  int    // 0 means no limit
	Offset int
}

// ListResult is the outcome of a List call. Total is the number of memos that
// match the filter before pagination is applied.
type ListResult struct {
	Memos []*Memo `json:"memos"`
	Total int     `json:"total"`
}

// inView reports whether m belongs to the named view. Anything that is not
// "archived" or "trash" is treated as the default "active" view.
func inView(m *Memo, view string) bool {
	switch view {
	case "archived":
		return m.Archived && !m.Trashed
	case "trash":
		return m.Trashed
	default: // "active"
		return !m.Archived && !m.Trashed
	}
}

// List returns memos matching opt, sorted pinned-first, then by descending
// position, then newest-first.
func (s *Store) List(opt ListOptions) ListResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := strings.ToLower(strings.TrimSpace(opt.Query))
	label := strings.ToLower(strings.TrimSpace(opt.Label))
	view := strings.TrimSpace(opt.View)

	var filtered []*Memo
	for _, m := range s.memos {
		if !inView(m, view) {
			continue
		}
		if label != "" && !hasLabel(m, label) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(m.Title+"\n"+m.Content), query) {
			continue
		}
		filtered = append(filtered, m)
	}

	sort.Slice(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		if a.Pinned != b.Pinned {
			return a.Pinned // pinned memos first
		}
		if a.Position != b.Position {
			return a.Position > b.Position // higher position first
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

// hasLabel reports whether m carries the given label (compared case-insensitively;
// want must already be lower-cased).
func hasLabel(m *Memo, want string) bool {
	for _, l := range m.Labels {
		if strings.ToLower(l) == want {
			return true
		}
	}
	return false
}

// LabelInfo is a label together with how many memos carry it.
type LabelInfo struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// Labels returns every label used by a non-trashed memo, ordered by descending
// usage and then alphabetically. Labels are grouped case-insensitively, keeping
// the first casing encountered.
func (s *Store) Labels() []LabelInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	counts := make(map[string]int)
	names := make(map[string]string) // lower-case key -> display name
	for _, m := range s.memos {
		if m.Trashed {
			continue
		}
		for _, l := range m.Labels {
			key := strings.ToLower(l)
			if _, ok := names[key]; !ok {
				names[key] = l
			}
			counts[key]++
		}
	}
	labels := make([]LabelInfo, 0, len(counts))
	for key, count := range counts {
		labels = append(labels, LabelInfo{Name: names[key], Count: count})
	}
	sort.Slice(labels, func(i, j int) bool {
		if labels[i].Count != labels[j].Count {
			return labels[i].Count > labels[j].Count
		}
		return labels[i].Name < labels[j].Name
	})
	return labels
}

// Stats returns the number of memos in each top-level bucket. notes counts
// active memos (neither archived nor trashed).
func (s *Store) Stats() (notes, archived, trashed int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, m := range s.memos {
		switch {
		case m.Trashed:
			trashed++
		case m.Archived:
			archived++
		default:
			notes++
		}
	}
	return notes, archived, trashed
}
