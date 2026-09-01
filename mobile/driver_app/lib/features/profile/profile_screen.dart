import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../auth/otp_login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final driver = auth.driver;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(leading: const Icon(Icons.star), title: Text('Rating: ${driver?.rating.toStringAsFixed(2) ?? '—'}')),
            ListTile(leading: const Icon(Icons.local_taxi), title: Text('Total trips: ${driver?.totalTrips ?? 0}')),
            ListTile(leading: const Icon(Icons.verified_user), title: Text('KYC status: ${driver?.kycStatus ?? '—'}')),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Log out', style: TextStyle(color: Colors.red)),
              onTap: () async {
                await auth.logout();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const OtpLoginScreen()), (route) => false);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
