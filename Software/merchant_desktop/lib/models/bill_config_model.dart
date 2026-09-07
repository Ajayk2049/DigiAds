class BillConfigModel {
  String logoUrl;
  String restaurantName;
  String addressLine1;
  String addressLine2;
  String cityZip;
  String gstin;
  String fssaiNo;
  String phone;
  String billPrefix;
  bool showKOTNumbers;
  bool showCovers;
  bool showCustomerDetail;
  double cgstPercent;
  double sgstPercent;
  double serviceTaxPercent;
  bool enableAutoRoundOff;
  String thankYouMessage;
  bool showThankYouMessage;
  String crmContactName;
  String crmContactPhone;
  String deliveryPhone;
  bool showPoweredBy;
  String customWatermark;
  String billWidthFormat; // '80mm' | '58mm'
  String qrImageUrl;
  String qrCaption;

  BillConfigModel({
    this.logoUrl = '',
    this.restaurantName = '',
    this.addressLine1 = '',
    this.addressLine2 = '',
    this.cityZip = '',
    this.gstin = '',
    this.fssaiNo = '',
    this.phone = '',
    this.billPrefix = 'INV',
    this.showKOTNumbers = true,
    this.showCovers = true,
    this.showCustomerDetail = true,
    this.cgstPercent = 2.5,
    this.sgstPercent = 2.5,
    this.serviceTaxPercent = 0.0,
    this.enableAutoRoundOff = true,
    this.thankYouMessage = 'Thank You & Visit Again !',
    this.showThankYouMessage = true,
    this.crmContactName = '',
    this.crmContactPhone = '',
    this.deliveryPhone = '',
    this.showPoweredBy = true,
    this.customWatermark = 'POWERED BY - DIGIADS',
    this.billWidthFormat = '80mm',
    this.qrImageUrl = '',
    this.qrCaption = '',
  });

  factory BillConfigModel.fromJson(Map<String, dynamic> json) {
    return BillConfigModel(
      logoUrl: json['logoUrl'] ?? '',
      restaurantName: json['restaurantName'] ?? '',
      addressLine1: json['addressLine1'] ?? '',
      addressLine2: json['addressLine2'] ?? '',
      cityZip: json['cityZip'] ?? '',
      gstin: json['gstin'] ?? '',
      fssaiNo: json['fssaiNo'] ?? '',
      phone: json['phone'] ?? '',
      billPrefix: json['billPrefix'] ?? 'INV',
      showKOTNumbers: json['showKOTNumbers'] ?? true,
      showCovers: json['showCovers'] ?? true,
      showCustomerDetail: json['showCustomerDetail'] ?? true,
      cgstPercent: (json['cgstPercent'] as num?)?.toDouble() ?? 2.5,
      sgstPercent: (json['sgstPercent'] as num?)?.toDouble() ?? 2.5,
      serviceTaxPercent: (json['serviceTaxPercent'] as num?)?.toDouble() ?? 0.0,
      enableAutoRoundOff: json['enableAutoRoundOff'] ?? true,
      thankYouMessage: json['thankYouMessage'] ?? 'Thank You & Visit Again !',
      showThankYouMessage: json['showThankYouMessage'] ?? true,
      crmContactName: json['crmContactName'] ?? '',
      crmContactPhone: json['crmContactPhone'] ?? '',
      deliveryPhone: json['deliveryPhone'] ?? '',
      showPoweredBy: json['showPoweredBy'] ?? true,
      customWatermark: json['customWatermark'] ?? 'POWERED BY - DIGIADS',
      billWidthFormat: json['billWidthFormat'] ?? '80mm',
      qrImageUrl: json['qrImageUrl'] ?? json['footerQrUrl'] ?? '',
      qrCaption: json['qrCaption'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'logoUrl': logoUrl,
      'restaurantName': restaurantName,
      'addressLine1': addressLine1,
      'addressLine2': addressLine2,
      'cityZip': cityZip,
      'gstin': gstin,
      'fssaiNo': fssaiNo,
      'phone': phone,
      'billPrefix': billPrefix,
      'showKOTNumbers': showKOTNumbers,
      'showCovers': showCovers,
      'showCustomerDetail': showCustomerDetail,
      'cgstPercent': cgstPercent,
      'sgstPercent': sgstPercent,
      'serviceTaxPercent': serviceTaxPercent,
      'enableAutoRoundOff': enableAutoRoundOff,
      'thankYouMessage': thankYouMessage,
      'showThankYouMessage': showThankYouMessage,
      'crmContactName': crmContactName,
      'crmContactPhone': crmContactPhone,
      'deliveryPhone': deliveryPhone,
      'showPoweredBy': showPoweredBy,
      'customWatermark': customWatermark,
      'billWidthFormat': billWidthFormat,
      'qrImageUrl': qrImageUrl,
      'footerQrUrl': qrImageUrl,
      'qrCaption': qrCaption,
    };
  }
}
