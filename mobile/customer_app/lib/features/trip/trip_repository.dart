import '../../core/network/api_client.dart';
import '../../core/models/booking.dart';

class TripRepository {
  final _api = ApiClient.instance.dio;

  Future<Booking> getBooking(String bookingId) async {
    final response = await _api.get('/bookings/$bookingId');
    return Booking.fromJson(response.data);
  }

  Future<void> requestRouteChange({
    required String tripId,
    required List<Map<String, dynamic>> newStops,
    required double changeLat,
    required double changeLng,
    String? reason,
  }) async {
    await _api.post('/trips/$tripId/route-changes', data: {
      'newStops': newStops,
      'changeLat': changeLat,
      'changeLng': changeLng,
      if (reason != null) 'reason': reason,
    });
  }

  Future<void> rateTrip(String tripId, {required String ratedUserId, required int score, String? comment}) async {
    await _api.post('/trips/$tripId/rate', data: {
      'ratedUserId': ratedUserId,
      'score': score,
      if (comment != null) 'comment': comment,
    });
  }
}
