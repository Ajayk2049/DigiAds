import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../models/order_model.dart';
import '../../providers/orders_provider.dart';
import '../../providers/menu_provider.dart';
import 'takeout_modal.dart';

class LiveOrdersScreen extends StatelessWidget {
  const LiveOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersProv = context.watch<OrdersProvider>();
    final menuProv = context.watch<MenuProvider>();

    final orders = ordersProv.liveOrders;

    return Column(
      children: [
        // Top Toolbar inside Live Orders Page
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 0.8)),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.utensilsCrossed, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              const Text(
                'LIVE ORDERS POS',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
              ),
              const SizedBox(width: 10),

              // Active Orders Count Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: orders.isNotEmpty ? AppColors.danger : (isDark ? AppColors.darkCardElevated : Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${orders.length} ACTIVE',
                  style: TextStyle(
                    color: orders.isNotEmpty ? Colors.white : (isDark ? AppColors.darkMuted : Colors.black87),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              const SizedBox(width: 10),

              // Live Pulse Indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF062817) : AppColors.successBg,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.4), width: 0.8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.circle, color: AppColors.success, size: 6),
                    SizedBox(width: 5),
                    Text(
                      'LIVE FEED',
                      style: TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Active Shift Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0C243B) : AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 0.8),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.clock, size: 12, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Text(
                      'Shift: ${menuProv.activeShift}',
                      style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 10),

              // + COUNTER / TAKEAWAY ORDER BUTTON
              ElevatedButton.icon(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => const TakeoutModal(),
                  );
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                icon: const Icon(LucideIcons.shoppingBag, size: 14),
                label: const Text('+ COUNTER / TAKEAWAY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        ),

        // Body Content: Tabular Layout
        Expanded(
          child: ordersProv.isLoading
              ? const Center(child: CircularProgressIndicator())
              : orders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.bell, size: 48, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          const SizedBox(height: 14),
                          const Text(
                            'Waiting for live orders...',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'When customers order at dining tables or counter pickups, they will pop up here instantly.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ),
                        ],
                      ),
                    )
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        const minTableWidth = 1140.0;
                        final contentWidth = constraints.maxWidth < minTableWidth ? minTableWidth : constraints.maxWidth;

                        return SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: SizedBox(
                            width: contentWidth,
                            child: Column(
                              children: [
                                // Clear Table Headers
                                _buildTableHeader(context, isDark),

                                // Scrollable Orders Table Rows
                                Expanded(
                                  child: ListView.separated(
                                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                                    itemCount: orders.length,
                                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                                    itemBuilder: (context, index) {
                                      final order = orders[index];
                                      return _buildOrderRow(context, order, ordersProv, isDark);
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  /// Sticky / Clear Column Headers for Live Orders Table
  Widget _buildTableHeader(BuildContext context, bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        border: Border.all(
          color: Theme.of(context).dividerColor,
          width: 0.8,
        ),
      ),
      child: const Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              'TABLE NUMBER',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'ORDER ID',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
            ),
          ),
          Expanded(
            flex: 4,
            child: Text(
              'ITEMS',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
            ),
          ),
          Expanded(
            flex: 1,
            child: Center(
              child: Text(
                'QTY',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'PRICE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'TOTAL',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Center(
              child: Text(
                'WAITER REQUEST',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Center(
              child: Text(
                'STATUS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'ACTIONS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: Colors.grey),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Formatted Table Row for Each Live Order
  Widget _buildOrderRow(
    BuildContext context,
    OrderModel order,
    OrdersProvider ordersProv,
    bool isDark,
  ) {
    final isPlaced = order.orderStatus == 'placed';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        border: Border.all(
          color: isPlaced ? AppColors.warning.withValues(alpha: 0.5) : Theme.of(context).dividerColor,
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: isPlaced ? AppColors.warning.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. TABLE NUMBER (flex: 2)
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: isDark
                      ? (order.isTakeout ? const Color(0xFF2A1C08) : const Color(0xFF0C243B))
                      : (order.isTakeout ? AppColors.warningBg : AppColors.primaryLight),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(
                    color: order.isTakeout ? AppColors.warning.withValues(alpha: 0.3) : AppColors.primary.withValues(alpha: 0.3),
                    width: 0.8,
                  ),
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
            ),
          ),

          // 2. ORDER ID (flex: 2)
          Expanded(
            flex: 2,
            child: Text(
              order.orderId,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Courier'),
            ),
          ),

          // 3. ITEMS (flex: 4)
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: order.items.map((item) {
                return Container(
                  constraints: const BoxConstraints(minHeight: 22),
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: item.isVeg ? AppColors.vegGreen : AppColors.nonVegRed,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '${item.name}${item.isPacked ? ' [PACK]' : ''}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      if (item.customization.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(left: 14, top: 1),
                          child: Text(
                            '↳ ${item.customization}',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontStyle: FontStyle.italic,
                              color: isDark ? Colors.amber.shade300 : Colors.amber.shade800,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          // 4. QTY (flex: 1, Centered)
          Expanded(
            flex: 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: order.items.map((item) {
                return Container(
                  constraints: const BoxConstraints(minHeight: 22),
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  alignment: Alignment.center,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCardElevated : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'x${item.quantity}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // 5. PRICE (flex: 2, Aligned right)
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: order.items.map((item) {
                return Container(
                  constraints: const BoxConstraints(minHeight: 22),
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  alignment: Alignment.centerRight,
                  child: Text(
                    'Rs. ${item.totalInRupees.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                      fontFamily: 'Courier',
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // 6. TOTAL (flex: 2, Aligned right)
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Rs. ${order.totalInRupees.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  alignment: WrapAlignment.end,
                  children: [
                    InkWell(
                      onTap: () => ordersProv.toggleGstExemption(order.orderId, !order.isGstExempt),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark
                              ? (order.isGstExempt ? const Color(0xFF062817) : const Color(0xFF2A1C08))
                              : (order.isGstExempt ? AppColors.successBg : AppColors.warningBg),
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          border: Border.all(
                            color: order.isGstExempt ? AppColors.success.withValues(alpha: 0.4) : AppColors.warning.withValues(alpha: 0.4),
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          order.isGstExempt ? '✓ No GST' : '- GST',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: order.isGstExempt ? AppColors.success : AppColors.warning,
                          ),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => ordersProv.toggleServiceTaxExemption(order.orderId, !order.isServiceTaxExempt),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark
                              ? (order.isServiceTaxExempt ? const Color(0xFF062817) : const Color(0xFF1E103A))
                              : (order.isServiceTaxExempt ? AppColors.successBg : AppColors.purpleBg),
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          border: Border.all(
                            color: order.isServiceTaxExempt ? AppColors.success.withValues(alpha: 0.4) : AppColors.purple.withValues(alpha: 0.4),
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          order.isServiceTaxExempt ? '✓ No ST' : '- ST',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: order.isServiceTaxExempt ? AppColors.success : AppColors.purple,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 7. WAITER REQUEST (flex: 3, Centered)
          Expanded(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Center(
                child: order.waiterCallStatus == 'pending'
                    ? InkWell(
                        onTap: () => ordersProv.serviceWaiter(order.orderId),
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF3B1212) : AppColors.dangerBg,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.7), width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                (order.waiterCallOption?.toLowerCase().contains('bill') ?? false)
                                    ? LucideIcons.receipt
                                    : LucideIcons.bellRing,
                                size: 13,
                                color: AppColors.danger,
                              ),
                              const SizedBox(width: 5),
                              Flexible(
                                child: Text(
                                  '${order.waiterCallOption ?? 'Assistance'}${order.waiterCallCount > 1 ? ' x${order.waiterCallCount}' : ''}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.danger,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 5),
                              const Icon(LucideIcons.check, size: 12, color: AppColors.danger),
                            ],
                          ),
                        ),
                      )
                    : const Text(
                        '—',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
              ),
            ),
          ),

          // 8. STATUS (flex: 3, Centered)
          Expanded(
            flex: 3,
            child: Center(
              child: _buildStatusWidget(context, order, ordersProv),
            ),
          ),

          // 9. ACTIONS (flex: 2, Aligned right)
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: (order.isTakeout || order.tableStatus == 'close_table')
                  ? _PulsingReceiveButton(
                      onPressed: () => _showPaymentMethodDialog(context, order, ordersProv),
                    )
                  : OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: BorderSide(color: AppColors.danger.withOpacity(0.4)),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      onPressed: (order.orderStatus == 'served' || order.items.isEmpty)
                          ? () => ordersProv.closeTable(order.orderId)
                          : null,
                      child: const Text('CLEAR TABLE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  /// Dynamic Status Widget enforcing forward-only lifecycle
  Widget _buildStatusWidget(BuildContext context, OrderModel order, OrdersProvider ordersProv) {
    // 1. If 'served': Locked permanent state, only Clear Table action is possible
    if (order.orderStatus == 'served') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.successBg,
          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.5)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.circleCheck, size: 14, color: AppColors.success),
            SizedBox(width: 5),
            Text(
              'Served',
              style: TextStyle(
                color: AppColors.success,
                fontWeight: FontWeight.w900,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    // 2. If 'cancelled': Locked permanent state
    if (order.orderStatus == 'cancelled') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.dangerBg,
          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
          border: Border.all(color: AppColors.danger.withValues(alpha: 0.5)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.circleMinus, size: 14, color: AppColors.danger),
            SizedBox(width: 5),
            Text(
              'Cancelled',
              style: TextStyle(
                color: AppColors.danger,
                fontWeight: FontWeight.w900,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    // 3. Dropdown for active states ('placed' or 'cooking')
    final isCooking = order.orderStatus == 'cooking';

    // Allowed options:
    // - From 'placed': can stay 'placed', advance to 'cooking', or cancel ('cancelled')
    // - From 'cooking': can stay 'cooking', or advance to 'served'. CANNOT go back to 'placed' or be 'cancelled'!
    final items = <DropdownMenuItem<String>>[
      if (!isCooking)
        const DropdownMenuItem(
          value: 'placed',
          child: Text('Placed', style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold, fontSize: 11)),
        ),
      const DropdownMenuItem(
        value: 'cooking',
        child: Text('Accepted & Preparing', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
      ),
      const DropdownMenuItem(
        value: 'served',
        child: Text('Served', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
      ),
      if (!isCooking)
        const DropdownMenuItem(
          value: 'cancelled',
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.circleMinus, size: 12, color: AppColors.danger),
              SizedBox(width: 4),
              Text('Cancel order', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w900, fontSize: 11)),
            ],
          ),
        ),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: _getStatusBgColor(order.orderStatus),
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        border: Border.all(color: _getStatusColor(order.orderStatus).withOpacity(0.5)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: order.orderStatus,
          dropdownColor: Theme.of(context).cardColor,
          isDense: true,
          icon: Icon(
            LucideIcons.chevronDown,
            size: 14,
            color: _getStatusColor(order.orderStatus),
          ),
          style: TextStyle(
            color: _getStatusColor(order.orderStatus),
            fontWeight: FontWeight.w900,
            fontSize: 11,
          ),
          items: items,
          selectedItemBuilder: (context) {
            return items.map((item) {
              if (item.value == 'cancelled') {
                return const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.circleMinus, size: 12, color: AppColors.danger),
                    SizedBox(width: 4),
                    Text('Cancel order', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.danger)),
                  ],
                );
              }
              final label = item.value == 'placed'
                  ? 'Placed'
                  : item.value == 'cooking'
                      ? 'Accepted & Preparing'
                      : 'Served';
              return Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900));
            }).toList();
          },
          onChanged: (val) {
            if (val != null && val != order.orderStatus) {
              if (val == 'cancelled') {
                _confirmCancelOrder(context, order, ordersProv);
              } else {
                ordersProv.updateOrderStatus(order.orderId, val);
              }
            }
          },
        ),
      ),
    );
  }

  void _confirmCancelOrder(BuildContext context, OrderModel order, OrdersProvider ordersProv) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(LucideIcons.circleMinus, color: AppColors.danger, size: 20),
            SizedBox(width: 8),
            Text('Cancel Order?'),
          ],
        ),
        content: Text(
          'Are you sure you want to cancel order ${order.orderId} for ${order.isTakeout ? 'Takeout' : 'Table ${order.tableNumber}'}?\nThis will mark the order as cancelled.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep Order'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              Navigator.pop(ctx);
              ordersProv.updateOrderStatus(order.orderId, 'cancelled');
            },
            child: const Text('Cancel Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showPaymentMethodDialog(BuildContext context, OrderModel order, OrdersProvider ordersProv) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
          title: Text(
            'Collect Payment for ${order.isTakeout ? 'Takeout' : 'Table ${order.tableNumber}'}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Grand Total: Rs. ${order.totalInRupees.toStringAsFixed(2)}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.success),
              ),
              const SizedBox(height: 6),
              const Text(
                'Select customer payment mode to complete and clear table:',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actionsPadding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
          actions: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                ordersProv.markPaymentReceived(order.orderId, 'CASH');
              },
              icon: const Icon(LucideIcons.banknote, size: 16),
              label: const Text('CASH', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                ordersProv.markPaymentReceived(order.orderId, 'UPI');
              },
              icon: const Icon(LucideIcons.qrCode, size: 16),
              label: const Text('UPI', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'placed':
        return AppColors.warning;
      case 'cooking':
        return AppColors.primary;
      case 'served':
        return AppColors.success;
      case 'cancelled':
        return AppColors.danger;
      default:
        return AppColors.lightMuted;
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status) {
      case 'placed':
        return AppColors.warningBg;
      case 'cooking':
        return AppColors.primaryLight;
      case 'served':
        return AppColors.successBg;
      case 'cancelled':
        return AppColors.dangerBg;
      default:
        return Colors.transparent;
    }
  }
}

/// Breathing Pulsing Red Button for "Mark As Received" action
class _PulsingReceiveButton extends StatefulWidget {
  final VoidCallback onPressed;
  const _PulsingReceiveButton({required this.onPressed});

  @override
  State<_PulsingReceiveButton> createState() => _PulsingReceiveButtonState();
}

class _PulsingReceiveButtonState extends State<_PulsingReceiveButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final val = _animation.value;
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
            boxShadow: [
              BoxShadow(
                color: AppColors.danger.withValues(alpha: 0.2 + (val * 0.45)),
                blurRadius: 4.0 + (val * 8.0),
                spreadRadius: 0.5 + (val * 1.5),
              ),
            ],
          ),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Color.lerp(
                const Color(0xFFB91C1C),
                const Color(0xFFEF4444),
                val,
              ),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                side: BorderSide(
                  color: Colors.white.withValues(alpha: 0.2 + (val * 0.4)),
                  width: 1,
                ),
              ),
            ),
            onPressed: widget.onPressed,
            icon: const Icon(LucideIcons.circleCheck, size: 13),
            label: const Text(
              'Mark As Received',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
            ),
          ),
        );
      },
    );
  }
}
