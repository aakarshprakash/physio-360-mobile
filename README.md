# Physio360 mobile (staff app)

React Native app (Expo SDK 58, Expo Router) for clinic staff. One app for every
role; the screens a person sees follow the role the clinic gave them in the web
portal (owner, administrator, physiotherapist, front desk, accountant).

## What it does

| Area | Owner / admin | Physiotherapist | Front desk | Accountant |
|---|---|---|---|---|
| Home dashboard (role-aware KPIs, today's schedule, alerts) | ✓ business view | ✓ my day | ✓ queue | ✓ finance |
| Geofenced clock in / out, attendance history | ✓ | ✓ | ✓ | ✓ |
| Leave: balances, apply, cancel; approve / reject team requests | ✓ approve | ✓ | ✓ | ✓ |
| Payslips (PDF) | ✓ | ✓ | ✓ | ✓ |
| Schedule (day strip, mine / all), appointment status flow | ✓ | ✓ | ✓ | view |
| Book appointments against real free slots | ✓ | ✓ | ✓ | — |
| Patients: search, register, profile, call / WhatsApp | ✓ | ✓ | ✓ | view |
| Patient photo (camera / gallery) and attachments (camera, gallery, PDF) | ✓ | ✓ | ✓ | — |
| SOAP treatment notes with pain score, sign | — | ✓ | — | — |
| Online booking inbox (confirm / decline + WhatsApp reply) | ✓ | ✓ | ✓ | — |
| Billing: outstanding invoices, record payment, share invoice PDF | ✓ | — | ✓ | ✓ |
| Team directory: who is in, performance, reset password | ✓ | — | — | — |
| Face ID / fingerprint app lock, change password, first-login password | ✓ | ✓ | ✓ | ✓ |

Security: the app signs in with `POST /api/auth/token` and stores a Sanctum
bearer token in the device keychain / keystore (expo-secure-store). Signing out
revokes the token; an administrator can sign a person out of every device from
the web portal. Every endpoint is authorised on the server; the app only hides
what a role cannot use.

## Run it

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press a / i / w
```

* **Server address**: tap "Clinic server" on the sign-in screen. On a phone use
  your computer's LAN address and start Laravel on all interfaces:
  `php artisan serve --host=0.0.0.0 --port=8000`, then enter
  `http://192.168.x.x:8000`. The Android emulator reaches the host at
  `http://10.0.2.2:8000`. The default comes from `app.json` → `extra.apiUrl`.
* Demo logins (password `Physio@2026`): `sarah@physio360.test` (owner),
  `arjun@physio360.test` (physiotherapist), `reena@physio360.test` (front desk),
  `joseph@physio360.test` (accountant), `kiran@physio360.test` (admin).
* Geofenced clock-in is off in the demo. Turn it on in the web portal
  (Settings → Attendance & leave) and pin each branch's location
  (Settings → Branches → "Use my current location").

## Build the APK on this PC (no Expo account needed)

Tools already installed: JDK 17 in `D:\tools\jdk17`, Android SDK in `D:\tools\android-sdk`
(platform 36, build-tools 36, NDK 27.1, emulator + `servon` AVD) and Gradle 9.4.1 as a local zip
(`D:\tools\gradle-9.4.1-bin.zip`; Expo SDK 58 needs 9.4.1 or newer). From Git Bash:

```bash
export JAVA_HOME=/d/tools/jdk17 ANDROID_HOME=D:/tools/android-sdk NODE_ENV=production
export EXPO_PUBLIC_API_URL=http://192.168.1.19:8000     # default server baked in; use https:// in production
npx expo prebuild --platform android --clean             # only after app.json / plugin changes, then:
echo "sdk.dir=D:/tools/android-sdk" > android/local.properties
#   android/gradle/wrapper/gradle-wrapper.properties -> distributionUrl=file\:///D:/tools/gradle-9.4.1-bin.zip
rm -rf android/app/build/generated/assets/react          # when EXPO_PUBLIC_API_URL changes
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# -> android/app/build/outputs/apk/release/app-release.apk  (copied to dist/)
```

Build from `D:\physio-360\mobile` itself, not a `subst` drive: native module links are recorded
with the real path. `plugins/withShortCmakeObjectPaths` keeps React Native's C++ object paths
under Windows' 260-character limit.

**Release signing.** `plugins/withReleaseSigning` signs release builds with
`credentials/physio360-release.jks` (gitignored). Its passwords live in
`%USERPROFILE%\.gradle\gradle.properties` (`PHYSIO360_KEYSTORE*`), never in the repo. **Back up the
keystore and those passwords**: Android only installs updates signed with the same key, and the
Play Store needs it for every release. Without them the build falls back to debug signing.

**Phone setup.** Start Laravel on all interfaces (`php artisan serve --host=0.0.0.0 --port=8000`),
keep the phone on the same Wi-Fi, and allow port 8000 through Windows Firewall if the app cannot
connect. The server address can also be changed on the sign-in screen.

### Test screens on the emulator

The release APK only contains ARM code. For the x86_64 emulator build a separate copy (never
ship it), install it and drive it with adb:

```bash
/d/tools/android-sdk/emulator/emulator -avd servon &
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/release/app-release.apk
adb emu geo fix 76.2877 9.9661        # put the emulator at the Kochi branch (geofence tests)
adb exec-out screencap -p > screen.png
```

### With EAS instead

`npx eas-cli@latest build -p android --profile preview` (APK) or `--profile production` (Play
Store); set the production API in `eas.json` first.

Face ID / fingerprint lock needs a real build (not Expo Go).

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
