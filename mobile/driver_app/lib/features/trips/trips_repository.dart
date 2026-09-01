import '../../core/network/api_client.dart';
import '../../core/models/trip.dart';

class TripsRepository {
  final _api = ApiClient.instance.dio;

  Future<List<DriverTrip>> myTrips({String? status}) async {
    final response = await _api.get('/trips/driver/mine', queryParameters: status != null ? {'status': status} : null);
    return (response.data as List).map((e) => DriverTrip.fromJson(e)).toList();
  }

  Future<DriverTrip> getTrip(String id) async {
    final response = await _api.get('/trips/$id');
    return DriverTrip.fromJson(response.data);
  }

  Future<void> markArriving(String id) => _api.patch('/trips/$id/driver-arriving');
  Future<void> markArrived(String id) => _api.patch('/trips/$id/driver-arrived');
  Future<void> verifyOtp(String id, String otpCode) => _api.post('/trips/$id/verify-otp', data: {'otpCode': otpCode});
  Future<void> startTrip(String id) => _api.patch('/trips/$id/start');
  Future<void> arriveAtStop(String tripId, String tripStopId) => _api.post('/trips/$tripId/stops/arrive', data: {'tripStopId': tripStopId});
  Future<void> departStop(String tripId, String tripStopId) => _api.post('/trips/$tripId/stops/depart', data: {'tripStopId': tripStopId});

  Future<Map<String, dynamic>> completeTrip(
    String id, {
    double? actualDistanceKm,
    int? actualDurationMinutes,
    double? tollAmount,
    double? parkingAmount,
  }) async {
    final response = await _api.post('/trips/$id/complete', data: {
      if (actualDistanceKm != null) 'actualDistanceKm': actualDistanceKm,
      if (actualDurationMinutes != null) 'actualDurationMinutes': actualDurationMinutes,
      if (tollAmount != null) 'tollAmount': tollAmount,
      if (parkingAmount != null) 'parkingAmount': parkingAmount,
    });
    return Map<String, dynamic>.from(response.data);
  }
}
