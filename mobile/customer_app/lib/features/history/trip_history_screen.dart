import 'package:flutter/material.dart';
import '../booking/booking_repository.dart';
import '../../core/models/booking.dart';

class TripHistoryScreen extends StatefulWidget {
  const TripHistoryScreen({super.key});

  @override
  State<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends State<TripHistoryScreen> {
  final _repository = BookingRepository();
  List<Booking> _bookings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final bookings = await _repository.myTripHistory();
    setState(() {
      _bookings = bookings;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip history')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _bookings.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final b = _bookings[i];
                  return ListTile(
                    title: Text('${b.pickupLabel} → ${b.dropLabel}'),
                    subtitle: Text(b.status),
                    trailing: Text(b.trip?.finalFare != null ? '₹${b.trip!.finalFare}' : (b.estimatedFare != null ? '₹${b.estimatedFare} (est.)' : '')),
                  );
                },
              ),
            ),
    );
  }
}
