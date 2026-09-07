import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/venue_provider.dart';
import '../../services/api_service.dart';

class UpiConfigModal extends StatefulWidget {
  const UpiConfigModal({super.key});

  @override
  State<UpiConfigModal> createState() => _UpiConfigModalState();
}

class _UpiConfigModalState extends State<UpiConfigModal> {
  final ApiService _api = ApiService();

  bool _isPasswordVerified = false;
  final _passwordController = TextEditingController();
  final _upiIdController = TextEditingController();
  final _payeeNameController = TextEditingController();

  bool _isLoading = false;
  bool _isUploadingQr = false;
  String? _error;
  String? _successMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _upiIdController.dispose();
    _payeeNameController.dispose();
    super.dispose();
  }

  Future<void> _verifyPassword() async {
    final pwd = _passwordController.text;
    if (pwd.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await _api.post('/host/verify-password', data: {'password': pwd});
      if (res.data['success'] == true) {
        setState(() {
          _isPasswordVerified = true;
          _isLoading = false;
        });
        _fetchUpiDetails();
      } else {
        setState(() {
          _error = res.data['message'] ?? 'Incorrect password';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchUpiDetails() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    try {
      final res = await _api.get('/host/payment-config', queryParameters: {'hostApplicationId': venueId});
      if (res.data['success'] == true && res.data['data'] != null) {
        setState(() {
          _upiIdController.text = res.data['data']['upiId'] ?? '';
          _payeeNameController.text = res.data['data']['payeeName'] ?? '';
        });
      }
    } catch (_) {}
  }

  Future<void> _uploadQrCode() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      withData: true,
    );

    if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
      final file = result.files.first;
      setState(() {
        _isUploadingQr = true;
        _error = null;
        _successMessage = null;
      });

      try {
        final mimeType = file.extension == 'png' ? 'image/png' : 'image/jpeg';
        final res = await _api.post(
          '/host/payment-config/upload-qr',
          data: file.bytes!,
          options: Options(
            headers: {
              'Content-Type': mimeType,
            },
          ),
        );

        if (res.data['success'] == true && res.data['data'] != null) {
          setState(() {
            _upiIdController.text = res.data['data']['upiId'] ?? '';
            _payeeNameController.text = res.data['data']['payeeName'] ?? '';
            _successMessage = 'QR code successfully decrypted and verified!';
          });
        } else {
          setState(() {
            _error = res.data['message'] ?? 'Failed to decode QR code. Please upload a valid payment QR.';
          });
        }
      } catch (e) {
        setState(() {
          _error = 'Failed to decode QR image. Please verify file format or enter details manually.';
        });
      } finally {
        setState(() => _isUploadingQr = false);
      }
    }
  }

  Future<void> _saveUpi() async {
    final venueId = context.read<VenueProvider>().selectedVenue?.id;
    if (venueId == null) return;

    final upi = _upiIdController.text.trim();
    if (upi.isEmpty) {
      setState(() => _error = 'Please enter a valid Merchant UPI VPA ID');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await _api.put('/host/payment-config', data: {
        'hostApplicationId': venueId,
        'upiId': upi,
        'payeeName': _payeeNameController.text.trim(),
      });

      setState(() => _isLoading = false);

      if (context.mounted && res.data['success'] == true) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Direct Bank UPI configuration updated successfully!')),
        );
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.qrCode, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'DIRECT BANK UPI PAYMENTS',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8),
                    ),
                  ],
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

            if (!_isPasswordVerified) ...[
              const Text(
                'Security Verification Required',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 4),
              Text(
                'Please enter your account password to unlock direct bank settlement settings.',
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
              ),
              const SizedBox(height: 16),

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.dangerBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 12),
              ],

              TextField(
                controller: _passwordController,
                obscureText: true,
                onSubmitted: (_) => _verifyPassword(),
                decoration: const InputDecoration(
                  labelText: 'Account Password',
                  prefixIcon: Icon(LucideIcons.lock, size: 16),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: _isLoading ? null : _verifyPassword,
                child: _isLoading
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('VERIFY PASSWORD'),
              ),
            ] else ...[
              // QR Upload Option Box (matching website)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      ),
                      child: const Icon(LucideIcons.scanLine, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Auto-Fill via UPI QR Code Image', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 2),
                          Text(
                            'Upload a PhonePe, Google Pay, Paytm or BHIM QR image to auto-extract details.',
                            style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: _isUploadingQr ? null : _uploadQrCode,
                      icon: _isUploadingQr
                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(LucideIcons.upload, size: 13),
                      label: const Text('UPLOAD QR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (_successMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.successBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 14),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_successMessage!, style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.dangerBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 12),
              ],

              TextField(
                controller: _upiIdController,
                decoration: const InputDecoration(
                  labelText: 'Merchant UPI VPA ID',
                  hintText: 'e.g. restaurantname@okhdfcbank',
                  prefixIcon: Icon(LucideIcons.qrCode, size: 16),
                ),
              ),
              const SizedBox(height: 14),

              TextField(
                controller: _payeeNameController,
                decoration: const InputDecoration(
                  labelText: 'Beneficiary Payee Name',
                  hintText: 'e.g. Mysore Dining Hall Pvt Ltd',
                  prefixIcon: Icon(LucideIcons.user, size: 16),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                onPressed: _isLoading ? null : _saveUpi,
                child: _isLoading
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('SAVE UPI CONFIGURATION', style: TextStyle(fontWeight: FontWeight.w900)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
