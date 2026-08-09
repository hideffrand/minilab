# Minilab Backend — API

Go backend with **one external dependency** (`github.com/skip2/go-qrcode`,
used only to render the pairing QR code in the terminal — everything else is
the standard library). Because it's a single small dependency, `go build` on
your laptop stays as simple as usual (Go downloads it once and caches it
locally, as long as there's internet during the first build).

## Quick Setup (one script does everything)

```bash
cd agent
./install.sh
```

This script automatically:
- Install Go via `apt` if it's missing (asks for permission first)
- Generates a random API key
- Asks which folder the app is allowed to manage — it suggests common folders
  it found on your system (Documents, Downloads, Pictures, …) as numbered
  options, or you can type any custom path
- Builds the binary
- Detects the IP (Tailscale first, otherwise the LAN IP automatically)
- Optionally installs it as a systemd service (auto-start on boot)
- Optionally grants **passwordless sudo for just `systemctl reboot` and
  `systemctl poweroff`** so the app's Reboot/Shutdown buttons work — a scoped
  rule in `/etc/sudoers.d/minilab-power` (validated with `visudo -cf`), nothing
  else gets sudo
- **Prints the QR code + pairing code text** in the terminal

Configuration is stored at `~/.minilab/config.env` (mode 600), and the last
pairing code at `~/.minilab/last-pairing-code.txt` (mode 600) — neither can be
read by other users.

## Pairing — two ways, both from one command

```
Scan this QR from the app (Add Device > Scan QR):

█████████████████████████████████████████████████
████ ▄▄▄▄▄ █▄ ▄▄██  ▄▄█▀▀▄▄█▄▄▄ █▄█▀ █ ▄▄▄▄▄ ████
...

Or paste manually (Add Device > Paste Code):

MINILAB1:eyJuYW1lIjoiTGFwdG9wIFRlc3QiLCJiYXNlVXJsIjoi...
```

1. **Scan QR** — open the app → **Add Device** → **Scan QR Code** → point
   your camera at the QR shown in the terminal. Fastest, and ideal for people
   who don't want to type or paste anything.
2. **Paste manually** — if the camera struggles to read the terminal screen
   (reflections, small resolution, etc.), the `MINILAB1:...` text below the QR
   can be copied and pasted straight into the "Paste Code" mode.

Both contain the exact same payload (device name, server URL, API key) —
validated with a real QR decoder, not just "looks like a QR".

The QR **is always printed**, even when Tailscale isn't installed: the backend
automatically falls back to the LAN IP, or to `127.0.0.1` with a warning to
re-run with `-host` if no IP could be detected at all.

Want to give access to another phone (e.g. family)? Regenerate anytime without
re-running the setup:

```bash
source ~/.minilab/config.env && ./minilab-backend -pair -name "Family Phone"
```

## API Features

- `GET  /api/health` — check the server is alive (no API key needed)
- `GET  /api/files/list?path=...` — list folder contents
- `GET  /api/files/download?path=...` — download a file
- `GET  /api/files/preview?path=...` — stream a file (HTTP Range support → enables video scrubbing)
- `POST /api/files/upload` — multipart upload (`file`, `path` = destination folder)
- `POST /api/files/mkdir` — `{"path": "folder/new"}`
- `POST /api/files/rename` — `{"oldPath": "...", "newPath": "..."}`
- `POST /api/files/copy` — `{"src": "...", "dst": "..."}`
- `POST /api/files/move` — `{"src": "...", "dst": "..."}`
- `DELETE /api/files/delete` — `{"path": "..."}`
- `GET  /api/system/stats` — system health snapshot: CPU %, memory, disk, load
  average, uptime, process count, and CPU temperature (read straight from
  `/proc` and sysfs, no external dependency)
- `POST /api/system/reboot` — restart the machine. Requires the passwordless
  sudo rule from `install.sh` (or a local console session for `loginctl`).
- `POST /api/system/shutdown` — power the machine off. Same requirement as
  reboot.

All paths are **relative to `MINILAB_ROOT_DIR`** and sanitized so they can
never escape that folder (protection against path traversal `../`, absolute
paths, and symlinks pointing outside the root). Uploads are capped at 2 GiB
per file, and large uploads are not cut off by a timeout (request bodies are
read without a deadline).

`rename` and `move` refuse to overwrite an existing destination file.

All `/api/files/*` and `/api/system/*` endpoints require the header
`X-API-Key: <your api key>`.

## Manual Setup (if you don't want to use install.sh)

Needs Go 1.22+. If you don't have it on Mint: `sudo apt install golang-go`

```bash
cd agent
go build -o minilab-backend .   # Go downloads go-qrcode once (needs internet)

export MINILAB_ROOT_DIR=/home/you/minilab-storage
export MINILAB_API_KEY=$(openssl rand -hex 24)
export MINILAB_PORT=8080

./minilab-backend
```

Generate a pairing code + QR manually:

```bash
./minilab-backend -pair -name "My Laptop" -host $(tailscale ip -4)
```

(The `-host` flag is optional — if omitted, the backend tries to auto-detect
via `tailscale ip -4`, then falls back to the LAN IP, then to `127.0.0.1`.)

## Access via Tailscale from your phone

1. Make sure Tailscale is running on both the laptop and phone, logged into
   the same tailnet.
2. Run `install.sh` (or `-pair` manually) to get the QR / pairing code.
3. Scan the QR in the app, or paste the text code.

Because it goes through Tailscale (an encrypted peer-to-peer VPN), you **don't
need** to open any ports on your router/public firewall.

## Run automatically at boot

`install.sh` can set this up for you (answer "y" when asked). To do it
manually, create `/etc/systemd/system/minilab-backend.service`:

```ini
[Unit]
Description=Minilab Backend
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=you
EnvironmentFile=/home/you/.minilab/config.env
ExecStart=/home/you/agent/minilab-backend
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minilab-backend
sudo systemctl status minilab-backend
```

## Uninstall

Quick way — run the companion script from the `agent/` folder:

```bash
cd agent
./uninstall.sh
```

It removes, in order:
1. **systemd service** — stops, disables, and deletes
   `/etc/systemd/system/minilab-backend.service` (skipped if never installed).
2. **Power-control sudoers rule** — removes `/etc/sudoers.d/minilab-power`
   (the passwordless-sudo rule that powered the Reboot/Shutdown buttons).
3. **Built binary** — `agent/minilab-backend`.
4. **Config folder** `~/.minilab/` — API key + saved pairing codes (this is
   what un-pairs the phones).

**Your files are untouched by default.** The script lists the paired storage
folder and asks, by number, whether to keep the files or delete them too:

```
Paired folders:
  [1] /home/you/minilab-storage
What should uninstall do with the files in it?
  1) Keep all files — just uninstall (recommended)
  2) Uninstall AND permanently delete all files in [1]
```

If you pick option 2, it still asks you to type **DELETE** before anything is
removed — an accidental Enter can never wipe your files.

Existing pairing codes on phones stop working once the service is stopped and
the API key is deleted. Go itself is left installed (it's a general tool);
remove it manually if you want: `sudo apt remove golang-go`.

### Manual uninstall

Equivalent steps by hand:

```bash
sudo systemctl stop minilab-backend 2>/dev/null || true
sudo systemctl disable minilab-backend 2>/dev/null || true
sudo rm -f /etc/systemd/system/minilab-backend.service
sudo systemctl daemon-reload
sudo rm -f /etc/sudoers.d/minilab-power
rm -f /home/you/agent/minilab-backend
rm -rf ~/.minilab            # config + API key + saved pairing codes
# Your files under MINILAB_ROOT_DIR are untouched — delete them only if you
# deliberately want them gone:
# rm -rf /home/you/minilab-storage
```

## Security notes

- Store `MINILAB_API_KEY` (and the pairing code/QR, since it contains the API
  key) safely — anyone with it can read/write/delete all files inside
  `MINILAB_ROOT_DIR`, and, if power control is enabled, reboot or shut down
  the machine. `install.sh` stores it at `~/.minilab/config.env` with
  permission `600` (and the `~/.minilab` folder itself is `700`). Don't
  screenshot the QR/code in the terminal and save it carelessly either.
- All file endpoints are sandboxed to `MINILAB_ROOT_DIR`: path traversal
  (`../`, absolute paths) and **symlinks pointing outside the root** are
  rejected — you can't access files outside that folder even with a
  manipulated path.
- Filesystem errors (e.g. messages containing local paths) are not leaked to
  the client — the client only gets a generic message.
- The app guards Reboot/Shutdown with a **type-to-confirm modal** (a random
  token must be typed before the request is sent). That's a UI guard against
  accidental taps, not a security boundary — anyone holding the API key can
  still call `POST /api/system/reboot` directly.
- This version uses a simple API key in the header for auth. If you later want
  to add a device-lock / biometric layer for sensitive operations, the
  suggested pattern is:
  1. The RN app runs a local lock check (pin/fingerprint via
     `expo-local-authentication`).
  2. On success, the app sends the request with an extra `X-Confirm-Token`
     header (short-lived, e.g. HMAC of timestamp + API key).
  3. A new middleware in the backend validates that token for specific
     endpoints (`/api/system/reboot`, `/api/system/shutdown`, delete, etc.).
  This isn't implemented yet — the app's type-to-confirm modal is the
  placeholder, and the same gate is where the device lock would slot in.
