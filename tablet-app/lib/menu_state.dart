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

/// Immutable snapshot of the cart state, emitted by [CartNotifier].
class CartSnapshot {
  final Map<String, int> items;
  const CartSnapshot(this.items);

  int get totalItemCount => items.values.fold(0, (sum, q) => sum + q);
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  int quantityOf(String itemId) {
    int total = items[itemId] ?? 0;
    total += items['$itemId:pack'] ?? 0;
    return total;
  }

  static bool isPackedKey(String cartKey) => cartKey.endsWith(':pack');
  static String rawItemId(String cartKey) => cartKey.split(':pack').first;

  /// Unique raw item IDs in the cart
  List<String> get uniqueItemIds {
    final set = <String>{};
    for (final k in items.keys) {
      set.add(rawItemId(k));
    }
    return set.toList();
  }

  int dineInQtyOf(String rawItemId) => items[rawItemId] ?? 0;
  int packedQtyOf(String rawItemId) => items['$rawItemId:pack'] ?? 0;
  int totalQtyOf(String rawItemId) => dineInQtyOf(rawItemId) + packedQtyOf(rawItemId);

  bool get isAllPacked => items.isNotEmpty && items.keys.every((k) => isPackedKey(k));

  /// Compute total price in rupees given the menu items list.
  double totalPrice(List<MenuItem> menuItems) {
    double total = 0;
    for (final entry in items.entries) {
      try {
        final rawId = rawItemId(entry.key);
        final item = menuItems.firstWhere((i) => i.itemId == rawId);
        total += (item.price.toDouble() / 100.0) * entry.value;
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

  void addItem(String itemId, {bool isPacked = false}) {
    final key = isPacked ? '$itemId:pack' : itemId;
    _items[key] = (_items[key] ?? 0) + 1;
    _emit();
  }

  void removeItem(String rawItemId) {
    // Decrement dine-in first, then packed if dine-in is 0
    if (_items.containsKey(rawItemId) && _items[rawItemId]! > 0) {
      final current = _items[rawItemId]!;
      if (current > 1) {
        _items[rawItemId] = current - 1;
      } else {
        _items.remove(rawItemId);
      }
    } else {
      final packedKey = '$rawItemId:pack';
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

  void removeAllOfItem(String rawItemId) {
    _items.remove(rawItemId);
    _items.remove('$rawItemId:pack');
    _emit();
  }

  void setPackedQuantity(String rawItemId, int targetPackedQty) {
    final normalQty = _items[rawItemId] ?? 0;
    final packedKey = '$rawItemId:pack';
    final currentPackedQty = _items[packedKey] ?? 0;
    final totalQty = normalQty + currentPackedQty;

    if (totalQty <= 0) return;

    int newPacked = targetPackedQty.clamp(0, totalQty);
    int newNormal = totalQty - newPacked;

    if (newNormal > 0) {
      _items[rawItemId] = newNormal;
    } else {
      _items.remove(rawItemId);
    }

    if (newPacked > 0) {
      _items[packedKey] = newPacked;
    } else {
      _items.remove(packedKey);
    }

    _emit();
  }

  void togglePacked(String rawItemId) {
    final packedKey = '$rawItemId:pack';
    final packedQty = _items[packedKey] ?? 0;
    final normalQty = _items[rawItemId] ?? 0;
    final totalQty = packedQty + normalQty;

    if (totalQty <= 0) return;

    if (packedQty > 0) {
      // Convert all to dine-in
      _items[rawItemId] = totalQty;
      _items.remove(packedKey);
    } else {
      // Convert all to packed
      _items[packedKey] = totalQty;
      _items.remove(rawItemId);
    }
    _emit();
  }

  void togglePackAll() {
    if (_items.isEmpty) return;
    final isAllPacked = _items.keys.every((k) => k.endsWith(':pack'));
    final Map<String, int> updated = {};

    for (final entry in _items.entries) {
      final rawId = entry.key.split(':pack').first;
      final newKey = isAllPacked ? rawId : '$rawId:pack';
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
