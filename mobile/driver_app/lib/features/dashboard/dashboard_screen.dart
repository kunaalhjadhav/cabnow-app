import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';
import '../trips/trips_repository.dart';
import '../trips/active_trip_screen.dart';
import '../earnings/earnings_screen.dart';
import '../vehicles/vehicles_screen.dart';
import '../documents/documents_screen.dart';
import '../support/support_screen.dart';
import '../profile/profile_screen.dart';

/// Driver home: online/offline toggle and the current/incoming trip. Trip
/// assignment is push-driven in a full build (FCM + the /tracking socket's
/// `trip:status` events); this scaffold polls /trips/driver/mine every few
/// seconds as a simple, dependency-light default that still works end-to-end.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _tripsRepository = TripsRepository();
  final _api = ApiClient.instance.dio;
  Timer? _poller;
  dynamic _activeTrip;
  bool _togglingOnline = false;

  @override
  void initState() {
    super.initState();
    _poller = Timer.periodic(const Duration(seconds: 6), (_) => _pollForTrip());
    _pollForTrip();
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }

  Future<void> _pollForTrip() async {
    final driver = context.read<AuthState>().driver;
    if (driver == null || driver.id.isEmpty || !driver.isOnline) return;
    final trips = await _tripsRepository.myTrips();
    final active = trips.where((t) => !['COMPLETED', 'CANCELLED'].contains(t.status)).toList();
    if (mounted) setState(() => _activeTrip = active.isNotEmpty ? active.first : null);
  }

  Future<void> _toggleOnline(bool value) async {
    final driver = context.read<AuthState>().driver;
    if (driver == null || driver.id.isEmpty) return;
    setState(() => _togglingOnline = true);
    try {
      await _api.patch('/drivers/${driver.id}/online-status', data: {'isOnline': value});
      await context.read<AuthState>().refreshDriver();
    } finally {
      setState(() => _togglingOnline = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final driver = auth.driver;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Partner'),
        actions: [
          IconButton(icon: const Icon(Icons.account_balance_wallet), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EarningsScreen()))),
          IconButton(icon: const Icon(Icons.support_agent), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportScreen()))),
          IconButton(icon: const Icon(Icons.person), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()))),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (driver != null && driver.kycStatus != 'APPROVED')
            Card(
              color: Colors.amber.shade50,
              child: ListTile(
                leading: const Icon(Icons.warning_amber, color: Colors.orange),
                title: const Text('Complete your KYC to start accepting trips'),
                subtitle: Text('Current status: ${driver.kycStatus}'),
                trailing: TextButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DocumentsScreen())),
                  child: const Text('Upload'),
                ),
              ),
            ),
          Card(
            child: SwitchListTile(
              title: Text(driver?.isOnline == true ? 'You are online' : 'You are offline'),
              subtitle: const Text('Go online to start receiving trip requests'),
              value: driver?.isOnline ?? false,
              onChanged: _togglingOnline || driver?.kycStatus != 'APPROVED' ? null : _toggleOnline,
            ),
          ),
          const SizedBox(height: 12),
          if (_activeTrip != null)
            Card(
              color: Colors.blue.shade50,
              child: ListTile(
                leading: const Icon(Icons.local_taxi),
                title: Text('${_activeTrip.booking?['pickupLabel'] ?? ''} → ${_activeTrip.booking?['dropLabel'] ?? ''}'),
                subtitle: Text('Status: ${_activeTrip.status}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ActiveTripScreen(tripId: _activeTrip.id))),
              ),
            )
          else
            const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No active trip — you will see a request here as soon as one is assigned.')),
              ),
            ),
          const SizedBox(height: 12),
          ListTile(
            leading: const Icon(Icons.directions_car),
            title: const Text('My vehicles'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VehiclesScreen())),
          ),
        ],
      ),
    );
  }
}
