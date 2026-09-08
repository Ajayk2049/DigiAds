class OrderItemModel {
  final String? itemId;
  final String name;
  final int price; // in paise
  final int quantity;
  final bool isPacked;
  final bool isVeg;
  final String customization;

  OrderItemModel({
    this.itemId,
    required this.name,
    required this.price,
    required this.quantity,
    this.isPacked = false,
    this.isVeg = true,
    this.customization = '',
  });

  double get priceInRupees => price / 100.0;
  double get totalInRupees => (price * quantity) / 100.0;

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      itemId: json['itemId'],
      name: json['name'] ?? 'Dish Item',
      price: (json['price'] as num?)?.toInt() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      isPacked: json['isPacked'] ?? false,
      isVeg: json['isVeg'] ?? true,
      customization: json['customization'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (itemId != null) 'itemId': itemId,
      'name': name,
      'price': price,
      'quantity': quantity,
      'isPacked': isPacked,
      'isVeg': isVeg,
      if (customization.isNotEmpty) 'customization': customization,
    };
  }
}

class OrderModel {
  final String id;
  final String orderId;
  final String hostApplicationId;
  final String tableNumber;
  final String orderType; // 'DINE_IN' | 'TAKEOUT'
  final List<OrderItemModel> items;
  final int totalAmount; // in paise
  final int subtotalAmount;
  final int cgstAmount;
  final int sgstAmount;
  final int serviceTaxAmount;
  final int roundOffAmount;
  final double cgstPercent;
  final double sgstPercent;
  final double serviceTaxPercent;
  final bool isGstExempt;
  final bool isServiceTaxExempt;
  final String orderStatus; // 'placed' | 'cooking' | 'served' | 'cancelled'
  final String paymentStatus; // 'pending' | 'paid' | 'cancelled'
  final String? paymentType; // 'UPI' | 'CASH'
  final String? tableStatus; // 'open' | 'close_table'
  final String waiterCallStatus; // 'none' | 'pending' | 'serviced'
  final String? waiterCallOption;
  final int waiterCallCount;
  final DateTime createdAt;
  final DateTime? updatedAt;

  OrderModel({
    required this.id,
    required this.orderId,
    required this.hostApplicationId,
    required this.tableNumber,
    this.orderType = 'DINE_IN',
    required this.items,
    required this.totalAmount,
    this.subtotalAmount = 0,
    this.cgstAmount = 0,
    this.sgstAmount = 0,
    this.serviceTaxAmount = 0,
    this.roundOffAmount = 0,
    this.cgstPercent = 2.5,
    this.sgstPercent = 2.5,
    this.serviceTaxPercent = 0.0,
    this.isGstExempt = false,
    this.isServiceTaxExempt = false,
    required this.orderStatus,
    required this.paymentStatus,
    this.paymentType,
    this.tableStatus,
    this.waiterCallStatus = 'none',
    this.waiterCallOption,
    this.waiterCallCount = 0,
    required this.createdAt,
    this.updatedAt,
  });

  double get totalInRupees => totalAmount / 100.0;
  double get subtotalInRupees => subtotalAmount > 0
      ? subtotalAmount / 100.0
      : items.fold(0.0, (sum, i) => sum + i.totalInRupees);
  double get cgstInRupees => cgstAmount / 100.0;
  double get sgstInRupees => sgstAmount / 100.0;
  double get serviceTaxInRupees => serviceTaxAmount / 100.0;
  double get roundOffInRupees => roundOffAmount / 100.0;

  bool get isTakeout => orderType == 'TAKEOUT' || tableNumber == 'TAKEOUT';

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems.map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>)).toList();

    return OrderModel(
      id: json['_id'] ?? json['id'] ?? '',
      orderId: json['orderId'] ?? '',
      hostApplicationId: json['hostApplicationId'] is Map
          ? (json['hostApplicationId']['_id'] ?? '')
          : (json['hostApplicationId'] ?? ''),
      tableNumber: json['tableNumber']?.toString() ?? '',
      orderType: json['orderType'] ?? 'DINE_IN',
      items: itemsList,
      totalAmount: (json['totalAmount'] as num?)?.toInt() ?? 0,
      subtotalAmount: (json['subtotalAmount'] as num?)?.toInt() ?? 0,
      cgstAmount: (json['cgstAmount'] as num?)?.toInt() ?? 0,
      sgstAmount: (json['sgstAmount'] as num?)?.toInt() ?? 0,
      serviceTaxAmount: (json['serviceTaxAmount'] as num?)?.toInt() ?? 0,
      roundOffAmount: (json['roundOffAmount'] as num?)?.toInt() ?? 0,
      cgstPercent: (json['cgstPercent'] as num?)?.toDouble() ?? 2.5,
      sgstPercent: (json['sgstPercent'] as num?)?.toDouble() ?? 2.5,
      serviceTaxPercent: (json['serviceTaxPercent'] as num?)?.toDouble() ?? 0.0,
      isGstExempt: json['isGstExempt'] ?? false,
      isServiceTaxExempt: json['isServiceTaxExempt'] ?? false,
      orderStatus: json['orderStatus'] ?? 'placed',
      paymentStatus: json['paymentStatus'] ?? 'pending',
      paymentType: json['paymentType'],
      tableStatus: json['tableStatus'],
      waiterCallStatus: json['waiterCallStatus'] ?? 'none',
      waiterCallOption: json['waiterCallOption'],
      waiterCallCount: (json['waiterCallCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }
}
