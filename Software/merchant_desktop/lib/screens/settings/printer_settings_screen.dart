import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
// icons via app_theme.dart
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/printer_provider.dart';

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
                const Divider(),

                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Auto-Print KOT on Live Order Arrival', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: const Text('Whenever a customer places an order from tabletop tablet or counter, instantly fire KOT ticket to kitchen printer.', style: TextStyle(fontSize: 11)),
                  value: printerProv.autoPrintKot,
                  onChanged: (val) => printerProv.toggleAutoPrintKot(val),
                ),
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
        ],
      ),
    );
  }
}
