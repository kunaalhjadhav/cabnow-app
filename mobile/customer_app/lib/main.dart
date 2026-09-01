import 'package:flutter/material.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // If you've wired up Firebase for push notifications, initialize it here
  // before runApp — see README.md for the platform config files needed.
  // await Firebase.initializeApp();
  runApp(const CabPlatformApp());
}
