# Google Play Store - Submission Checklist

Status: **Expo SDK 54 upgrade DONE Aug 15, 2026** (was the hard blocker). Remaining: build AAB, verify 16 KB alignment, Play Console tasks.

Quick state: **Expo SDK 54** (RN 0.81, React 19.1), default `targetSdk 36` / `compileSdk 36` (RN 0.81 template default; no `expo-build-properties` override needed), New Architecture on, cleartext HTTP on, unneeded permissions stripped via `mobile/plugins/withPlayCompat.js` (config plugin). 16 KB page-size support comes with RN 0.76+ → SDK 54 satisfies it; must still be **verified on the built AAB**. Details below.

## Blockers (must fix - submission rejected / policy violation)

- [x] **Upgrade Expo SDK → 54** (DONE; branch `backup/pre-sdk54`)
  - 16 KB page size and target API 36 both satisfied: SDK 54 = RN 0.81 (16 KB-aligned native libs) and defaults to targetSdk 36 (Android 16, required from Aug 31, 2026).
  - Migration completed and verified:
    - `expo-av` **removed** → `expo-video` (`~3.0.16`) migrated in `FilePreviewScreen.tsx` (`useVideoPlayer` + `VideoView`, `contentFit="contain"`). This also dropped the `MODIFY_AUDIO_SETTINGS` permission (was expo-av's).
    - `expo-file-system` → import switched to `expo-file-system/legacy` (SDK 54 moved the old API; upload-task/download code unchanged).
    - All expo packages reconciled to SDK 54 pins (`expo install --fix`); `expo-share-intent` bumped `^2.7.0` → `^5.0.0` (expo `^54` peer); `babel-preset-expo` + `expo-asset` added (transitive, were missing).
    - **Edge-to-edge opt-out removed** from `plugins/withPlayCompat.js` (API 36 disables the opt-out anyway; SDK 54 ships edge-to-edge support).
    - `expo-build-properties` pin to SDK 35 removed - RN 0.81 default targetSdk/compileSdk 36 applies.
    - React 19.1: `useRef<T>(null)` now `RefObject<T | null>` → `ShareIntentGate` prop type updated in `RootNavigator.tsx`.
  - Verified: `expo-doctor` 18/18, `tsc --noEmit` clean, jest 2/2, Metro export bundles (Hermes `.hbc`).
  - Re-test on device in **release** build: pair → files → preview (video/audio) → share-upload → biometric power control.
- [ ] **Verify 16 KB alignment on the release AAB** (SDK 54 build)
  - Run Google's `check_elf_alignment.sh` against the AAB; expect `ALIGNED` for all `arm64-v8a` libs. Do this before first upload - Play's first signal is the "16 KB native library alignment" review comment.
- [ ] **Privacy policy URL** - required (CAMERA = sensitive permission). **In-app Terms & Privacy screen is done** (`mobile/src/screens/LegalScreen.tsx`, reachable via Settings → Terms & Privacy); the *publicly reachable URL* for Play Console still needs hosting (GitHub Pages etc.). Use the same text from the screen.
- [ ] **Submit AAB, never APK**
  - `eas build --profile production --platform android` (defaults to app-bundle) + `eas submit`. `preview` profile builds APK - testing only.

## High priority (smooth review / security / quality)

- [x] **`android:allowBackup: false`** - added in `plugins/withPlayCompat.js` (applies to the `<application>` element). Device list no longer backed up to Google Cloud.
- [x] **`expo-dev-client` moved to `devDependencies`** - its DevLauncher activities are debug-only (no Play policy risk), but it no longer ships in the production `dependencies` set. **Verified:** DevLauncher activities live under `expo-dev-launcher/android/src/debug/` - a release build's source-set merge excludes them; `expo config --type introspect` (with the plugin active) shows no DevLauncher activity in the manifest. Confirmed against the production AAB once one is built.
- [x] **`expo-system-ui` installed** (SDK 51 pin `~3.0.7`) - `userInterfaceStyle: automatic` now works on Android; dark mode renders correctly. Prebuild warning gone.
- [ ] **Data safety form** (Play Console) - Play's "collected" = transmitted off-device, so this is **not** "no data". Answer accurately:
  - **Files and docs** (incl. photos/videos, per share-intent filters): collected **YES**, user-provided only when the user transfers/shares them; shared **YES** - to the user's *own* server, not us. Purpose: app functionality. Encrypted in transit: **NO** on the plain-HTTP LAN/Tailscale path - disclose honestly.
  - **Authentication (API key)**: transmitted to the user's own server during pairing; stored on-device in SecureStore.
  - **Not collected/shared**: no personal info, no location, no identifiers sent to us, no ads/analytics/3P SDKs. Device list is local-only (AsyncStorage).
  - Deletion: remove device / uninstall → on-device keys gone; server files are the user's (app deletes nothing server-side). No account system → no account-deletion flow required.

## Review-process risk

- [ ] **Listing must explain it's a companion app** - reviewer sees an empty device list without an agent server. Short + full description: "companion app for your own Mooni server; requires the agent + Tailscale." Include test instructions (pair → browse → health).
- [ ] **Closed test before production** (if personal account created after Nov 13, 2023): **≥12 testers opted in continuously for 14 days**, then apply for production access. Start this in parallel with the SDK upgrade - it's on a calendar.
- [ ] **Content rating + target-audience questionnaire** (Play Console).
- [ ] **Screenshots** - ≥2 phone (incl. one 6.5"+); tablet recommended.

## Play Console listing tasks (no code)

- [ ] Short + full description, category (Tools/Productivity)
- [ ] Support email + support URL
- [ ] Feature graphic 1024×500
- [ ] Upload key / Play App Signing (EAS signing)
- [ ] Verify `com.mooni.app` is reserved/owned (EAS project owner: `mooni-app`)

## Done / verified (Aug 2026)

- [x] **targetSdk/compileSdk 36** - RN 0.81 (SDK 54) template default; no override needed (removed the SDK-35 `expo-build-properties` pins). `minSdk` is now 24 (RN 0.81 default, was 23).
- [x] **Cleartext HTTP enabled** (`usesCleartextTraffic: true`) - release manifest now allows `http://<ip>:8080` (traffic rides encrypted Tailscale tunnel; justified)
- [x] **Unused permissions stripped** - `RECORD_AUDIO` (camera QR only; `recordAudioAndroid: false`), `READ/WRITE_EXTERNAL_STORAGE` (expo-file-system legacy), `SYSTEM_ALERT_WINDOW` (Expo base template) - all removed via `tools:node="remove"` in `plugins/withPlayCompat.js`
  - Final merged permissions (SDK 54, re-verified via introspect): `CAMERA`, `INTERNET`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `VIBRATE` - all justified. `MODIFY_AUDIO_SETTINGS` gone (was expo-av's, removed with the migration). `USE_FINGERPRINT` is the legacy duplicate of `USE_BIOMETRIC` (both from `expo-local-authentication`, harmless but redundant).
- [x] **Edge-to-edge** - SDK 54 ships edge-to-edge support; the SDK-51 opt-out (`windowOptOutEdgeToEdgeEnforcement`) was **removed** from `plugins/withPlayCompat.js` (API 36 disables the opt-out anyway). Verify safe-area insets on device.
- [x] Runtime permissions minimal (camera only), proper permission message
- [x] API keys in `expo-secure-store` (encrypted), not AsyncStorage
- [x] Versioning: `versionCode` auto-increment (EAS), `version 1.0.1`
- [x] No ad/analytics/third-party SDKs
- [x] Icons 1024×1024 + adaptive icon
- [x] 64-bit ABIs included (AAB splits per device); Hermes on; `minSdk 24`
- [x] `expo-font` plugin (release crash on Add Device fixed)
- [x] **In-app Terms & Privacy screen** - `LegalScreen.tsx` (Settings → Terms & Privacy), theme-aware; covers no-data-collection, on-device keys, server-side files, power-control risk, permissions

## Suggested order

1. ~~**Expo SDK upgrade**~~ **DONE** (SDK 54: 16 KB + targetSdk 36; `expo-av`→`expo-video`, edge-to-edge, `expo-file-system/legacy`, React 19 fixes)
2. Build `production` AAB, run `check_elf_alignment.sh`, test full flow in **release** (pair → files → preview → share-upload → health)
3. Start 14-day closed test (≥12 testers) - runs on calendar in parallel
4. Play Console: privacy policy, data-safety, content rating, screenshots, listing

## Policy dates (for planning)

| Requirement | Applies from |
|---|---|
| Target API 35 (new apps + updates) | Aug 31, 2025 |
| 16 KB page size (targetSdk 35 apps) | Nov 1, 2025 |
| Target API 36 (new apps + updates) | Aug 31, 2026 |
| Target API 36 (existing-app availability) | Aug 31, 2026 (extension → Nov 1, 2026) |
