import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants.dart';
import '../menu_state.dart';
import '../menu_image_cache.dart';
import 'package:fixnum/fixnum.dart';
import '../generated/menu.pbgrpc.dart';
import 'cached_menu_image.dart';

class OrderSummaryPanel extends StatelessWidget {
  final CartNotifier cartNotifier;
  final List<MenuItem> menuItems;
  final bool showHeader;
  final VoidCallback onPlaceOrder;
  final String serverHost;
  final MenuImageCache imageCache;

  const OrderSummaryPanel({
    super.key,
    required this.cartNotifier,
    required this.menuItems,
    required this.showHeader,
    required this.onPlaceOrder,
    required this.serverHost,
    required this.imageCache,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: cartNotifier,
      builder: (context, cart, _) {
        if (cart.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shopping_cart_outlined, size: 64, color: kTextGrey),
                SizedBox(height: 16),
                Text("Your cart is empty", style: kEmptyCartStyle),
              ],
            ),
          );
        }

        final total = cart.totalPrice(menuItems);
        final isAllPacked = cart.isAllPacked;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Bar: Global "Pack Entire Order" Toggle
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isAllPacked ? Colors.amber.shade100 : kCardBg,
                borderRadius: kCardBorderRadius,
                border: Border.all(
                  color: isAllPacked ? Colors.amber.shade600 : Colors.grey.shade300,
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.takeout_dining_outlined,
                        color: isAllPacked ? Colors.amber.shade900 : kTextDark,
                        size: 22,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        "Pack Entire Order (Takeaway / Parcel)",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isAllPacked ? Colors.amber.shade900 : kTextDark,
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      cartNotifier.togglePackAll();
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isAllPacked ? kAccentBlue : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isAllPacked ? Icons.restaurant_rounded : Icons.takeout_dining_outlined,
                            size: 16,
                            color: isAllPacked ? Colors.white : kTextDark,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isAllPacked ? "DINE-IN ALL" : "PACK ALL",
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isAllPacked ? Colors.white : kTextDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: ListView.separated(
                itemCount: cart.uniqueItemIds.length,
                separatorBuilder: (context, index) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final rawId = cart.uniqueItemIds[index];
                  final dineInQty = cart.dineInQtyOf(rawId);
                  final packedQty = cart.packedQtyOf(rawId);
                  final totalQty = cart.totalQtyOf(rawId);

                  final item = menuItems.firstWhere(
                    (i) => i.itemId == rawId,
                    orElse: () => MenuItem()
                      ..itemId = rawId
                      ..name = 'Unknown Item'
                      ..price = Int64(0),
                  );

                  final unitPrice = item.price.toDouble() / 100.0;
                  final lineTotal = unitPrice * totalQty;

                  return Container(
                    decoration: BoxDecoration(
                      color: kCardBg,
                      borderRadius: kCardBorderRadius,
                      border: packedQty > 0 ? Border.all(color: Colors.amber.shade500, width: 1.5) : null,
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 6,
                          offset: Offset(0, 3),
                        )
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Food Image — local cache first, network fallback
                        ClipRRect(
                          borderRadius: kImageBorderRadius,
                          child: Container(
                            width: 90,
                            height: 90,
                            color: kScaffoldBg,
                            child: CachedMenuImage(
                              cache: imageCache,
                              itemId: item.itemId,
                              imageUrl: item.imageUrl,
                              serverHost: serverHost,
                              fallback: const Icon(Icons.restaurant_menu, color: kTextGrey),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Details Column
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                item.name,
                                style: kCardTitleStyle.copyWith(fontSize: 18),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Unit price: ₹${unitPrice.toStringAsFixed(2)}",
                                style: kCardDescriptionStyle.copyWith(fontSize: 13),
                              ),
                              const SizedBox(height: 6),
                              // Breakdown summary indicators
                              Row(
                                children: [
                                  if (dineInQty > 0)
                                    Text(
                                      "🍽️ $dineInQty Dine-In",
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextDark),
                                    ),
                                  if (dineInQty > 0 && packedQty > 0)
                                    const Text("  •  ", style: TextStyle(fontSize: 12, color: kTextGrey)),
                                  if (packedQty > 0)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.shade800,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        "📦 $packedQty PACK",
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              // Stepper & Pack Button Row
                              Row(
                                children: [
                                  // Pill Qty Stepper
                                  Container(
                                    decoration: BoxDecoration(
                                      color: kScaffoldBg,
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          constraints: const BoxConstraints(),
                                          padding: const EdgeInsets.all(8),
                                          icon: const Icon(Icons.remove, color: kAccentBlue, size: 18),
                                          onPressed: () => cartNotifier.removeItem(rawId),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '$totalQty',
                                          style: kQuantityTextStyle.copyWith(color: kTextDark),
                                        ),
                                        const SizedBox(width: 8),
                                        IconButton(
                                          constraints: const BoxConstraints(),
                                          padding: const EdgeInsets.all(8),
                                          icon: const Icon(Icons.add, color: kAccentBlue, size: 18),
                                          onPressed: () => cartNotifier.addItem(rawId),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Pack / Dine-In Action Button
                                  InkWell(
                                    onTap: () {
                                      HapticFeedback.lightImpact();
                                      if (totalQty == 1) {
                                        cartNotifier.togglePacked(rawId);
                                      } else {
                                        _showPackQuantityDialog(
                                          context,
                                          cartNotifier,
                                          rawId,
                                          item.name,
                                          totalQty,
                                          packedQty,
                                        );
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: packedQty > 0
                                            ? (packedQty == totalQty
                                                ? const Color(0xFFEFF6FF)
                                                : Colors.amber.shade50)
                                            : Colors.grey.shade100,
                                        border: Border.all(
                                          color: packedQty > 0
                                              ? (packedQty == totalQty
                                                  ? kAccentBlue
                                                  : Colors.amber.shade700)
                                              : Colors.grey.shade400,
                                          width: 1.5,
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            packedQty == totalQty
                                                ? Icons.restaurant_rounded
                                                : (packedQty > 0
                                                    ? Icons.takeout_dining_rounded
                                                    : Icons.takeout_dining_outlined),
                                            size: 16,
                                            color: packedQty > 0
                                                ? (packedQty == totalQty
                                                    ? kAccentBlue
                                                    : Colors.amber.shade900)
                                                : Colors.grey.shade800,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            packedQty == totalQty
                                                ? "Dine-In"
                                                : (packedQty > 0
                                                    ? "Packed ($packedQty/$totalQty)"
                                                    : "Pack"),
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: packedQty > 0
                                                ? (packedQty == totalQty
                                                    ? kAccentBlue
                                                    : Colors.amber.shade900)
                                                : Colors.grey.shade800,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Price & Trash
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              "Line total",
                              style: kCardDescriptionStyle,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "₹${lineTotal.toStringAsFixed(2)}",
                              style: kTotalValueStyle.copyWith(fontSize: 18),
                            ),
                            const SizedBox(height: 12),
                            // Trash Icon inside red-bordered circle
                            GestureDetector(
                              onTap: () => cartNotifier.removeAllOfItem(rawId),
                              child: Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.red.shade200, width: 1.5),
                                  color: Colors.red.shade50,
                                ),
                                padding: const EdgeInsets.all(8),
                                child: Icon(Icons.delete_outline_rounded, color: Colors.red.shade400, size: 20),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            // Remove All Action Pill (Right-aligned above Total Card)
            Align(
              alignment: Alignment.centerRight,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    cartNotifier.clear();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.red.shade200, width: 1.2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.delete_outline_rounded, color: Colors.red.shade600, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          "Remove All",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Calculations Card
            Container(
              decoration: const BoxDecoration(
                color: kCardBg,
                borderRadius: kCardBorderRadius,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 6,
                    offset: Offset(0, 3),
                  )
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Total", style: kTotalLabelStyle.copyWith(fontSize: 18)),
                      Text(
                        "₹${total.toStringAsFixed(2)}",
                        style: kTotalValueStyle.copyWith(fontSize: 24),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Proceed to Payment button
            SizedBox(
              height: 64,
              child: ElevatedButton(
                onPressed: onPlaceOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccentBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(width: 24), // to center text somewhat
                    const Text(
                      "Place Order",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Container(
                      decoration: const BoxDecoration(
                        color: Colors.white24,
                        shape: BoxShape.circle,
                      ),
                      padding: const EdgeInsets.all(8),
                      child: const Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showPackQuantityDialog(
    BuildContext context,
    CartNotifier cartNotifier,
    String rawItemId,
    String itemName,
    int totalQty,
    int currentPackedQty,
  ) {
    int tempPackedQty = currentPackedQty > 0 ? currentPackedQty : 1;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
              backgroundColor: kCardBg,
              title: Row(
                children: [
                  const Icon(Icons.takeout_dining_rounded, color: Colors.amber, size: 28),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Parcel Quantity",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kTextDark),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    itemName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kTextDark),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Total items in cart: $totalQty",
                    style: const TextStyle(fontSize: 13, color: kTextGrey),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    "How many plates do you want to parcel?",
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: kTextDark),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: Container(
                      decoration: BoxDecoration(
                        color: kScaffoldBg,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: Colors.amber.shade400, width: 1.5),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(
                              Icons.remove_circle_outline,
                              color: tempPackedQty > 0 ? kAccentBlue : Colors.grey.shade400,
                              size: 28,
                            ),
                            onPressed: tempPackedQty > 0
                                ? () => setModalState(() => tempPackedQty--)
                                : null,
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              '$tempPackedQty',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: kTextDark),
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.add_circle_outline,
                              color: tempPackedQty < totalQty ? kAccentBlue : Colors.grey.shade400,
                              size: 28,
                            ),
                            onPressed: tempPackedQty < totalQty
                                ? () => setModalState(() => tempPackedQty++)
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: Text(
                      "Result: $tempPackedQty Parcel [PACK], ${totalQty - tempPackedQty} Dine-In",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: tempPackedQty > 0 ? Colors.amber.shade900 : kTextDark,
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text("Cancel", style: TextStyle(color: kTextGrey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    cartNotifier.setPackedQuantity(rawItemId, tempPackedQty);
                    Navigator.pop(dialogCtx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber.shade800,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                  child: const Text("Confirm Parcel", style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
