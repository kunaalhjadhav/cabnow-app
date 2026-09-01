# Cab Platform — Driver Partner App (Flutter)

Same setup pattern as `mobile/customer_app` — see that README for the full explanation. Quick version:

```bash
flutter create --org com.yourcompany --project-name cab_platform_driver_app .
flutter pub get
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=SOCKET_URL=http://10.0.2.2:3000
```

Add your Google Maps key to the generated `android/app/src/main/AndroidManifest.xml` /
`ios/Runner/AppDelegate.swift` the same way as the customer app, and your Firebase config files for push
notifications (trip requests should arrive as push, not just the in-app poll this scaffold uses by default).

## Screens implemented

Phone/OTP signup & login, dashboard (online/offline toggle, KYC gate, active trip card), KYC document upload,
vehicle list, the full trip lifecycle screen (navigate → arrived → OTP verify → start → stop arrive/depart →
complete), earnings & pending payout, support tickets, profile.

## Where this needs real infrastructure before production

- **Trip assignment push**: `dashboard_screen.dart` polls `/trips/driver/mine` every 6s. Replace with FCM push
  (backend hook: call your push provider right after `DispatchService.assignNearestDriver` succeeds) plus the
  `/tracking` Socket.IO namespace for instant updates, and drop the poll.
- **Document upload**: `documents_screen.dart` currently sends the local file path as `fileUrl` — insert a real
  object-storage upload (S3/GCS/Cloudinary presigned URL) before that POST.
- **Turn-by-turn navigation**: the "Start navigating to pickup" button is a state transition only; launch Google
  Maps/Waze via `url_launcher` with the pickup coordinates, or embed turn-by-turn with the Maps SDK.
