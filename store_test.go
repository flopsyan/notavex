package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(filepath.Join(t.TempDir(), "jot.json"))
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	return s
}

// create is a tiny helper for the common "title only" memo.
func create(t *testing.T, s *Store, title string) *Memo {
	t.Helper()
	m, err := s.Create(NewMemo{Title: title})
	if err != nil {
		t.Fatalf("Create(%q): %v", title, err)
	}
	return m
}

func TestCreateSetsFields(t *testing.T) {
	s := newTestStore(t)
	m, err := s.Create(NewMemo{
		Title:     "  Shopping  ",
		Content:   "  milk  ",
		Labels:    []string{" Work ", "work", "", "HOME", "home"},
		Checklist: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if m.ID != 1 {
		t.Errorf("id = %d, want 1", m.ID)
	}
	if m.Title != "Shopping" || m.Content != "milk" {
		t.Errorf("title/content not trimmed: %q / %q", m.Title, m.Content)
	}
	if !m.Checklist {
		t.Error("checklist not set")
	}
	// Deduped case-insensitively, first casing kept, order preserved.
	want := []string{"Work", "HOME"}
	if len(m.Labels) != len(want) {
		t.Fatalf("labels = %v, want %v", m.Labels, want)
	}
	for i := range want {
		if m.Labels[i] != want[i] {
			t.Errorf("label[%d] = %q, want %q", i, m.Labels[i], want[i])
		}
	}
	if m.Position != 1 {
		t.Errorf("position = %v, want 1", m.Position)
	}
}

func TestCreateAssignsIncreasingPositions(t *testing.T) {
	s := newTestStore(t)
	a := create(t, s, "a")
	b := create(t, s, "b")
	c := create(t, s, "c")
	if !(a.Position < b.Position && b.Position < c.Position) {
		t.Errorf("positions not strictly increasing: %v, %v, %v", a.Position, b.Position, c.Position)
	}
	// Newest sits on top.
	if got := s.List(ListOptions{}).Memos[0].ID; got != c.ID {
		t.Errorf("top memo = %d, want %d (newest)", got, c.ID)
	}
}

func TestCreateRejectsEmpty(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.Create(NewMemo{Title: "   ", Content: "  \n\t "}); err == nil {
		t.Error("expected error for blank title and content")
	}
	// Either field alone is enough.
	if _, err := s.Create(NewMemo{Content: "just content"}); err != nil {
		t.Errorf("content-only create failed: %v", err)
	}
	if _, err := s.Create(NewMemo{Title: "just title"}); err != nil {
		t.Errorf("title-only create failed: %v", err)
	}
}

func TestUpdatePartial(t *testing.T) {
	s := newTestStore(t)
	m, err := s.Create(NewMemo{Title: "T", Content: "C", Labels: []string{"x"}})
	if err != nil {
		t.Fatal(err)
	}

	// Content-only update keeps title and labels, bumps UpdatedAt.
	newContent := "new content"
	upd, err := s.Update(m.ID, UpdateMemo{Content: &newContent})
	if err != nil {
		t.Fatal(err)
	}
	if upd.Title != "T" || upd.Content != "new content" {
		t.Errorf("content-only: title/content = %q / %q", upd.Title, upd.Content)
	}
	if len(upd.Labels) != 1 || upd.Labels[0] != "x" {
		t.Errorf("content-only changed labels: %v", upd.Labels)
	}
	if !upd.UpdatedAt.After(m.UpdatedAt) {
		t.Error("content-only did not bump UpdatedAt")
	}

	// Labels-only update.
	newLabels := []string{"a", "a", "b"}
	upd, err = s.Update(m.ID, UpdateMemo{Labels: &newLabels})
	if err != nil {
		t.Fatal(err)
	}
	if len(upd.Labels) != 2 || upd.Labels[0] != "a" || upd.Labels[1] != "b" {
		t.Errorf("labels-only: %v", upd.Labels)
	}
	if upd.Content != "new content" {
		t.Errorf("labels-only changed content: %q", upd.Content)
	}

	// Title-only update.
	newTitle := "  Renamed  "
	upd, err = s.Update(m.ID, UpdateMemo{Title: &newTitle})
	if err != nil {
		t.Fatal(err)
	}
	if upd.Title != "Renamed" {
		t.Errorf("title-only: %q", upd.Title)
	}

	// Missing memo.
	if _, err := s.Update(999, UpdateMemo{Title: &newTitle}); err != ErrNotFound {
		t.Errorf("update missing: want ErrNotFound, got %v", err)
	}
}

func TestUpdateRejectsEmptying(t *testing.T) {
	s := newTestStore(t)
	m := create(t, s, "only title")
	blank := "   "
	emptyContent := ""
	if _, err := s.Update(m.ID, UpdateMemo{Title: &blank, Content: &emptyContent}); err == nil {
		t.Error("expected error when update would empty the memo")
	}
	// The failed update must not have mutated the stored memo.
	got, _ := s.Get(m.ID)
	if got.Title != "only title" {
		t.Errorf("memo mutated by failed update: %q", got.Title)
	}
}

func TestDelete(t *testing.T) {
	s := newTestStore(t)
	m := create(t, s, "bye")
	if err := s.Delete(m.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(m.ID); err != ErrNotFound {
		t.Errorf("want ErrNotFound after delete, got %v", err)
	}
	if err := s.Delete(999); err != ErrNotFound {
		t.Errorf("delete missing: want ErrNotFound, got %v", err)
	}
}

func TestArchiveTrashViews(t *testing.T) {
	s := newTestStore(t)
	keep := create(t, s, "active")
	arch := create(t, s, "to archive")
	trash := create(t, s, "to trash")

	if _, err := s.SetArchived(arch.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetTrashed(trash.ID, true); err != nil {
		t.Fatal(err)
	}

	// Active view excludes archived and trashed.
	active := s.List(ListOptions{View: "active"})
	if active.Total != 1 || active.Memos[0].ID != keep.ID {
		t.Errorf("active view = %+v, want only %d", ids(active.Memos), keep.ID)
	}
	// Empty/unknown view defaults to active.
	if def := s.List(ListOptions{}); def.Total != 1 || def.Memos[0].ID != keep.ID {
		t.Errorf("default view = %v, want only %d", ids(def.Memos), keep.ID)
	}
	if junk := s.List(ListOptions{View: "nonsense"}); junk.Total != 1 {
		t.Errorf("unknown view should fall back to active, got total %d", junk.Total)
	}

	// Archived view.
	a := s.List(ListOptions{View: "archived"})
	if a.Total != 1 || a.Memos[0].ID != arch.ID {
		t.Errorf("archived view = %v, want only %d", ids(a.Memos), arch.ID)
	}
	// Trash view.
	tr := s.List(ListOptions{View: "trash"})
	if tr.Total != 1 || tr.Memos[0].ID != trash.ID {
		t.Errorf("trash view = %v, want only %d", ids(tr.Memos), trash.ID)
	}
}

func TestRestoreFromTrashReturnsActive(t *testing.T) {
	s := newTestStore(t)
	m := create(t, s, "doomed")
	// Archive then trash; restore must clear both.
	if _, err := s.SetArchived(m.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetTrashed(m.ID, true); err != nil {
		t.Fatal(err)
	}
	restored, err := s.SetTrashed(m.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if restored.Trashed || restored.Archived || restored.TrashedAt != nil {
		t.Errorf("restore left flags set: %+v", restored)
	}
	if got := s.List(ListOptions{View: "active"}); got.Total != 1 || got.Memos[0].ID != m.ID {
		t.Errorf("restored memo not active: %v", ids(got.Memos))
	}
}

func TestTrashSetsTimestampAndUnpins(t *testing.T) {
	s := newTestStore(t)
	m := create(t, s, "pinned then trashed")
	if _, err := s.SetPinned(m.ID, true); err != nil {
		t.Fatal(err)
	}
	tr, err := s.SetTrashed(m.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if !tr.Trashed || tr.TrashedAt == nil {
		t.Errorf("trash did not set Trashed/TrashedAt: %+v", tr)
	}
	if tr.Pinned {
		t.Error("trash did not unpin")
	}
}

func TestPinSortsFirstAndUnarchives(t *testing.T) {
	s := newTestStore(t)
	first := create(t, s, "first")
	create(t, s, "second")

	// Archive it, then pin: pinning must un-archive and return it to active.
	if _, err := s.SetArchived(first.ID, true); err != nil {
		t.Fatal(err)
	}
	pinned, err := s.SetPinned(first.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if pinned.Archived {
		t.Error("pinning did not un-archive")
	}
	res := s.List(ListOptions{})
	if !res.Memos[0].Pinned || res.Memos[0].ID != first.ID {
		t.Errorf("pinned memo should sort first, got %+v", res.Memos[0])
	}
}

func TestArchiveUnpins(t *testing.T) {
	s := newTestStore(t)
	m := create(t, s, "pin me")
	if _, err := s.SetPinned(m.ID, true); err != nil {
		t.Fatal(err)
	}
	arch, err := s.SetArchived(m.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if arch.Pinned {
		t.Error("archiving did not unpin")
	}
}

func TestDuplicateMakesIndependentCopyOnTop(t *testing.T) {
	s := newTestStore(t)
	orig, err := s.Create(NewMemo{Title: "orig", Content: "body", Labels: []string{"l1"}, Color: "mint", Checklist: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetPinned(orig.ID, true); err != nil {
		t.Fatal(err)
	}
	create(t, s, "in between")

	dup, err := s.Duplicate(orig.ID)
	if err != nil {
		t.Fatal(err)
	}
	if dup.ID == orig.ID {
		t.Error("duplicate reused the source ID")
	}
	if dup.Title != "orig" || dup.Content != "body" || dup.Color != "mint" || !dup.Checklist {
		t.Errorf("duplicate did not copy fields: %+v", dup)
	}
	if dup.Pinned || dup.Archived || dup.Trashed || dup.TrashedAt != nil {
		t.Errorf("duplicate should be a plain active note: %+v", dup)
	}
	if dup.Position <= orig.Position {
		t.Errorf("duplicate should sit on top: dup=%v orig=%v", dup.Position, orig.Position)
	}

	// Independent labels slice: mutating the duplicate must not touch the source.
	upd := []string{"changed"}
	if _, err := s.Update(dup.ID, UpdateMemo{Labels: &upd}); err != nil {
		t.Fatal(err)
	}
	got, _ := s.Get(orig.ID)
	if len(got.Labels) != 1 || got.Labels[0] != "l1" {
		t.Errorf("source labels mutated via duplicate: %v", got.Labels)
	}

	// Unpinned duplicate sorts at the very top of the active board.
	top := s.List(ListOptions{}).Memos[0]
	if top.ID != orig.ID { // pinned original still beats unpinned duplicate
		t.Errorf("pinned original should still be first, got %d", top.ID)
	}
}

func TestMoveReorders(t *testing.T) {
	s := newTestStore(t)
	a := create(t, s, "a")
	b := create(t, s, "b")
	c := create(t, s, "c")
	// Visual order now: c, b, a (newest first).

	// Move a to just after c -> c, a, b.
	if _, err := s.Move(a.ID, c.ID); err != nil {
		t.Fatal(err)
	}
	if got := ids(s.List(ListOptions{}).Memos); !equalIDs(got, []int64{c.ID, a.ID, b.ID}) {
		t.Errorf("after move-after: %v, want [c a b]", got)
	}

	// Move b to the very top (afterID = 0) -> b, c, a.
	if _, err := s.Move(b.ID, 0); err != nil {
		t.Fatal(err)
	}
	got := ids(s.List(ListOptions{}).Memos)
	if !equalIDs(got, []int64{b.ID, c.ID, a.ID}) {
		t.Errorf("after move-to-top: %v, want [b c a]", got)
	}

	// The order must survive a fresh List call.
	again := ids(s.List(ListOptions{}).Memos)
	if !equalIDs(again, got) {
		t.Errorf("order not stable across List: %v vs %v", again, got)
	}
}

func TestMoveStaysWithinPinnedGroup(t *testing.T) {
	s := newTestStore(t)
	p1 := create(t, s, "p1")
	create(t, s, "u1")
	p2 := create(t, s, "p2")
	if _, err := s.SetPinned(p1.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetPinned(p2.ID, true); err != nil {
		t.Fatal(err)
	}
	// Move p2 to top of the pinned group; the unpinned note must stay below both.
	if _, err := s.Move(p2.ID, 0); err != nil {
		t.Fatal(err)
	}
	res := s.List(ListOptions{}).Memos
	if !res[0].Pinned || !res[1].Pinned || res[2].Pinned {
		t.Errorf("pinned group not kept on top: %v", ids(res))
	}
	if res[0].ID != p2.ID {
		t.Errorf("p2 should be first pinned, got %d", res[0].ID)
	}
}

func TestLabelsCountExcludeTrashed(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.Create(NewMemo{Title: "a", Labels: []string{"common", "rare"}}); err != nil {
		t.Fatal(err)
	}
	b, err := s.Create(NewMemo{Title: "b", Labels: []string{"common"}})
	if err != nil {
		t.Fatal(err)
	}
	trashed, err := s.Create(NewMemo{Title: "c", Labels: []string{"common", "ghost"}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetTrashed(trashed.ID, true); err != nil {
		t.Fatal(err)
	}
	_ = b

	labels := s.Labels()
	// "ghost" lives only on the trashed memo and must not appear.
	for _, l := range labels {
		if l.Name == "ghost" {
			t.Error("trashed-only label leaked into Labels()")
		}
	}
	if len(labels) != 2 {
		t.Fatalf("labels = %+v, want common+rare", labels)
	}
	if labels[0].Name != "common" || labels[0].Count != 2 {
		t.Errorf("most-used label = %+v, want common/2", labels[0])
	}
}

func TestStats(t *testing.T) {
	s := newTestStore(t)
	create(t, s, "active1")
	create(t, s, "active2")
	arch := create(t, s, "arch")
	trash := create(t, s, "trash")
	if _, err := s.SetArchived(arch.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetTrashed(trash.ID, true); err != nil {
		t.Fatal(err)
	}
	notes, archived, trashed := s.Stats()
	if notes != 2 || archived != 1 || trashed != 1 {
		t.Errorf("stats = %d/%d/%d, want 2/1/1", notes, archived, trashed)
	}
}

func TestEmptyTrash(t *testing.T) {
	s := newTestStore(t)
	keep := create(t, s, "keep")
	t1 := create(t, s, "t1")
	t2 := create(t, s, "t2")
	for _, m := range []*Memo{t1, t2} {
		if _, err := s.SetTrashed(m.ID, true); err != nil {
			t.Fatal(err)
		}
	}
	n, err := s.EmptyTrash()
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("emptied %d, want 2", n)
	}
	if _, err := s.Get(t1.ID); err != ErrNotFound {
		t.Error("trashed memo survived EmptyTrash")
	}
	if _, err := s.Get(keep.ID); err != nil {
		t.Error("EmptyTrash removed a non-trashed memo")
	}
	// Empty again is a no-op returning 0.
	if n, err := s.EmptyTrash(); err != nil || n != 0 {
		t.Errorf("second EmptyTrash = %d, %v; want 0, nil", n, err)
	}
}

func TestPagination(t *testing.T) {
	s := newTestStore(t)
	for i := 0; i < 5; i++ {
		create(t, s, "note")
	}
	if res := s.List(ListOptions{Limit: 2, Offset: 0}); len(res.Memos) != 2 || res.Total != 5 {
		t.Errorf("page 1: got %d items, total %d", len(res.Memos), res.Total)
	}
	if res := s.List(ListOptions{Limit: 2, Offset: 4}); len(res.Memos) != 1 {
		t.Errorf("last page: got %d items, want 1", len(res.Memos))
	}
	if res := s.List(ListOptions{Limit: 2, Offset: 99}); len(res.Memos) != 0 {
		t.Errorf("offset past end: got %d items, want 0", len(res.Memos))
	}
}

func TestListFilters(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.Create(NewMemo{Title: "Apple", Content: "a red fruit", Labels: []string{"fruit"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(NewMemo{Title: "Banana", Labels: []string{"Fruit"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(NewMemo{Title: "Carrot", Labels: []string{"veg"}}); err != nil {
		t.Fatal(err)
	}

	// Label match is case-insensitive ("fruit" == "Fruit").
	if res := s.List(ListOptions{Label: "fruit"}); res.Total != 2 {
		t.Errorf("label filter total = %d, want 2", res.Total)
	}
	// Query searches title + content, case-insensitively.
	if res := s.List(ListOptions{Query: "RED FRUIT"}); res.Total != 1 || res.Memos[0].Title != "Apple" {
		t.Errorf("query over content = %+v", ids(res.Memos))
	}
	if res := s.List(ListOptions{Query: "carr"}); res.Total != 1 || res.Memos[0].Title != "Carrot" {
		t.Errorf("query over title = %+v", ids(res.Memos))
	}
}

func TestCreateAndSetColor(t *testing.T) {
	s := newTestStore(t)
	m, err := s.Create(NewMemo{Content: "a colored note", Color: "mint"})
	if err != nil {
		t.Fatal(err)
	}
	if m.Color != "mint" {
		t.Errorf("create color = %q, want mint", m.Color)
	}
	upd, err := s.SetColor(m.ID, "coral")
	if err != nil {
		t.Fatal(err)
	}
	if upd.Color != "coral" {
		t.Errorf("set color = %q, want coral", upd.Color)
	}
	if _, err := s.SetColor(999, "mint"); err != ErrNotFound {
		t.Errorf("set color on missing: want ErrNotFound, got %v", err)
	}
}

func TestPersistenceAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "jot.json")
	s1, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	m, err := s1.Create(NewMemo{Title: "persist me", Content: "body", Labels: []string{"keep"}, Checklist: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s1.SetPinned(m.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s1.SetColor(m.ID, "sage"); err != nil {
		t.Fatal(err)
	}

	s2, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	res := s2.List(ListOptions{})
	if res.Total != 1 {
		t.Fatalf("not persisted: %+v", res)
	}
	got := res.Memos[0]
	if got.Title != "persist me" || got.Content != "body" || got.Color != "sage" {
		t.Errorf("fields not persisted: %+v", got)
	}
	if !got.Pinned || !got.Checklist {
		t.Errorf("flags not persisted: pinned=%v checklist=%v", got.Pinned, got.Checklist)
	}
	if len(got.Labels) != 1 || got.Labels[0] != "keep" {
		t.Errorf("labels not persisted: %v", got.Labels)
	}
	if got.Position == 0 {
		t.Error("position not persisted")
	}
	if next, _ := s2.Create(NewMemo{Title: "next"}); next.ID != 2 {
		t.Errorf("nextID not restored: got %d, want 2", next.ID)
	}
}

func TestLegacyPositionMigration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "jot.json")
	// A legacy snapshot: memos predate the Position field (it is absent/zero).
	// Created order is 1 (oldest) .. 3 (newest); newest-first must be preserved.
	old := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	snap := `{
  "nextId": 4,
  "memos": [
    {"id": 1, "title": "oldest",  "createdAt": "` + old.Format(time.RFC3339) + `", "updatedAt": "` + old.Format(time.RFC3339) + `"},
    {"id": 2, "title": "middle",  "createdAt": "` + old.Add(time.Hour).Format(time.RFC3339) + `", "updatedAt": "` + old.Add(time.Hour).Format(time.RFC3339) + `"},
    {"id": 3, "title": "newest",  "createdAt": "` + old.Add(2*time.Hour).Format(time.RFC3339) + `", "updatedAt": "` + old.Add(2*time.Hour).Format(time.RFC3339) + `"}
  ]
}`
	if err := os.WriteFile(path, []byte(snap), 0o600); err != nil {
		t.Fatal(err)
	}

	s, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	// Newest-first order preserved, and positions strictly increase with age.
	order := ids(s.List(ListOptions{}).Memos)
	if !equalIDs(order, []int64{3, 2, 1}) {
		t.Errorf("migrated order = %v, want [3 2 1] (newest first)", order)
	}
	p1, _ := s.Get(1)
	p2, _ := s.Get(2)
	p3, _ := s.Get(3)
	if !(p1.Position < p2.Position && p2.Position < p3.Position) {
		t.Errorf("positions not ascending with age: %v %v %v", p1.Position, p2.Position, p3.Position)
	}
	if p1.Position == 0 {
		t.Error("oldest memo still has zero position after migration")
	}
}

// ---- small test helpers ----

func ids(ms []*Memo) []int64 {
	out := make([]int64, len(ms))
	for i, m := range ms {
		out[i] = m.ID
	}
	return out
}

func equalIDs(a, b []int64) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
