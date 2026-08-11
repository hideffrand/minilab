package config

import (
	"fmt"
	"os"
	"path/filepath"
)

// Config holds runtime configuration loaded from environment variables.
type Config struct {
	// RootDir is the ONLY directory tree the API is allowed to touch.
	// All file operations are sandboxed inside this path.
	RootDir string
	// APIKey must be sent by clients in the "X-API-Key" header.
	APIKey string
	// Port the HTTP server listens on.
	Port string
	// MaxUploadBytes limits the size of a single upload (default 2GB).
	MaxUploadBytes int64
}

func Load() (*Config, error) {
	root := os.Getenv("MOONI_ROOT_DIR")
	if root == "" {
		return nil, fmt.Errorf("MOONI_ROOT_DIR is required (the folder this API is allowed to manage)")
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("invalid MOONI_ROOT_DIR: %w", err)
	}
	info, err := os.Stat(absRoot)
	if err != nil {
		return nil, fmt.Errorf("MOONI_ROOT_DIR does not exist: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("MOONI_ROOT_DIR is not a directory: %s", absRoot)
	}
	// Resolve symlinks on the root itself so all sandbox comparisons inside
	// fsutil operate on the same canonical path.
	resolvedRoot, err := filepath.EvalSymlinks(absRoot)
	if err != nil {
		return nil, fmt.Errorf("resolving MOONI_ROOT_DIR: %w", err)
	}

	apiKey := os.Getenv("MOONI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("MOONI_API_KEY is required (used to authenticate the mobile app)")
	}

	port := os.Getenv("MOONI_PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		RootDir:        resolvedRoot,
		APIKey:         apiKey,
		Port:           port,
		MaxUploadBytes: 2 << 30, // 2 GiB
	}, nil
}
