import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
// icons via app_theme.dart
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/menu_provider.dart';

class ManageShiftsModal extends StatefulWidget {
  const ManageShiftsModal({super.key});

  @override
  State<ManageShiftsModal> createState() => _ManageShiftsModalState();
}

class _ManageShiftsModalState extends State<ManageShiftsModal> {
  final _newShiftController = TextEditingController();

  @override
  void dispose() {
    _newShiftController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final menuProv = context.watch<MenuProvider>();
    final shifts = menuProv.shifts;
    final activeShift = menuProv.activeShift;

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
                  'MANAGE MENU SHIFTS',
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

            // Add Shift Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _newShiftController,
                    decoration: const InputDecoration(hintText: 'e.g. Midnight Supper', labelText: 'New Shift Name'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final name = _newShiftController.text.trim();
                    if (name.isNotEmpty) {
                      menuProv.addShift(name);
                      _newShiftController.clear();
                    }
                  },
                  child: const Text('ADD SHIFT'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Shifts List
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: shifts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final shift = shifts[index];
                  final isLiveActive = shift == activeShift;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        if (isLiveActive)
                          const Icon(Icons.circle, size: 8, color: AppColors.success)
                        else
                          const Icon(LucideIcons.clock, size: 14, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '$shift ${isLiveActive ? "(Live Shift)" : ""}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isLiveActive ? AppColors.success : null,
                            ),
                          ),
                        ),
                        if (!isLiveActive && shifts.length > 1)
                          IconButton(
                            icon: const Icon(LucideIcons.trash2, size: 14, color: AppColors.danger),
                            onPressed: () => menuProv.deleteShift(shift),
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
