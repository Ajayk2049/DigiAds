import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/order_model.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/orders_provider.dart';
import '../../providers/venue_provider.dart';
import '../../providers/printer_provider.dart';
import 'bill_config_screen.dart';
import 'upi_config_modal.dart';
import 'export_excel_modal.dart';
import '../../widgets/thermal_receipt_preview.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  DateTime _selectedDate = DateTime.now();
  String _historyPreset = 'today'; // 'today', '3d', '7d', '15d', '30d', 'all', 'custom_date'
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  int _countOrdersForPreset(List<OrderModel> allOrders, String preset) {
    if (preset == 'all') {
      return allOrders.where((o) => o.items.isNotEmpty || o.totalAmount > 0).length;
    }
    final now = DateTime.now();
    if (preset == 'today') {
      return allOrders.where((o) =>
        (o.items.isNotEmpty || o.totalAmount > 0) &&
        o.createdAt.year == now.year &&
        o.createdAt.month == now.month &&
        o.createdAt.day == now.day
      ).length;
    }
    final startOfToday = DateTime(now.year, now.month, now.day);
    final int days = preset == '3d' ? 2 : (preset == '7d' ? 6 : (preset == '15d' ? 14 : 29));
    final cutoff = startOfToday.subtract(Duration(days: days));
    return allOrders.where((o) =>
      (o.items.isNotEmpty || o.totalAmount > 0) &&
      o.createdAt.isAfter(cutoff.subtract(const Duration(seconds: 1)))
    ).length;
  }

  String _getHistoryButtonLabel() {
    switch (_historyPreset) {
      case '3d':
        return 'History: Last 3 Days';
      case '7d':
        return 'History: Last 7 Days';
      case '15d':
        return 'History: Last 15 Days';
      case '30d':
        return 'History: Last 30 Days';
      case 'all':
        return 'History: All Orders';
      case 'custom_date':
        return 'History';
      case 'today':
      default:
        return 'History';
    }
  }

  PopupMenuItem<String> _buildHistoryMenuItem({
    required String value,
    required String label,
    required IconData icon,
    required int count,
    required bool isDark,
  }) {
    final isSelected = _historyPreset == value;
    return PopupMenuItem<String>(
      value: value,
      height: 40,
      child: Row(
        children: [
          Icon(
            icon,
            size: 14,
            color: isSelected ? AppColors.primary : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                color: isSelected
                    ? AppColors.primary
                    : (isDark ? AppColors.darkText : AppColors.lightText),
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primary.withOpacity(0.15)
                  : (isDark ? AppColors.darkCard : const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isSelected ? AppColors.primary : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
              ),
            ),
          ),
          const SizedBox(width: 6),
          if (isSelected)
            const Icon(LucideIcons.check, size: 14, color: AppColors.primary)
          else
            const SizedBox(width: 14),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersProv = context.watch<OrdersProvider>();
    final venueProv = context.watch<VenueProvider>();
    final printerProv = context.watch<PrinterProvider>();

    final allOrders = ordersProv.paymentOrders;

    // Filter by date range & search query
    final filtered = allOrders.where((ord) {
      // Exclude empty ₹0 waiter sessions
      if (ord.items.isEmpty && ord.totalAmount == 0) return false;

      final bool matchesDate;
      if (_historyPreset == 'all') {
        matchesDate = true;
      } else if (_historyPreset == 'today') {
        final now = DateTime.now();
        matchesDate = ord.createdAt.year == now.year &&
            ord.createdAt.month == now.month &&
            ord.createdAt.day == now.day;
      } else if (_historyPreset == 'custom_date') {
        matchesDate = ord.createdAt.year == _selectedDate.year &&
            ord.createdAt.month == _selectedDate.month &&
            ord.createdAt.day == _selectedDate.day;
      } else {
        final now = DateTime.now();
        final startOfToday = DateTime(now.year, now.month, now.day);
        final int days;
        if (_historyPreset == '3d') {
          days = 2; // today + 2 previous days
        } else if (_historyPreset == '7d') {
          days = 6;
        } else if (_historyPreset == '15d') {
          days = 14;
        } else if (_historyPreset == '30d') {
          days = 29;
        } else {
          days = 0;
        }
        final cutoff = startOfToday.subtract(Duration(days: days));
        matchesDate = ord.createdAt.isAfter(cutoff.subtract(const Duration(seconds: 1)));
      }

      if (!matchesDate) return false;

      if (_searchQuery.trim().isEmpty) {
        return true;
      }

      final q = _searchQuery.toLowerCase();
      final matchId = ord.orderId.toLowerCase().contains(q);
      final matchTable = ord.tableNumber.toLowerCase().contains(q);
      final matchType = (ord.paymentType ?? 'UPI').toLowerCase().contains(q);
      final matchItems = ord.items.any((i) => i.name.toLowerCase().contains(q));
      final matchAmount = ord.totalInRupees.toString().contains(q);

      return matchId || matchTable || matchType || matchItems || matchAmount;
    }).toList();

    // Sort newest first
    filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final dateFormat = DateFormat('dd-MMM-yyyy');
    final dateTimeFormat = DateFormat('dd-MMM-yyyy hh:mm a');

    final isHistoryRangeActive = _historyPreset != 'today' && _historyPreset != 'custom_date';

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              children: [
                const Text(
                  'PAYMENT HISTORY',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 0.8),
                ),
                const Spacer(),

                // 1. Calendar Date Picker
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2025),
                      lastDate: DateTime.now().add(const Duration(days: 1)),
                    );
                    if (picked != null) {
                      setState(() {
                        _selectedDate = picked;
                        _historyPreset = 'custom_date';
                      });
                    }
                  },
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  child: Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: _historyPreset == 'custom_date'
                          ? AppColors.primary.withOpacity(isDark ? 0.2 : 0.1)
                          : (isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      border: Border.all(
                        color: _historyPreset == 'custom_date'
                            ? AppColors.primary
                            : Theme.of(context).dividerColor,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          LucideIcons.calendar,
                          size: 14,
                          color: _historyPreset == 'custom_date'
                              ? AppColors.primary
                              : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          dateFormat.format(_selectedDate),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _historyPreset == 'custom_date'
                                ? AppColors.primary
                                : (isDark ? AppColors.darkText : AppColors.lightText),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // 2. History Preset Button (Web-matching Primary BG with Clock Icon)
                PopupMenuButton<String>(
                  tooltip: 'Order History Presets',
                  offset: const Offset(0, 42),
                  elevation: 8,
                  color: isDark ? AppColors.darkCardElevated : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    side: BorderSide(color: Theme.of(context).dividerColor, width: 0.8),
                  ),
                  onSelected: (val) {
                    setState(() {
                      _historyPreset = val;
                      if (val == 'today') {
                        _selectedDate = DateTime.now();
                      }
                    });
                  },
                  itemBuilder: (ctx) => [
                    _buildHistoryMenuItem(
                      value: 'today',
                      label: 'Today',
                      icon: LucideIcons.calendar,
                      count: _countOrdersForPreset(allOrders, 'today'),
                      isDark: isDark,
                    ),
                    _buildHistoryMenuItem(
                      value: '3d',
                      label: 'Last 3 Days',
                      icon: LucideIcons.clock,
                      count: _countOrdersForPreset(allOrders, '3d'),
                      isDark: isDark,
                    ),
                    _buildHistoryMenuItem(
                      value: '7d',
                      label: 'Last 7 Days',
                      icon: LucideIcons.clock,
                      count: _countOrdersForPreset(allOrders, '7d'),
                      isDark: isDark,
                    ),
                    _buildHistoryMenuItem(
                      value: '15d',
                      label: 'Last 15 Days',
                      icon: LucideIcons.clock,
                      count: _countOrdersForPreset(allOrders, '15d'),
                      isDark: isDark,
                    ),
                    _buildHistoryMenuItem(
                      value: '30d',
                      label: 'Last 30 Days',
                      icon: LucideIcons.clock,
                      count: _countOrdersForPreset(allOrders, '30d'),
                      isDark: isDark,
                    ),
                    const PopupMenuDivider(height: 8),
                    _buildHistoryMenuItem(
                      value: 'all',
                      label: 'All (Full History)',
                      icon: LucideIcons.receipt,
                      count: _countOrdersForPreset(allOrders, 'all'),
                      isDark: isDark,
                    ),
                  ],
                  child: Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.clock, size: 14, color: Colors.white),
                        const SizedBox(width: 6),
                        Text(
                          _getHistoryButtonLabel(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Icon(
                          LucideIcons.chevronDown,
                          size: 12,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // 3. EXPORT PAYMENTS EXCEL BUTTON (Web-matching Emerald BG)
                SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusSmall)),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => ExportExcelModal(allOrders: allOrders),
                      );
                    },
                    icon: const Icon(LucideIcons.download, size: 14),
                    label: const Text('EXPORT PAYMENTS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),

                // 4. CONFIGURE BILL (Web-matching Primary Blue BG)
                SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusSmall)),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const BillConfigScreen()),
                      );
                    },
                    icon: const Icon(LucideIcons.fileText, size: 14),
                    label: const Text('Configure Bill', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),

                // 5. CONFIGURE UPI (Web-matching Primary Blue BG)
                SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusSmall)),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      showDialog(context: context, builder: (_) => const UpiConfigModal());
                    },
                    icon: const Icon(LucideIcons.lock, size: 14),
                    label: const Text('Configure UPI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),

                // Search Bar
                SizedBox(
                  width: 240,
                  height: 36,
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Search order, table, dish, UPI...',
                      prefixIcon: const Icon(LucideIcons.search, size: 14),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        borderSide: const BorderSide(color: AppColors.primary),
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 14),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(minWidth: 32, minHeight: 36),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Transactions Table
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.receipt, size: 44, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                        const SizedBox(height: 12),
                        const Text('No completed payment transactions found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('Adjust search parameters or date filters to locate specific orders.', style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final order = filtered[index];
                      final itemsSummary = order.items.map((i) => '${i.name}${i.isPacked ? " [PACK]" : ""} (x${i.quantity})').join(', ');

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(color: Theme.of(context).dividerColor),
                        ),
                        child: Row(
                          children: [
                            Text('${index + 1}.', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            const SizedBox(width: 12),

                            // Table / Takeout Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: order.isTakeout ? AppColors.warningBg : AppColors.primaryLight,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              ),
                              child: Text(
                                order.isTakeout ? '🛍️ TAKEOUT' : 'TABLE ${order.tableNumber}',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: order.isTakeout ? AppColors.warning : AppColors.primary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Order ID
                            SizedBox(
                              width: 130,
                              child: Text(order.orderId, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Courier')),
                            ),

                            // Items Summary
                            Expanded(
                              child: Text(
                                itemsSummary,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Amount
                            SizedBox(
                              width: 110,
                              child: Text(
                                'Rs. ${order.totalInRupees.toStringAsFixed(2)}',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, fontFamily: 'Courier'),
                                textAlign: TextAlign.right,
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Payment Mode
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.successBg,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                              ),
                              child: Text(
                                'PAID (${order.paymentType ?? "UPI"})',
                                style: const TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w900),
                              ),
                            ),
                            const SizedBox(width: 14),

                            // Timestamp
                            SizedBox(
                              width: 150,
                              child: Text(
                                dateTimeFormat.format(order.createdAt),
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                                textAlign: TextAlign.right,
                              ),
                            ),
                            const SizedBox(width: 14),

                            // SILENT PRINT RECEIPT
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              onPressed: () async {
                                final success = await printerProv.printCustomerBill(
                                  order: order,
                                  billConfig: venueProv.billConfig,
                                );
                                if (context.mounted && success) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Receipt sent to printer (${order.orderId})')),
                                  );
                                }
                              },
                              icon: const Icon(LucideIcons.printer, size: 13),
                              label: const Text('PRINT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            ),

                            const SizedBox(width: 4),

                            // PREVIEW
                            IconButton(
                              icon: const Icon(LucideIcons.eye, size: 15),
                              tooltip: 'Preview Bill',
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (_) => ThermalReceiptPreview(order: order, billConfig: venueProv.billConfig),
                                );
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
