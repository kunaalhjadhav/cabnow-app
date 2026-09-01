import 'package:flutter/material.dart';
import '../../core/models/vehicle_category.dart';
import '../../core/models/stop.dart';
import 'booking_repository.dart';
import '../trip/live_trip_screen.dart';

class VehicleSelectScreen extends StatefulWidget {
  final String pickupLabel;
  final double pickupLat;
  final double pickupLng;
  final String dropLabel;
  final double dropLat;
  final double dropLng;
  final List<TripStopModel> stops;

  const VehicleSelectScreen({
    super.key,
    required this.pickupLabel,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLabel,
    required this.dropLat,
    required this.dropLng,
    this.stops = const [],
  });

  @override
  State<VehicleSelectScreen> createState() => _VehicleSelectScreenState();
}

class _VehicleSelectScreenState extends State<VehicleSelectScreen> {
  final _repository = BookingRepository();
  List<VehicleCategory> _categories = [];
  String? _selectedCategoryId;
  bool _loading = true;
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final categories = await _repository.getVehicleCategories();
    setState(() {
      _categories = categories;
      _selectedCategoryId = categories.isNotEmpty ? categories.first.id : null;
      _loading = false;
    });
  }

  Future<void> _confirmBooking() async {
    if (_selectedCategoryId == null) return;
    setState(() => _booking = true);
    try {
      final booking = await _repository.createBooking(
        categoryId: _selectedCategoryId!,
        pickupLabel: widget.pickupLabel,
        pickupLat: widget.pickupLat,
        pickupLng: widget.pickupLng,
        dropLabel: widget.dropLabel,
        dropLat: widget.dropLat,
        dropLng: widget.dropLng,
        stops: widget.stops,
      );
      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => LiveTripScreen(bookingId: booking.id)));
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a vehicle')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('${widget.pickupLabel} → ${widget.dropLabel}', style: const TextStyle(color: Colors.black54)),
                const SizedBox(height: 16),
                ..._categories.map((c) => RadioListTile<String>(
                      value: c.id,
                      groupValue: _selectedCategoryId,
                      onChanged: (v) => setState(() => _selectedCategoryId = v),
                      title: Text(c.name),
                      subtitle: Text('${c.seatingCapacity} seats'),
                    )),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _booking ? null : _confirmBooking,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(_booking ? 'Booking…' : 'Confirm booking'),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'The exact fare estimate (base fare, distance, time, surcharges, taxes) is shown on the next '
                  'screen once the booking is created — it comes from the backend\'s configurable pricing engine.',
                  style: TextStyle(fontSize: 12, color: Colors.black45),
                ),
              ],
            ),
    );
  }
}
