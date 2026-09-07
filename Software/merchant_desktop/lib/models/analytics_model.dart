class AnalyticsTopSeller {
  final String name;
  final int qty;
  final int totalAmount; // in paise
  final String? imageUrl;

  AnalyticsTopSeller({
    required this.name,
    required this.qty,
    required this.totalAmount,
    this.imageUrl,
  });

  factory AnalyticsTopSeller.fromJson(Map<String, dynamic> json) {
    return AnalyticsTopSeller(
      name: json['name'] ?? '',
      qty: (json['qty'] as num?)?.toInt() ?? 0,
      totalAmount: (json['totalAmount'] as num?)?.toInt() ?? 0,
      imageUrl: json['imageUrl'],
    );
  }
}

class AnalyticsRankedItem {
  final String name;
  final int qty;
  final int totalAmount;
  final String? imageUrl;

  AnalyticsRankedItem({
    required this.name,
    required this.qty,
    required this.totalAmount,
    this.imageUrl,
  });

  factory AnalyticsRankedItem.fromJson(Map<String, dynamic> json) {
    return AnalyticsRankedItem(
      name: json['name'] ?? '',
      qty: (json['qty'] as num?)?.toInt() ?? 0,
      totalAmount: (json['totalAmount'] as num?)?.toInt() ?? 0,
      imageUrl: json['imageUrl'],
    );
  }
}

class AnalyticsSlotData {
  final AnalyticsTopSeller? topSeller;
  final List<AnalyticsRankedItem> rankedItems;

  AnalyticsSlotData({
    this.topSeller,
    this.rankedItems = const [],
  });

  factory AnalyticsSlotData.fromJson(Map<String, dynamic> json) {
    final rawRanked = json['rankedItems'] as List<dynamic>? ?? [];
    final ranked = rawRanked.map((e) => AnalyticsRankedItem.fromJson(e as Map<String, dynamic>)).toList();
    final topSeller = json['topSeller'] != null ? AnalyticsTopSeller.fromJson(json['topSeller'] as Map<String, dynamic>) : null;

    return AnalyticsSlotData(
      topSeller: topSeller,
      rankedItems: ranked,
    );
  }
}

class AnalyticsTableTurnover {
  final String tableNumber;
  final int orderCount;
  final int totalAmount;

  AnalyticsTableTurnover({
    required this.tableNumber,
    required this.orderCount,
    required this.totalAmount,
  });

  factory AnalyticsTableTurnover.fromJson(Map<String, dynamic> json) {
    return AnalyticsTableTurnover(
      tableNumber: json['tableNumber']?.toString() ?? '',
      orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
      totalAmount: (json['totalAmount'] as num?)?.toInt() ?? 0,
    );
  }
}

class AnalyticsModel {
  final String venueName;
  final int totalRevenuePaise;
  final int totalCompletedOrders;
  final int avgOrderValuePaise;
  final String peakSlotName;
  final Map<String, AnalyticsSlotData> slots;
  final AnalyticsTableTurnover? mostActiveTable;
  final AnalyticsTableTurnover? leastActiveTable;

  AnalyticsModel({
    required this.venueName,
    required this.totalRevenuePaise,
    required this.totalCompletedOrders,
    required this.avgOrderValuePaise,
    required this.peakSlotName,
    required this.slots,
    this.mostActiveTable,
    this.leastActiveTable,
  });

  factory AnalyticsModel.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? {};
    final rawSlots = json['slots'] as Map<String, dynamic>? ?? {};
    final slotsMap = <String, AnalyticsSlotData>{};

    rawSlots.forEach((k, v) {
      if (v is Map<String, dynamic>) {
        slotsMap[k] = AnalyticsSlotData.fromJson(v);
      }
    });

    final tables = json['tables'] as Map<String, dynamic>? ?? {};

    return AnalyticsModel(
      venueName: json['venueName'] ?? '',
      totalRevenuePaise: (summary['totalRevenuePaise'] as num?)?.toInt() ?? 0,
      totalCompletedOrders: (summary['totalCompletedOrders'] as num?)?.toInt() ?? 0,
      avgOrderValuePaise: (summary['avgOrderValuePaise'] as num?)?.toInt() ?? 0,
      peakSlotName: summary['peakSlotName'] ?? '--',
      slots: slotsMap,
      mostActiveTable: tables['mostActiveTable'] != null
          ? AnalyticsTableTurnover.fromJson(tables['mostActiveTable'] as Map<String, dynamic>)
          : null,
      leastActiveTable: tables['leastActiveTable'] != null
          ? AnalyticsTableTurnover.fromJson(tables['leastActiveTable'] as Map<String, dynamic>)
          : null,
    );
  }
}
