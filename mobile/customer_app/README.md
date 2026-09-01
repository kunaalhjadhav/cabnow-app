# Cab Platform — Customer App (Flutter)

This directory contains the Dart application source (`lib/`) for the customer-facing mobile app. Flutter's
platform scaffolding (`android/`, `ios/`) is intentionally **not** included — generate it once, locally, where you
have the Flutter SDK installed, then this `lib/` + `pubspec.yaml` slot straight in:

```bash
flutter --version                # make sure you have a recent stable SDK
flutter create --org com.yourcompany --project-name cab_platform_customer_app .
# flutter create will not overwrite lib/main.dart or pubspec.yaml if you answer "n" when prompted,
# or just re-copy this repo's lib/ and pubspec.yaml back over the generated project afterwards.
flutter pub get
flutter run
```

## Configuring API keys (spec: "where I will add the keys and APIs")

Nothing in this app has a hard-coded key. Everything is read at build time via `--dart-define` (see
`lib/core/config/app_config.dart`) or from the native platform config files you add after `flutter create`:

| Key | Where it's used | How to supply it |
|---|---|---|
| `API_BASE_URL` | `lib/core/config/app_config.dart` | `--dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1` |
| `SOCKET_URL` | `lib/core/config/app_config.dart` | `--dart-define=SOCKET_URL=https://api.yourdomain.com` |
| `RAZORPAY_KEY_ID` | `lib/features/booking/payment_service.dart` | `--dart-define=RAZORPAY_KEY_ID=rzp_live_xxx` (never put the *secret* in the app — that stays server-side) |
| Google Maps (Android) | native config | `android/app/src/main/AndroidManifest.xml` → add inside `<application>`: `<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>` |
| Google Maps (iOS) | native config | `ios/Runner/AppDelegate.swift` → `GMSServices.provideAPIKey("YOUR_KEY")` |
| Firebase (push) | native config | drop `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) into the generated platform folders from your Firebase project |

Example run with all the dev-relevant keys:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=SOCKET_URL=http://10.0.2.2:3000 \
  --dart-define=RAZORPAY_KEY_ID=rzp_test_xxx
```//`10.0.2.2` is the Android emulator's alias for the host machine's `localhost`.

## Architecture

- `lib/core/network` — a single `Dio`-based `ApiClient` (attaches the JWT, refreshes on 401) and a `SocketService`
  wrapping `socket_io_client` for the same live-tracking events the admin dashboard listens to.
- `lib/core/auth` — `AuthRepository` (OTP request/verify against `/auth/otp/*`) + `AuthState` (a `ChangeNotifier`
  holding the session, consumed via `provider`).
- `lib/core/models` — plain Dart classes mirroring the backend's Prisma models (`Booking`, `Trip`, `FareBreakdown`,
  `VehicleCategory`, ...), each with a `fromJson`.
- `lib/features/*` — one folder per user-facing flow (auth, home/map, booking, live trip, history, ratings,
  support), each with its own repository (API calls) and screen(s).

## Screens implemented

Phone/OTP login, home screen with pickup/drop entry, vehicle category + fare estimate, stops with waiting time,
booking confirmation, live trip tracking (driver location via Socket.IO, OTP display, share trip, SOS button),
trip history, rate trip, support tickets, profile.
