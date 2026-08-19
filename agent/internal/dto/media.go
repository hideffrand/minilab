package dto

import "time"

// MediaItem is one image or video found in the media library.
type MediaItem struct {
	Path    string    `json:"path"` // root-relative, forward-slashed
	Name    string    `json:"name"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
	Kind    string    `json:"kind"` // "image" | "video"
}

// MediaDeleteRequest is the body for deleting one or more library entries.
type MediaDeleteRequest struct {
	Paths []string `json:"paths"`
}
