#!/usr/bin/env bash
# Minilab backend — one-command setup.
# Builds the server, generates a random API key, detects a reachable IP
# (Tailscale first, then the LAN IP), and prints a QR + pairing code the
# mobile app can scan to connect.
set -euo pipefail

CONFIG_DIR="$HOME/.minilab"
CONFIG_FILE="$CONFIG_DIR/config.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_PATH="$SCRIPT_DIR/minilab-backend"

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

echo "Minilab Backend — Setup"
echo "======================="

# 1. Make sure Go is available
say "1/8 Check Go"
if ! command -v go >/dev/null 2>&1; then
  echo "Go compiler not found."
  if confirm "Install 'golang-go' via apt now?" "Y/n"; then
    sudo apt update && sudo apt install -y golang-go
  else
    echo "Install Go first (https://go.dev/dl/), then run this script again."
    exit 1
  fi
fi

# 2. Prepare the config dir and load any previous config
say "2/8 Load config"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  echo "Previous config found at $CONFIG_FILE"
else
  echo "No config yet; a new one will be created."
fi

# 3. Folder the app is allowed to manage
say "3/8 Allowed folder"
DEFAULT_ROOT="${MINILAB_ROOT_DIR:-$HOME/minilab-storage}"
read -rp "Folder the app is allowed to manage [$DEFAULT_ROOT]: " ROOT_INPUT
MINILAB_ROOT_DIR="${ROOT_INPUT:-$DEFAULT_ROOT}"
mkdir -p "$MINILAB_ROOT_DIR"
echo "Root dir: $MINILAB_ROOT_DIR"

# 4. API key (reuse the previous one if it exists)
say "4/8 API key"
if [[ -z "${MINILAB_API_KEY:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    MINILAB_API_KEY="$(openssl rand -hex 24)"
  else
    MINILAB_API_KEY="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  echo "Generated a new API key."
else
  echo "Reusing the existing API key."
fi

# 5. Port
say "5/8 Port"
DEFAULT_PORT="${MINILAB_PORT:-8080}"
read -rp "Backend port [$DEFAULT_PORT]: " PORT_INPUT
MINILAB_PORT="${PORT_INPUT:-$DEFAULT_PORT}"

# 6. Device name (shown in the app)
say "6/8 Device name"
DEFAULT_NAME="$(hostname)"
read -rp "Device name (shown in the app) [$DEFAULT_NAME]: " NAME_INPUT
DEVICE_NAME="${NAME_INPUT:-$DEFAULT_NAME}"

# 7. Save the config (for reuse + the systemd service) and build
say "7/8 Save config & build"
cat > "$CONFIG_FILE" <<EOF
MINILAB_ROOT_DIR=$MINILAB_ROOT_DIR
MINILAB_API_KEY=$MINILAB_API_KEY
MINILAB_PORT=$MINILAB_PORT
EOF
chmod 600 "$CONFIG_FILE"
echo "Config saved to $CONFIG_FILE (mode 600)"

echo "Building..."
go build -o "$BIN_PATH" .
echo "Build finished: $BIN_PATH"

# 8. IP for the pairing code (Tailscale -> manual -> auto LAN IP in the backend)
say "8/8 Detect IP"
TS_IP=""
if command -v tailscale >/dev/null 2>&1 && TS_IP="$(tailscale ip -4 2>/dev/null || true)" && [[ -n "$TS_IP" ]]; then
  echo "Tailscale IP detected: $TS_IP"
else
  echo "Tailscale not detected. If left empty, the backend will automatically use the LAN IP."
  read -rp "Enter a manual IP/host for the pairing code (leave empty for auto): " TS_IP
fi

# Optional: install as a systemd service (auto-start on boot)
if confirm "Run automatically at boot via systemd?" "y/N"; then
  SERVICE_FILE="/etc/systemd/system/minilab-backend.service"
  sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=Minilab Backend
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=$USER
EnvironmentFile=$CONFIG_FILE
ExecStart=$BIN_PATH
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now minilab-backend
  echo "systemd service active. Check status: sudo systemctl status minilab-backend"
else
  echo "Skipping systemd. Run manually with:"
  echo "  source $CONFIG_FILE && $BIN_PATH"
fi

# Print the pairing code (QR + text) to scan or paste from the app
say "Pairing Code"
export MINILAB_ROOT_DIR MINILAB_API_KEY MINILAB_PORT
PAIR_ARGS=(-pair -name "$DEVICE_NAME")
if [[ -n "$TS_IP" ]]; then
  PAIR_ARGS+=(-host "$TS_IP")
fi
"$BIN_PATH" "${PAIR_ARGS[@]}" | tee "$CONFIG_DIR/last-pairing-code.txt"
chmod 600 "$CONFIG_DIR/last-pairing-code.txt"

cat <<EOF

The code above is also saved to: $CONFIG_DIR/last-pairing-code.txt
Open the app on your phone -> 'Add Device' -> 'Paste Code' -> paste that code.

To generate a pairing code again anytime (e.g. for someone else's phone):
  source $CONFIG_FILE && ./minilab-backend -pair -name "Name of Phone"
EOF
