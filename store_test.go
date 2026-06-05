package main

import (
	"path/filepath"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(filepath.Join(t.TempDir(), "jot.json"))
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	return s
}

func TestCreateExtractsTags(t *testing.T) {
	s := newTestStore(t)
	m, err := s.Create("Hello #World and #Go/lang, visit https://example.com#frag")
	if err != nil {
		t.Fatal(err)
	}
	if m.ID != 1 {
		t.Errorf("want id 1, got %d", m.ID)
	}
	want := []string{"go/lang", "world"} // lower-cased, sorted, no URL fragment
	if len(m.Tags) != len(want) {
		t.Fatalf("tags = %v, want %v", m.Tags, want)
	}
	for i := range want {
		if m.Tags[i] != want[i] {
			t.Errorf("tag[%d] = %q, want %q", i, m.Tags[i], want[i])
		}
	}
}

func TestCreateRejectsEmpty(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.Create("   \n\t "); err == nil {
		t.Error("expected error for blank content")
	}
}

func TestUpdate(t *testing.T) {
	s := newTestStore(t)
	m, _ := s.Create("first #a")
	upd, err := s.Update(m.ID, "second #b #c")
	if err != nil {
		t.Fatal(err)
	}
	if upd.Content != "second #b #c" {
		t.Errorf("content = %q", upd.Content)
	}
	if len(upd.Tags) != 2 {
		t.Errorf("tags = %v", upd.Tags)
	}
	if upd.UpdatedAt.Before(upd.CreatedAt) {
		t.Error("updatedAt is before createdAt")
	}
	if _, err := s.Update(999, "nope"); err != ErrNotFound {
		t.Errorf("update missing: want ErrNotFound, got %v", err)
	}
}

func TestDelete(t *testing.T) {
	s := newTestStore(t)
	m, _ := s.Create("bye")
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

func TestListFilterAndSort(t *testing.T) {
	s := newTestStore(t)
	s.Create("apple #fruit")
	s.Create("banana #fruit")
	s.Create("carrot #veg")

	if res := s.List(ListOptions{Tag: "fruit"}); res.Total != 2 {
		t.Errorf("tag filter total = %d, want 2", res.Total)
	}
	if res := s.List(ListOptions{Query: "CARR"}); res.Total != 1 || res.Memos[0].Content != "carrot #veg" {
		t.Errorf("query filter = %+v", res)
	}
	if all := s.List(ListOptions{}); all.Memos[0].Content != "carrot #veg" {
		t.Errorf("expected newest first, got %q", all.Memos[0].Content)
	}
}

func TestPinSortsFirst(t *testing.T) {
	s := newTestStore(t)
	first, _ := s.Create("first")
	s.Create("second")
	if _, err := s.SetPinned(first.ID, true); err != nil {
		t.Fatal(err)
	}
	res := s.List(ListOptions{})
	if !res.Memos[0].Pinned || res.Memos[0].ID != first.ID {
		t.Errorf("pinned memo should sort first, got %+v", res.Memos[0])
	}
}

func TestPagination(t *testing.T) {
	s := newTestStore(t)
	for i := 0; i < 5; i++ {
		s.Create("note")
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

func TestTagsCount(t *testing.T) {
	s := newTestStore(t)
	s.Create("a #common #rare")
	s.Create("b #common")
	tags := s.Tags()
	if len(tags) != 2 {
		t.Fatalf("tags = %+v", tags)
	}
	if tags[0].Name != "common" || tags[0].Count != 2 {
		t.Errorf("most-used tag = %+v, want common/2", tags[0])
	}
}

func TestPersistenceAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "jot.json")
	s1, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	s1.Create("persist me #x")

	s2, err := NewStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if res := s2.List(ListOptions{}); res.Total != 1 || res.Memos[0].Content != "persist me #x" {
		t.Errorf("not persisted: %+v", res)
	}
	if m, _ := s2.Create("next"); m.ID != 2 {
		t.Errorf("nextID not restored: got %d, want 2", m.ID)
	}
}
