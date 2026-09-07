class HostApplicationModel {
  final String id;
  final String outletName;
  final String outletDescription;
  final String doorNo;
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String contactPerson;
  final String phone;
  final String email;
  final double? latitude;
  final double? longitude;
  final bool requestTablet;
  final int tabletQuantity;
  final bool requestScreen;
  final int screenQuantity;
  final String adMode; // 'open' | 'closed'
  final bool allowOpenAds;
  final String status; // 'pending' | 'approved' | 'rejected'
  final DateTime? createdAt;

  HostApplicationModel({
    required this.id,
    required this.outletName,
    required this.outletDescription,
    required this.doorNo,
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.contactPerson,
    required this.phone,
    required this.email,
    this.latitude,
    this.longitude,
    required this.requestTablet,
    required this.tabletQuantity,
    required this.requestScreen,
    required this.screenQuantity,
    required this.adMode,
    required this.allowOpenAds,
    required this.status,
    this.createdAt,
  });

  factory HostApplicationModel.fromJson(Map<String, dynamic> json) {
    return HostApplicationModel(
      id: json['_id'] ?? json['id'] ?? '',
      outletName: json['outletName'] ?? '',
      outletDescription: json['outletDescription'] ?? '',
      doorNo: json['doorNo'] ?? '',
      street: json['street'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      zipCode: json['zipCode'] ?? '',
      contactPerson: json['contactPerson'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      requestTablet: json['requestTablet'] ?? false,
      tabletQuantity: (json['tabletQuantity'] as num?)?.toInt() ?? 1,
      requestScreen: json['requestScreen'] ?? false,
      screenQuantity: (json['screenQuantity'] as num?)?.toInt() ?? 1,
      adMode: json['adMode'] ?? (json['allowOpenAds'] == false ? 'closed' : 'open'),
      allowOpenAds: json['allowOpenAds'] ?? true,
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'outletName': outletName,
      'outletDescription': outletDescription,
      'doorNo': doorNo,
      'street': street,
      'city': city,
      'state': state,
      'zipCode': zipCode,
      'contactPerson': contactPerson,
      'phone': phone,
      'email': email,
      'latitude': latitude,
      'longitude': longitude,
      'requestTablet': requestTablet,
      'tabletQuantity': tabletQuantity,
      'requestScreen': requestScreen,
      'screenQuantity': screenQuantity,
      'adMode': adMode,
      'allowOpenAds': allowOpenAds,
      'status': status,
    };
  }
}
