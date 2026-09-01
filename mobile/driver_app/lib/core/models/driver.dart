class DriverProfile {
  final String id;
  final String userId;
  final String kycStatus;
  final String status;
  final bool isOnline;
  final double rating;
  final int totalTrips;

  DriverProfile({
    required this.id,
    required this.userId,
    required this.kycStatus,
    required this.status,
    required this.isOnline,
    required this.rating,
    required this.totalTrips,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) => DriverProfile(
        id: json['id'],
        userId: json['userId'],
        kycStatus: json['kycStatus'] ?? 'NOT_SUBMITTED',
        status: json['status'] ?? 'PENDING',
        isOnline: json['isOnline'] ?? false,
        rating: json['rating'] != null ? double.parse(json['rating'].toString()) : 5.0,
        totalTrips: json['totalTrips'] ?? 0,
      );
}
