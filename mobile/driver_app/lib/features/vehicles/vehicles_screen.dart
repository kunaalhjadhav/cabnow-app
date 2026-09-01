import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';

/// Lists vehicles registered under this driver's vendor and lets the driver
/// add a new one for admin approval — spec: "Vehicle management, multiple
/// vehicle support". Admin approval happens in the Admin Dashboard; a newly
/// added vehicle starts life as PENDING_APPROVAL and can't be dispatched
/// until approved (see backend VehiclesService.approve).
class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  final _api = ApiClient.instance.dio;
  List<dynamic> _vehicles = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final driver = context.read<AuthState>().driver;
    if (driver == null) return;
    final driverResponse = await _api.get('/drivers/${driver.id}');
    setState(() {
      _vehicles = driverResponse.data['vehicles'] ?? [];
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My vehicles')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _vehicles.isEmpty
              ? const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No vehicles yet. Ask your vendor/fleet admin to register one against your account.')))
              : ListView.separated(
                  itemCount: _vehicles.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final v = Map<String, dynamic>.from(_vehicles[i]);
                    return ListTile(
                      leading: const Icon(Icons.directions_car),
                      title: Text('${v['make']} ${v['model']} (${v['year']})'),
                      subtitle: Text('${v['registrationNumber']} · ${v['colour']}'),
                      trailing: Chip(label: Text(v['status'] ?? '')),
                    );
                  },
                ),
    );
  }
}
