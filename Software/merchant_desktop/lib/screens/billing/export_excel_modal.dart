import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
// icons via app_theme.dart
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../models/order_model.dart';
import '../../providers/venue_provider.dart';
import '../../services/excel_export_service.dart';

class ExportExcelModal extends StatefulWidget {
  final List<OrderModel> allOrders;

  const ExportExcelModal({super.key, required this.allOrders});

  @override
  State<ExportExcelModal> createState() => _ExportExcelModalState();
}

class _ExportExcelModalState extends State<ExportExcelModal> {
  String _preset = 'today'; // 'today', '7d', '15d', '30d', 'custom'
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  bool _isExporting = false;

  @override
  void initState() {
    super.initState();
    _applyPreset('today');
  }

  void _applyPreset(String preset) {
    setState(() {
      _preset = preset;
      final now = DateTime.now();
      if (preset == 'today') {
        _startDate = DateTime(now.year, now.month, now.day);
        _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
      } else if (preset == '7d') {
        _startDate = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 7));
        _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
      } else if (preset == '15d') {
        _startDate = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 15));
        _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
      } else if (preset == '30d') {
        _startDate = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 30));
        _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final venueName = context.watch<VenueProvider>().selectedVenue?.outletName ?? 'Venue';
    final dateFormat = DateFormat('dd-MMM-yyyy');

    // Filter matching orders in range
    final matchingOrders = widget.allOrders.where((ord) {
      if (ord.items.isEmpty && ord.totalAmount == 0) return false;
      return ord.createdAt.isAfter(_startDate.subtract(const Duration(seconds: 1))) &&
          ord.createdAt.isBefore(_endDate.add(const Duration(seconds: 1)));
    }).toList();

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'EXPORT PAYMENT HISTORY TO EXCEL',
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

            // Date Presets Chips
            const Text('Choose Date Range Preset:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            Wrap(
              spacing: 8,
              children: [
                _buildPresetChip('Today', 'today'),
                _buildPresetChip('Last 7 Days', '7d'),
                _buildPresetChip('Last 15 Days', '15d'),
                _buildPresetChip('Last 30 Days', '30d'),
                _buildPresetChip('Custom Date', 'custom'),
              ],
            ),
            const SizedBox(height: 16),

            // Start & End Date Selectors
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Start Date:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _startDate,
                            firstDate: DateTime(2025),
                            lastDate: DateTime.now(),
                          );
                          if (picked != null) {
                            setState(() {
                              _preset = 'custom';
                              _startDate = DateTime(picked.year, picked.month, picked.day);
                            });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            border: Border.all(color: Theme.of(context).dividerColor),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: Text(dateFormat.format(_startDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('End Date:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _endDate,
                            firstDate: DateTime(2025),
                            lastDate: DateTime.now(),
                          );
                          if (picked != null) {
                            setState(() {
                              _preset = 'custom';
                              _endDate = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
                            });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            border: Border.all(color: Theme.of(context).dividerColor),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: Text(dateFormat.format(_endDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Summary Indicator Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileSpreadsheet, size: 20, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Text(
                    '${matchingOrders.length} transaction orders found for export',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: (matchingOrders.isEmpty || _isExporting)
                      ? null
                      : () async {
                          setState(() => _isExporting = true);

                          final filePath = await ExcelExportService.exportPaymentHistory(
                            venueName: venueName,
                            orders: matchingOrders,
                            startDate: _startDate,
                            endDate: _endDate,
                          );

                          setState(() => _isExporting = false);

                          if (context.mounted) {
                            Navigator.pop(context);
                            if (filePath != null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Exported ${matchingOrders.length} orders to Excel!\n$filePath')),
                              );
                            }
                          }
                        },
                  icon: _isExporting
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(LucideIcons.download, size: 14),
                  label: Text(_isExporting ? 'EXPORTING...' : 'EXPORT TO EXCEL'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetChip(String label, String value) {
    final isSelected = _preset == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : null)),
      selected: isSelected,
      selectedColor: AppColors.primary,
      onSelected: (_) => _applyPreset(value),
    );
  }
}
