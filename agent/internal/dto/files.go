package dto

import "time"

// FileEntry is one file or directory in a listing.
type FileEntry struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"` // root-relative, forward-slashed
	IsDir   bool      `json:"isDir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
	Mode    string    `json:"mode"`
}

// PathRequest is the body for operations that take a single path (mkdir, delete).
type PathRequest struct {
	Path string `json:"path"`
}

// SrcDstRequest is the body for copy/move (source + destination).
type SrcDstRequest struct {
	Src string `json:"src"`
	Dst string `json:"dst"`
}

// RenameRequest is the body for rename (old + new path).
type RenameRequest struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}
