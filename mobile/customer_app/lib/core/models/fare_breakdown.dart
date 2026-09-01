class FareLine {
  final String lineType;
  final String label;
  final double amount;

  FareLine({required this.lineType, required this.label, required this.amount});

  factory FareLine.fromJson(Map<String, dynamic> json) => FareLine(
        lineType: json['lineType'],
        label: json['label'],
        amount: (json['amount'] as num).toDouble(),
      );
}
