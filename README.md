# Minilab

Control your Linux server (or just your own laptop) from your phone — over
Tailscale, so everything stays private and you don't have to open any ports
on your router.

## What you get

- **File Manager** — browse folders, upload, download, rename, copy, move,
  delete, and preview photos & videos right from your phone.
- **System Health** — a live dashboard of your server's CPU, memory, disk,
  load, uptime, and temperature.

## How it works (the short version)

Two pieces, both in this repo:

- `mobile/` — the Android app you use on your phone.
- `agent/` — a small program that runs on your server and does what the app
  asks. You set it up once with one command.

When you set up the agent, it prints a **QR code**. Scan it with the app and
your phone is connected — no IPs, no API keys to type.

## Requirements

- An Android phone.
- A Linux machine with **Tailscale** installed and turned on (the app talks
  to your server through the Tailscale network).

## Install

### 1. Set up the agent (on your server)

```bash
cd agent
./install.sh
```

The script walks you through everything: picks the folder the app may
access, generates a secret key, and finishes by printing a **QR code +
pairing code** in your terminal.

### 2. Set up the app (on your phone)

- For development: install **Expo Go** from the Play Store, then run
  `cd mobile && npm install && npx expo start` and scan the Metro QR with
  Expo Go.
- For a production APK: `eas build --platform android` (see `mobile/README.md`).

### 3. Connect

In the app: **Add Device → Scan QR Code**, point the camera at the QR code
from step 1. Done. Your server appears and you can browse files or check its
health.

## Features

- **Files**: list folders, upload/download, rename/copy/move/delete,
  preview images, videos and audio, share files to other apps.
- **System health**: CPU, memory, disk, load average, uptime, temperature —
  refreshes automatically.
- **Multiple servers**: keep several servers/devices in the app and switch
  between them anytime.

## Uninstall

### Remove the agent (on your server)

```bash
cd agent
./uninstall.sh
```

It stops the service, deletes the program, and removes the config (API key)
— which un-pairs the phones. **Your files are never touched.** You can also
uninstall manually — see `agent/README.md`.

### Remove the app

Just uninstall it like any Android app.

## Where to find details

- `mobile/README.md` — the app: development, builds, folder structure.
- `agent/README.md` — the agent: API, manual setup, systemd, security.
