import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart' as lucide;
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/menu_provider.dart';

const Map<String, IconData> kDesktopCategoryIconMap = {
  'wheat': lucide.LucideIcons.wheat,
  'package': lucide.LucideIcons.package,
  'fastfood': lucide.LucideIcons.utensils,
  'pizza': lucide.LucideIcons.pizza,
  'burger': lucide.LucideIcons.sandwich,
  'soup': lucide.LucideIcons.soup,
  'dinner': lucide.LucideIcons.utensilsCrossed,
  'rice': lucide.LucideIcons.cookingPot,
  'croissant': lucide.LucideIcons.croissant,
  'coffee': lucide.LucideIcons.coffee,
  'drink': lucide.LucideIcons.cupSoda,
  'bar': lucide.LucideIcons.wine,
  'beer': lucide.LucideIcons.beer,
  'icecream': lucide.LucideIcons.iceCream2,
  'cookie': lucide.LucideIcons.cookie,
  'cake': lucide.LucideIcons.cake,
  'salad': lucide.LucideIcons.salad,
  'flame': lucide.LucideIcons.flame,
  'fish': lucide.LucideIcons.fish,
  'egg': lucide.LucideIcons.egg,
  'sparkles': lucide.LucideIcons.sparkles,
  'star': lucide.LucideIcons.star,
  'tag': lucide.LucideIcons.tag,
  'apple': lucide.LucideIcons.apple,
  'popcorn': lucide.LucideIcons.popcorn,
  'baby': lucide.LucideIcons.baby,
  'sauce': lucide.LucideIcons.sparkle,
  'bell': lucide.LucideIcons.bell,
  'store': lucide.LucideIcons.store,
  'leaf': lucide.LucideIcons.leaf,
  'shield': lucide.LucideIcons.shieldCheck,
  'utensils': lucide.LucideIcons.utensilsCrossed,
};

IconData getDesktopCategoryIcon(String catName, [String? explicitKey]) {
  if (explicitKey != null && explicitKey.isNotEmpty && kDesktopCategoryIconMap.containsKey(explicitKey.toLowerCase())) {
    return kDesktopCategoryIconMap[explicitKey.toLowerCase()]!;
  }
  final c = catName.toLowerCase();
  if (c.contains('wheat') || c.contains('millet') || c.contains('flake') || c.contains('grain')) return lucide.LucideIcons.wheat;
  if (c.contains('package') || c.contains('box') || c.contains('retail')) return lucide.LucideIcons.package;
  if (c.contains('pizza')) return lucide.LucideIcons.pizza;
  if (c.contains('soup')) return lucide.LucideIcons.soup;
  if (c.contains('burger') || c.contains('sandwich')) return lucide.LucideIcons.sandwich;
  if (c.contains('rice') || c.contains('biryani')) return lucide.LucideIcons.cookingPot;
  if (c.contains('main') || c.contains('curry')) return lucide.LucideIcons.utensilsCrossed;
  if (c.contains('drink') || c.contains('beverage')) return lucide.LucideIcons.cupSoda;
  if (c.contains('coffee') || c.contains('tea')) return lucide.LucideIcons.coffee;
  if (c.contains('dessert') || c.contains('sweet')) return lucide.LucideIcons.cookie;
  if (c.contains('ice cream')) return lucide.LucideIcons.iceCream2;
  if (c.contains('salad')) return lucide.LucideIcons.salad;
  return lucide.LucideIcons.utensilsCrossed;
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

  String? _suggestIconForCategory(String text) {
    final c = text.toLowerCase();
    if (c.contains('wheat') || c.contains('millet') || c.contains('grain')) return 'wheat';
    if (c.contains('package') || c.contains('box') || c.contains('retail')) return 'package';
    if (c.contains('pizza')) return 'pizza';
    if (c.contains('soup')) return 'soup';
    if (c.contains('burger') || c.contains('sandwich')) return 'burger';
    if (c.contains('rice') || c.contains('biryani')) return 'rice';
    if (c.contains('curry') || c.contains('main')) return 'dinner';
    if (c.contains('drink') || c.contains('beverage')) return 'drink';
    if (c.contains('coffee') || c.contains('tea')) return 'coffee';
    if (c.contains('dessert') || c.contains('sweet')) return 'cake';
    if (c.contains('ice cream')) return 'icecream';
    if (c.contains('salad')) return 'salad';
    if (c.contains('flame') || c.contains('grill') || c.contains('tandoor')) return 'flame';
    return null;
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

  void _showRenameCategoryDialog(String oldName) {
    final renameController = TextEditingController(text: oldName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('RENAME CATEGORY', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: renameController,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Category Name'),
            ),
            const SizedBox(height: 8),
            Text(
              'Dishes assigned to "$oldName" will be automatically updated to the new name.',
              style: TextStyle(fontSize: 11, color: Theme.of(ctx).textTheme.bodySmall?.color),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              final newName = renameController.text.trim();
              if (newName.isEmpty) return;
              final menuProv = context.read<MenuProvider>();
              if (newName.toLowerCase() != oldName.toLowerCase() &&
                  menuProv.categories.any((c) => c.toLowerCase() == newName.toLowerCase())) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('A category with this name already exists!'), backgroundColor: AppColors.danger),
                );
                return;
              }
              menuProv.renameCategory(oldName, newName);
              Navigator.pop(ctx);
            },
            child: const Text('APPLY'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCategory(String cat, int itemCount) {
    final menuProv = context.read<MenuProvider>();
    if (menuProv.categories.length <= 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must keep at least 1 menu category.'), backgroundColor: AppColors.danger),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('DELETE CATEGORY', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.danger)),
        content: Text(
          itemCount > 0
              ? 'Category "$cat" contains $itemCount dish(es). Deleting this category will remove it from the categories list (dishes will remain in database). Are you sure?'
              : 'Are you sure you want to delete category "$cat"?',
          style: const TextStyle(fontSize: 12),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              menuProv.removeCategory(cat);
              Navigator.pop(ctx);
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menuProv = context.watch<MenuProvider>();
    final categories = menuProv.categories;
    final starredCount = menuProv.items.where((i) => i.isPopular).length;

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 560,
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

            // Featured Section Card (Tablet Kiosk #1)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(lucide.LucideIcons.star, size: 14, color: Colors.amber),
                          SizedBox(width: 6),
                          Text(
                            'FEATURED SECTION (TABLET KIOSK #1)',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.amber),
                          ),
                        ],
                      ),
                      Text(
                        'Shows dishes marked with ★ Star',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Theme.of(context).textTheme.bodySmall?.color),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Tooltip(
                        message: 'Change icon for featured section',
                        child: InkWell(
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          onTap: () {
                            _showIconPicker(
                              currentIcon: menuProv.popularCategoryIcon,
                              onSelected: (key) => menuProv.setPopularCategory(icon: key),
                            );
                          },
                          child: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                            ),
                            child: Icon(
                              kDesktopCategoryIconMap[menuProv.popularCategoryIcon] ?? lucide.LucideIcons.star,
                              size: 18,
                              color: Colors.amber,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                menuProv.popularCategoryName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.amber.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                '★ Starred ($starredCount)',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(lucide.LucideIcons.pencil, size: 15),
                        tooltip: 'Rename featured section',
                        onPressed: () {
                          final renameController = TextEditingController(text: menuProv.popularCategoryName);
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('RENAME FEATURED SECTION', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              content: TextField(
                                controller: renameController,
                                autofocus: true,
                                decoration: const InputDecoration(labelText: 'Section Name (e.g. Popular, Bestsellers)'),
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
                                ElevatedButton(
                                  onPressed: () {
                                    final val = renameController.text.trim();
                                    if (val.isNotEmpty) {
                                      menuProv.setPopularCategory(name: val);
                                    }
                                    Navigator.pop(ctx);
                                  },
                                  child: const Text('APPLY'),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

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
                    onChanged: (val) {
                      final suggested = _suggestIconForCategory(val);
                      if (suggested != null && _newCategoryIcon == 'utensils') {
                        setState(() => _newCategoryIcon = suggested);
                      }
                    },
                    decoration: const InputDecoration(hintText: 'e.g. Soups, Pizzas, Millets', labelText: 'New Category Name'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final name = _newCategoryController.text.trim();
                    if (name.isNotEmpty) {
                      if (categories.any((c) => c.toLowerCase() == name.toLowerCase())) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Category already exists!'), backgroundColor: AppColors.danger),
                        );
                        return;
                      }
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
              constraints: const BoxConstraints(maxHeight: 300),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: categories.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final cat = categories[index];
                  final isFirst = index == 0;
                  final isLast = index == categories.length - 1;
                  final iconKey = menuProv.getCategoryIcon(cat);
                  final iconData = getDesktopCategoryIcon(cat, iconKey);
                  final itemCount = menuProv.items.where((i) => i.category.trim().toLowerCase() == cat.trim().toLowerCase()).length;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  cat,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).cardColor,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                                ),
                                child: Text(
                                  '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Theme.of(context).textTheme.bodySmall?.color),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Move Up
                        IconButton(
                          icon: const Icon(lucide.LucideIcons.chevronUp, size: 16),
                          tooltip: 'Move up',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          onPressed: isFirst ? null : () => menuProv.moveCategory(index, -1),
                        ),

                        // Move Down
                        IconButton(
                          icon: const Icon(lucide.LucideIcons.chevronDown, size: 16),
                          tooltip: 'Move down',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          onPressed: isLast ? null : () => menuProv.moveCategory(index, 1),
                        ),

                        // Rename
                        IconButton(
                          icon: const Icon(lucide.LucideIcons.pencil, size: 14),
                          tooltip: 'Rename category',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          onPressed: () => _showRenameCategoryDialog(cat),
                        ),

                        // Delete
                        IconButton(
                          icon: const Icon(lucide.LucideIcons.trash2, size: 14, color: AppColors.danger),
                          tooltip: 'Delete category',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          onPressed: categories.length <= 1 ? null : () => _confirmDeleteCategory(cat, itemCount),
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
