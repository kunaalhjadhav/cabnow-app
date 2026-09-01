import '../../core/network/api_client.dart';
import '../../core/models/booking.dart';
import '../../core/models/vehicle_category.dart';
import '../../core/models/stop.dart';

class BookingRepository {
  final _api = ApiClient.instance.dio;

  Future<List<VehicleCategory>> getVehicleCategories() async {
    final response = await _api.get('/vehicle-categories', queryParameters: {'activeOnly': 'true'});
    return (response.data as List).map((e) => VehicleCategory.fromJson(e)).toList();
  }

  Future<Booking> createBooking({
    required String categoryId,
    required String pickupLabel,
    required double pickupLat,
    required double pickupLng,
    required String dropLabel,
    required double dropLat,
    required double dropLng,
    List<TripStopModel> stops = const [],
    DateTime? scheduledAt,
    String? passengerName,
    String? passengerPhone,
    String? specialInstructions,
  }) async {
    final response = await _api.post('/bookings', data: {
      'source': 'CUSTOMER_APP',
      'type': scheduledAt != null ? 'SCHEDULED' : 'IMMEDIATE',
      'categoryId': categoryId,
      'pickup': {'label': pickupLabel, 'lat': pickupLat, 'lng': pickupLng},
      'drop': {'label': dropLabel, 'lat': dropLat, 'lng': dropLng},
      'stops': stops.map((s) => s.toBookingJson()).toList(),
      if (scheduledAt != null) 'scheduledAt': scheduledAt.toIso8601String(),
      if (passengerName != null) 'passengerName': passengerName,
      if (passengerPhone != null) 'passengerPhone': passengerPhone,
      if (specialInstructions != null) 'specialInstructions': specialInstructions,
    });
    return Booking.fromJson(response.data);
  }

  Future<Booking> getBooking(String id) async {
    final response = await _api.get('/bookings/$id');
    return Booking.fromJson(response.data);
  }

  Future<void> cancelBooking(String id, {String? reason}) async {
    await _api.patch('/bookings/$id/cancel', data: {if (reason != null) 'reason': reason});
  }

  Future<List<Booking>> myTripHistory() async {
    final response = await _api.get('/customers/me/trips');
    return (response.data as List).map((e) => Booking.fromJson(e)).toList();
  }
}
