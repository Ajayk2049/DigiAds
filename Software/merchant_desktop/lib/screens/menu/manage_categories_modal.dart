import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/menu_provider.dart';

const Map<String, IconData> kDesktopCategoryIconMap = {
  'wheat': Icons.grain,
  'package': Icons.inventory_2_outlined,
  'fastfood': Icons.fastfood,
  'pizza': Icons.local_pizza,
  'burger': Icons.lunch_dining,
  'soup': Icons.soup_kitchen,
  'dinner': Icons.dinner_dining,
  'rice': Icons.rice_bowl,
  'croissant': Icons.bakery_dining,
  'coffee': Icons.local_cafe,
  'drink': Icons.local_drink,
  'bar': Icons.local_bar,
  'beer': Icons.sports_bar,
  'icecream': Icons.icecream,
  'cookie': Icons.cookie,
  'cake': Icons.cake,
  'salad': Icons.eco,
  'flame': Icons.outdoor_grill,
  'fish': Icons.set_meal,
  'egg': Icons.breakfast_dining,
  'sparkles': Icons.auto_awesome,
  'star': Icons.star_rounded,
  'tag': Icons.local_offer,
  'apple': Icons.apple,
  'popcorn': Icons.movie,
  'baby': Icons.child_care,
  'sauce': Icons.add_circle_outline,
  'bell': Icons.notifications_active,
  'store': Icons.storefront,
  'leaf': Icons.spa,
  'shield': Icons.health_and_safety,
  'utensils': Icons.restaurant,
};

IconData getDesktopCategoryIcon(String catName, [String? explicitKey]) {
  if (explicitKey != null && explicitKey.isNotEmpty && kDesktopCategoryIconMap.containsKey(explicitKey.toLowerCase())) {
    return kDesktopCategoryIconMap[explicitKey.toLowerCase()]!;
  }
  final c = catName.toLowerCase();
  if (c.contains('wheat') || c.contains('millet') || c.contains('flake') || c.contains('grain')) return Icons.grain;
  if (c.contains('package') || c.contains('box') || c.contains('retail')) return Icons.inventory_2_outlined;
  if (c.contains('pizza')) return Icons.local_pizza;
  if (c.contains('soup')) return Icons.soup_kitchen;
  if (c.contains('burger') || c.contains('sandwich')) return Icons.lunch_dining;
  if (c.contains('rice') || c.contains('biryani')) return Icons.rice_bowl;
  if (c.contains('main') || c.contains('curry')) return Icons.dinner_dining;
  if (c.contains('drink') || c.contains('beverage')) return Icons.local_drink;
  if (c.contains('coffee') || c.contains('tea')) return Icons.local_cafe;
  if (c.contains('dessert') || c.contains('sweet')) return Icons.cookie;
  if (c.contains('ice cream')) return Icons.icecream;
  if (c.contains('salad')) return Icons.eco;
  return Icons.restaurant;
}

class ManageCategoriesModal extends StatefulWidget {
  const ManageCategoriesModal({super.key});

  @override
  State<ManageCategoriesModal> createState() => _ManageCategoriesModalState();
}

class _ManageCategoriesModalState extends State<ManageCategoriesModal> {
  final _newCategoryController = TextEditingController();
  String _newCategoryIcon = 'utensils';

  @override
  void dispose() {
    _newCategoryController.dispose();
    super.dispose();
  }

  void _showIconPicker({required String currentIcon, required Function(String) onSelected}) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Theme.of(ctx).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
        child: Container(
          width: 380,
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'SELECT CATEGORY ICON',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 14),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 280),
                child: SingleChildScrollView(
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: kDesktopCategoryIconMap.entries.map((entry) {
                      final isSelected = currentIcon.toLowerCase() == entry.key.toLowerCase();
                      return Tooltip(
                        message: entry.key,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          onTap: () {
                            onSelected(entry.key);
                            Navigator.pop(ctx);
                          },
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : Theme.of(ctx).scaffoldBackgroundColor,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : Theme.of(ctx).dividerColor,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Icon(
                              entry.value,
                              size: 20,
                              color: isSelected ? AppColors.primary : Theme.of(ctx).textTheme.bodyMedium?.color,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menuProv = context.watch<MenuProvider>();
    final categories = menuProv.categories;

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'MANAGE MENU CATEGORIES',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 0.8),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Add Category Row
            Row(
              children: [
                Tooltip(
                  message: 'Select icon for new category',
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    onTap: () {
                      _showIconPicker(
                        currentIcon: _newCategoryIcon,
                        onSelected: (key) => setState(() => _newCategoryIcon = key),
                      );
                    },
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        border: Border.all(color: Theme.of(context).dividerColor),
                      ),
                      child: Icon(
                        kDesktopCategoryIconMap[_newCategoryIcon] ?? Icons.restaurant,
                        size: 20,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _newCategoryController,
                    decoration: const InputDecoration(hintText: 'e.g. Soups, Pizzas, Millets', labelText: 'New Category Name'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final name = _newCategoryController.text.trim();
                    if (name.isNotEmpty) {
                      menuProv.addCategory(name, _newCategoryIcon);
                      _newCategoryController.clear();
                      setState(() => _newCategoryIcon = 'utensils');
                    }
                  },
                  child: const Text('ADD'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Categories List
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: categories.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final cat = categories[index];
                  final iconKey = menuProv.getCategoryIcon(cat);
                  final iconData = getDesktopCategoryIcon(cat, iconKey);

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '#${index + 1}',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                        ),
                        const SizedBox(width: 8),
                        Tooltip(
                          message: 'Click to change icon',
                          child: InkWell(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            onTap: () {
                              _showIconPicker(
                                currentIcon: iconKey,
                                onSelected: (key) => menuProv.setCategoryIcon(cat, key),
                              );
                            },
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                              ),
                              child: Icon(iconData, size: 16, color: AppColors.primary),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(cat, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                        if (categories.length > 1)
                          IconButton(
                            icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.danger),
                            onPressed: () => menuProv.removeCategory(cat),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('DONE'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
