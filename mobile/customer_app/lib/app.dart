import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/auth/auth_state.dart';
import 'features/auth/otp_login_screen.dart';
import 'features/home/home_screen.dart';

class CabPlatformApp extends StatelessWidget {
  const CabPlatformApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState(),
      child: MaterialApp(
        title: 'Cab Platform',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xFF3B5BFD), useMaterial3: true),
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
    return auth.user != null ? const HomeScreen() : const OtpLoginScreen();
  }
}
