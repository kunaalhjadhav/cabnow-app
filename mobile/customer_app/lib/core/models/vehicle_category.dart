class VehicleCategory {
  final String id;
  final String name;
  final int seatingCapacity;
  final String? iconUrl;

  VehicleCategory({required this.id, required this.name, required this.seatingCapacity, this.iconUrl});

  factory VehicleCategory.fromJson(Map<String, dynamic> json) => VehicleCategory(
        id: json['id'],
        name: json['name'],
        seatingCapacity: json['seatingCapacity'] ?? 4,
        iconUrl: json['iconUrl'],
      );
}
