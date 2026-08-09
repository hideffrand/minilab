# AGENTS.md

Monorepo-lite of two **independent** projects, tracked by one root git repo (no CI, no tests anywhere):

- `mobile/` — Expo (SDK 51) + React Native 0.74 + TypeScript mobile app.
- `agent/` — Go 1.22+ HTTP API. Only external dep: `go-qrcode` (used solely for the terminal QR in `-pair` mode).

## Verify / build

Backend (no env vars needed for build/vet):
```bash
cd agent && go vet ./... && go build -o minilab-backend .
```

App — no lint/test scripts exist. Only verification is the typecheck:
```bash
cd mobile && npm install && npx tsc --noEmit
```
Dev server: `npx expo start` (Expo Go). No `package-lock.json` is committed; `node_modules` not installed by default.

## Backend runtime (gotcha)

Server **refuses to start** without env: `MINILAB_ROOT_DIR` and `MINILAB_API_KEY` are required; `MINILAB_PORT` optional (default 8080).
- One-shot setup + pairing: `./install.sh` (installs Go if missing, generates key, writes `~/.minilab/config.env` mode 600, optional systemd service, prints QR/pairing code).
- Uninstall: `./uninstall.sh` (stops/removes the systemd service, removes the binary and `~/.minilab` config; lists the paired storage folder and only deletes it if the user picks that option AND types `DELETE` — never automatically).
- Quick rerun after setup: `source ~/.minilab/config.env && go run .`
- Regenerate pairing code any time: `./minilab-backend -pair -name "..."` (auto-detects Tailscale IP via `tailscale ip -4`).

Go 1.22 method-routing patterns are used (`mux.HandleFunc("GET /api/files/list", ...)`) — won't compile on older Go.

## Cross-repo contract: pairing code (MUST stay in sync)

`MINILAB1:<base64(JSON{name,baseUrl,apiKey})>` encoded in two places:
- app: `src/utils/pairingCode.ts`
- backend: `internal/pairing/pairing.go`

Change the format in one → change the other. App code uses global `btoa`/`atob` (RN 0.74+ Hermes) — do NOT reintroduce a `Buffer` fallback (not a global in RN).

## Security invariants (don't weaken)

- All `/api/files/*` require header `X-API-Key` (constant-time compare, `internal/auth/middleware.go`). `GET /api/health` is public. `GET /api/system/stats` (the system health snapshot, reads `/proc` + sysfs in `internal/system`) also requires the key — new `/api/system/*` endpoints must go through the same auth wrapper.
- Every user path is sandboxed to `MINILAB_ROOT_DIR` via `internal/fsutil/path.go` `Resolve()` — blocks `..`, absolute paths, AND symlinks pointing outside root (existing-path symlinks are resolved and re-checked). Upload filenames go through `filepath.Base`. Keep this boundary intact; new endpoints must go through `Resolve`.
- App stores device API keys in `expo-secure-store`, NOT AsyncStorage (`DevicesContext` writes them per-device under `minilab.apikey.<id>`). The AsyncStorage device list is keyless; `DevicesContext` migrates any legacy inline key on load.
- `/api/files/preview` streams via `http.ServeContent` (HTTP Range support enables video scrubbing) — don't replace with a plain file handler.
- Max upload 2 GiB (`MaxUploadBytes`). Backend serves at most `MINILAB_ROOT_DIR`; a pairing code contains the API key and must be treated like a password. `install.sh` keeps `~/.minilab/` at 700 and `last-pairing-code.txt` at 600.

## Conventions

- All paths are root-relative, forward-slashed (see `fsutil.ToRelative` and app `src/types/index.ts` `FileEntry`).
- UI text, error messages, READMEs, and install.sh prompts are in English — keep new user-facing strings English.
- App architecture: `src/api` (axios client + file ops), `src/context/DevicesContext.tsx` (persisted devices via AsyncStorage, API keys via SecureStore), `src/navigation/RootNavigator.tsx` (stack: DeviceList → AddDevice / FileBrowser → FilePreview, plus ScanQR), `src/screens/`, `src/screens/components/` (`PromptModal`, `ActionSheet`).
- App is **Android-first** — don't add iOS-only APIs (no `ActionSheetIOS`, no iOS-only styling). Long-press menus use the custom `ActionSheet` component because Android's `Alert` caps at 3 buttons.
- App downloads/uploads stream via `expo-file-system` (`downloadAsync`/`uploadAsync`), not axios, for large files.
- Roadmap items in the READMEs (power control, docker manager, fingerprint confirm tokens) are **not implemented** — don't assume they exist.
