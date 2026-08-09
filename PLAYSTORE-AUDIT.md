# Google Play Store — Submission Checklist

Status: **audited Aug 2026** (see audit notes in conversation). Target: pass Play review.

## Blockers (must fix — fail review / app can't function in release)

- [ ] **Upgrade Expo SDK 51 → 52 (or 53)**
  - Target SDK is currently **34**; Play now requires **API 35** (new apps + updates as of Aug 2026).
  - SDK 52 = RN 0.76 = **16 KB page-size support** (mandatory for API 35+).
  - Includes migrating deprecated `expo-av` → `expo-video`; retest preview/video/audio.
- [ ] **Enable cleartext HTTP** (`expo-build-properties` → `android.usesCleartextTraffic: true`)
  - Release manifest has it off → all `http://<tailscale-ip>:8080` requests fail in release. (Traffic rides the encrypted Tailscale tunnel, so it's justified.)
- [ ] **Privacy policy URL** — required (CAMERA = sensitive permission). Create + host (GitHub Pages etc.), paste into Play Console.
- [ ] **Submit as AAB, not APK**
  - Use `eas build --profile production --platform android` (defaults to AAB) + `eas submit`.
  - `preview` profile builds APK — for testing only.

## High priority (smooth review / security)

- [ ] **Block unused permissions** (`android.blockedPermissions`):
  - Block: `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`
  - Keep: `CAMERA`, `INTERNET`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE`
- [ ] **Set `android.allowBackup: false`** (device list currently backed up to Google Cloud).
- [ ] **Data safety form** (Play Console): no data collected by us; files live on the user's own server; credentials on-device in SecureStore; deletion = remove device / uninstall; no account system → no account-deletion flow needed.

## Review-process risk

- [ ] **Listing must explain it's a companion app** — reviewer sees an empty device list without an agent server. Add short + full description: "companion app for your own Minilab server; requires the agent + Tailscale." Add test instructions.
- [ ] **Content rating + target-audience questionnaire** (Play Console).
- [ ] **Screenshots** — ≥2 phone (incl. one 6.5"+); tablet screenshots recommended.

## Play Console listing tasks (no code)

- [ ] Short + full description, category (Tools/Productivity)
- [ ] Support email + support URL
- [ ] Feature graphic 1024×500
- [ ] Upload key / Play App Signing (EAS signing)
- [ ] Verify `com.minilab.control` is reserved/owned

## Already compliant (verified)

- [x] Runtime permissions minimal (camera only), proper permission message
- [x] API keys in `expo-secure-store` (encrypted), not AsyncStorage
- [x] Versioning: `versionCode` auto-increment, `version 1.0.0`
- [x] No ad/analytics/third-party SDKs
- [x] Icons 1024×1024 + adaptive icon
- [x] `expo-font` plugin (release crash on Add Device fixed)

## Suggested order

1. SDK 52 upgrade (+ `expo-video`) — biggest item, do as its own session
2. `expo-build-properties`: cleartext `true`, `allowBackup false`, `blockedPermissions`
3. Test full flow in a **release** APK (pair → files → health) before submitting
4. Play Console: privacy policy, data-safety form, content rating, screenshots, listing
