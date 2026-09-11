class CustomizationOption {
  String name;
  int extraPrice; // in paise
  bool isDefault;

  CustomizationOption({
    required this.name,
    this.extraPrice = 0,
    this.isDefault = false,
  });

  double get extraPriceInRupees => extraPrice / 100.0;

  factory CustomizationOption.fromJson(Map<String, dynamic> json) {
    return CustomizationOption(
      name: json['name']?.toString() ?? '',
      extraPrice: (json['extraPrice'] as num?)?.toInt() ?? 0,
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'extraPrice': extraPrice,
      'isDefault': isDefault,
    };
  }

  CustomizationOption copyWith({
    String? name,
    int? extraPrice,
    bool? isDefault,
  }) {
    return CustomizationOption(
      name: name ?? this.name,
      extraPrice: extraPrice ?? this.extraPrice,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}

class CustomizationGroup {
  String title;
  String pricingType; // 'addon' | 'direct'
  bool isMultiple;
  bool isRequired;
  List<CustomizationOption> options;

  CustomizationGroup({
    required this.title,
    this.pricingType = 'addon',
    this.isMultiple = false,
    this.isRequired = false,
    List<CustomizationOption>? options,
  }) : options = options ?? [];

  bool get isDirect => pricingType == 'direct';

  factory CustomizationGroup.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'] as List<dynamic>? ?? [];
    final opts = rawOptions.map((e) => CustomizationOption.fromJson(e as Map<String, dynamic>)).toList();
    final pType = json['pricingType']?.toString() == 'direct' ? 'direct' : 'addon';

    return CustomizationGroup(
      title: json['title']?.toString() ?? '',
      pricingType: pType,
      isMultiple: pType == 'direct' ? false : (json['isMultiple'] == true),
      isRequired: json['isRequired'] == true,
      options: opts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'pricingType': pricingType,
      'isMultiple': isDirect ? false : isMultiple,
      'isRequired': isRequired,
      'options': options.map((e) => e.toJson()).toList(),
    };
  }

  CustomizationGroup copyWith({
    String? title,
    String? pricingType,
    bool? isMultiple,
    bool? isRequired,
    List<CustomizationOption>? options,
  }) {
    return CustomizationGroup(
      title: title ?? this.title,
      pricingType: pricingType ?? this.pricingType,
      isMultiple: isMultiple ?? this.isMultiple,
      isRequired: isRequired ?? this.isRequired,
      options: options ?? this.options.map((e) => e.copyWith()).toList(),
    );
  }
}

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
  List<CustomizationGroup> customizations;

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
    List<CustomizationGroup>? customizations,
  }) : customizations = customizations ?? [];

  double get priceInRupees => price / 100.0;
  bool get hasCustomizations => customizations.isNotEmpty && customizations.any((g) => g.options.isNotEmpty);

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final rawShifts = (json['shifts'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final bool isAllShiftsExplicit = json['isAllShifts'] == true;
    final bool isAllShifts = isAllShiftsExplicit || rawShifts.isEmpty;

    final rawCust = json['customizations'] as List<dynamic>? ?? [];
    final custList = rawCust.map((e) => CustomizationGroup.fromJson(e as Map<String, dynamic>)).toList();

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
      customizations: custList,
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
      'customizations': customizations.map((e) => e.toJson()).toList(),
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
    List<CustomizationGroup>? customizations,
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
      customizations: customizations ?? this.customizations.map((e) => e.copyWith()).toList(),
    );
  }
}

class MenuModel {
  final String id;
  final String hostApplicationId;
  final List<MenuItemModel> items;
  final List<String> categories;
  final Map<String, String> categoryIcons;
  final String popularCategoryName;
  final String popularCategoryIcon;
  final List<String> shifts;
  final String activeShift;

  MenuModel({
    required this.id,
    required this.hostApplicationId,
    required this.items,
    required this.categories,
    required this.categoryIcons,
    this.popularCategoryName = 'Popular',
    this.popularCategoryIcon = 'star',
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

    final rawPopular = json['popularCategory'];
    final popName = (rawPopular is Map ? rawPopular['name'] as String? : null)?.trim();
    final popIcon = (rawPopular is Map ? rawPopular['icon'] as String? : null)?.trim();

    final rawShifts = json['shifts'] as List<dynamic>? ?? [];
    final shiftsList = rawShifts.map((e) => e.toString()).toList();

    return MenuModel(
      id: json['_id'] ?? json['id'] ?? '',
      hostApplicationId: json['hostApplicationId'] ?? '',
      items: itemsList,
      categories: catsList.isNotEmpty ? catsList : ['Starters', 'Main Course', 'Dessert', 'Beverages'],
      categoryIcons: iconsMap,
      popularCategoryName: (popName != null && popName.isNotEmpty) ? popName : 'Popular',
      popularCategoryIcon: (popIcon != null && popIcon.isNotEmpty) ? popIcon : 'star',
      shifts: shiftsList.isNotEmpty ? shiftsList : ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      activeShift: json['activeShift'] ?? 'Breakfast',
    );
  }
}
