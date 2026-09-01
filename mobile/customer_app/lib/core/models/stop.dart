class TripStopModel {
  final String id;
  final int sequence;
  final String label;
  final double lat;
  final double lng;
  final int plannedWaitMinutes;
  final String status;

  TripStopModel({
    required this.id,
    required this.sequence,
    required this.label,
    required this.lat,
    required this.lng,
    required this.plannedWaitMinutes,
    required this.status,
  });

  factory TripStopModel.fromJson(Map<String, dynamic> json) => TripStopModel(
        id: json['id'],
        sequence: json['sequence'],
        label: json['label'],
        lat: double.parse(json['lat'].toString()),
        lng: double.parse(json['lng'].toString()),
        plannedWaitMinutes: json['plannedWaitMinutes'] ?? 0,
        status: json['status'] ?? 'PENDING',
      );

  Map<String, dynamic> toBookingJson() => {
        'label': label,
        'lat': lat,
        'lng': lng,
        'plannedWaitMinutes': plannedWaitMinutes,
      };
}
