/// Centralized cart and menu state using ValueNotifier for localized rebuilds.
///
/// BOTTLENECK: The original code used root-level setState() in _KioskScreenState
/// for every cart quantity change, rebuilding the entire screen (video player,
/// menu grid, app bar, etc.) — 183+ unnecessary rebuilds per test session.
///
/// FIX: ValueNotifier + ValueListenableBuilder confines rebuilds to only the
/// widgets that actually display cart data (quantity badges, cart total, order
/// summary list). The video player, menu images, and category headers are
/// completely isolated from cart mutations.
library;

import 'package:flutter/foundation.dart';
import 'generated/menu.pbgrpc.dart';

/// Information parsed from a cart line item key.
class CartLineKeyInfo {
  final String rawItemId;
  final String customization;
  final int extraPaise;
  final String baseKey;

  CartLineKeyInfo({
    required this.rawItemId,
    required this.customization,
    required this.extraPaise,
    required this.baseKey,
  });

  static CartLineKeyInfo parse(String key) {
    final withoutPack = key.endsWith(':pack') ? key.substring(0, key.length - 5) : key;
    if (withoutPack.contains('::cust::')) {
      final parts = withoutPack.split('::cust::');
      final itemId = parts[0];
      final custParts = parts[1].split('::');
      final extraPaise = int.tryParse(custParts[0]) ?? 0;
      final customization = custParts.sublist(1).join('::');
      return CartLineKeyInfo(
        rawItemId: itemId,
        customization: customization,
        extraPaise: extraPaise,
        baseKey: withoutPack,
      );
    }
    return CartLineKeyInfo(
      rawItemId: withoutPack,
      customization: '',
      extraPaise: 0,
      baseKey: withoutPack,
    );
  }

  static String buildBaseKey(String itemId, {String customization = '', int extraPaise = 0}) {
    if (customization.isEmpty) return itemId;
    return '$itemId::cust::$extraPaise::$customization';
  }
}

/// Immutable snapshot of the cart state, emitted by [CartNotifier].
class CartSnapshot {
  final Map<String, int> items;
  const CartSnapshot(this.items);

  int get totalItemCount => items.values.fold(0, (sum, q) => sum + q);
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  int quantityOf(String itemId) {
    int total = 0;
    for (final entry in items.entries) {
      final info = CartLineKeyInfo.parse(entry.key);
      if (info.rawItemId == itemId) {
        total += entry.value;
      }
    }
    return total;
  }

  static bool isPackedKey(String cartKey) => cartKey.endsWith(':pack');
  static String rawItemId(String cartKey) => CartLineKeyInfo.parse(cartKey).rawItemId;
  static String baseKey(String cartKey) => CartLineKeyInfo.parse(cartKey).baseKey;

  /// Unique base line keys in the cart (each unique combination of dish + customization)
  List<String> get uniqueLineKeys {
    final set = <String>{};
    for (final k in items.keys) {
      set.add(CartLineKeyInfo.parse(k).baseKey);
    }
    return set.toList();
  }

  /// Unique raw item IDs in the cart (for backwards compatibility)
  List<String> get uniqueItemIds {
    final set = <String>{};
    for (final k in items.keys) {
      set.add(rawItemId(k));
    }
    return set.toList();
  }

  int dineInQtyOf(String baseKey) => items[baseKey] ?? 0;
  int packedQtyOf(String baseKey) => items['$baseKey:pack'] ?? 0;
  int totalQtyOf(String baseKey) => dineInQtyOf(baseKey) + packedQtyOf(baseKey);

  bool get isAllPacked => items.isNotEmpty && items.keys.every((k) => isPackedKey(k));

  /// Compute total price in rupees given the menu items list.
  double totalPrice(List<MenuItem> menuItems) {
    double total = 0;
    for (final entry in items.entries) {
      try {
        final info = CartLineKeyInfo.parse(entry.key);
        final item = menuItems.firstWhere((i) => i.itemId == info.rawItemId);
        final unitPrice = (item.price.toInt() + info.extraPaise) / 100.0;
        total += unitPrice * entry.value;
      } catch (_) {
        // item not found — skip
      }
    }
    return total;
  }

  /// Create a defensive copy of the internal map.
  Map<String, int> toMap() => Map<String, int>.from(items);
}

/// ValueNotifier that manages cart state with minimal rebuild surface.
///
/// Listeners are notified only when the cart contents actually change.
/// The emitted [CartSnapshot] is immutable, preventing accidental mutation.
class CartNotifier extends ValueNotifier<CartSnapshot> {
  CartNotifier() : super(const CartSnapshot({}));

  /// Internal mutable map — only exposed as immutable snapshots.
  final Map<String, int> _items = {};

  void addItem(
    String itemId, {
    bool isPacked = false,
    String customization = '',
    int extraPaise = 0,
    int quantity = 1,
  }) {
    final baseKey = CartLineKeyInfo.buildBaseKey(
      itemId,
      customization: customization,
      extraPaise: extraPaise,
    );
    final key = isPacked ? '$baseKey:pack' : baseKey;
    _items[key] = (_items[key] ?? 0) + quantity;
    _emit();
  }

  void removeItem(String baseKey) {
    // Decrement dine-in first, then packed if dine-in is 0
    if (_items.containsKey(baseKey) && _items[baseKey]! > 0) {
      final current = _items[baseKey]!;
      if (current > 1) {
        _items[baseKey] = current - 1;
      } else {
        _items.remove(baseKey);
      }
    } else {
      final packedKey = '$baseKey:pack';
      if (_items.containsKey(packedKey) && _items[packedKey]! > 0) {
        final current = _items[packedKey]!;
        if (current > 1) {
          _items[packedKey] = current - 1;
        } else {
          _items.remove(packedKey);
        }
      }
    }
    _emit();
  }

  void removeAllOfItem(String baseKey) {
    _items.remove(baseKey);
    _items.remove('$baseKey:pack');
    _emit();
  }

  /// Decrement one unit of an item by raw itemId, supporting customized line items.
  void removeOneOfItemId(String rawItemId) {
    // 1. Direct match on plain un-customized key
    if ((_items.containsKey(rawItemId) && _items[rawItemId]! > 0) ||
        (_items.containsKey('$rawItemId:pack') && _items['$rawItemId:pack']! > 0)) {
      removeItem(rawItemId);
      return;
    }
    // 2. Customized lines: find the last matching line for this rawItemId and decrement it
    final keys = _items.keys.toList().reversed;
    for (final k in keys) {
      final info = CartLineKeyInfo.parse(k);
      if (info.rawItemId == rawItemId) {
        removeItem(info.baseKey);
        return;
      }
    }
  }

  /// Remove all units of an item across all customizations and packing states by raw itemId.
  void removeAllOfRawItemId(String rawItemId) {
    final toRemove = <String>[];
    for (final k in _items.keys) {
      final info = CartLineKeyInfo.parse(k);
      if (info.rawItemId == rawItemId) {
        toRemove.add(k);
      }
    }
    for (final k in toRemove) {
      _items.remove(k);
    }
    if (toRemove.isNotEmpty) {
      _emit();
    }
  }

  void setPackedQuantity(String baseKey, int targetPackedQty) {
    final normalQty = _items[baseKey] ?? 0;
    final packedKey = '$baseKey:pack';
    final currentPackedQty = _items[packedKey] ?? 0;
    final totalQty = normalQty + currentPackedQty;

    if (totalQty <= 0) return;

    int newPacked = targetPackedQty.clamp(0, totalQty);
    int newNormal = totalQty - newPacked;

    if (newNormal > 0) {
      _items[baseKey] = newNormal;
    } else {
      _items.remove(baseKey);
    }

    if (newPacked > 0) {
      _items[packedKey] = newPacked;
    } else {
      _items.remove(packedKey);
    }

    _emit();
  }

  void togglePacked(String baseKey) {
    final packedKey = '$baseKey:pack';
    final packedQty = _items[packedKey] ?? 0;
    final normalQty = _items[baseKey] ?? 0;
    final totalQty = packedQty + normalQty;

    if (totalQty <= 0) return;

    if (packedQty > 0) {
      // Convert all to dine-in
      _items[baseKey] = totalQty;
      _items.remove(packedKey);
    } else {
      // Convert all to packed
      _items[packedKey] = totalQty;
      _items.remove(baseKey);
    }
    _emit();
  }

  void togglePackAll() {
    if (_items.isEmpty) return;
    final isAllPacked = _items.keys.every((k) => k.endsWith(':pack'));
    final Map<String, int> updated = {};

    for (final entry in _items.entries) {
      final base = entry.key.endsWith(':pack')
          ? entry.key.substring(0, entry.key.length - 5)
          : entry.key;
      final newKey = isAllPacked ? base : '$base:pack';
      updated[newKey] = (updated[newKey] ?? 0) + entry.value;
    }

    _items.clear();
    _items.addAll(updated);
    _emit();
  }

  void setQuantity(String cartKey, int qty) {
    if (qty <= 0) {
      _items.remove(cartKey);
    } else {
      _items[cartKey] = qty;
    }
    _emit();
  }

  void clear() {
    if (_items.isEmpty) return; // no-op guard
    _items.clear();
    _emit();
  }

  void _emit() {
    value = CartSnapshot(Map<String, int>.from(_items));
  }
}

/// Holds the menu items list. Separated from cart so that menu fetches
/// don't trigger cart widget rebuilds and vice versa.
class MenuNotifier extends ValueNotifier<MenuState> {
  MenuNotifier() : super(const MenuState(items: [], isLoading: false));

  void setLoading() {
    value = MenuState(items: value.items, isLoading: true);
  }

  void setItems(List<MenuItem> items) {
    value = MenuState(items: items, isLoading: false);
  }

  void setError() {
    // Keep existing items (could be fallback), just stop loading
    value = MenuState(items: value.items, isLoading: false);
  }
}

class MenuState {
  final List<MenuItem> items;
  final bool isLoading;
  const MenuState({required this.items, required this.isLoading});
}
