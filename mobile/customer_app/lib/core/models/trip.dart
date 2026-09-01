class Trip {
  final String id;
  final String status;
  final String? otpCode;
  final String? driverId;
  final double? finalFare;

  Trip({required this.id, required this.status, this.otpCode, this.driverId, this.finalFare});

  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
        id: json['id'],
        status: json['status'],
        otpCode: json['otpCode'],
        driverId: json['driverId'],
        finalFare: json['finalFare'] != null ? double.parse(json['finalFare'].toString()) : null,
      );
}
