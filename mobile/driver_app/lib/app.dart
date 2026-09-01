import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/auth/auth_state.dart';
import 'features/auth/otp_login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(),
      child: MaterialApp(
        title: 'Cab Platform — Driver',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xFF0F9D58), useMaterial3: true),
        home: const _RootRouter(),
      ),
    );
  }
}

class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return auth.driver != null ? const DashboardScreen() : const OtpLoginScreen();
  }
}
