import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../constants/app_colors.dart';
import '../../models/order_model.dart';
import '../../models/bill_config_model.dart';
import '../../config.dart';

/// Clean dashed divider matching thermal print dashed borders
class ReceiptDashedDivider extends StatelessWidget {
  final double height;
  final Color color;
  final double dashWidth;
  final double dashSpace;

  const ReceiptDashedDivider({
    super.key,
    this.height = 1,
    this.color = const Color(0xFF94A3B8),
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

/// Modal Preview for Customer Thermal Bills & Receipts
/// Designed with identical frame to ThermalKotPreview (no print button, pure preview)
class ThermalReceiptPreview extends StatefulWidget {
  final OrderModel order;
  final BillConfigModel billConfig;

  const ThermalReceiptPreview({
    super.key,
    required this.order,
    required this.billConfig,
  });

  @override
  State<ThermalReceiptPreview> createState() => _ThermalReceiptPreviewState();
}

class _ThermalReceiptPreviewState extends State<ThermalReceiptPreview> {
  late String _selectedPrintWidth;

  @override
  void initState() {
    super.initState();
    _selectedPrintWidth = widget.billConfig.billWidthFormat == '58mm' ? '58mm' : '80mm';
  }

  @override
  Widget build(BuildContext context) {
    final is58mm = _selectedPrintWidth == '58mm';
    final currency = NumberFormat.currency(locale: 'en_IN', symbol: '', decimalDigits: 2);
    final dateFormat = DateFormat('yyyy-MM-dd');

    final config = widget.billConfig;
    final order = widget.order;
    final totalQty = order.items.fold<int>(0, (sum, i) => sum + i.quantity);

    // Fallback to Mysore Dining Hall brand image & QR if not uploaded
    final logoUrl = config.logoUrl.isNotEmpty
        ? config.logoUrl
        : '/uploads/outlets/mysore_dining_hall_6a8bf6552d763dd4ee15b4bf/bills/bill_logo_e6499645a1ec4ef0.webp';
    final qrUrl = config.qrImageUrl.isNotEmpty
        ? config.qrImageUrl
        : '/uploads/outlets/mysore_dining_hall_6a8bf6552d763dd4ee15b4bf/bills/bill_logo_5d92401e7db54553.webp';
    final qrCaption = config.qrCaption.isNotEmpty
        ? config.qrCaption
        : 'Scan QR to provide feedback';

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        width: 500,
        decoration: BoxDecoration(
          color: const Color(0xFF131926), // Dark slate matching KOT preview
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
            // Top Header: Title, Venue Subtitle & Close Icon (No Print Button)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left: Receipt Icon + Title & Subtitle
                Row(
                  children: [
                    const Icon(Icons.receipt_long_rounded, size: 20, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Live Thermal Receipt Preview',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          config.restaurantName.isNotEmpty ? config.restaurantName : 'Sample Restaurant Bill',
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
                color: const Color(0xFF0B101B),
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

            // Ticket Preview (Thermal Receipt matching Web Portal)
            Flexible(
              child: SingleChildScrollView(
                child: Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: is58mm ? 240 : 340,
                    padding: EdgeInsets.all(is58mm ? 12 : 16),
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
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Header Logo (if uploaded or sample brand image)
                          if (logoUrl.isNotEmpty) ...[
                            Image.network(
                              AppConfig.resolveMediaUrl(logoUrl),
                              height: is58mm ? 45 : 55,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                            const SizedBox(height: 6),
                          ],

                          // Restaurant Name
                          Text(
                            config.restaurantName.isNotEmpty ? config.restaurantName.toUpperCase() : 'MYSORE DINING HALL',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: is58mm ? 14 : 17,
                              color: Colors.black,
                              letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 2),

                          // Addresses & Contact
                          if (config.addressLine1.isNotEmpty)
                            Text(config.addressLine1, style: TextStyle(fontSize: is58mm ? 8 : 9.5, color: Colors.black87), textAlign: TextAlign.center),
                          if (config.addressLine2.isNotEmpty || config.cityZip.isNotEmpty)
                            Text(
                              [config.addressLine2, config.cityZip].where((s) => s.isNotEmpty).join(', '),
                              style: TextStyle(fontSize: is58mm ? 8 : 9.5, color: Colors.black87),
                              textAlign: TextAlign.center,
                            ),
                          if (config.phone.isNotEmpty)
                            Text('Ph: ${config.phone}', style: TextStyle(fontSize: is58mm ? 8 : 9.5, color: Colors.black87), textAlign: TextAlign.center),

                          if (config.gstin.isNotEmpty || config.fssaiNo.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            if (config.gstin.isNotEmpty)
                              Text('GSTIN: ${config.gstin}', style: TextStyle(fontSize: is58mm ? 7.5 : 9, color: Colors.black87, fontWeight: FontWeight.bold)),
                            if (config.fssaiNo.isNotEmpty)
                              Text('FSSAI: ${config.fssaiNo}', style: TextStyle(fontSize: is58mm ? 7.5 : 9, color: Colors.black87)),
                          ],

                          const SizedBox(height: 6),
                          const ReceiptDashedDivider(height: 1, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 6),

                          // Order Meta Section
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('ORDER #: ${order.orderId}', style: TextStyle(fontSize: is58mm ? 8.5 : 10, fontWeight: FontWeight.bold, color: Colors.black)),
                              Text(order.isTakeout ? 'TYPE: TAKEOUT' : 'TYPE: DINE', style: TextStyle(fontSize: is58mm ? 8.5 : 10, fontWeight: FontWeight.bold, color: Colors.black)),
                            ],
                          ),
                          if (!order.isTakeout)
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text('TABLE NUMBER: ${order.tableNumber}', style: TextStyle(fontSize: is58mm ? 8.5 : 10, color: Colors.black)),
                            ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('BILL NO: ${config.billPrefix.isNotEmpty ? config.billPrefix : "INV"}-13658', style: TextStyle(fontSize: is58mm ? 8 : 9, color: Colors.black87)),
                              Text('DATE: ${dateFormat.format(order.createdAt)}', style: TextStyle(fontSize: is58mm ? 8 : 9, color: Colors.black87)),
                            ],
                          ),
                          if (config.showKOTNumbers)
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text('KOTS: 101, 102', style: TextStyle(fontSize: is58mm ? 8 : 9, color: Colors.black87)),
                            ),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'PAYMENT TYPE: ${order.paymentType ?? "CASH / PENDING"}',
                              style: TextStyle(fontSize: is58mm ? 8.5 : 10, fontWeight: FontWeight.bold, color: Colors.black),
                            ),
                          ),

                          const SizedBox(height: 6),
                          const ReceiptDashedDivider(height: 1, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 6),

                          // Table Column Header (NO. | ITEM | QTY | AMT)
                          Row(
                            children: [
                              SizedBox(width: is58mm ? 18 : 22, child: Text('NO.', style: TextStyle(fontSize: is58mm ? 8 : 9.5, fontWeight: FontWeight.bold, color: Colors.black))),
                              Expanded(child: Text('ITEM', style: TextStyle(fontSize: is58mm ? 8 : 9.5, fontWeight: FontWeight.bold, color: Colors.black))),
                              SizedBox(width: is58mm ? 25 : 32, child: Text('QTY', textAlign: TextAlign.center, style: TextStyle(fontSize: is58mm ? 8 : 9.5, fontWeight: FontWeight.bold, color: Colors.black))),
                              SizedBox(width: is58mm ? 42 : 55, child: Text('AMT', textAlign: TextAlign.right, style: TextStyle(fontSize: is58mm ? 8 : 9.5, fontWeight: FontWeight.bold, color: Colors.black))),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Container(height: 1.2, color: Colors.black),
                          const SizedBox(height: 6),

                          // Items List
                          ...order.items.asMap().entries.map((entry) {
                            final idx = entry.key + 1;
                            final item = entry.value;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(
                                        width: is58mm ? 18 : 22,
                                        child: Text('$idx.', style: TextStyle(fontSize: is58mm ? 8 : 9.5, fontWeight: FontWeight.bold, color: Colors.black)),
                                      ),
                                      Expanded(
                                        child: Text(
                                          '${item.name}${item.isPacked && !item.name.contains('(PACK)') ? ' (PACK)' : ''}',
                                          style: TextStyle(fontSize: is58mm ? 8.5 : 10, fontWeight: FontWeight.bold, color: Colors.black, height: 1.15),
                                        ),
                                      ),
                                      SizedBox(
                                        width: is58mm ? 25 : 32,
                                        child: Text('${item.quantity}', textAlign: TextAlign.center, style: TextStyle(fontSize: is58mm ? 8.5 : 10, color: Colors.black)),
                                      ),
                                      SizedBox(
                                        width: is58mm ? 42 : 55,
                                        child: Text(currency.format(item.totalInRupees), textAlign: TextAlign.right, style: TextStyle(fontSize: is58mm ? 8.5 : 10, color: Colors.black)),
                                      ),
                                    ],
                                  ),
                                  if (item.customization.isNotEmpty)
                                    Padding(
                                      padding: EdgeInsets.only(left: is58mm ? 18 : 22, top: 1),
                                      child: Text('* ${item.customization}', style: TextStyle(fontSize: is58mm ? 7 : 8.5, fontStyle: FontStyle.italic, color: Colors.black54)),
                                    ),
                                ],
                              ),
                            );
                          }),

                          const SizedBox(height: 6),
                          const ReceiptDashedDivider(height: 1, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 6),

                          // Tax & Totals Breakdown
                          _buildSummaryLine('SUB TOTAL:', currency.format(order.subtotalInRupees), is58mm, isBold: true),
                          if (!order.isGstExempt && (order.cgstInRupees > 0 || order.sgstInRupees > 0)) ...[
                            _buildSummaryLine('GST (${(order.cgstPercent + order.sgstPercent).toStringAsFixed(1)}%):', currency.format(order.cgstInRupees + order.sgstInRupees), is58mm),
                            if (order.cgstInRupees > 0)
                              _buildSummaryLine('  CGST @ ${order.cgstPercent}%:', currency.format(order.cgstInRupees), is58mm, isMuted: true),
                            if (order.sgstInRupees > 0)
                              _buildSummaryLine('  SGST @ ${order.sgstPercent}%:', currency.format(order.sgstInRupees), is58mm, isMuted: true),
                          ],
                          if (!order.isServiceTaxExempt && order.serviceTaxInRupees > 0)
                            _buildSummaryLine('SERVICE TAX (${order.serviceTaxPercent}%):', currency.format(order.serviceTaxInRupees), is58mm),
                          if (order.roundOffInRupees != 0)
                            _buildSummaryLine('ROUND OFF:', order.roundOffInRupees > 0 ? '+${currency.format(order.roundOffInRupees)}' : currency.format(order.roundOffInRupees), is58mm),

                          const SizedBox(height: 4),
                          Container(height: 2, color: Colors.black),
                          const SizedBox(height: 5),

                          // Total Invoice Value
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('TOTAL INVOICE VALUE:', style: TextStyle(fontSize: is58mm ? 9.5 : 11.5, fontWeight: FontWeight.w900, color: Colors.black)),
                              Text(currency.format(order.totalInRupees), style: TextStyle(fontSize: is58mm ? 9.5 : 11.5, fontWeight: FontWeight.w900, color: Colors.black)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('UNIQUE ITEMS: ${order.items.length}', style: TextStyle(fontSize: is58mm ? 7.5 : 9, color: Colors.black87)),
                              Text('TOTAL QTY: $totalQty', style: TextStyle(fontSize: is58mm ? 7.5 : 9, color: Colors.black87)),
                            ],
                          ),

                          const SizedBox(height: 6),
                          const ReceiptDashedDivider(height: 1, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 8),

                          // Footer: Thank You Greeting + Permanent DigiAds Watermark on Left, Custom QR on Right
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Left: Greeting & Permanent DigiAds Branding
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (config.showThankYouMessage) ...[
                                      Text(
                                        config.thankYouMessage.isNotEmpty ? config.thankYouMessage : 'Thank You & Visit Again !',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: is58mm ? 8.5 : 10.5,
                                          color: Colors.black,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                    ],
                                    // Permanent Watermark (Always shown, unremovable)
                                    Text(
                                      'POWERED BY - DIGIADS',
                                      style: TextStyle(
                                        fontSize: is58mm ? 6.5 : 7.5,
                                        color: Colors.black54,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Right: Custom QR Image & Caption
                              if (qrUrl.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: Colors.black26, width: 0.8),
                                      ),
                                      child: Image.network(
                                        AppConfig.resolveMediaUrl(qrUrl),
                                        height: is58mm ? 42 : 52,
                                        width: is58mm ? 42 : 52,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.qr_code, size: 36, color: Colors.black54),
                                      ),
                                    ),
                                    if (qrCaption.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      SizedBox(
                                        width: is58mm ? 56 : 72,
                                        child: Text(
                                          qrCaption,
                                          style: TextStyle(
                                            fontSize: is58mm ? 6 : 7.5,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.black87,
                                            height: 1.1,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryLine(String label, String value, bool is58mm, {bool isBold = false, bool isMuted = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 0.8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: is58mm ? 7.5 : 9,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isMuted ? Colors.black54 : Colors.black,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: is58mm ? 7.5 : 9,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isMuted ? Colors.black54 : Colors.black,
            ),
          ),
        ],
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
