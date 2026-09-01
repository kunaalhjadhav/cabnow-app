import 'package:flutter/material.dart';
import '../../core/models/trip.dart';
import 'trips_repository.dart';
import '../dashboard/dashboard_screen.dart';

/// Walks the driver through the full trip lifecycle state machine that
/// backend's TripsService enforces: ASSIGNED → DRIVER_ARRIVING →
/// DRIVER_ARRIVED → OTP_VERIFIED → IN_PROGRESS → (AT_STOP ⇄ IN_PROGRESS)* →
/// COMPLETED. Each button below maps 1:1 to one of those transitions.
class ActiveTripScreen extends StatefulWidget {
  final String tripId;
  const ActiveTripScreen({super.key, required this.tripId});

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  final _repository = TripsRepository();
  DriverTrip? _trip;
  bool _busy = false;
  String? _error;
  final _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final trip = await _repository.getTrip(widget.tripId);
    setState(() => _trip = trip);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      await _load();
    } catch (e) {
      setState(() => _error = 'That action failed — check the trip is in the right state and try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _complete() async {
    await _run(() async {
      await _repository.completeTrip(widget.tripId);
    });
    if (mounted && _trip?.status == 'COMPLETED') {
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const DashboardScreen()), (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = _trip;
    if (trip == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final booking = trip.booking ?? {};

    return Scaffold(
      appBar: AppBar(title: const Text('Active trip')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${booking['pickupLabel'] ?? ''} → ${booking['dropLabel'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Status: ${trip.status}'),
                  if (booking['passengerName'] != null) Text('Passenger: ${booking['passengerName']}'),
                  if (booking['passengerPhone'] != null) Text('Phone: ${booking['passengerPhone']}'),
                  if (booking['specialInstructions'] != null) Text('Instructions: ${booking['specialInstructions']}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),

          if (trip.status == 'ASSIGNED')
            ElevatedButton.icon(icon: const Icon(Icons.navigation), label: const Text('Start navigating to pickup'), onPressed: _busy ? null : () => _run(() => _repository.markArriving(widget.tripId))),

          if (trip.status == 'DRIVER_ARRIVING')
            ElevatedButton.icon(icon: const Icon(Icons.place), label: const Text("I've arrived at pickup"), onPressed: _busy ? null : () => _run(() => _repository.markArrived(widget.tripId))),

          if (trip.status == 'DRIVER_ARRIVED') ...[
            TextField(controller: _otpController, decoration: const InputDecoration(labelText: 'Enter OTP from passenger'), keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.verified),
              label: const Text('Verify OTP'),
              onPressed: _busy ? null : () => _run(() => _repository.verifyOtp(widget.tripId, _otpController.text.trim())),
            ),
          ],

          if (trip.status == 'OTP_VERIFIED')
            ElevatedButton.icon(icon: const Icon(Icons.play_arrow), label: const Text('Start trip'), onPressed: _busy ? null : () => _run(() => _repository.startTrip(widget.tripId))),

          if (trip.status == 'IN_PROGRESS' || trip.status == 'AT_STOP') ...[
            if (trip.stops.isNotEmpty) ...[
              const Text('Stops', style: TextStyle(fontWeight: FontWeight.bold)),
              ...trip.stops.map((s) {
                final stop = Map<String, dynamic>.from(s);
                return ListTile(
                  title: Text(stop['label'] ?? ''),
                  subtitle: Text('Status: ${stop['status']}'),
                  trailing: stop['status'] == 'PENDING'
                      ? TextButton(onPressed: _busy ? null : () => _run(() => _repository.arriveAtStop(widget.tripId, stop['id'])), child: const Text('Arrived'))
                      : stop['status'] == 'ARRIVED'
                          ? TextButton(onPressed: _busy ? null : () => _run(() => _repository.departStop(widget.tripId, stop['id'])), child: const Text('Depart'))
                          : null,
                );
              }),
              const SizedBox(height: 12),
            ],
            ElevatedButton.icon(icon: const Icon(Icons.flag), label: const Text('Complete trip (arrived at destination)'), onPressed: _busy ? null : _complete),
          ],
        ],
      ),
    );
  }
}
