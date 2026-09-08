class MenuItemModel {
  final String itemId;
  String name;
  String description;
  int price; // in paise
  String category;
  bool isAvailable;
  String imageUrl;
  bool isVeg;
  bool isPopular;
  bool isAllShifts;
  List<String> shifts;

  MenuItemModel({
    required this.itemId,
    required this.name,
    this.description = '',
    required this.price,
    required this.category,
    this.isAvailable = true,
    this.imageUrl = '',
    this.isVeg = true,
    this.isPopular = false,
    this.isAllShifts = false,
    this.shifts = const ['Breakfast'],
  });

  double get priceInRupees => price / 100.0;

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final rawShifts = (json['shifts'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final bool isAllShiftsExplicit = json['isAllShifts'] == true;
    final bool isAllShifts = isAllShiftsExplicit || rawShifts.isEmpty;

    return MenuItemModel(
      itemId: json['itemId'] ?? json['_id'] ?? json['id'] ?? 'item_${DateTime.now().millisecondsSinceEpoch}',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toInt() ?? 0,
      category: json['category'] ?? 'Starters',
      isAvailable: json['isAvailable'] ?? true,
      imageUrl: json['imageUrl'] ?? '',
      isVeg: json['isVeg'] ?? true,
      isPopular: json['isPopular'] ?? false,
      isAllShifts: isAllShifts,
      shifts: rawShifts.isNotEmpty ? rawShifts : const ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'itemId': itemId,
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'isAvailable': isAvailable,
      'imageUrl': imageUrl,
      'isVeg': isVeg,
      'isPopular': isPopular,
      'isAllShifts': isAllShifts,
      'shifts': isAllShifts ? [] : shifts,
    };
  }

  MenuItemModel copyWith({
    String? itemId,
    String? name,
    String? description,
    int? price,
    String? category,
    bool? isAvailable,
    String? imageUrl,
    bool? isVeg,
    bool? isPopular,
    bool? isAllShifts,
    List<String>? shifts,
  }) {
    return MenuItemModel(
      itemId: itemId ?? this.itemId,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      category: category ?? this.category,
      isAvailable: isAvailable ?? this.isAvailable,
      imageUrl: imageUrl ?? this.imageUrl,
      isVeg: isVeg ?? this.isVeg,
      isPopular: isPopular ?? this.isPopular,
      isAllShifts: isAllShifts ?? this.isAllShifts,
      shifts: shifts ?? List.from(this.shifts),
    );
  }
}

class MenuModel {
  final String id;
  final String hostApplicationId;
  final List<MenuItemModel> items;
  final List<String> categories;
  final Map<String, String> categoryIcons;
  final List<String> shifts;
  final String activeShift;

  MenuModel({
    required this.id,
    required this.hostApplicationId,
    required this.items,
    required this.categories,
    required this.categoryIcons,
    required this.shifts,
    required this.activeShift,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems.map((e) => MenuItemModel.fromJson(e as Map<String, dynamic>)).toList();

    final rawCats = json['categories'] as List<dynamic>? ?? [];
    final catsList = <String>[];
    final iconsMap = <String, String>{};

    for (final c in rawCats) {
      if (c is Map) {
        final name = (c['name'] as String? ?? '').trim();
        final icon = (c['icon'] as String? ?? '').trim();
        if (name.isNotEmpty) {
          catsList.add(name);
          if (icon.isNotEmpty) {
            iconsMap[name.toLowerCase()] = icon;
          }
        }
      } else if (c != null) {
        final name = c.toString().trim();
        if (name.isNotEmpty) catsList.add(name);
      }
    }

    final rawShifts = json['shifts'] as List<dynamic>? ?? [];
    final shiftsList = rawShifts.map((e) => e.toString()).toList();

    return MenuModel(
      id: json['_id'] ?? json['id'] ?? '',
      hostApplicationId: json['hostApplicationId'] ?? '',
      items: itemsList,
      categories: catsList.isNotEmpty ? catsList : ['Starters', 'Main Course', 'Dessert', 'Beverages'],
      categoryIcons: iconsMap,
      shifts: shiftsList.isNotEmpty ? shiftsList : ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      activeShift: json['activeShift'] ?? 'Breakfast',
    );
  }
}
