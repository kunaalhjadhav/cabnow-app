import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/models/booking.dart';
import '../../core/network/socket_service.dart';
import '../booking/booking_repository.dart';
import '../home/home_screen.dart';
import '../sos/sos_button.dart';
import '../ratings/rate_trip_screen.dart';
import 'trip_repository.dart';

/// The screen a customer sits on for the whole life of a trip: shows driver
/// assignment, the OTP to hand the driver, live location updates over the
/// same Socket.IO namespace the admin dashboard's live map uses, a "share
/// trip" action, cancellation, and a route-change request entry point. When
/// the backend marks the trip COMPLETED it hands off to the rating screen.
class LiveTripScreen extends StatefulWidget {
  final String bookingId;
  const LiveTripScreen({super.key, required this.bookingId});

  @override
  State<LiveTripScreen> createState() => _LiveTripScreenState();
}

class _LiveTripScreenState extends State<LiveTripScreen> {
  final _repository = TripRepository();
  final _socket = SocketService();
  Booking? _booking;
  Map<String, dynamic>? _lastLocation;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final booking = await _repository.getBooking(widget.bookingId);
    setState(() {
      _booking = booking;
      _loading = false;
    });

    if (booking.trip != null) {
      await _socket.connect();
      _socket.watchTrip(booking.trip!.id);
      _socket.onTripLocation((data) => setState(() => _lastLocation = data));
      _socket.onTripStatus((_) => _refresh());
      _socket.onRouteChange((_) => _refresh());
    }
  }

  Future<void> _refresh() async {
    final booking = await _repository.getBooking(widget.bookingId);
    setState(() => _booking = booking);

    if (booking.trip?.status == 'COMPLETED' && mounted) {
      // driverUserId isn't returned on the trip payload by default in this
      // scaffold — extend GET /trips/:id (or /bookings/:id) to include
      // trip.driver.userId and thread it through here for a one-tap rating flow.
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => RateTripScreen(tripId: booking.trip!.id, driverUserId: booking.trip!.driverId ?? '')),
      );
    }
  }

  Future<void> _shareTrip() async {
    final booking = _booking;
    if (booking == null) return;
    await Share.share(
      "I'm on a trip from ${booking.pickupLabel} to ${booking.dropLabel}. "
      'Track it live: https://track.yourdomain.example/trip/${booking.trip?.id ?? booking.id}',
      subject: 'My live trip',
    );
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this trip?'),
        content: const Text('A cancellation fee may apply once a driver is on the way — this is configured by the platform.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep trip')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cancel trip')),
        ],
      ),
    );
    if (confirmed == true) {
      await BookingRepository().cancelBooking(widget.bookingId);
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeScreen()), (route) => false);
      }
    }
  }

  @override
  void dispose() {
    _socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _booking == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final booking = _booking!;
    final trip = booking.trip;

    return Scaffold(
      appBar: AppBar(title: const Text('Your trip')),
      floatingActionButton: const SosButton(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${booking.pickupLabel} → ${booking.dropLabel}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Booking status: ${booking.status}'),
                  if (trip != null) Text('Trip status: ${trip.status}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (trip?.otpCode != null)
            Card(
              color: Colors.amber.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const Text('Share this OTP with your driver to start the trip'),
                    const SizedBox(height: 8),
                    Text(trip!.otpCode!, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 8)),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          if (_lastLocation != null)
            ListTile(
              leading: const Icon(Icons.local_taxi),
              title: const Text('Driver location'),
              subtitle: Text('${_lastLocation!['lat']}, ${_lastLocation!['lng']}'),
              // Replace this list tile with a GoogleMap widget centered on
              // (lat, lng) and a car marker for the real live-tracking view.
            ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton.icon(onPressed: _shareTrip, icon: const Icon(Icons.share), label: const Text('Share trip')),
              if (trip != null && !['COMPLETED', 'CANCELLED'].contains(trip.status))
                OutlinedButton.icon(
                  onPressed: () => _showRouteChangeSheet(context, trip.id),
                  icon: const Icon(Icons.alt_route),
                  label: const Text('Change route'),
                ),
              if (!['COMPLETED', 'CANCELLED'].contains(booking.status))
                OutlinedButton.icon(
                  onPressed: _cancel,
                  icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                  label: const Text('Cancel', style: TextStyle(color: Colors.red)),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (booking.fareBreakdowns.isNotEmpty) ...[
            const Text('Fare breakdown', style: TextStyle(fontWeight: FontWeight.bold)),
            ...booking.fareBreakdowns.map((f) => ListTile(dense: true, title: Text(f.label), trailing: Text('₹${f.amount.toStringAsFixed(2)}'))),
          ],
        ],
      ),
    );
  }

  void _showRouteChangeSheet(BuildContext context, String tripId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _RouteChangeSheet(tripId: tripId, repository: _repository),
    );
  }
}

class _RouteChangeSheet extends StatefulWidget {
  final String tripId;
  final TripRepository repository;
  const _RouteChangeSheet({required this.tripId, required this.repository});

  @override
  State<_RouteChangeSheet> createState() => _RouteChangeSheetState();
}

class _RouteChangeSheetState extends State<_RouteChangeSheet> {
  final _labelCtrl = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  bool _busy = false;
  String? _result;

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await widget.repository.requestRouteChange(
        tripId: widget.tripId,
        newStops: [
          {'label': _labelCtrl.text, 'lat': double.tryParse(_latCtrl.text) ?? 0, 'lng': double.tryParse(_lngCtrl.text) ?? 0, 'plannedWaitMinutes': 0},
        ],
        changeLat: double.tryParse(_latCtrl.text) ?? 0,
        changeLng: double.tryParse(_lngCtrl.text) ?? 0,
        reason: _reasonCtrl.text,
      );
      setState(() => _result = 'Route change requested — you\'ll be notified once it\'s approved.');
    } catch (e) {
      setState(() => _result = 'Could not submit that route change (it may be outside what your trip allows).');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Add a stop / change route', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: _labelCtrl, decoration: const InputDecoration(labelText: 'New stop label')),
          Row(children: [
            Expanded(child: TextField(controller: _latCtrl, decoration: const InputDecoration(labelText: 'Lat'))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _lngCtrl, decoration: const InputDecoration(labelText: 'Lng'))),
          ]),
          TextField(controller: _reasonCtrl, decoration: const InputDecoration(labelText: 'Reason (optional)')),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Submitting…' : 'Request change')),
          if (_result != null) Padding(padding: const EdgeInsets.only(top: 8, bottom: 16), child: Text(_result!)),
        ],
      ),
    );
  }
}
