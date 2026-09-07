import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
// icons via app_theme.dart
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/menu_provider.dart';

class ManageCategoriesModal extends StatefulWidget {
  const ManageCategoriesModal({super.key});

  @override
  State<ManageCategoriesModal> createState() => _ManageCategoriesModalState();
}

class _ManageCategoriesModalState extends State<ManageCategoriesModal> {
  final _newCategoryController = TextEditingController();

  @override
  void dispose() {
    _newCategoryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final menuProv = context.watch<MenuProvider>();
    final categories = menuProv.categories;

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 480,
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
                Expanded(
                  child: TextField(
                    controller: _newCategoryController,
                    decoration: const InputDecoration(hintText: 'e.g. Soups, Pizzas, Desserts', labelText: 'New Category Name'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final name = _newCategoryController.text.trim();
                    if (name.isNotEmpty) {
                      menuProv.addCategory(name);
                      _newCategoryController.clear();
                    }
                  },
                  child: const Text('ADD'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Categories List
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: categories.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final cat = categories[index];

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.tag, size: 14, color: AppColors.primary),
                        const SizedBox(width: 8),
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
