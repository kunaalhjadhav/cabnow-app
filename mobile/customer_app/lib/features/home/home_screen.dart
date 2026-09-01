import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../../core/models/stop.dart';
import '../booking/vehicle_select_screen.dart';
import '../history/trip_history_screen.dart';
import '../profile/profile_screen.dart';
import '../support/support_screen.dart';

/// Landing screen: pickup/drop entry (+ optional stops), then hands off to
/// vehicle selection & fare estimate. A real build should replace the plain
/// text fields below with a Google Places Autocomplete widget and a
/// GoogleMap for pin-drop selection — the lat/lng fields here exist so the
/// full booking flow is exercisable without a Places API key configured.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _pickupLabelCtrl = TextEditingController();
  final _pickupLatCtrl = TextEditingController();
  final _pickupLngCtrl = TextEditingController();
  final _dropLabelCtrl = TextEditingController();
  final _dropLatCtrl = TextEditingController();
  final _dropLngCtrl = TextEditingController();
  final List<TripStopModel> _stops = [];

  void _addStop() {
    setState(() {
      _stops.add(TripStopModel(id: '', sequence: _stops.length + 1, label: '', lat: 0, lng: 0, plannedWaitMinutes: 0, status: 'PENDING'));
    });
  }

  void _goToVehicleSelection() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => VehicleSelectScreen(
        pickupLabel: _pickupLabelCtrl.text,
        pickupLat: double.tryParse(_pickupLatCtrl.text) ?? 0,
        pickupLng: double.tryParse(_pickupLngCtrl.text) ?? 0,
        dropLabel: _dropLabelCtrl.text,
        dropLat: double.tryParse(_dropLatCtrl.text) ?? 0,
        dropLng: double.tryParse(_dropLngCtrl.text) ?? 0,
        stops: _stops,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book a ride'),
        actions: [
          IconButton(icon: const Icon(Icons.history), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TripHistoryScreen()))),
          IconButton(icon: const Icon(Icons.support_agent), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportScreen()))),
          IconButton(icon: const Icon(Icons.person), onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()))),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Hi ${auth.user?.phone ?? ''}', style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 16),
          const Text('Pickup', style: TextStyle(fontWeight: FontWeight.bold)),
          TextField(controller: _pickupLabelCtrl, decoration: const InputDecoration(labelText: 'Pickup address')),
          Row(children: [
            Expanded(child: TextField(controller: _pickupLatCtrl, decoration: const InputDecoration(labelText: 'Lat'))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _pickupLngCtrl, decoration: const InputDecoration(labelText: 'Lng'))),
          ]),
          const SizedBox(height: 16),
          const Text('Destination', style: TextStyle(fontWeight: FontWeight.bold)),
          TextField(controller: _dropLabelCtrl, decoration: const InputDecoration(labelText: 'Drop address')),
          Row(children: [
            Expanded(child: TextField(controller: _dropLatCtrl, decoration: const InputDecoration(labelText: 'Lat'))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _dropLngCtrl, decoration: const InputDecoration(labelText: 'Lng'))),
          ]),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Stops', style: TextStyle(fontWeight: FontWeight.bold)),
              TextButton.icon(onPressed: _addStop, icon: const Icon(Icons.add), label: const Text('Add stop')),
            ],
          ),
          ..._stops.asMap().entries.map((entry) {
            final i = entry.key;
            return Card(
              margin: const EdgeInsets.symmetric(vertical: 4),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(labelText: 'Stop label'),
                      onChanged: (v) => _stops[i] = TripStopModel(
                        id: '', sequence: i + 1, label: v, lat: _stops[i].lat, lng: _stops[i].lng,
                        plannedWaitMinutes: _stops[i].plannedWaitMinutes, status: 'PENDING',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 90,
                    child: TextField(
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Wait min'),
                      onChanged: (v) => _stops[i] = TripStopModel(
                        id: '', sequence: i + 1, label: _stops[i].label, lat: _stops[i].lat, lng: _stops[i].lng,
                        plannedWaitMinutes: int.tryParse(v) ?? 0, status: 'PENDING',
                      ),
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => setState(() => _stops.removeAt(i))),
                ]),
              ),
            );
          }),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: _goToVehicleSelection, child: const Padding(padding: EdgeInsets.all(12), child: Text('See vehicle options'))),
        ],
      ),
    );
  }
}
