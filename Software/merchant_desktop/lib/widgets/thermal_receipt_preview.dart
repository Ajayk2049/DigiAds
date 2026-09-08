import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../constants/app_theme.dart';
import '../../models/order_model.dart';
import '../../models/bill_config_model.dart';
import '../../config.dart';

class ThermalReceiptPreview extends StatelessWidget {
  final OrderModel order;
  final BillConfigModel billConfig;

  const ThermalReceiptPreview({
    super.key,
    required this.order,
    required this.billConfig,
  });

  @override
  Widget build(BuildContext context) {
    final is58mm = billConfig.billWidthFormat == '58mm';
    final currency = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs. ', decimalDigits: 2);
    final dateFormat = DateFormat('dd-MMM-yyyy hh:mm a');

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        width: is58mm ? 360 : 420,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20)],
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Close Button
              Align(
                alignment: Alignment.topRight,
                child: IconButton(
                  icon: const Icon(LucideIcons.x, size: 16, color: Colors.black54),
                  onPressed: () => Navigator.pop(context),
                ),
              ),

              // Header Logo (if uploaded)
              if (billConfig.logoUrl.isNotEmpty) ...[
                Image.network(
                  AppConfig.resolveMediaUrl(billConfig.logoUrl),
                  height: 50,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
                const SizedBox(height: 8),
              ],

              // Restaurant Name
              Text(
                billConfig.restaurantName.isNotEmpty ? billConfig.restaurantName.toUpperCase() : 'RESTAURANT NAME',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.black),
                textAlign: TextAlign.center,
              ),
              if (billConfig.addressLine1.isNotEmpty)
                Text(billConfig.addressLine1, style: const TextStyle(fontSize: 11, color: Colors.black87)),
              if (billConfig.addressLine2.isNotEmpty)
                Text(billConfig.addressLine2, style: const TextStyle(fontSize: 11, color: Colors.black87)),
              if (billConfig.cityZip.isNotEmpty)
                Text(billConfig.cityZip, style: const TextStyle(fontSize: 11, color: Colors.black87)),
              if (billConfig.phone.isNotEmpty)
                Text('Phone: ${billConfig.phone}', style: const TextStyle(fontSize: 11, color: Colors.black87)),

              if (billConfig.gstin.isNotEmpty || billConfig.fssaiNo.isNotEmpty) ...[
                const SizedBox(height: 6),
                if (billConfig.gstin.isNotEmpty)
                  Text('GSTIN: ${billConfig.gstin}', style: const TextStyle(fontSize: 10, color: Colors.black54, fontFamily: 'Courier')),
                if (billConfig.fssaiNo.isNotEmpty)
                  Text('FSSAI: ${billConfig.fssaiNo}', style: const TextStyle(fontSize: 10, color: Colors.black54, fontFamily: 'Courier')),
              ],

              const SizedBox(height: 8),
              _buildDashedLine(),
              const SizedBox(height: 6),

              // Meta
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Order: ${order.orderId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                  Text(
                    order.isTakeout ? 'TAKEOUT' : 'TABLE ${order.tableNumber}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.black),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Date: ${dateFormat.format(order.createdAt)}', style: const TextStyle(fontSize: 10, color: Colors.black54)),
              ),

              const SizedBox(height: 6),
              _buildDashedLine(),
              const SizedBox(height: 6),

              // Items Header
              const Row(
                children: [
                  Expanded(flex: 5, child: Text('ITEM', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black))),
                  Expanded(flex: 2, child: Text('QTY', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black))),
                  Expanded(flex: 3, child: Text('AMOUNT', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black))),
                ],
              ),
              const Divider(color: Colors.black26, height: 8),

              // Items
              ...order.items.map((i) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 5,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${i.name}${i.isPacked ? " (PACK)" : ""}', style: const TextStyle(fontSize: 11, color: Colors.black)),
                            if (i.customization.isNotEmpty)
                              Text('* ${i.customization}', style: const TextStyle(fontSize: 9.5, fontStyle: FontStyle.italic, color: Colors.black87)),
                          ],
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text('${i.quantity}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: Colors.black)),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(currency.format(i.totalInRupees), textAlign: TextAlign.right, style: const TextStyle(fontSize: 11, color: Colors.black, fontFamily: 'Courier')),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 6),
              _buildDashedLine(),
              const SizedBox(height: 6),

              // Calculations
              _buildSummaryRow('Subtotal', currency.format(order.subtotalInRupees)),
              if (!order.isGstExempt && order.cgstInRupees > 0)
                _buildSummaryRow('CGST (${order.cgstPercent}%)', currency.format(order.cgstInRupees)),
              if (!order.isGstExempt && order.sgstInRupees > 0)
                _buildSummaryRow('SGST (${order.sgstPercent}%)', currency.format(order.sgstInRupees)),
              if (!order.isServiceTaxExempt && order.serviceTaxInRupees > 0)
                _buildSummaryRow('Service Tax (${order.serviceTaxPercent}%)', currency.format(order.serviceTaxInRupees)),
              if (order.roundOffInRupees != 0)
                _buildSummaryRow('Round Off', currency.format(order.roundOffInRupees)),

              const Divider(color: Colors.black, height: 12),

              // Grand Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('GRAND TOTAL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.black)),
                  Text(currency.format(order.totalInRupees), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.black, fontFamily: 'Courier')),
                ],
              ),

              const SizedBox(height: 8),
              _buildDashedLine(),
              const SizedBox(height: 8),

              Text('Payment Mode: ${order.paymentType ?? "UPI"} (${order.paymentStatus.toUpperCase()})', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black)),

              const SizedBox(height: 8),
              _buildDashedLine(),
              const SizedBox(height: 10),

              // Side-by-Side Footer (Matching Web Portal Layout)
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Left Side: Thank You Greeting & Watermark
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (billConfig.showThankYouMessage && billConfig.thankYouMessage.isNotEmpty) ...[
                          Text(
                            billConfig.thankYouMessage,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                              color: Colors.black,
                            ),
                          ),
                        ],
                        if (billConfig.showPoweredBy && billConfig.customWatermark.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            billConfig.customWatermark.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 8,
                              color: Colors.black45,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Right Side: QR Code in rounded bordered box + Caption
                  if (billConfig.qrImageUrl.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            border: Border.all(color: Colors.black26, width: 0.8),
                            boxShadow: const [
                              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                          child: Image.network(
                            AppConfig.resolveMediaUrl(billConfig.qrImageUrl),
                            height: is58mm ? 52 : 64,
                            width: is58mm ? 52 : 64,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                          ),
                        ),
                        if (billConfig.qrCaption.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          SizedBox(
                            width: is58mm ? 70 : 88,
                            child: Text(
                              billConfig.qrCaption,
                              style: const TextStyle(
                                fontSize: 8,
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
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.black87)),
          Text(value, style: const TextStyle(fontSize: 11, color: Colors.black87, fontFamily: 'Courier')),
        ],
      ),
    );
  }

  Widget _buildDashedLine() {
    return const Row(
      children: [
        Expanded(
          child: Text(
            '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -',
            maxLines: 1,
            overflow: TextOverflow.clip,
            style: TextStyle(color: Colors.black38, fontSize: 10),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}
