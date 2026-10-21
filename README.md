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

## Build for the stores

```bash
npx eas-cli@latest build --profile preview --platform android   # installable APK
npx eas-cli@latest build --profile production --platform all     # store builds
```

Face ID needs a development or store build (it is not available in Expo Go).

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
