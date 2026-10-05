import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
// icons via app_theme.dart
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/printer_provider.dart';
import '../../services/tray_notification_service.dart';

class PrinterSettingsScreen extends StatelessWidget {
  const PrinterSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final printerProv = context.watch<PrinterProvider>();
    final printers = printerProv.installedPrinters;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'POS THERMAL PRINTER SETTINGS',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 0.8),
                  ),
                  Text(
                    'Configure direct 1-click silent thermal receipt & KOT printing (0 Windows Popups)',
                    style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                  ),
                ],
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: printerProv.refreshPrinters,
                    icon: const Icon(LucideIcons.refreshCw, size: 14),
                    label: const Text('Refresh Printers', style: TextStyle(fontSize: 11)),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: () async {
                      final ok = await printerProv.printTestReceipt();
                      if (context.mounted && ok) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Test receipt sent to printer!')),
                        );
                      }
                    },
                    icon: const Icon(LucideIcons.printer, size: 14),
                    label: const Text('SEND TEST PRINT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Primary Receipt Printer Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.receipt, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'Primary Customer Bill / Receipt Printer',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Select the physical USB or Spooler thermal printer attached to this POS counter.',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                ),
                const SizedBox(height: 14),

                DropdownButtonFormField<String?>(
                  value: printers.any((p) => p.name == printerProv.selectedReceiptPrinter)
                      ? printerProv.selectedReceiptPrinter
                      : null,
                  decoration: const InputDecoration(
                    labelText: 'Selected Receipt Printer',
                    prefixIcon: Icon(LucideIcons.printer, size: 16),
                  ),
                  hint: Text(printers.isEmpty ? 'No Windows printers detected' : 'Choose printer...'),
                  items: printers.map((p) {
                    return DropdownMenuItem(
                      value: p.name,
                      child: Text('${p.name} ${p.isDefault ? "(Default)" : ""}'),
                    );
                  }).toList(),
                  onChanged: (val) => printerProv.updateReceiptPrinter(val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Kitchen KOT Printer Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.chefHat, size: 18, color: AppColors.warning),
                    SizedBox(width: 8),
                    Text(
                      'Kitchen Order Ticket (KOT) Printer',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Printer located in the kitchen area for automated or 1-click food ticket dispatch.',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                ),
                const SizedBox(height: 14),

                DropdownButtonFormField<String?>(
                  value: printers.any((p) => p.name == printerProv.selectedKotPrinter)
                      ? printerProv.selectedKotPrinter
                      : null,
                  decoration: const InputDecoration(
                    labelText: 'Selected Kitchen Printer',
                    prefixIcon: Icon(LucideIcons.printer, size: 16),
                  ),
                  hint: Text(printers.isEmpty ? 'No Windows printers detected' : 'Choose kitchen printer...'),
                  items: printers.map((p) {
                    return DropdownMenuItem(
                      value: p.name,
                      child: Text('${p.name} ${p.isDefault ? "(Default)" : ""}'),
                    );
                  }).toList(),
                  onChanged: (val) => printerProv.updateKotPrinter(val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Silent Direct Printing & Automation Switches
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'PRINTING AUTOMATION & ZERO-POPUP SETTINGS',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                ),
                const SizedBox(height: 12),

                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Silent Direct Printing (0 Windows Print Dialogs)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: const Text('When clicking "Print Bill" or "Print KOT", send bytes directly to the print head without showing Windows preview modals.', style: TextStyle(fontSize: 11)),
                  value: printerProv.silentPrintEnabled,
                  onChanged: (val) => printerProv.toggleSilentPrint(val),
                ),
                const Divider(height: 24),

                const Text(
                  'AUTOMATIC KOT (KITCHEN ORDER TICKET) PRINT TRIGGER',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5),
                ),
                const SizedBox(height: 4),
                Text(
                  'Choose when Kitchen Order Tickets should be automatically dispatched to the kitchen thermal printer. (The manual "PRINT KOT" button is always retained on the Live Orders screen).',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : Colors.grey.shade600),
                ),
                const SizedBox(height: 12),

                _buildKotTriggerOption(
                  context: context,
                  isDark: isDark,
                  title: 'On Order Arrival (Instant)',
                  subtitle: 'Automatically print KOT immediately when customer places an order via table QR or kiosk.',
                  icon: LucideIcons.bellRing,
                  value: 'arrival',
                  groupValue: printerProv.kotPrintTrigger,
                  onChanged: (val) => printerProv.updateKotPrintTrigger(val),
                ),
                const SizedBox(height: 8),

                _buildKotTriggerOption(
                  context: context,
                  isDark: isDark,
                  title: 'On Order Accepted (Kitchen Confirmed)',
                  subtitle: 'Automatically print KOT only after staff reviews and accepts the order (status moved to "Cooking").',
                  icon: LucideIcons.chefHat,
                  value: 'accepted',
                  groupValue: printerProv.kotPrintTrigger,
                  onChanged: (val) => printerProv.updateKotPrintTrigger(val),
                ),
                const SizedBox(height: 8),

                _buildKotTriggerOption(
                  context: context,
                  isDark: isDark,
                  title: 'Manual Only (Cashier Controlled)',
                  subtitle: 'Never auto-print. Cashier or counter staff manually taps the "PRINT KOT" button on the live orders dashboard.',
                  icon: LucideIcons.printer,
                  value: 'manual',
                  groupValue: printerProv.kotPrintTrigger,
                  onChanged: (val) => printerProv.updateKotPrintTrigger(val),
                ),
                const SizedBox(height: 16),
                const Divider(),

                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      const Text('Thermal Receipt Width Format:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 16),
                      ChoiceChip(
                        label: const Text('80mm (Standard POS)'),
                        selected: printerProv.paperWidthFormat == '80mm',
                        selectedColor: AppColors.primary,
                        onSelected: (_) => printerProv.updatePaperWidth('80mm'),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('58mm (Compact Mobile)'),
                        selected: printerProv.paperWidthFormat == '58mm',
                        selectedColor: AppColors.primary,
                        onSelected: (_) => printerProv.updatePaperWidth('58mm'),
                      ),
                    ],
                  ),
                ),
                const Divider(),

                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      const Text('Receipt Print Output Mode:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 16),
                      ChoiceChip(
                        label: const Text('Black & White (Monochrome)'),
                        selected: printerProv.colorMode == 'monochrome',
                        selectedColor: AppColors.primary,
                        onSelected: (_) => printerProv.updateColorMode('monochrome'),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Full Color (Inkjet / Laser)'),
                        selected: printerProv.colorMode == 'color',
                        selectedColor: AppColors.primary,
                        onSelected: (_) => printerProv.updateColorMode('color'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Section 4: Windows Startup & System Settings
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.power_settings_new, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'START WITH WINDOWS & SYSTEM STARTUP SETTINGS',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Manage automated desktop application startup when this POS machine boots up.',
                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkMuted : Colors.grey.shade600),
                ),
                const SizedBox(height: 12),
                const _WindowsAutoStartSwitch(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKotTriggerOption({
    required BuildContext context,
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required String value,
    required String groupValue,
    required ValueChanged<String> onChanged,
  }) {
    final isSelected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.primary.withValues(alpha: 0.12) : AppColors.primaryLight.withValues(alpha: 0.5))
              : (isDark ? AppColors.darkCardElevated : Colors.grey.shade50),
          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
          border: Border.all(
            color: isSelected ? AppColors.primary : (isDark ? AppColors.darkBorder : Colors.grey.shade300),
            width: isSelected ? 1.5 : 0.8,
          ),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: value,
              groupValue: groupValue,
              activeColor: AppColors.primary,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              onChanged: (val) {
                if (val != null) onChanged(val);
              },
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withValues(alpha: 0.2) : (isDark ? Colors.black26 : Colors.grey.shade200),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 15,
                color: isSelected ? AppColors.primary : (isDark ? AppColors.darkMuted : Colors.grey.shade700),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.primary : (isDark ? Colors.white : Colors.black87),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkMuted : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WindowsAutoStartSwitch extends StatefulWidget {
  const _WindowsAutoStartSwitch();

  @override
  State<_WindowsAutoStartSwitch> createState() => _WindowsAutoStartSwitchState();
}

class _WindowsAutoStartSwitchState extends State<_WindowsAutoStartSwitch> {
  bool _enabled = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    final res = await TrayNotificationService.isAutoStartEnabled();
    if (mounted) setState(() { _enabled = res; _loading = false; });
  }

  Future<void> _toggle(bool val) async {
    setState(() => _enabled = val);
    await TrayNotificationService.toggleAutoStart(val);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(val
              ? 'DigiAds POS will now start automatically on Windows boot'
              : 'Start with Windows disabled'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: const Text('Launch DigiAds POS Automatically on Windows Boot', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      subtitle: const Text('When enabled, the POS app starts up silently and minimizes to the Windows taskbar system tray on workstation power-on.', style: TextStyle(fontSize: 11)),
      value: _enabled,
      onChanged: _toggle,
    );
  }
}
