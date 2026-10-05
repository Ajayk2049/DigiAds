import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../constants/app_colors.dart';
import '../../models/order_model.dart';
import '../../models/bill_config_model.dart';

/// Clean dashed divider matching thermal print dashed borders
class DashedDivider extends StatelessWidget {
  final double height;
  final Color color;
  final double dashWidth;
  final double dashSpace;

  const DashedDivider({
    super.key,
    this.height = 1,
    this.color = Colors.black,
    this.dashWidth = 4,
    this.dashSpace = 3,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final boxWidth = constraints.constrainWidth();
        final dashCount = (boxWidth / (dashWidth + dashSpace)).floor();
        return Flex(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: Axis.horizontal,
          children: List.generate(dashCount, (_) {
            return SizedBox(
              width: dashWidth,
              height: height,
              child: DecoratedBox(
                decoration: BoxDecoration(color: color),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Modal Preview for Kitchen Order Tickets (KOT)
/// Designed to match 100% to the Web PrintKotModal & KotReceipt component
class ThermalKotPreview extends StatefulWidget {
  final OrderModel order;
  final BillConfigModel billConfig;

  const ThermalKotPreview({
    super.key,
    required this.order,
    required this.billConfig,
  });

  @override
  State<ThermalKotPreview> createState() => _ThermalKotPreviewState();
}

class _ThermalKotPreviewState extends State<ThermalKotPreview> {
  late String _selectedPrintWidth;

  @override
  void initState() {
    super.initState();
    _selectedPrintWidth = widget.billConfig.billWidthFormat == '58mm' ? '58mm' : '80mm';
  }

  // Hardcoded preview items: premium veg main course with one parcel item
  static final List<OrderItemModel> _hardcodedPreviewItems = [
    OrderItemModel(
      itemId: '1',
      name: 'Paneer Butter Masala',
      quantity: 2,
      price: 28000,
      customization: 'Medium spicy, extra butter',
    ),
    OrderItemModel(
      itemId: '2',
      name: 'Dal Makhani Special',
      quantity: 1,
      price: 22000,
    ),
    OrderItemModel(
      itemId: '3',
      name: 'Butter Naan',
      quantity: 4,
      price: 4500,
    ),
    OrderItemModel(
      itemId: '4',
      name: 'Veg Dum Biryani',
      quantity: 1,
      price: 26000,
      isPacked: true,
      customization: 'Pack raita separately',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final is58mm = _selectedPrintWidth == '58mm';
    final displayItems = widget.order.items.isNotEmpty ? widget.order.items : _hardcodedPreviewItems;
    final totalQty = displayItems.fold<int>(0, (sum, item) => sum + item.quantity);

    // Format timestamp: "05 Oct 2026, 01:18 pm"
    final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(widget.order.createdAt);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        width: 500,
        decoration: BoxDecoration(
          color: const Color(0xFF131926), // Dark slate matching web bg-card
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x1FFFFFFF), width: 1),
          boxShadow: const [
            BoxShadow(
              color: Color(0x99000000),
              blurRadius: 32,
              offset: Offset(0, 12),
            ),
          ],
        ),
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Header: Title, Order ID, Print KOT Button, Close Icon
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left: Printer icon + Title & Subtitle
                Row(
                  children: [
                    const Icon(Icons.print_rounded, size: 20, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Print Kitchen KOT',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Order ID: ${widget.order.orderId}',
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontFamily: 'Courier',
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Right: Close 'X' Button
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF94A3B8)),
                  hoverColor: Colors.white10,
                  splashRadius: 18,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Paper Format Segmented Tab Bar (80mm vs 58mm)
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFF0B101B), // Dark pill container
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x14FFFFFF)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildFormatTab(
                      label: '📄 3-Inch (80mm POS)',
                      isSelected: !is58mm,
                      onTap: () => setState(() => _selectedPrintWidth = '80mm'),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: _buildFormatTab(
                      label: '📄 2-Inch (58mm Portable)',
                      isSelected: is58mm,
                      onTap: () => setState(() => _selectedPrintWidth = '58mm'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // On-screen Preview (KotReceipt identical to web version)
            Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: is58mm ? 240 : 340,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 16,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: DefaultTextStyle(
                  style: const TextStyle(
                    fontFamily: 'Courier',
                    color: Colors.black,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Table & Order Metadata
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            widget.order.orderType == 'TAKEOUT' || widget.order.tableNumber == 'TAKEOUT'
                                ? '🛍️ TAKEOUT'
                                : 'TABLE: ${widget.order.tableNumber}',
                            style: TextStyle(
                              fontSize: is58mm ? 12 : 14,
                              fontWeight: FontWeight.w900,
                              color: Colors.black,
                              fontFamily: 'Courier',
                            ),
                          ),
                          Text(
                            'ID: ${widget.order.orderId}',
                            style: TextStyle(
                              fontSize: is58mm ? 10 : 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.black,
                              fontFamily: 'Courier',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),

                      // Time
                      Text(
                        'Time: $formattedDate',
                        style: TextStyle(
                          fontSize: is58mm ? 8.5 : 10,
                          color: Colors.black87,
                          fontFamily: 'Courier',
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Dashed Divider
                      const DashedDivider(height: 1, color: Colors.black),
                      const SizedBox(height: 6),

                      // Column Headers
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'ITEM',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                              color: Colors.black,
                              fontFamily: 'Courier',
                            ),
                          ),
                          Text(
                            'QTY',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                              color: Colors.black,
                              fontFamily: 'Courier',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Solid Line
                      Container(height: 1.2, color: Colors.black),
                      const SizedBox(height: 8),

                      // Items List
                      ...displayItems.map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${item.name}${item.isPacked && !item.name.contains('(PACK)') ? ' [PACK]' : ''}',
                                      style: TextStyle(
                                        fontSize: is58mm ? 10 : 12,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.black,
                                        height: 1.2,
                                        fontFamily: 'Courier',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'x ${item.quantity}',
                                    style: TextStyle(
                                      fontSize: is58mm ? 11 : 12,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.black,
                                      fontFamily: 'Courier',
                                    ),
                                  ),
                                ],
                              ),
                              if (item.customization.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Padding(
                                  padding: const EdgeInsets.only(left: 6),
                                  child: Text(
                                    '* ${item.customization}',
                                    style: TextStyle(
                                      fontSize: is58mm ? 8.5 : 10,
                                      fontStyle: FontStyle.italic,
                                      color: Colors.black87,
                                      height: 1.2,
                                      fontFamily: 'Courier',
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      }),

                      const SizedBox(height: 4),
                      // Dashed Divider
                      const DashedDivider(height: 1, color: Colors.black),
                      const SizedBox(height: 8),

                      // Summary Footer: Total Items
                      Center(
                        child: Text(
                          'TOTAL ITEMS: $totalQty',
                          style: TextStyle(
                            fontSize: is58mm ? 10 : 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            color: Colors.black,
                            fontFamily: 'Courier',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormatTab({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? const [BoxShadow(color: Color(0x33000000), blurRadius: 4, offset: Offset(0, 1))]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white60,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
