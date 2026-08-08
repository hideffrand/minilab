package files

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"syscall"
	"time"

	"minilab-backend/internal/fsutil"
)

type Entry struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"` // root-relative, forward-slashed
	IsDir   bool      `json:"isDir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
	Mode    string    `json:"mode"`
}

type Service struct {
	Root string
}

func NewService(root string) *Service {
	return &Service{Root: root}
}

// resolve is a thin wrapper so handlers don't import fsutil directly.
func (s *Service) resolve(userPath string) (string, error) {
	return fsutil.Resolve(s.Root, userPath)
}

func (s *Service) List(userPath string) ([]Entry, error) {
	dir, err := s.resolve(userPath)
	if err != nil {
		return nil, err
	}
	items, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := make([]Entry, 0, len(items))
	for _, it := range items {
		info, err := it.Info()
		if err != nil {
			continue // skip unreadable entries (broken symlinks etc.)
		}
		abs := filepath.Join(dir, it.Name())
		out = append(out, Entry{
			Name:    it.Name(),
			Path:    fsutil.ToRelative(s.Root, abs),
			IsDir:   it.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
			Mode:    info.Mode().String(),
		})
	}
	return out, nil
}

func (s *Service) Stat(userPath string) (Entry, string, error) {
	abs, err := s.resolve(userPath)
	if err != nil {
		return Entry{}, "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return Entry{}, "", err
	}
	return Entry{
		Name:    info.Name(),
		Path:    fsutil.ToRelative(s.Root, abs),
		IsDir:   info.IsDir(),
		Size:    info.Size(),
		ModTime: info.ModTime(),
		Mode:    info.Mode().String(),
	}, abs, nil
}

func (s *Service) Mkdir(userPath string) error {
	abs, err := s.resolve(userPath)
	if err != nil {
		return err
	}
	return os.MkdirAll(abs, 0o755)
}

func (s *Service) Rename(oldPath, newPath string) error {
	oldAbs, err := s.resolve(oldPath)
	if err != nil {
		return err
	}
	newAbs, err := s.resolve(newPath)
	if err != nil {
		return err
	}
	if _, err := os.Stat(newAbs); err == nil {
		return fmt.Errorf("destination already exists")
	}
	return os.Rename(oldAbs, newAbs)
}

func (s *Service) Move(src, dst string) error {
	// Move is just rename when possible; fall back to copy+delete only when
	// the files are on different filesystems (os.Rename → EXDEV). Refuse to
	// clobber an existing destination, matching Rename.
	srcAbs, err := s.resolve(src)
	if err != nil {
		return err
	}
	dstAbs, err := s.resolve(dst)
	if err != nil {
		return err
	}
	if _, err := os.Stat(dstAbs); err == nil {
		return fmt.Errorf("destination already exists")
	}
	if err := os.Rename(srcAbs, dstAbs); err == nil {
		return nil
	} else if !errors.Is(err, syscall.EXDEV) {
		return err
	}
	if err := s.Copy(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(srcAbs)
}

func (s *Service) Copy(src, dst string) error {
	srcAbs, err := s.resolve(src)
	if err != nil {
		return err
	}
	dstAbs, err := s.resolve(dst)
	if err != nil {
		return err
	}
	info, err := os.Stat(srcAbs)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return copyDir(srcAbs, dstAbs)
	}
	return copyFile(srcAbs, dstAbs, info.Mode())
}

func (s *Service) Delete(userPath string) error {
	abs, err := s.resolve(userPath)
	if err != nil {
		return err
	}
	if abs == s.Root {
		return fmt.Errorf("refusing to delete the root directory")
	}
	return os.RemoveAll(abs)
}

func copyFile(src, dst string, mode os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func copyDir(src, dst string) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		return err
	}
	for _, e := range entries {
		srcPath := filepath.Join(src, e.Name())
		dstPath := filepath.Join(dst, e.Name())
		if e.IsDir() {
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
			continue
		}
		info, err := e.Info()
		if err != nil {
			return err
		}
		if err := copyFile(srcPath, dstPath, info.Mode()); err != nil {
			return err
		}
	}
	return nil
}
