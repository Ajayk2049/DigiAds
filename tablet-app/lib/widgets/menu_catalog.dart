import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../menu_image_cache.dart';
import '../generated/menu.pbgrpc.dart';
import 'cached_menu_image.dart';

class MenuCatalogWidget extends StatefulWidget {
  final MenuNotifier menuNotifier;
  final CartNotifier cartNotifier;
  final String serverHost;
  final double viewportHeight;
  final String selectedCategory;
  final MenuImageCache imageCache;
  final bool isOnline;

  const MenuCatalogWidget({
    super.key,
    required this.menuNotifier,
    required this.cartNotifier,
    required this.serverHost,
    required this.viewportHeight,
    required this.selectedCategory,
    required this.imageCache,
    this.isOnline = true,
  });

  @override
  State<MenuCatalogWidget> createState() => _MenuCatalogWidgetState();
}

class _MenuCatalogWidgetState extends State<MenuCatalogWidget> {
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MenuState>(
      valueListenable: widget.menuNotifier,
      builder: (context, menuState, _) {
        if (menuState.isLoading) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(kAccentBlue),
            ),
          );
        }
        if (menuState.items.isEmpty) {
          return const Center(
            child: Text(
              "No menu items available.",
              style: TextStyle(color: kTextGrey, fontSize: 16, fontWeight: FontWeight.w600),
            ),
          );
        }

        // Filter items by selected category (Popular section shows items where isPopular == true)
        final categoryItems = menuState.items.where((item) {
          if (widget.selectedCategory.toLowerCase() == 'popular') {
            return item.isPopular;
          }
          return item.category.toLowerCase() == widget.selectedCategory.toLowerCase();
        }).toList();

        // Fallback: If Popular category is selected but no item has isPopular == true, show top menu items so section is NEVER empty
        final displayItems = (widget.selectedCategory.toLowerCase() == 'popular' && categoryItems.isEmpty)
            ? menuState.items.take(8).toList()
            : categoryItems;

        final totalItems = displayItems.length;

        final screenWidth = MediaQuery.sizeOf(context).width;
        final isMobile = screenWidth < 600;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Bar: Category Title & Item Count Pill
            Padding(
              padding: EdgeInsets.fromLTRB(
                isMobile ? 14 : 24,
                isMobile ? 10 : 16,
                isMobile ? 14 : 24,
                isMobile ? 8 : 12,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${widget.selectedCategory} Selection",
                          style: isMobile
                              ? kCategoryHeaderStyle.copyWith(fontSize: 18)
                              : kCategoryHeaderStyle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          getCategorySubtitle(widget.selectedCategory),
                          style: kCardDescriptionStyle.copyWith(fontSize: isMobile ? 11 : 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Item Count Pill
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: isMobile ? 10 : 16,
                      vertical: isMobile ? 6 : 8,
                    ),
                    decoration: BoxDecoration(
                      color: kAccentBlue.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "$totalItems items",
                      style: TextStyle(
                        fontSize: isMobile ? 11 : 13,
                        fontWeight: FontWeight.bold,
                        color: kAccentBlue,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Grid items
            Expanded(
              child: displayItems.isEmpty
                  ? Center(
                      child: Text(
                        "No items available in ${widget.selectedCategory}",
                        style: const TextStyle(color: kTextGrey, fontSize: 15, fontWeight: FontWeight.w500),
                      ),
                    )
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final width = constraints.maxWidth;
                        final isCompact = width < 500;
                        final crossAxisCount = 2;
                        final aspectRatio = isCompact ? 0.74 : 0.82;
                        final spacing = isCompact ? 12.0 : 20.0;
                        final horizontalPadding = isCompact ? 12.0 : 24.0;
                        final bottomPadding = isCompact ? 96.0 : 120.0;

                        return GridView.builder(
                          padding: EdgeInsets.only(
                            left: horizontalPadding,
                            right: horizontalPadding,
                            bottom: bottomPadding,
                          ),
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossAxisCount,
                            crossAxisSpacing: spacing,
                            mainAxisSpacing: spacing,
                            childAspectRatio: aspectRatio,
                          ),
                          itemCount: displayItems.length,
                          physics: const ClampingScrollPhysics(),
                          itemBuilder: (context, index) {
                            return _MenuCard(
                              key: ValueKey(displayItems[index].itemId),
                              item: displayItems[index],
                              cartNotifier: widget.cartNotifier,
                              serverHost: widget.serverHost,
                              imageCache: widget.imageCache,
                              isOnline: widget.isOnline,
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _MenuCard extends StatelessWidget {
  final MenuItem item;
  final CartNotifier cartNotifier;
  final String serverHost;
  final MenuImageCache imageCache;
  final bool isOnline;

  const _MenuCard({
    super.key,
    required this.item,
    required this.cartNotifier,
    required this.serverHost,
    required this.imageCache,
    required this.isOnline,
  });

  @override
  Widget build(BuildContext context) {
    // Check if item is veg via explicit field or fallback keyword detection
    final bool isVeg = item.hasIsVeg() ? item.isVeg : _checkIsVeg(item);

    return Material(
      color: kCardBg,
      borderRadius: kCardBorderRadius,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.08),
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image top frame — wrapped in ClipRRect for crisp corners
          Expanded(
            flex: 5,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CachedMenuImage(
                    key: ValueKey(item.itemId),
                    cache: imageCache,
                    itemId: item.itemId,
                    imageUrl: item.imageUrl,
                    serverHost: serverHost,
                    fallback: _buildImagePlaceholder(),
                  ),
                ),

                // Dietary Badge (Slightly bigger: Dot for Veg, Triangle for Non-Veg)
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: const [
                        BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                      ],
                    ),
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isVeg ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: isVeg
                            ? Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF2E7D32),
                                  shape: BoxShape.circle,
                                ),
                              )
                            : SizedBox(
                                width: 8,
                                height: 8,
                                child: CustomPaint(
                                  painter: const _TrianglePainter(color: Color(0xFFC62828)),
                                ),
                              ),
                      ),
                    ),
                  ),
                ),

                // Price Tag Badge Overlay
                Positioned(
                  bottom: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: kTextDark.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "₹${(item.price.toDouble() / 100.0).toStringAsFixed(0)}",
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Content text frame (Title and Description)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title
                Text(
                  item.name,
                  style: kCardTitleStyle.copyWith(fontSize: 15),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),

                // Description
                Text(
                  item.description.isNotEmpty
                      ? item.description
                      : "Fresh delicious ${item.name} prepared by our chefs.",
                  style: kCardDescriptionStyle.copyWith(fontSize: 11, height: 1.25),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Bottom Corner-to-Corner ADD / Stepper Button (No Side/Bottom Padding)
          ValueListenableBuilder<CartSnapshot>(
            valueListenable: cartNotifier,
            builder: (context, cart, _) {
              final qty = cart.quantityOf(item.itemId);
              if (qty > 0) {
                return _buildFullWidthStepper(qty);
              }
              return _buildFullWidthAddButton();
            },
          ),
        ],
      ),
    );
  }

  bool _checkIsVeg(MenuItem item) {
    final lowerName = item.name.toLowerCase();
    final lowerDesc = item.description.toLowerCase();
    if (lowerName.contains('chicken') ||
        lowerName.contains('mutton') ||
        lowerName.contains('fish') ||
        lowerName.contains('prawn') ||
        lowerName.contains('egg') ||
        lowerDesc.contains('chicken') ||
        lowerDesc.contains('mutton') ||
        lowerDesc.contains('meat')) {
      return false;
    }
    return true;
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: kSidebarBg,
      child: const Center(
        child: Icon(Icons.restaurant_menu_rounded, size: 36, color: kTextGrey),
      ),
    );
  }

  Widget _buildFullWidthStepper(int qty) {
    return Container(
      height: 48,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: Colors.grey.shade200, width: 1),
        ),
      ),
      child: Row(
        children: [
          // Minus (-) button - Faded red tint background with clear red icon
          Expanded(
            child: Material(
              color: const Color(0xFFFEE2E2),
              borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24)),
              child: InkWell(
                borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24)),
                onTap: isOnline
                    ? () {
                        HapticFeedback.lightImpact();
                        cartNotifier.removeItem(item.itemId);
                      }
                    : null,
                child: const SizedBox(
                  height: double.infinity,
                  child: Center(
                    child: Icon(
                      Icons.remove_rounded,
                      color: Color(0xFFDC2626),
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Number in center - Exactly 2-digit width on clean white background
          Container(
            width: 38,
            height: double.infinity,
            alignment: Alignment.center,
            color: Colors.white,
            child: Text(
              '$qty',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 17,
                color: kTextDark,
              ),
            ),
          ),

          // Plus (+) button - Faded green tint background with clear green icon
          Expanded(
            child: Material(
              color: const Color(0xFFDCFCE7),
              borderRadius: const BorderRadius.only(bottomRight: Radius.circular(24)),
              child: InkWell(
                borderRadius: const BorderRadius.only(bottomRight: Radius.circular(24)),
                onTap: isOnline
                    ? () {
                        HapticFeedback.lightImpact();
                        cartNotifier.addItem(item.itemId);
                      }
                    : null,
                child: const SizedBox(
                  height: double.infinity,
                  child: Center(
                    child: Icon(
                      Icons.add_rounded,
                      color: Color(0xFF16A34A),
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFullWidthAddButton() {
    final bool canAdd = item.isAvailable && isOnline;
    return SizedBox(
      height: 48,
      width: double.infinity,
      child: Material(
        color: canAdd ? kAccentBlue : Colors.grey.shade300,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
        elevation: canAdd ? 1 : 0,
        child: InkWell(
          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
          onTap: canAdd
              ? () {
                  HapticFeedback.lightImpact();
                  cartNotifier.addItem(item.itemId);
                }
              : null,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.add_rounded,
                size: 22,
                color: canAdd ? Colors.white : Colors.grey.shade600,
              ),
              const SizedBox(width: 6),
              Text(
                "ADD TO CART",
                style: TextStyle(
                  color: canAdd ? Colors.white : Colors.grey.shade600,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrianglePainter extends CustomPainter {
  final Color color;

  const _TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _TrianglePainter oldDelegate) => oldDelegate.color != color;
}
