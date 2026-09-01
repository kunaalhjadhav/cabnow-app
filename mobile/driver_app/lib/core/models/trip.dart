class DriverTrip {
  final String id;
  final String status;
  final String? otpCode;
  final Map<String, dynamic>? booking;
  final List<dynamic> stops;

  DriverTrip({required this.id, required this.status, this.otpCode, this.booking, this.stops = const []});

  factory DriverTrip.fromJson(Map<String, dynamic> json) => DriverTrip(
        id: json['id'],
        status: json['status'],
        otpCode: json['otpCode'],
        booking: json['booking'],
        stops: json['stops'] ?? [],
      );
}
