# Minilab Control — Mobile App (Phase 1: File Manager)

Expo + React Native + TypeScript. Typecheck-clean (`npx tsc --noEmit`).
**Target: Android first** — iOS is not a priority yet.

## Features

- **Multi-device**: store several "devices" (laptops/servers running Linux)
  and switch between them easily from the **My Devices** screen.
- **Setup without typing anything**: the **Add Device** screen has a
  "Paste Code" mode with two options — **Scan QR** (point your camera at the
  QR printed by `install.sh` on the backend terminal) or **paste the pairing
  code** manually / from the clipboard. The name/URL/API key are filled in
  automatically from either method. You never need to know your Tailscale IP
  or what an API key even is. "Manual" mode is still there for people who
  prefer to fill everything in themselves.
- **Key security**: each device's API key is stored encrypted via
  `expo-secure-store` (Android Keystore), not in AsyncStorage.
- **File Browser**: list folders, navigate into subfolders, pull-to-refresh,
  create new folders, upload files, and long-press an item for Rename / Copy /
  Move / Delete. The long-press menu uses the app's own `ActionSheet`
  component (not `Alert`) because `Alert` on Android only supports 3 buttons.
- **File Preview**: preview images & videos (streaming, with seek support
  because the backend uses HTTP Range); other files can be downloaded and
  shared (share sheet) to other apps on the phone.

## How to distribute to other people (no coding needed)

1. You (the admin) run `./install.sh` on the backend → you get a QR code +
   pairing code text in the terminal.
2. If the other person is near you: they just open the app, tap **Add Device**
   → **Scan QR Code**, and point the camera at your terminal screen. Done.
3. If they're remote (can't scan): send them the pairing code text (chat,
   shared note, etc. — treat it like a password, since it contains the API
   key), and they paste it in "Paste Code" mode.
4. Install the app (via Expo Go for development, or the APK from
   `eas build` for production) if it isn't installed yet.

There's no "enter your Tailscale IP manually" or "enter your API key
manually" step for the end user — it's all wrapped up in the single code they
paste.

## Expo Go vs Development Build

All the dependencies in this project (`expo-camera`, `expo-file-system`,
`expo-secure-store`, etc.) are standard native modules already bundled in
**Expo Go** — so you can just run `npx expo start` and scan the Metro QR with
the **Expo Go** app from the Play Store, no build needed.

If you later want a **development build** (custom native code, or to make
notifications/etc. closer to production), the project is ready:

```bash
npx expo install expo-dev-client   # already in package.json
eas build --platform android --profile development
# or a local build (needs Android Studio/SDK installed):
npx expo run:android
```

Then start Metro with:

```bash
npm run start:dev-client
```

## Development setup (Expo Go)

```bash
cd minilab-app
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone (make sure the phone and the
laptop running the Metro bundler are on the same network while developing —
for everyday use the app connects to the backend via Tailscale, not Metro, so
they don't need to share a network).

## Folder structure

```
src/
  api/             axios client + API functions (list, upload, etc.)
  context/         DevicesContext — saved devices (AsyncStorage) &
                   each device's API key (expo-secure-store)
  navigation/      React Navigation stack (DeviceList → AddDevice / FileBrowser → FilePreview)
  screens/         DeviceListScreen, AddDeviceScreen, FileBrowserScreen, FilePreviewScreen
  screens/components/  PromptModal (input dialog), ActionSheet (long-press menu, Android-safe)
  utils/           encode/decode pairing code (must stay in sync with internal/pairing in the backend)
  types/           shared TypeScript types
```

## Build APK (Android target)

Use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas build --platform android
```

## Next-feature roadmap (not implemented yet)

In line with your original feature list, my suggested order after File Manager:

1. **System Health Monitor** — new backend Go endpoints (read `/proc`
   directly, no external dependency) + a dashboard in the app.
2. **Power Control & Wake-on-LAN** — `POST /api/power/reboot` and
   `/shutdown` endpoints, plus a WoL magic packet sent from the app side (UDP
   broadcast, no backend needed since the point is to turn on a powered-off
   laptop).
3. **Docker Manager** & **Systemd Service Control** — via the Unix socket
   `/var/run/docker.sock` and `systemctl` (needs a restricted shell and a
   service whitelist to stay safe).
4. **Custom Script Launcher** & **Remote Terminal/SSH** — the most sensitive;
   Remote Terminal is best done with a real SSH client in the app connecting
   to your Mint SSH server (safer and more battle-tested than re-inventing a
   shell in the Go backend).
5. A **fingerprint-gated confirm token** layer for all sensitive actions
   (delete, power control, restart service, etc.) — see the note in the
   backend README.

Just say the word if you want to move on to any of these.
