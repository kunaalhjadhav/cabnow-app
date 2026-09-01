import 'package:flutter/material.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // await Firebase.initializeApp(); // once Firebase is wired up for push notifications
  runApp(const DriverApp());
}
