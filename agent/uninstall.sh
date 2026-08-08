#!/usr/bin/env bash
# Minilab agent — one-command uninstall.
# Removes the systemd service (if installed), the built binary, and
# optionally the shared storage folder and the config folder (~/.minilab).
set -euo pipefail

CONFIG_DIR="$HOME/.minilab"
CONFIG_FILE="$CONFIG_DIR/config.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_PATH="$SCRIPT_DIR/minilab-backend"
SERVICE_NAME="minilab-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

say() { printf '\n=== %s ===\n' "$1"; }

confirm() {
  local prompt="$1" default="$2" ans def
  # The capital letter is the default (e.g. [Y/n] defaults to Y, [y/N] to N).
  if [[ "$default" =~ [A-Z] ]]; then
    def="${BASH_REMATCH[0]}"
  else
    def="${default:0:1}"
  fi
  read -rp "$prompt [$default] " ans
  ans="${ans:-$def}"
  [[ "$ans" =~ ^[Yy]$ ]]
}

# Remember the storage folder before anything gets deleted (it's only stored
# in the config file, which may be removed below).
STORAGE_DIR=""
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  STORAGE_DIR="${MINILAB_ROOT_DIR:-}"
fi

echo "Minilab Agent — Uninstall"
echo "========================="

# 1. Stop & remove the systemd service
say "1/4 Stop & remove the systemd service"
if systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE_NAME}\."; then
  sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  sudo rm -f "$SERVICE_FILE"
  sudo systemctl daemon-reload
  echo "systemd service removed."
else
  echo "No systemd service installed — nothing to do."
fi

# 2. Remove the built binary
say "2/4 Remove the built binary"
if [[ -f "$BIN_PATH" ]]; then
  rm -f "$BIN_PATH"
  echo "Removed: $BIN_PATH"
else
  echo "No binary found."
fi

# 3. Remove the shared storage folder (the user's files — requires typing the
#    exact path, so an accidental Enter can never wipe data)
say "3/4 Shared storage folder"
if [[ -n "$STORAGE_DIR" && -d "$STORAGE_DIR" ]]; then
  echo "Your files live in: $STORAGE_DIR"
  echo "This step DELETES ALL FILES in that folder."
  read -rp "Type the exact folder path above to delete it (anything else keeps it): " confirm_path
  if [[ "$confirm_path" == "$STORAGE_DIR" ]]; then
    rm -rf "$STORAGE_DIR"
    echo "Removed: $STORAGE_DIR"
  else
    echo "Kept: $STORAGE_DIR"
  fi
else
  echo "No storage folder configured/found."
fi

# 4. Remove the config folder (API key + saved pairing codes)
say "4/4 Remove the config folder"
if [[ -d "$CONFIG_DIR" ]]; then
  if confirm "Remove $CONFIG_DIR (config + API key + saved pairing codes)?" "Y/n"; then
    rm -rf "$CONFIG_DIR"
    echo "Removed: $CONFIG_DIR"
  else
    echo "Kept: $CONFIG_DIR"
  fi
else
  echo "No config folder found."
fi

cat <<EOF

Uninstall complete.
- Existing pairing codes on phones stop working now that the service is
  stopped and the API key is deleted.
- Go was left installed (it's a general tool). Remove it manually if you want:
  sudo apt remove golang-go
EOF
