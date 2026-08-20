package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"mooni-backend/internal/auth"
	"mooni-backend/internal/cache"
	"mooni-backend/internal/config"
	"mooni-backend/internal/dto"
	"mooni-backend/internal/files"
	"mooni-backend/internal/media"
	"mooni-backend/internal/pairing"
	"mooni-backend/internal/system"
)

func main() {
	pairFlag := flag.Bool("pair", false, "print a pairing code for the mobile app and exit (no server started)")
	nameFlag := flag.String("name", "", "device name to embed in the pairing code (default: hostname)")
	hostFlag := flag.String("host", "", "override the host/IP embedded in the pairing code (default: auto-detect Tailscale IP)")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	if *pairFlag {
		runPair(cfg, *nameFlag, *hostFlag)
		return
	}

	// Optional Redis-backed response cache. If Redis is unreachable at startup
	// (or not configured at all) the server runs uncached, as before.
	c := cache.New(cfg.RedisAddr, cfg.RedisPassword)
	if c.Enabled() {
		if err := c.Ping(context.Background()); err != nil {
			log.Printf("redis unreachable (%v) - running without cache", err)
			c.Close()
			c = cache.New("", "")
		} else {
			log.Printf("redis cache enabled (%s)", cfg.RedisAddr)
		}
	}

	// File routes live on their own mux, wrapped with the API key check.
	fileMux := http.NewServeMux()
	svc := files.NewService(cfg.RootDir, c)
	fileHandler := files.NewHandler(svc, cfg.MaxUploadBytes)
	fileHandler.Register(fileMux)
	protectedFiles := auth.RequireAPIKey(cfg.APIKey, fileMux)

	// System stats are sensitive (they read the host), so they get the same
	// API key check, on their own /api/system/ mux.
	systemMux := http.NewServeMux()
	sysHandler := system.NewHandler(cfg.RootDir, c)
	sysHandler.Register(systemMux)
	protectedSystem := auth.RequireAPIKey(cfg.APIKey, systemMux)

	// Outer mux: health check stays public so the app (and you, with curl)
	// can verify the server is reachable without a key; everything under
	// /api/files/, /api/media/ and /api/system/ requires the key.
	outer := http.NewServeMux()
	outer.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	outer.Handle("/api/files/", protectedFiles)
	if cfg.MediaDir != "" {
		// Media library (Photos-style) is optional: only exposed when the user
		// points MOONI_MEDIA_DIR at a dedicated directory. Same auth wrapper -
		// media endpoints read files off the host like the file ones.
		mediaMux := http.NewServeMux()
		mediaHandler := media.NewHandler(
			media.NewService(cfg.MediaDir, c, thumbDir()),
			cfg.MaxUploadBytes,
		)
		mediaHandler.Register(mediaMux)
		outer.Handle("/api/media/", auth.RequireAPIKey(cfg.APIKey, mediaMux))
		log.Printf("media library enabled (%s)", cfg.MediaDir)
	}
	outer.Handle("/api/system/", protectedSystem)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           logRequests(outer),
		ReadHeaderTimeout: 30 * time.Second,
		// No body ReadTimeout: a 2 GiB upload over a slow link takes minutes.
		WriteTimeout: 0, // large downloads/streaming can take a while
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("mooni backend")
	log.Printf("  root dir : %s", cfg.RootDir)
	log.Printf("  listening: :%s", cfg.Port)
	log.Fatal(srv.ListenAndServe())
}

// runPair prints a pairing code that the mobile app's "Paste Code" screen
// can decode directly, so the person setting up a new phone/tablet never
// has to type an IP address or API key by hand.
func runPair(cfg *config.Config, name, hostOverride string) {
	if name == "" {
		if h, err := os.Hostname(); err == nil {
			name = h
		} else {
			name = "Mooni"
		}
	}

	host := hostOverride
	if host == "" {
		ip, err := pairing.TailscaleIPv4()
		if err != nil {
			ip, err = pairing.LANIPv4()
		}
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not detect a reachable IP (%v).\n", err)
			fmt.Fprintf(os.Stderr, "Printing a code for 127.0.0.1 (won't work from a phone) - re-run with -host <ip-or-hostname>, e.g.:\n")
			fmt.Fprintf(os.Stderr, "  ./mooni-backend -pair -host 100.x.x.x\n")
			host = "127.0.0.1"
		} else {
			host = ip
		}
	}

	baseURL := fmt.Sprintf("http://%s:%s", host, cfg.Port)
	code := pairing.Encode(dto.PairingPayload{
		Name:    name,
		BaseURL: baseURL,
		APIKey:  cfg.APIKey,
	})

	qr, err := pairing.TerminalQR(code)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: could not render QR code (%v). Falling back to text code only.\n", err)
	}

	fmt.Println()
	if qr != "" {
		fmt.Println("Scan this QR from the app (Add Device > Scan QR):")
		fmt.Println()
		fmt.Println(qr)
	}
	fmt.Println("Or paste manually (Add Device > Paste Code):")
	fmt.Println()
	fmt.Println(code)
	fmt.Println()
	fmt.Printf("(device: %q, server: %s)\n", name, baseURL)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// thumbDir returns where generated media thumbnails are cached on disk.
// Outside MOONI_MEDIA_DIR so the library index never sees them; ~/.mooni/
// matches where install.sh keeps config (mode 700).
func thumbDir() string {
	if home, err := os.UserHomeDir(); err == nil {
		return filepath.Join(home, ".mooni", "thumbs")
	}
	return filepath.Join(os.TempDir(), "mooni-thumbs")
}
