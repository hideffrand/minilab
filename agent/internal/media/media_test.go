package media

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"
)

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
	n, _ := strconv.ParseInt(string(b), 10, 64)
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

func writeJPEG(t *testing.T, path string, w, h int) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{uint8(x % 255), uint8(y % 255), 128, 255})
		}
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := jpeg.Encode(f, img, nil); err != nil {
		t.Fatal(err)
	}
}

func TestListFiltersMediaAndSortsNewestFirst(t *testing.T) {
	dir := t.TempDir()
	svc := NewService(dir, newFake(), t.TempDir())
	ctx := context.Background()

	writeJPEG(t, filepath.Join(dir, "a.jpg"), 100, 100)
	if err := os.WriteFile(filepath.Join(dir, "b.txt"), []byte("nope"), 0o644); err != nil {
		t.Fatal(err)
	}
	writeJPEG(t, filepath.Join(dir, "sub", "c.png"), 50, 50)
	// Stale timestamps so ordering is deterministic: c newest, a oldest.
	old := time.Now().Add(-24 * time.Hour)
	os.Chtimes(filepath.Join(dir, "a.jpg"), old, old)
	mid := time.Now().Add(-1 * time.Hour)
	os.Chtimes(filepath.Join(dir, "sub", "c.png"), mid, mid)

	items, err := svc.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 media items, got %+v", items)
	}
	if items[0].Name != "c.png" || items[1].Name != "a.jpg" {
		t.Fatalf("expected newest-first order, got %+v", items)
	}
}

func TestThumbDownscalesAndCaches(t *testing.T) {
	dir := t.TempDir()
	thumbDir := t.TempDir()
	svc := NewService(dir, newFake(), thumbDir)
	ctx := context.Background()

	writeJPEG(t, filepath.Join(dir, "big.jpg"), 400, 200)
	_, _ = svc.List(ctx) // prime the cache path

	b, err := svc.Thumb("big.jpg", 256)
	if err != nil {
		t.Fatal(err)
	}
	img, _, err := image.Decode(bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if got := img.Bounds().Dx(); got != 256 {
		t.Fatalf("expected 256px wide thumb, got %d", got)
	}
	if got := img.Bounds().Dy(); got != 128 {
		t.Fatalf("expected 128px tall thumb, got %d", got)
	}

	// Second call must be served from the on-disk cache (same bytes).
	b2, err := svc.Thumb("big.jpg", 256)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(b, b2) {
		t.Fatal("expected identical cached thumbnail")
	}
}

func TestDeleteRefusesRoot(t *testing.T) {
	dir := t.TempDir()
	svc := NewService(dir, newFake(), t.TempDir())
	if err := svc.Delete(context.Background(), []string{""}); err == nil {
		t.Fatal("expected error when deleting the root")
	}
	if _, err := os.Stat(dir); err != nil {
		t.Fatalf("root was deleted: %v", err)
	}
}
