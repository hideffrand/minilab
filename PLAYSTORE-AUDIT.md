# Google Play Store — Submission Checklist

Status: **re-audited Aug 15, 2026** after permission/targetSdk fixes. Target: pass Play review.

Quick state: `targetSdk 35` (compileSdk 35, buildTools 35.0.0), cleartext HTTP on, unneeded permissions stripped via `mobile/plugins/withPlayCompat.js` (config plugin). Remaining **hard blocker is 16 KB page-size support** → Expo SDK upgrade. Details below.

## Blockers (must fix — submission rejected / policy violation)

- [ ] **Upgrade Expo SDK (SDK 52+; prefer newest, e.g. 54/55)**
  - Two independent Play requirements collide with Expo SDK 51:
    1. **16 KB page size** — since **Nov 1, 2025** all apps targeting Android 15+ (API 35) must support 16 KB pages on 64-bit devices. RN 0.74/Expo 51 ships 4 KB-aligned native libs → AAB **fails the Play check**. First RN with support: 0.76 (= Expo SDK 52). This is why the AAB we build today cannot be submitted.
    2. **Target API 36** — from **Aug 31, 2026** new apps/updates must target Android 16 (API 36). SDK 52/53 default to API 35; SDK 54+ defaults to API 36. To submit *after* Aug 31 without an extension, you need targetSdk 36 → SDK 54+.
  - The interim `targetSdk 35` bump stays (policy-required groundwork; kept in `expo-build-properties`).
  - Migration notes (verified against SDK 53/54 changelogs):
    - `expo-av` is deprecated (SDK 53), **removed in SDK 55** → migrate to `expo-video` (audio → `expo-audio`, not used here). Do this before or with the upgrade.
    - New Architecture is **default in SDK 52+ (new projects), everywhere in SDK 53**; SDK 55 will be New-Arch-only (legacy arch frozen in RN 0.80, opt-out removed in 0.82). Verify `expo-camera`, `expo-share-intent`, `expo-local-authentication` behave on New Arch.
    - **Edge-to-edge becomes mandatory in SDK 54** (targets API 36; `windowOptOutEdgeToEdgeEnforcement` is deprecated and disabled on API 36). Remove the current opt-out when upgrading and verify safe-area insets render correctly (`react-native-safe-area-context` already a dep).
  - Re-test preview/streaming/share/biometric after the upgrade.
- [ ] **Verify 16 KB alignment on the release AAB** (SDK 52+ build)
  - Run Google's `check_elf_alignment.sh` against the AAB; expect `ALIGNED` for all `arm64-v8a` libs. Do this before first upload — Play's first signal is the "16 KB native library alignment" review comment.
- [ ] **Privacy policy URL** — required (CAMERA = sensitive permission). **In-app Terms & Privacy screen is done** (`mobile/src/screens/LegalScreen.tsx`, reachable via Settings → Terms & Privacy); the *publicly reachable URL* for Play Console still needs hosting (GitHub Pages etc.). Use the same text from the screen.
- [ ] **Submit AAB, never APK**
  - `eas build --profile production --platform android` (defaults to app-bundle) + `eas submit`. `preview` profile builds APK — testing only.

## High priority (smooth review / security / quality)

- [x] **`android:allowBackup: false`** — added in `plugins/withPlayCompat.js` (applies to the `<application>` element). Device list no longer backed up to Google Cloud.
- [x] **`expo-dev-client` moved to `devDependencies`** — its DevLauncher activities are debug-only (no Play policy risk), but it no longer ships in the production `dependencies` set. **Verified:** DevLauncher activities live under `expo-dev-launcher/android/src/debug/` — a release build's source-set merge excludes them; `expo config --type introspect` (with the plugin active) shows no DevLauncher activity in the manifest. Confirmed against the production AAB once one is built.
- [x] **`expo-system-ui` installed** (SDK 51 pin `~3.0.7`) — `userInterfaceStyle: automatic` now works on Android; dark mode renders correctly. Prebuild warning gone.
- [ ] **Data safety form** (Play Console) — Play's "collected" = transmitted off-device, so this is **not** "no data". Answer accurately:
  - **Files and docs** (incl. photos/videos, per share-intent filters): collected **YES**, user-provided only when the user transfers/shares them; shared **YES** — to the user's *own* server, not us. Purpose: app functionality. Encrypted in transit: **NO** on the plain-HTTP LAN/Tailscale path — disclose honestly.
  - **Authentication (API key)**: transmitted to the user's own server during pairing; stored on-device in SecureStore.
  - **Not collected/shared**: no personal info, no location, no identifiers sent to us, no ads/analytics/3P SDKs. Device list is local-only (AsyncStorage).
  - Deletion: remove device / uninstall → on-device keys gone; server files are the user's (app deletes nothing server-side). No account system → no account-deletion flow required.

## Review-process risk

- [ ] **Listing must explain it's a companion app** — reviewer sees an empty device list without an agent server. Short + full description: "companion app for your own Mooni server; requires the agent + Tailscale." Include test instructions (pair → browse → health).
- [ ] **Closed test before production** (if personal account created after Nov 13, 2023): **≥12 testers opted in continuously for 14 days**, then apply for production access. Start this in parallel with the SDK upgrade — it's on a calendar.
- [ ] **Content rating + target-audience questionnaire** (Play Console).
- [ ] **Screenshots** — ≥2 phone (incl. one 6.5"+); tablet recommended.

## Play Console listing tasks (no code)

- [ ] Short + full description, category (Tools/Productivity)
- [ ] Support email + support URL
- [ ] Feature graphic 1024×500
- [ ] Upload key / Play App Signing (EAS signing)
- [ ] Verify `com.mooni.app` is reserved/owned (EAS project owner: `mooni-app`)

## Done / verified (Aug 2026)

- [x] **targetSdk/compileSdk 35, buildTools 35.0.0** — via `expo-build-properties` (`mobile/app.json`)
- [x] **Cleartext HTTP enabled** (`usesCleartextTraffic: true`) — release manifest now allows `http://<ip>:8080` (traffic rides encrypted Tailscale tunnel; justified)
- [x] **Unused permissions stripped** — `RECORD_AUDIO` (camera QR only; `recordAudioAndroid: false` + expo-av source), `READ/WRITE_EXTERNAL_STORAGE` (expo-file-system legacy), `SYSTEM_ALERT_WINDOW` (Expo base template) — all removed via `tools:node="remove"` in `plugins/withPlayCompat.js`
  - Final merged permissions: `CAMERA`, `INTERNET`, `MODIFY_AUDIO_SETTINGS`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `VIBRATE` — all justified. Note: `MODIFY_AUDIO_SETTINGS` comes from `expo-av`'s plugin; `USE_FINGERPRINT` is the legacy duplicate of `USE_BIOMETRIC` (both added by `expo-local-authentication`, harmless but redundant). Both permissions disappear with the SDK 54+ migration (`expo-av` → `expo-video` drops `MODIFY_AUDIO_SETTINGS`; `expo-local-authentication` drops `USE_FINGERPRINT`).
- [x] **Edge-to-edge handled for API 35** — `android:windowOptOutEdgeToEdgeEnforcement=true` added to `AppTheme` + `Theme.App.SplashScreen` (SDK 51 doesn't handle enforced edge-to-edge; opt-out is the interim fix). **Remove on SDK 54 upgrade** — API 36 disables the opt-out and forces edge-to-edge.
- [x] Runtime permissions minimal (camera only), proper permission message
- [x] API keys in `expo-secure-store` (encrypted), not AsyncStorage
- [x] Versioning: `versionCode` auto-increment (EAS), `version 1.0.1`
- [x] No ad/analytics/third-party SDKs
- [x] Icons 1024×1024 + adaptive icon
- [x] 64-bit ABIs included (AAB splits per device); Hermes on; `minSdk 23`
- [x] `expo-font` plugin (release crash on Add Device fixed)
- [x] **In-app Terms & Privacy screen** — `LegalScreen.tsx` (Settings → Terms & Privacy), theme-aware; covers no-data-collection, on-device keys, server-side files, power-control risk, permissions

## Suggested order

1. **Expo SDK upgrade** (52+ now for 16 KB; 54+ if submitting after Aug 31, 2026) — its own session; incl. `expo-av` → `expo-video` (removed in SDK 55) and edge-to-edge opt-out removal
2. Build `production` AAB, run `check_elf_alignment.sh`, test full flow in **release** (pair → files → health)
3. Start 14-day closed test (≥12 testers) — runs on calendar in parallel
4. Play Console: privacy policy, data-safety, content rating, screenshots, listing

## Policy dates (for planning)

| Requirement | Applies from |
|---|---|
| Target API 35 (new apps + updates) | Aug 31, 2025 |
| 16 KB page size (targetSdk 35 apps) | Nov 1, 2025 |
| Target API 36 (new apps + updates) | Aug 31, 2026 |
| Target API 36 (existing-app availability) | Aug 31, 2026 (extension → Nov 1, 2026) |
