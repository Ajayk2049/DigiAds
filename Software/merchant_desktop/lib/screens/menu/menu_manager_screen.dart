import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/menu_provider.dart';
import '../../providers/venue_provider.dart';
import 'item_editor_modal.dart';
import 'manage_shifts_modal.dart';
import 'manage_categories_modal.dart';

class MenuManagerScreen extends StatefulWidget {
  const MenuManagerScreen({super.key});

  @override
  State<MenuManagerScreen> createState() => _MenuManagerScreenState();
}

class _MenuManagerScreenState extends State<MenuManagerScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final venueId = context.read<VenueProvider>().selectedVenue?.id;
      if (venueId != null && context.read<MenuProvider>().menu == null) {
        context.read<MenuProvider>().fetchMenu(venueId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final menuProv = context.watch<MenuProvider>();
    final venueProv = context.watch<VenueProvider>();

    final shifts = menuProv.shifts.isNotEmpty
        ? menuProv.shifts
        : ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    final activeShift = menuProv.activeShift;
    final selectedViewingShift = menuProv.selectedViewingShift;
    final venueId = venueProv.selectedVenue?.id;

    // Collect all categories (predefined + dynamically from items)
    final categorySet = <String>{};
    for (final c in menuProv.categories) {
      if (c.trim().isNotEmpty) categorySet.add(c.trim());
    }
    for (final item in menuProv.items) {
      if (item.category.trim().isNotEmpty) categorySet.add(item.category.trim());
    }
    if (categorySet.isEmpty) {
      categorySet.addAll(['Starters', 'Main Course', 'Dessert', 'Beverages']);
    }
    final categories = categorySet.toList();

    if (menuProv.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Sub-Header Controls Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 0.8)),
            ),
            child: Row(
              children: [
                // Shift Selector Pills
                const Text(
                  'SHIFT:',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.8),
                ),
                const SizedBox(width: 8),

                Wrap(
                  spacing: 6,
                  children: shifts.map((s) {
                    final isSelected = s.toLowerCase() == selectedViewingShift.toLowerCase();
                    final isLive = s.toLowerCase() == activeShift.toLowerCase();

                    return InkWell(
                      onTap: () => menuProv.setSelectedViewingShift(s),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? AppColors.darkCardElevated : Colors.white)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : (isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0)),
                            width: isSelected ? 1.5 : 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isLive) ...[
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.success,
                                ),
                              ),
                              const SizedBox(width: 5),
                            ],
                            Text(
                              s,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                color: isSelected
                                    ? (isDark ? Colors.white : AppColors.primary)
                                    : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                              ),
                            ),
                            if (isLive) ...[
                              const SizedBox(width: 4),
                              const Text(
                                '(LIVE)',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.success,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(width: 14),

                // Live Shift Switcher Button (if viewing non-active shift)
                if (selectedViewingShift.toLowerCase() != activeShift.toLowerCase()) ...[
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onPressed: menuProv.isSwitchingShift
                        ? null
                        : () async {
                            if (venueId != null) {
                              final success = await menuProv.switchLiveShift(venueId, selectedViewingShift);
                              if (context.mounted && success) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Switched live menu to $selectedViewingShift shift!')),
                                );
                              }
                            }
                          },
                    icon: menuProv.isSwitchingShift
                        ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(LucideIcons.sparkles, size: 13),
                    label: Text('ACTIVATE $selectedViewingShift LIVE', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
                  ),
                ],

                const Spacer(),

                // Manage Shifts
                OutlinedButton.icon(
                  onPressed: () {
                    showDialog(context: context, builder: (_) => const ManageShiftsModal());
                  },
                  icon: const Icon(LucideIcons.clock, size: 13),
                  label: const Text('Manage Shifts', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 8),

                // Manage Categories
                OutlinedButton.icon(
                  onPressed: () {
                    showDialog(context: context, builder: (_) => const ManageCategoriesModal());
                  },
                  icon: const Icon(LucideIcons.settings, size: 13),
                  label: const Text('Manage Categories', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 8),

                // Add Item
                ElevatedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (_) => const ItemEditorModal(itemIndex: -1),
                    );
                  },
                  icon: const Icon(LucideIcons.plus, size: 13),
                  label: const Text('Add Dish Item', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),

                // Save Menu
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: menuProv.hasChanges ? AppColors.success : (isDark ? AppColors.darkCardElevated : const Color(0xFFE2E8F0)),
                    foregroundColor: menuProv.hasChanges ? Colors.white : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                    disabledBackgroundColor: isDark ? AppColors.darkCardElevated : const Color(0xFFE2E8F0),
                    disabledForegroundColor: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                    elevation: menuProv.hasChanges ? 2 : 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  onPressed: (!menuProv.hasChanges || menuProv.isSaving)
                      ? null
                      : () async {
                          if (venueId != null) {
                            final ok = await menuProv.saveMenu(venueId);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(ok ? 'Menu changes published successfully!' : 'Failed to save menu changes'),
                                  backgroundColor: ok ? AppColors.success : AppColors.danger,
                                ),
                              );
                            }
                          }
                        },
                  icon: menuProv.isSaving
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Icon(menuProv.hasChanges ? LucideIcons.upload : LucideIcons.check, size: 14),
                  label: Text(
                    menuProv.isSaving
                        ? 'SAVING...'
                        : (menuProv.hasChanges ? 'SAVE MENU' : 'MENU SAVED'),
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                      letterSpacing: 0.6,
                      color: menuProv.hasChanges
                          ? Colors.white
                          : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Categories & Items Grid
          Expanded(
            child: menuProv.items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.utensilsCrossed,
                          size: 48,
                          color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'No menu dishes found',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Click "Add Dish Item" to create your restaurant dishes.',
                          style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                        ),
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (_) => const ItemEditorModal(itemIndex: -1),
                            );
                          },
                          icon: const Icon(LucideIcons.plus, size: 14),
                          label: const Text('Add First Dish'),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: categories.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 44),
                    itemBuilder: (context, catIndex) {
                      final category = categories[catIndex];

                      final items = menuProv.items.where((i) {
                        // Match category (case-insensitive)
                        if (i.category.trim().toLowerCase() != category.trim().toLowerCase()) return false;
                        // All-shifts or empty shifts list means item is available in all shifts
                        if (i.isAllShifts || i.shifts.isEmpty) return true;
                        // Shift matching (case-insensitive)
                        return i.shifts.any((s) => s.trim().toLowerCase() == selectedViewingShift.trim().toLowerCase());
                      }).toList();

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category Header Pill-shaped Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0C243B) : AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: isDark ? 0.4 : 0.25),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  getDesktopCategoryIcon(category, menuProv.getCategoryIcon(category)),
                                  size: 14,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  category.toUpperCase(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 12,
                                    letterSpacing: 1.1,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '${items.length} items',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Food Dishes Responsive Grid with Narrower Cards
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 210,
                              mainAxisExtent: 225,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: items.length + 1, // +1 for "Create New" card
                            itemBuilder: (context, index) {
                                  if (index == 0) {
                                    // Create New Card
                                    return InkWell(
                                      onTap: () {
                                        showDialog(
                                          context: context,
                                          builder: (_) => ItemEditorModal(itemIndex: -1, defaultCategory: category),
                                        );
                                      },
                                      borderRadius: BorderRadius.circular(14),
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: isDark ? AppColors.darkCard : const Color(0xFFF8FAFC),
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                                        ),
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(10),
                                              decoration: const BoxDecoration(
                                                color: AppColors.primaryLight,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(LucideIcons.plus, size: 20, color: AppColors.primary),
                                            ),
                                            const SizedBox(height: 8),
                                            const Text('+ ADD DISH', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5)),
                                            const SizedBox(height: 2),
                                            Text('in $category', style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
                                          ],
                                        ),
                                      ),
                                    );
                                  }

                                  final item = items[index - 1];
                                  final rawIndex = menuProv.items.indexWhere((i) => i.itemId == item.itemId);

                                  return Container(
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).cardColor,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
                                          blurRadius: 8,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        // Dish Image Preview Header
                                        Stack(
                                          children: [
                                            Container(
                                              height: 110,
                                              width: double.infinity,
                                              color: isDark ? AppColors.darkCardElevated : const Color(0xFFF1F5F9),
                                              child: item.imageUrl.isNotEmpty
                                                  ? Image.network(
                                                      AppConfig.resolveMediaUrl(item.imageUrl),
                                                      fit: BoxFit.cover,
                                                      errorBuilder: (_, __, ___) => Center(
                                                        child: Icon(
                                                          LucideIcons.utensilsCrossed,
                                                          size: 26,
                                                          color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                                                        ),
                                                      ),
                                                    )
                                                  : Center(
                                                      child: Icon(
                                                        LucideIcons.utensilsCrossed,
                                                        size: 26,
                                                        color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                                                      ),
                                                    ),
                                            ),

                                            // Veg/Non-veg badge
                                            Positioned(
                                              top: 6,
                                              left: 6,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.black.withValues(alpha: 0.75),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Container(
                                                      width: 6,
                                                      height: 6,
                                                      decoration: BoxDecoration(
                                                        shape: BoxShape.circle,
                                                        color: item.isVeg ? AppColors.vegGreen : AppColors.nonVegRed,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      item.isVeg ? 'VEG' : 'NON-VEG',
                                                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),

                                            // Popular Star Badge
                                            if (item.isPopular)
                                              Positioned(
                                                top: 6,
                                                right: 6,
                                                child: Container(
                                                  padding: const EdgeInsets.all(3),
                                                  decoration: BoxDecoration(
                                                    color: Colors.black.withValues(alpha: 0.75),
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: const Icon(LucideIcons.star, size: 10, color: AppColors.warning),
                                                ),
                                              ),
                                          ],
                                        ),

                                        // Content Section
                                        Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  item.name,
                                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                const SizedBox(height: 2),
                                                Expanded(
                                                  child: Text(
                                                    item.description.isNotEmpty ? item.description : 'Freshly prepared dish.',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                                                    ),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                                      decoration: BoxDecoration(
                                                        color: isDark ? const Color(0xFF0C243B) : AppColors.primaryLight,
                                                        borderRadius: BorderRadius.circular(10),
                                                        border: Border.all(
                                                          color: AppColors.primary.withValues(alpha: isDark ? 0.4 : 0.25),
                                                          width: 1,
                                                        ),
                                                      ),
                                                      child: Text(
                                                        '₹${item.priceInRupees.toStringAsFixed(2)}',
                                                        style: const TextStyle(
                                                          fontWeight: FontWeight.w900,
                                                          fontSize: 11,
                                                          color: AppColors.primary,
                                                          fontFamily: 'Courier',
                                                        ),
                                                      ),
                                                    ),
                                                    Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        IconButton(
                                                          padding: EdgeInsets.zero,
                                                          constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                                          icon: const Icon(LucideIcons.pencil, size: 13),
                                                          onPressed: () {
                                                            showDialog(
                                                              context: context,
                                                              builder: (_) => ItemEditorModal(itemIndex: rawIndex),
                                                            );
                                                          },
                                                        ),
                                                        IconButton(
                                                          padding: EdgeInsets.zero,
                                                          constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                                          icon: const Icon(LucideIcons.trash2, size: 13, color: AppColors.danger),
                                                          onPressed: () => menuProv.removeItem(rawIndex),
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ],
                          );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
