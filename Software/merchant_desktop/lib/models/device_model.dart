class DeviceModel {
  final String id;
  final String deviceId;
  final String deviceType; // 'tablet' | 'screen'
  final String hostApplicationId;
  final String status; // 'online' | 'offline'
  final DateTime? lastSeen;
  final String? venueName;

  DeviceModel({
    required this.id,
    required this.deviceId,
    required this.deviceType,
    required this.hostApplicationId,
    required this.status,
    this.lastSeen,
    this.venueName,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['_id'] ?? json['id'] ?? '',
      deviceId: json['deviceId'] ?? '',
      deviceType: json['deviceType'] ?? 'tablet',
      hostApplicationId: json['hostApplicationId'] is Map
          ? (json['hostApplicationId']['_id'] ?? '')
          : (json['hostApplicationId'] ?? ''),
      status: json['status'] ?? 'offline',
      lastSeen: json['lastSeen'] != null ? DateTime.tryParse(json['lastSeen']) : null,
      venueName: json['hostApplicationId'] is Map
          ? (json['hostApplicationId']['outletName'] ?? '')
          : null,
    );
  }
}
