import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../config.dart';
import '../../models/bill_config_model.dart';
import '../../models/order_model.dart';
import '../../providers/venue_provider.dart';
import '../../widgets/thermal_receipt_preview.dart';

class BillConfigScreen extends StatefulWidget {
  const BillConfigScreen({super.key});

  @override
  State<BillConfigScreen> createState() => _BillConfigScreenState();
}

class _BillConfigScreenState extends State<BillConfigScreen> {
  final _nameController = TextEditingController();
  final _address1Controller = TextEditingController();
  final _address2Controller = TextEditingController();
  final _cityZipController = TextEditingController();
  final _phoneController = TextEditingController();
  final _gstinController = TextEditingController();
  final _fssaiController = TextEditingController();
  final _prefixController = TextEditingController();
  final _thankYouController = TextEditingController();
  final _watermarkController = TextEditingController();
  final _qrCaptionController = TextEditingController();
  final _cgstController = TextEditingController();
  final _sgstController = TextEditingController();
  final _serviceTaxController = TextEditingController();

  String _logoUrl = '';
  String _qrImageUrl = '';
  String _billWidthFormat = '80mm';
  bool _showKOTNumbers = true;
  bool _showCustomerDetail = true;
  bool _showThankYou = true;
  bool _showPoweredBy = true;
  bool _enableAutoRoundOff = true;

  bool _isUploadingLogo = false;
  bool _isUploadingQr = false;

  @override
  void initState() {
    super.initState();
    final config = context.read<VenueProvider>().billConfig;
    _loadFromConfig(config);
  }

  void _loadFromConfig(BillConfigModel config) {
    _logoUrl = config.logoUrl;
    _qrImageUrl = config.qrImageUrl;
    _nameController.text = config.restaurantName;
    _address1Controller.text = config.addressLine1;
    _address2Controller.text = config.addressLine2;
    _cityZipController.text = config.cityZip;
    _phoneController.text = config.phone;
    _gstinController.text = config.gstin;
    _fssaiController.text = config.fssaiNo;
    _prefixController.text = config.billPrefix;
    _thankYouController.text = config.thankYouMessage;
    _watermarkController.text = config.customWatermark;
    _qrCaptionController.text = config.qrCaption;
    _cgstController.text = config.cgstPercent.toString();
    _sgstController.text = config.sgstPercent.toString();
    _serviceTaxController.text = config.serviceTaxPercent.toString();
    _billWidthFormat = config.billWidthFormat;
    _showKOTNumbers = config.showKOTNumbers;
    _showCustomerDetail = config.showCustomerDetail;
    _showThankYou = config.showThankYouMessage;
    _showPoweredBy = config.showPoweredBy;
    _enableAutoRoundOff = config.enableAutoRoundOff;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _address1Controller.dispose();
    _address2Controller.dispose();
    _cityZipController.dispose();
    _phoneController.dispose();
    _gstinController.dispose();
    _fssaiController.dispose();
    _prefixController.dispose();
    _thankYouController.dispose();
    _watermarkController.dispose();
    _qrCaptionController.dispose();
    _cgstController.dispose();
    _sgstController.dispose();
    _serviceTaxController.dispose();
    super.dispose();
  }

  BillConfigModel _getCurrentModel() {
    return BillConfigModel(
      logoUrl: _logoUrl,
      restaurantName: _nameController.text.trim(),
      addressLine1: _address1Controller.text.trim(),
      addressLine2: _address2Controller.text.trim(),
      cityZip: _cityZipController.text.trim(),
      phone: _phoneController.text.trim(),
      gstin: _gstinController.text.trim(),
      fssaiNo: _fssaiController.text.trim(),
      billPrefix: _prefixController.text.trim(),
      thankYouMessage: _thankYouController.text.trim(),
      customWatermark: _watermarkController.text.trim(),
      qrImageUrl: _qrImageUrl,
      qrCaption: _qrCaptionController.text.trim(),
      cgstPercent: double.tryParse(_cgstController.text.trim()) ?? 2.5,
      sgstPercent: double.tryParse(_sgstController.text.trim()) ?? 2.5,
      serviceTaxPercent: double.tryParse(_serviceTaxController.text.trim()) ?? 0.0,
      billWidthFormat: _billWidthFormat,
      showKOTNumbers: _showKOTNumbers,
      showCustomerDetail: _showCustomerDetail,
      showThankYouMessage: _showThankYou,
      showPoweredBy: _showPoweredBy,
      enableAutoRoundOff: _enableAutoRoundOff,
    );
  }

  Future<void> _pickAndUploadLogo() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      withData: true,
    );

    if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
      final file = result.files.first;
      setState(() => _isUploadingLogo = true);

      final mimeType = file.extension == 'png' ? 'image/png' : 'image/jpeg';
      final url = await context.read<VenueProvider>().uploadBillImage(
        venueId,
        file.bytes!,
        file.name,
        mimeType,
      );

      setState(() {
        _isUploadingLogo = false;
        if (url != null && url.isNotEmpty) {
          _logoUrl = url;
        }
      });
    }
  }

  Future<void> _deleteLogo() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    final ok = await context.read<VenueProvider>().deleteBillImage(venueId, 'logoUrl');
    if (ok) {
      setState(() => _logoUrl = '');
    }
  }

  Future<void> _pickAndUploadQr() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      withData: true,
    );

    if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
      final file = result.files.first;
      setState(() => _isUploadingQr = true);

      final mimeType = file.extension == 'png' ? 'image/png' : 'image/jpeg';
      final url = await context.read<VenueProvider>().uploadBillImage(
        venueId,
        file.bytes!,
        file.name,
        mimeType,
      );

      setState(() {
        _isUploadingQr = false;
        if (url != null && url.isNotEmpty) {
          _qrImageUrl = url;
        }
      });
    }
  }

  Future<void> _deleteQr() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    final ok = await context.read<VenueProvider>().deleteBillImage(venueId, 'footerQrUrl');
    if (ok) {
      setState(() => _qrImageUrl = '');
    }
  }

  void _showSampleReceiptPreview() {
    final sampleOrder = OrderModel(
      id: 'sample_id',
      orderId: 'ORD_SAMPLE_101',
      hostApplicationId: 'sample_host',
      tableNumber: '4',
      items: [
        OrderItemModel(itemId: '1', name: 'Paneer Butter Masala', quantity: 2, price: 28000),
        OrderItemModel(itemId: '2', name: 'Butter Naan', quantity: 4, price: 4500),
        OrderItemModel(itemId: '3', name: 'Fresh Lime Soda', quantity: 2, price: 6000),
      ],
      subtotalAmount: 86000,
      cgstAmount: 2150,
      sgstAmount: 2150,
      serviceTaxAmount: 0,
      roundOffAmount: 0,
      cgstPercent: double.tryParse(_cgstController.text) ?? 2.5,
      sgstPercent: double.tryParse(_sgstController.text) ?? 2.5,
      serviceTaxPercent: double.tryParse(_serviceTaxController.text) ?? 0.0,
      totalAmount: 90300,
      paymentStatus: 'completed',
      paymentType: 'UPI',
      orderStatus: 'served',
      createdAt: DateTime.now(),
    );

    showDialog(
      context: context,
      builder: (ctx) => ThermalReceiptPreview(
        order: sampleOrder,
        billConfig: _getCurrentModel(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final venueProv = context.watch<VenueProvider>();
    final venueId = venueProv.selectedVenue?.id;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Column(
        children: [
          // Sub-Header with Back Navigation & Action Buttons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 0.8)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.arrowLeft, size: 18),
                  tooltip: 'Back to Payment History',
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                const Icon(LucideIcons.receipt, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'CONFIGURE THERMAL BILL & RECEIPT',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8),
                ),
                const Spacer(),

                // Live Preview Button
                OutlinedButton.icon(
                  onPressed: _showSampleReceiptPreview,
                  icon: const Icon(LucideIcons.eye, size: 14),
                  label: const Text('PREVIEW SAMPLE BILL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),

                // Save Button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                  onPressed: venueProv.isLoading || venueId == null
                      ? null
                      : () async {
                          final updated = _getCurrentModel();
                          final ok = await venueProv.saveBillConfig(venueId, updated);
                          if (context.mounted && ok) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Bill configuration saved successfully!')),
                            );
                          }
                        },
                  icon: const Icon(LucideIcons.circleCheck, size: 14),
                  label: const Text('SAVE CONFIG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                ),
              ],
            ),
          ),

          // Main Configuration Form Cards
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                // CARD 1: HEADER & RESTAURANT BRANDING
                _buildCard(
                  context: context,
                  icon: LucideIcons.store,
                  title: 'HEADER & RESTAURANT BRANDING',
                  children: [
                    // Logo Box & Actions
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 160,
                          height: 100,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkCardElevated : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                          ),
                          child: _logoUrl.isNotEmpty
                              ? Stack(
                                  children: [
                                    Center(
                                      child: Image.network(
                                        AppConfig.resolveMediaUrl(_logoUrl),
                                        height: 80,
                                        width: 140,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(LucideIcons.image, color: Colors.grey),
                                      ),
                                    ),
                                    Positioned(
                                      top: 4,
                                      right: 4,
                                      child: CircleAvatar(
                                        radius: 12,
                                        backgroundColor: AppColors.danger,
                                        child: IconButton(
                                          padding: EdgeInsets.zero,
                                          icon: const Icon(LucideIcons.trash2, size: 12, color: Colors.white),
                                          onPressed: _deleteLogo,
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(LucideIcons.image, size: 24, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                                      const SizedBox(height: 4),
                                      Text(
                                        'No Logo Uploaded',
                                        style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                                      ),
                                    ],
                                  ),
                                ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Header Restaurant Logo (PNG / JPG / WebP)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                'Upload your venue logo to print atop 80mm/58mm thermal receipts and customer invoices.',
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                              ),
                              const SizedBox(height: 12),
                              ElevatedButton.icon(
                                onPressed: _isUploadingLogo ? null : _pickAndUploadLogo,
                                icon: _isUploadingLogo
                                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Icon(LucideIcons.upload, size: 13),
                                label: Text(_logoUrl.isNotEmpty ? 'CHANGE LOGO' : 'UPLOAD LOGO', style: const TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Restaurant Display Name'),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _address1Controller,
                            decoration: const InputDecoration(labelText: 'Address Line 1'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _address2Controller,
                            decoration: const InputDecoration(labelText: 'Address Line 2'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _cityZipController,
                            decoration: const InputDecoration(labelText: 'City & PIN Code'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            decoration: const InputDecoration(labelText: 'Contact Phone Number'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // CARD 2: TAX & REGISTRATION IDENTIFIERS
                _buildCard(
                  context: context,
                  icon: LucideIcons.fileText,
                  title: 'TAX & REGISTRATION IDENTIFIERS',
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _gstinController,
                            decoration: const InputDecoration(labelText: 'GSTIN Number (Optional)'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _fssaiController,
                            decoration: const InputDecoration(labelText: 'FSSAI License No. (Optional)'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _prefixController,
                            decoration: const InputDecoration(labelText: 'Bill Prefix (e.g. INV)'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _cgstController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'CGST (%)'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _sgstController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'SGST (%)'),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextField(
                            controller: _serviceTaxController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Service Tax (%)'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // CARD 3: FOOTER, QR CODE & THANK YOU MESSAGE
                _buildCard(
                  context: context,
                  icon: LucideIcons.qrCode,
                  title: 'FOOTER, QR CODE & THANK YOU MESSAGE',
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkCardElevated : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                          ),
                          child: _qrImageUrl.isNotEmpty
                              ? Stack(
                                  children: [
                                    Center(
                                      child: Image.network(
                                        AppConfig.resolveMediaUrl(_qrImageUrl),
                                        height: 100,
                                        width: 100,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(LucideIcons.qrCode, color: Colors.grey),
                                      ),
                                    ),
                                    Positioned(
                                      top: 4,
                                      right: 4,
                                      child: CircleAvatar(
                                        radius: 12,
                                        backgroundColor: AppColors.danger,
                                        child: IconButton(
                                          padding: EdgeInsets.zero,
                                          icon: const Icon(LucideIcons.trash2, size: 12, color: Colors.white),
                                          onPressed: _deleteQr,
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(LucideIcons.qrCode, size: 24, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                                      const SizedBox(height: 4),
                                      Text(
                                        'No QR Uploaded',
                                        style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                                      ),
                                    ],
                                  ),
                                ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Custom Footer QR Image (Google Reviews / Instagram / Feedback)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                'Upload a QR code to print at the bottom of customer bills for quick reviews or feedback.',
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                              ),
                              const SizedBox(height: 12),
                              ElevatedButton.icon(
                                onPressed: _isUploadingQr ? null : _pickAndUploadQr,
                                icon: _isUploadingQr
                                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Icon(LucideIcons.upload, size: 13),
                                label: Text(_qrImageUrl.isNotEmpty ? 'CHANGE QR' : 'UPLOAD QR CODE', style: const TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextField(
                      controller: _qrCaptionController,
                      decoration: const InputDecoration(labelText: 'QR Caption (e.g. Scan to Review Us on Google)'),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _thankYouController,
                      decoration: const InputDecoration(labelText: 'Thank You Message'),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _watermarkController,
                      decoration: const InputDecoration(labelText: 'Custom Watermark'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // CARD 4: THERMAL PRINTER FORMAT & OUTPUT TOGGLES
                _buildCard(
                  context: context,
                  icon: LucideIcons.printer,
                  title: 'THERMAL PRINTER FORMAT & OUTPUT TOGGLES',
                  children: [
                    Row(
                      children: [
                        const Text('Paper Width Format:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        const SizedBox(width: 16),
                        ChoiceChip(
                          label: const Text('80mm Standard POS (Wide)'),
                          selected: _billWidthFormat == '80mm',
                          onSelected: (val) {
                            if (val) setState(() => _billWidthFormat = '80mm');
                          },
                        ),
                        const SizedBox(width: 10),
                        ChoiceChip(
                          label: const Text('58mm Compact Receipt (Narrow)'),
                          selected: _billWidthFormat == '58mm',
                          onSelected: (val) {
                            if (val) setState(() => _billWidthFormat = '58mm');
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    SwitchListTile(
                      title: const Text('Enable Auto Round-Off', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Round fractional paise to nearest whole rupee on final bills', style: TextStyle(fontSize: 11)),
                      value: _enableAutoRoundOff,
                      onChanged: (val) => setState(() => _enableAutoRoundOff = val),
                      contentPadding: EdgeInsets.zero,
                    ),
                    SwitchListTile(
                      title: const Text('Print KOT Kitchen Order Numbers', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Show sequential KOT number on tickets', style: TextStyle(fontSize: 11)),
                      value: _showKOTNumbers,
                      onChanged: (val) => setState(() => _showKOTNumbers = val),
                      contentPadding: EdgeInsets.zero,
                    ),
                    SwitchListTile(
                      title: const Text('Show Thank You Message', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      value: _showThankYou,
                      onChanged: (val) => setState(() => _showThankYou = val),
                      contentPadding: EdgeInsets.zero,
                    ),
                    SwitchListTile(
                      title: const Text('Show Powered By Footer Note', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      value: _showPoweredBy,
                      onChanged: (val) => setState(() => _showPoweredBy = val),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Clean, reusable desktop Card container for form sections
  Widget _buildCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Divider(color: Theme.of(context).dividerColor, height: 1, thickness: 0.8),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
