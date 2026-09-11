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
  final ScrollController _scrollController = ScrollController();
  int _itemsAddedInSession = 0;

  @override
  void initState() {
    super.initState();
    _groups = parseCustomizations(widget.item.customizations);
    _initDefaults();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _initDefaults() {
    _selections.clear();
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
    _quantity = 1;
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

  void _handleAddAnother() {
    if (!_isValid) return;
    HapticFeedback.mediumImpact();
    final customStr = _formatCustomizationString();
    final extraPaise = _unitPricePaise - widget.item.price.toInt();

    widget.cartNotifier.addItem(
      widget.item.itemId,
      customization: customStr,
      extraPaise: extraPaise,
      quantity: _quantity,
    );

    setState(() {
      _itemsAddedInSession += _quantity;
      _initDefaults();
    });

    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
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
          child: Stack(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Compact Header: Info on Left, Small Image Card on Right
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 144, 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left: Veg badge, Name, Category, Price
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Dietary Veg/Non-Veg Badge
                              Container(
                                width: 18,
                                height: 18,
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: widget.isVeg ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                    width: 1.8,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Center(
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: widget.isVeg ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),

                              // Dish Name
                              Text(
                                widget.item.name,
                                style: kCardTitleStyle.copyWith(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  height: 1.2,
                                ),
                              ),

                              if (widget.item.category.isNotEmpty) ...[
                                const SizedBox(height: 3),
                                Text(
                                  widget.item.category.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: kAccentBlue.withValues(alpha: 0.9),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],

                              const SizedBox(height: 8),

                              // Base / Dynamic Selected Variant Price
                              Text(
                                "₹${(_effectiveBasePaise / 100.0).toStringAsFixed(0)}",
                                style: const TextStyle(
                                  fontSize: 21,
                                  fontWeight: FontWeight.w900,
                                  color: kTextDark,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(width: 24),

                        // Right: Small Image in Card View
                        Container(
                          width: isMobile ? 90 : 112,
                          height: isMobile ? 90 : 112,
                          decoration: BoxDecoration(
                            color: kSidebarBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200, width: 1.2),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: CachedMenuImage(
                            cache: widget.imageCache,
                            itemId: widget.item.itemId,
                            imageUrl: widget.item.imageUrl,
                            serverHost: widget.serverHost,
                            fallback: const Center(
                              child: Icon(Icons.restaurant_menu_rounded, size: 36, color: kTextGrey),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Scrollable Content: Customization Groups upfront, then Description
                  Flexible(
                    child: SingleChildScrollView(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Customization Groups (Immediate on Frame 1 — Zero Scroll)
                          if (_groups.isNotEmpty)
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

            // Session confirmation banner if items have already been committed in this modal
            if (_itemsAddedInSession > 0)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFFF0FDF4),
                  border: Border(
                    top: BorderSide(color: Color(0xFFDCFCE7), width: 1),
                    bottom: BorderSide(color: Color(0xFFDCFCE7), width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Color(0xFF16A34A),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, size: 12, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$_itemsAddedInSession added to cart! Customising next...',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ),
                    Text(
                      'Ready for #${_itemsAddedInSession + 1}',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.green.shade800,
                      ),
                    ),
                  ],
                ),
              ),

            // Bottom Bar: Quantity Selector + Make Another (if customizable) + Add to Cart Button
            Container(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200, width: 1)),
              ),
              child: isMobile && _groups.isNotEmpty
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            _buildQuantityStepper(),
                            const SizedBox(width: 10),
                            Expanded(child: _buildMakeAnotherButton()),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: _buildAddToCartButton(),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        _buildQuantityStepper(),
                        if (_groups.isNotEmpty) ...[
                          const SizedBox(width: 10),
                          _buildMakeAnotherButton(),
                        ],
                        const SizedBox(width: 10),
                        Expanded(child: _buildAddToCartButton()),
                      ],
                    ),
            ),
          ],
        ),

        // Floating Overlaid Close Button (slightly bigger, doesn't block or take vertical space)
        Positioned(
          top: 10,
          right: 30,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => Navigator.of(context).pop(),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.grey.shade300, width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.close_rounded,
                  color: Color(0xFF475569),
                  size: 52,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  ),
),
);
}

  Widget _buildQuantityStepper() {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove_rounded, size: 22),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 38, minHeight: 50),
            color: _quantity > 1 ? const Color(0xFFDC2626) : Colors.grey.shade400,
            onPressed: _quantity > 1
                ? () {
                    HapticFeedback.lightImpact();
                    setState(() => _quantity--);
                  }
                : null,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '$_quantity',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w900,
                color: kTextDark,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_rounded, size: 22),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 38, minHeight: 50),
            color: const Color(0xFF16A34A),
            onPressed: () {
              HapticFeedback.lightImpact();
              setState(() => _quantity++);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMakeAnotherButton() {
    return SizedBox(
      height: 50,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: BorderSide(
            color: _isValid ? kAccentBlue.withValues(alpha: 0.5) : Colors.grey.shade300,
            width: 1.5,
          ),
          backgroundColor: Colors.green,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
        onPressed: _isValid ? _handleAddAnother : null,
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_circle_outline_rounded, size: 18),
            SizedBox(width: 6),
            Text(
              "Add & Customise Another",
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddToCartButton() {
    return SizedBox(
      height: 50,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: _isValid ? kAccentBlue : Colors.grey.shade300,
          foregroundColor: Colors.white,
          elevation: _isValid ? 1 : 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        onPressed: _isValid ? _handleAddToCart : null,
        child: Text(
          _isValid
              ? (_itemsAddedInSession > 0
                  ? "Done & Add • ₹${_totalPriceRs.toStringAsFixed(0)}"
                  : "Add to Cart • ₹${_totalPriceRs.toStringAsFixed(0)}")
              : "Choose options",
          style: const TextStyle(
            fontSize: 15.5,
            fontWeight: FontWeight.w800,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

