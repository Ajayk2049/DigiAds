import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../models/menu_models.dart';
import '../../providers/menu_provider.dart';
import '../../providers/orders_provider.dart';
import '../../providers/venue_provider.dart';
import '../menu/manage_categories_modal.dart';

class TakeoutModal extends StatefulWidget {
  const TakeoutModal({super.key});

  @override
  State<TakeoutModal> createState() => _TakeoutModalState();
}

class _TakeoutModalState extends State<TakeoutModal> {
  String? _selectedCategory;
  final Map<String, int> _cartQuantities = {}; // itemId -> quantity
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final menuProv = context.watch<MenuProvider>();
    final venueProv = context.watch<VenueProvider>();
    final ordersProv = context.read<OrdersProvider>();

    final popName = menuProv.popularCategoryName.isNotEmpty ? menuProv.popularCategoryName : 'Popular';
    final popIcon = getDesktopCategoryIcon(popName, menuProv.popularCategoryIcon);

    final categories = menuProv.categories;
    final currentCat = _selectedCategory ?? (categories.isNotEmpty ? categories.first : popName);

    final isPopSelected = currentCat.toLowerCase() == popName.toLowerCase();
    final categoryItems = isPopSelected
        ? menuProv.items.where((i) => i.isPopular).toList()
        : menuProv.items.where((i) => i.category.toLowerCase() == currentCat.toLowerCase()).toList();

    final allCategoryPills = [
      (name: popName, icon: popIcon, isPopular: true),
      ...categories.map((c) => (name: c, icon: getDesktopCategoryIcon(c, menuProv.getCategoryIcon(c)), isPopular: false)),
    ];

    double totalCartRupees = 0;
    int totalItemsCount = 0;

    _cartQuantities.forEach((itemId, qty) {
      if (qty > 0) {
        final item = menuProv.items.firstWhere((i) => i.itemId == itemId, orElse: () => MenuItemModel(itemId: '', name: '', price: 0, category: ''));
        totalCartRupees += item.priceInRupees * qty;
        totalItemsCount += qty;
      }
    });

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 850,
        height: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Row
            Row(
              children: [
                const Icon(LucideIcons.shoppingBag, size: 20, color: AppColors.primary),
                const SizedBox(width: 10),
                const Text(
                  'CREATE TAKEOUT / PARCEL POS ORDER',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 0.8),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 14),

            // Category Chips Row
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: allCategoryPills.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final pill = allCategoryPills[index];
                  final isSelected = currentCat.toLowerCase() == pill.name.toLowerCase();

                  return ChoiceChip(
                    avatar: Icon(
                      pill.icon,
                      size: 14,
                      color: isSelected
                          ? Colors.white
                          : (pill.isPopular ? Colors.amber.shade800 : AppColors.primary),
                    ),
                    label: Text(
                      pill.name.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : null,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: pill.isPopular ? Colors.amber.shade700 : AppColors.primary,
                    onSelected: (_) => setState(() => _selectedCategory = pill.name),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            // Catalog Grid & Cart Split View
            Expanded(
              child: Row(
                children: [
                  // Left: Dishes Grid
                  Expanded(
                    flex: 6,
                    child: GridView.builder(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 2.2,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: categoryItems.length,
                      itemBuilder: (context, index) {
                        final item = categoryItems[index];
                        final currentQty = _cartQuantities[item.itemId] ?? 0;

                        return Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            border: Border.all(color: Theme.of(context).dividerColor),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: item.isVeg ? AppColors.vegGreen : AppColors.nonVegRed,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      'Rs. ${item.priceInRupees.toStringAsFixed(2)}',
                                      style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted, fontFamily: 'Courier'),
                                    ),
                                    if (item.hasCustomizations)
                                      const Text('↳ Customisable', style: TextStyle(fontSize: 8.5, color: Colors.amber, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              if (currentQty > 0) ...[
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(LucideIcons.circleMinus, size: 16, color: AppColors.danger),
                                      onPressed: () => setState(() => _cartQuantities[item.itemId] = currentQty - 1),
                                    ),
                                    Text('$currentQty', style: const TextStyle(fontWeight: FontWeight.w900)),
                                    IconButton(
                                      icon: const Icon(LucideIcons.circlePlus, size: 16, color: AppColors.success),
                                      onPressed: () => setState(() => _cartQuantities[item.itemId] = currentQty + 1),
                                    ),
                                  ],
                                ),
                              ] else ...[
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  ),
                                  onPressed: () => setState(() => _cartQuantities[item.itemId] = 1),
                                  child: const Text('ADD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(width: 16),
                  const VerticalDivider(width: 1),
                  const SizedBox(width: 16),

                  // Right: Current Takeout Cart Summary
                  Expanded(
                    flex: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'PARCEL SUMMARY',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                        ),
                        const SizedBox(height: 10),

                        Expanded(
                          child: totalItemsCount == 0
                              ? Center(
                                  child: Text('No items in parcel cart.', style: TextStyle(color: isDark ? AppColors.darkMuted : AppColors.lightMuted, fontSize: 12)),
                                )
                              : ListView(
                                  children: _cartQuantities.entries.where((e) => e.value > 0).map((entry) {
                                    final item = menuProv.items.firstWhere((i) => i.itemId == entry.key);
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(child: Text('${item.name} [PACK] x${entry.value}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                          Text('Rs. ${(item.priceInRupees * entry.value).toStringAsFixed(2)}', style: const TextStyle(fontFamily: 'Courier', fontSize: 12)),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                        ),

                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL AMOUNT:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                            Text('Rs. ${totalCartRupees.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Courier')),
                          ],
                        ),
                        const SizedBox(height: 14),

                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          onPressed: (totalItemsCount == 0 || _isSubmitting)
                              ? null
                              : () async {
                                  final venueId = venueProv.selectedVenue?.id;
                                  if (venueId == null) return;

                                  setState(() => _isSubmitting = true);

                                  final itemsPayload = <Map<String, dynamic>>[];
                                  _cartQuantities.forEach((itemId, qty) {
                                    if (qty > 0) {
                                      final item = menuProv.items.firstWhere((i) => i.itemId == itemId);
                                      itemsPayload.add({
                                        'itemId': item.itemId,
                                        'name': item.name,
                                        'price': item.price,
                                        'quantity': qty,
                                        'isPacked': true,
                                        'isVeg': item.isVeg,
                                      });
                                    }
                                  });

                                  final success = await ordersProv.createTakeoutOrder(
                                    hostApplicationId: venueId,
                                    items: itemsPayload,
                                  );

                                  setState(() => _isSubmitting = false);

                                  if (context.mounted && success) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Takeout order created successfully!')),
                                    );
                                  }
                                },
                          icon: _isSubmitting
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(LucideIcons.send, size: 16),
                          label: Text(_isSubmitting ? 'PUNCHING ORDER...' : 'PUNCH TAKEOUT ORDER', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
