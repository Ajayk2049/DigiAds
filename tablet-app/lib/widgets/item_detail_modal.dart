import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../menu_image_cache.dart';
import '../generated/menu.pbgrpc.dart';
import 'cached_menu_image.dart';

class CustomOption {
  final String name;
  final int extraPrice; // in paise (direct price if parent group is direct, else extra add-on)
  final bool isDefault;

  CustomOption({
    required this.name,
    required this.extraPrice,
    this.isDefault = false,
  });

  factory CustomOption.fromJson(Map<String, dynamic> json) {
    return CustomOption(
      name: json['name']?.toString() ?? '',
      extraPrice: (json['extraPrice'] is num) ? (json['extraPrice'] as num).toInt() : 0,
      isDefault: json['isDefault'] == true,
    );
  }
}

class CustomGroup {
  final String title;
  final String pricingType; // 'addon' | 'direct'
  final bool isMultiple;
  final bool isRequired;
  final List<CustomOption> options;

  CustomGroup({
    required this.title,
    this.pricingType = 'addon',
    required this.isMultiple,
    required this.isRequired,
    required this.options,
  });

  bool get isDirect => pricingType == 'direct';

  factory CustomGroup.fromJson(Map<String, dynamic> json) {
    final opts = <CustomOption>[];
    if (json['options'] is List) {
      for (final o in json['options'] as List) {
        if (o is Map<String, dynamic>) {
          opts.add(CustomOption.fromJson(o));
        }
      }
    }
    final pricingType = json['pricingType']?.toString() == 'direct' ? 'direct' : 'addon';
    return CustomGroup(
      title: json['title']?.toString() ?? '',
      pricingType: pricingType,
      isMultiple: pricingType == 'direct' ? false : (json['isMultiple'] == true),
      isRequired: json['isRequired'] == true,
      options: opts,
    );
  }
}

List<CustomGroup> parseCustomizations(String rawJson) {
  if (rawJson.trim().isEmpty) return [];
  try {
    final decoded = jsonDecode(rawJson);
    if (decoded is List) {
      return decoded
          .whereType<Map<String, dynamic>>()
          .map((m) => CustomGroup.fromJson(m))
          .toList();
    }
  } catch (e) {
    debugPrint('Error parsing item customizations: $e');
  }
  return [];
}

/// Ultra-lightweight modal dialog optimized for Android 8 (API 26/27) tablets.
/// Zero blur shaders (flat black54 scrim), in-memory image reuse, localized state.
class ItemDetailModal extends StatefulWidget {
  final MenuItem item;
  final CartNotifier cartNotifier;
  final String serverHost;
  final MenuImageCache imageCache;
  final bool isVeg;
  final VoidCallback? onUserActivity;

  const ItemDetailModal({
    super.key,
    required this.item,
    required this.cartNotifier,
    required this.serverHost,
    required this.imageCache,
    required this.isVeg,
    this.onUserActivity,
  });

  static Future<void> show({
    required BuildContext context,
    required MenuItem item,
    required CartNotifier cartNotifier,
    required String serverHost,
    required MenuImageCache imageCache,
    required bool isVeg,
    VoidCallback? onUserActivity,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54, // Flat scrim — ZERO blur shader for Android 8 GPU
      builder: (ctx) => ItemDetailModal(
        item: item,
        cartNotifier: cartNotifier,
        serverHost: serverHost,
        imageCache: imageCache,
        isVeg: isVeg,
        onUserActivity: onUserActivity,
      ),
    );
  }

  @override
  State<ItemDetailModal> createState() => _ItemDetailModalState();
}

class _ItemDetailModalState extends State<ItemDetailModal> {
  late final List<CustomGroup> _groups;
  // Selected options: groupIndex -> Set of option indices
  final Map<int, Set<int>> _selections = {};
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _groups = parseCustomizations(widget.item.customizations);
    for (int i = 0; i < _groups.length; i++) {
      final g = _groups[i];
      if (g.isDirect) {
        // Direct variant: find option with isDefault or first option
        int defaultIdx = g.options.indexWhere((o) => o.isDefault);
        if (defaultIdx < 0 && g.options.isNotEmpty) defaultIdx = 0;
        _selections[i] = defaultIdx >= 0 ? {defaultIdx} : {};
      } else if (g.isRequired && !g.isMultiple && g.options.isNotEmpty) {
        _selections[i] = {0};
      } else {
        _selections[i] = {};
      }
    }
  }

  int get _effectiveBasePaise {
    for (int i = 0; i < _groups.length; i++) {
      final g = _groups[i];
      if (g.isDirect) {
        final sel = _selections[i] ?? {};
        if (sel.isNotEmpty) {
          final chosenIdx = sel.first;
          if (chosenIdx < g.options.length) {
            return g.options[chosenIdx].extraPrice;
          }
        }
      }
    }
    return widget.item.price.toInt();
  }

  int get _selectedAddonPaise {
    int total = 0;
    _selections.forEach((gIdx, optIndices) {
      final group = _groups[gIdx];
      if (!group.isDirect) {
        for (final oIdx in optIndices) {
          if (oIdx < group.options.length) {
            total += group.options[oIdx].extraPrice;
          }
        }
      }
    });
    return total;
  }

  int get _unitPricePaise => _effectiveBasePaise + _selectedAddonPaise;

  double get _totalPriceRs => (_unitPricePaise * _quantity) / 100.0;

  bool get _isValid {
    for (int i = 0; i < _groups.length; i++) {
      final g = _groups[i];
      if (g.isRequired || g.isDirect) {
        final selected = _selections[i] ?? {};
        if (selected.isEmpty) return false;
      }
    }
    return true;
  }

  String _formatCustomizationString() {
    final parts = <String>[];
    for (int i = 0; i < _groups.length; i++) {
      final group = _groups[i];
      final sel = _selections[i] ?? {};
      for (final idx in sel) {
        if (idx < group.options.length) {
          final opt = group.options[idx];
          if (!group.isDirect && opt.extraPrice > 0) {
            final extraRs = (opt.extraPrice / 100.0).toStringAsFixed(0);
            parts.add('${opt.name} (+₹$extraRs)');
          } else {
            parts.add(opt.name);
          }
        }
      }
    }
    return parts.join(', ');
  }

  void _handleAddToCart() {
    if (!_isValid) return;
    HapticFeedback.lightImpact();
    final customStr = _formatCustomizationString();
    // Delta relative to catalog item price so unit price equals _unitPricePaise
    final extraPaise = _unitPricePaise - widget.item.price.toInt();

    widget.cartNotifier.addItem(
      widget.item.itemId,
      customization: customStr,
      extraPaise: extraPaise,
      quantity: _quantity,
    );

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isMobile = screenWidth < 600;
    final dialogWidth = isMobile ? (screenWidth * 0.94) : 560.0;

    return Listener(
      onPointerDown: (_) => widget.onUserActivity?.call(),
      child: Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        clipBehavior: Clip.antiAlias,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: dialogWidth,
            maxHeight: MediaQuery.sizeOf(context).height * 0.88,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Image with Close & Diet badge (Trimmed height for zero-scroll visibility)
              Stack(
                children: [
                  Container(
                    width: double.infinity,
                    height: isMobile ? 140 : 155,
                    color: kSidebarBg,
                    child: CachedMenuImage(
                      cache: widget.imageCache,
                      itemId: widget.item.itemId,
                      imageUrl: widget.item.imageUrl,
                      serverHost: widget.serverHost,
                      fallback: const Center(
                        child: Icon(Icons.restaurant_menu_rounded, size: 52, color: kTextGrey),
                      ),
                    ),
                  ),
                  // Close button
                  Positioned(
                    top: 12,
                    right: 12,
                    child: GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                  // Dietary Veg/Non-Veg Badge
                  Positioned(
                    bottom: 12,
                    left: 16,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: const [
                          BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                        ],
                      ),
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: widget.isVeg ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                            width: 2.2,
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Center(
                          child: widget.isVeg
                              ? Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF2E7D32),
                                    shape: BoxShape.circle,
                                  ),
                                )
                              : Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFC62828),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Scrollable Content: Title, Customization Groups upfront, then Description
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Title and Base / Selected Variant Price
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.item.name,
                                  style: kCardTitleStyle.copyWith(fontSize: 21, fontWeight: FontWeight.w800),
                                ),
                                if (widget.item.category.isNotEmpty) ...[
                                  const SizedBox(height: 3),
                                  Text(
                                    widget.item.category.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: kAccentBlue.withValues(alpha: 0.9),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            "₹${(_effectiveBasePaise / 100.0).toStringAsFixed(0)}",
                            style: const TextStyle(
                              color: kTextDark,
                              fontWeight: FontWeight.w900,
                              fontSize: 22,
                            ),
                          ),
                        ],
                      ),

                      // Customization Groups (Immediate on Frame 1 — Zero Scroll)
                      if (_groups.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: Color(0xFFEEEEEE)),
                        const SizedBox(height: 14),
                        ..._groups.asMap().entries.map((entry) {
                          final gIdx = entry.key;
                          final group = entry.value;
                          final selected = _selections[gIdx] ?? {};

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Group Header
                                Row(
                                  children: [
                                    Text(
                                      group.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: kTextDark,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    if (group.isDirect)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade100,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          "Select Size",
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.amber.shade900,
                                          ),
                                        ),
                                      )
                                    else if (group.isRequired)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade100,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          "Required",
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.amber.shade900,
                                          ),
                                        ),
                                      )
                                    else
                                      Text(
                                        group.isMultiple ? "(Choose any)" : "(Optional)",
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          color: kTextGrey,
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 10),

                                // Option Chips
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: group.options.asMap().entries.map((optEntry) {
                                    final oIdx = optEntry.key;
                                    final opt = optEntry.value;
                                    final isChosen = selected.contains(oIdx);

                                    return InkWell(
                                      borderRadius: BorderRadius.circular(12),
                                      onTap: () {
                                        HapticFeedback.selectionClick();
                                        setState(() {
                                          if (group.isDirect) {
                                            selected.clear();
                                            selected.add(oIdx);
                                          } else if (group.isMultiple) {
                                            if (isChosen) {
                                              selected.remove(oIdx);
                                            } else {
                                              selected.add(oIdx);
                                            }
                                          } else {
                                            // Single choice
                                            if (isChosen && !group.isRequired) {
                                              selected.clear();
                                            } else {
                                              selected.clear();
                                              selected.add(oIdx);
                                            }
                                          }
                                          _selections[gIdx] = selected;
                                        });
                                      },
                                      child: AnimatedContainer(
                                        duration: const Duration(milliseconds: 150),
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: isChosen ? kAccentBlue.withValues(alpha: 0.12) : const Color(0xFFF7F8FA),
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(
                                            color: isChosen ? kAccentBlue : const Color(0xFFE2E8F0),
                                            width: isChosen ? 2.0 : 1.0,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              group.isMultiple
                                                  ? (isChosen ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded)
                                                  : (isChosen ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded),
                                              size: 19,
                                              color: isChosen ? kAccentBlue : kTextGrey,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              opt.name,
                                              style: TextStyle(
                                                fontSize: 14.5,
                                                fontWeight: isChosen ? FontWeight.bold : FontWeight.w500,
                                                color: isChosen ? kAccentBlue : kTextDark,
                                              ),
                                            ),
                                            if (group.isDirect) ...[
                                              const SizedBox(width: 6),
                                              Text(
                                                "₹${(opt.extraPrice / 100.0).toStringAsFixed(0)}",
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: FontWeight.w700,
                                                  color: isChosen ? kAccentBlue : Colors.grey.shade800,
                                                ),
                                              ),
                                              if (opt.isDefault) ...[
                                                const SizedBox(width: 6),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                  decoration: BoxDecoration(
                                                    color: Colors.amber.shade50,
                                                    border: Border.all(color: Colors.amber.shade300),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    "Best Value",
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.w800,
                                                      color: Colors.amber.shade900,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ] else if (opt.extraPrice > 0) ...[
                                              const SizedBox(width: 6),
                                              Text(
                                                "+₹${(opt.extraPrice / 100.0).toStringAsFixed(0)}",
                                                style: TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: FontWeight.w700,
                                                  color: isChosen ? kAccentBlue : Colors.grey.shade700,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],

                      // Description (Placed below customization options)
                      if (widget.item.description.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: Color(0xFFEEEEEE)),
                        const SizedBox(height: 12),
                        Text(
                          "About this item",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade700,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.item.description,
                          style: kCardDescriptionStyle.copyWith(fontSize: 14, height: 1.45),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

            // Bottom Bar: Quantity Selector + Live Price Add Button
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200, width: 1)),
              ),
              child: Row(
                children: [
                  // Quantity Stepper
                  Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_rounded, size: 22),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 44, minHeight: 50),
                          color: _quantity > 1 ? const Color(0xFFDC2626) : Colors.grey.shade400,
                          onPressed: _quantity > 1
                              ? () {
                                  HapticFeedback.lightImpact();
                                  setState(() => _quantity--);
                                }
                              : null,
                        ),
                        Text(
                          '$_quantity',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: kTextDark,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_rounded, size: 22),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 44, minHeight: 50),
                          color: const Color(0xFF16A34A),
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            setState(() => _quantity++);
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Add to Cart Button
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isValid ? kAccentBlue : Colors.grey.shade300,
                          foregroundColor: Colors.white,
                          elevation: _isValid ? 1 : 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: _isValid ? _handleAddToCart : null,
                        child: Text(
                          _isValid
                              ? "Add to Cart • ₹${_totalPriceRs.toStringAsFixed(0)}"
                              : "Choose options",
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
}
