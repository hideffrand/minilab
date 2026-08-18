package files

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"mooni-backend/internal/cache"
)

// fakeCache mirrors the Redis semantics the service relies on: values stored
// as bytes, INCR returns the new value and persists it.
type fakeCache struct {
	m   map[string][]byte
	inc map[string]int64
}

func newFake() *fakeCache {
	return &fakeCache{m: map[string][]byte{}, inc: map[string]int64{}}
}

func (f *fakeCache) Get(_ context.Context, key string) ([]byte, bool) {
	b, ok := f.m[key]
	return b, ok
}

func (f *fakeCache) GetInt64(_ context.Context, key string) int64 {
	b, ok := f.m[key]
	if !ok {
		return 0
	}
	n, err := strconv.ParseInt(string(b), 10, 64)
	if err != nil {
		return 0
	}
	return n
}

func (f *fakeCache) Set(_ context.Context, key string, value []byte, _ time.Duration) {
	f.m[key] = append([]byte(nil), value...)
}

func (f *fakeCache) Incr(_ context.Context, key string) int64 {
	n := f.inc[key] + 1
	f.inc[key] = n
	f.m[key] = []byte(strconv.FormatInt(n, 10))
	return n
}

func TestListServedFromCacheUntilMutation(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	fc := newFake()
	svc := NewService(dir, fc)
	ctx := context.Background()

	first, err := svc.List(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != 1 || first[0].Name != "a.txt" {
		t.Fatalf("unexpected listing: %+v", first)
	}

	// An out-of-band change is not visible yet: the second read is cached.
	if err := os.WriteFile(filepath.Join(dir, "b.txt"), []byte("y"), 0o644); err != nil {
		t.Fatal(err)
	}
	cached, err := svc.List(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(cached) != 1 {
		t.Fatalf("expected cache hit (1 entry), got %+v", cached)
	}

	// An API mutation bumps the version key, invalidating every listing, so
	// the fresh read also surfaces the earlier out-of-band b.txt.
	if err := svc.Mkdir(ctx, "sub"); err != nil {
		t.Fatal(err)
	}
	fresh, err := svc.List(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(fresh) != 3 {
		t.Fatalf("expected fresh listing (3 entries), got %+v", fresh)
	}
}

func TestListWorksWithoutCache(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	svc := NewService(dir, cache.New("", ""))
	ctx := context.Background()

	entries, err := svc.List(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %+v", entries)
	}
}
