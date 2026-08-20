package media

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var errUnsupportedThumb = errors.New("thumbnail not supported for this file type")

// Thumb returns a downscaled JPEG of the image at userPath (webp is the only
// common image format the stdlib decoder can't handle). Results are cached on
// disk in the service's thumb dir, keyed by content hash + modtime + size, so
// a changed file automatically produces a fresh thumbnail.
func (s *Service) Thumb(userPath string, maxDim int) ([]byte, error) {
	abs, err := s.resolve(userPath)
	if err != nil {
		return nil, err
	}
	if strings.EqualFold(filepath.Ext(abs), ".webp") {
		return nil, errUnsupportedThumb
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, err
	}

	cachePath := s.thumbCachePath(abs, info, maxDim)
	if b, err := os.ReadFile(cachePath); err == nil {
		return b, nil
	}

	src, err := decodeImage(abs)
	if err != nil {
		return nil, err
	}
	thumb := downscale(src, maxDim)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, thumb, &jpeg.Options{Quality: 82}); err != nil {
		return nil, err
	}
	_ = os.MkdirAll(filepath.Dir(cachePath), 0o755)
	_ = os.WriteFile(cachePath, buf.Bytes(), 0o644)
	return buf.Bytes(), nil
}

func decodeImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	return img, err
}

func downscale(src image.Image, maxDim int) image.Image {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxDim && h <= maxDim {
		return src
	}
	scale := float64(maxDim) / float64(max(w, h))
	dw, dh := int(float64(w)*scale), int(float64(h)*scale)
	if dw < 1 {
		dw = 1
	}
	if dh < 1 {
		dh = 1
	}
	// Nearest-neighbor downscale. For grid thumbnails this is good enough and
	// avoids the golang.org/x/image dependency (its bilinear Scaler would be
	// nicer, but not worth a new module for a 256px grid cell).
	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < dh; y++ {
		sy := (y*dh + dh/2) / dh
		sy = b.Min.Y + (sy * h / dh)
		for x := 0; x < dw; x++ {
			sx := (x*dw + dw/2) / dw
			sx = b.Min.X + (sx * w / dw)
			dst.Set(x, y, src.At(sx, sy))
		}
	}
	return dst
}

// thumbCachePath derives the on-disk cache file from the source path, modtime
// and size - any change to the file changes the key, so stale thumbs can't be
// served. Hash path so the filename stays safe even if it contains slashes.
func (s *Service) thumbCachePath(abs string, info os.FileInfo, maxDim int) string {
	h := sha256.New()
	io.WriteString(h, abs)
	io.WriteString(h, "|"+strconv.FormatInt(info.ModTime().UnixNano(), 10))
	io.WriteString(h, "|"+strconv.FormatInt(info.Size(), 10))
	io.WriteString(h, "|"+strconv.Itoa(maxDim))
	return filepath.Join(s.thumbDir, hex.EncodeToString(h.Sum(nil))+".jpg")
}
