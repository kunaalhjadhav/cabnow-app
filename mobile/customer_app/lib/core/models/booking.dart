import 'stop.dart';
import 'fare_breakdown.dart';
import 'trip.dart';

class Booking {
  final String id;
  final String status;
  final String type;
  final String pickupLabel;
  final String dropLabel;
  final double? estimatedFare;
  final double? estimatedDistanceKm;
  final int? estimatedDurationMinutes;
  final List<TripStopModel> stops;
  final List<FareLine> fareBreakdowns;
  final Trip? trip;

  Booking({
    required this.id,
    required this.status,
    required this.type,
    required this.pickupLabel,
    required this.dropLabel,
    this.estimatedFare,
    this.estimatedDistanceKm,
    this.estimatedDurationMinutes,
    this.stops = const [],
    this.fareBreakdowns = const [],
    this.trip,
  });

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
        id: json['id'],
        status: json['status'],
        type: json['type'],
        pickupLabel: json['pickupLabel'],
        dropLabel: json['dropLabel'],
        estimatedFare: json['estimatedFare'] != null ? double.parse(json['estimatedFare'].toString()) : null,
        estimatedDistanceKm:
            json['estimatedDistanceKm'] != null ? double.parse(json['estimatedDistanceKm'].toString()) : null,
        estimatedDurationMinutes: json['estimatedDurationMinutes'],
        stops: (json['stops'] as List? ?? []).map((s) => TripStopModel.fromJson(s)).toList(),
        fareBreakdowns: (json['fareBreakdowns'] as List? ?? []).map((f) => FareLine.fromJson(f)).toList(),
        trip: json['trip'] != null ? Trip.fromJson(json['trip']) : null,
      );
}
