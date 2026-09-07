import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
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
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersProv = context.watch<OrdersProvider>();
    final venueProv = context.watch<VenueProvider>();
    final printerProv = context.watch<PrinterProvider>();

    final allOrders = ordersProv.paymentOrders;

    // Filter by date & search query
    final filtered = allOrders.where((ord) {
      // Exclude empty ₹0 waiter sessions
      if (ord.items.isEmpty && ord.totalAmount == 0) return false;

      final isSameDay = ord.createdAt.year == _selectedDate.year &&
          ord.createdAt.month == _selectedDate.month &&
          ord.createdAt.day == _selectedDate.day;

      if (_searchQuery.trim().isEmpty) {
        return isSameDay;
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

                // Calendar Date Picker
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2025),
                      lastDate: DateTime.now().add(const Duration(days: 1)),
                    );
                    if (picked != null) setState(() => _selectedDate = picked);
                  },
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.calendar, size: 14, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          dateFormat.format(_selectedDate),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // EXPORT PAYMENTS EXCEL BUTTON
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (_) => ExportExcelModal(allOrders: allOrders),
                    );
                  },
                  icon: const Icon(LucideIcons.download, size: 14),
                  label: const Text('EXPORT PAYMENTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                ),
                const SizedBox(width: 8),

                // CONFIGURE BILL
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BillConfigScreen()),
                    );
                  },
                  icon: const Icon(LucideIcons.fileText, size: 14),
                  label: const Text('Configure Bill', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 8),

                // CONFIGURE UPI
                OutlinedButton.icon(
                  onPressed: () {
                    showDialog(context: context, builder: (_) => const UpiConfigModal());
                  },
                  icon: const Icon(LucideIcons.lock, size: 14),
                  label: const Text('Configure UPI', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 8),

                // Search Bar
                SizedBox(
                  width: 240,
                  height: 36,
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Search order, table, dish, UPI...',
                      prefixIcon: const Icon(LucideIcons.search, size: 14),
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 14),
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
