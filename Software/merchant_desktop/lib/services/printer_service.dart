import 'dart:ui' as ui;
import 'package:flutter/material.dart' show Canvas, Paint, ColorFilter, Offset;
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../config.dart';
import '../models/order_model.dart';
import '../models/bill_config_model.dart';

class PrinterService {
  static final PrinterService _instance = PrinterService._internal();
  factory PrinterService() => _instance;

  PrinterService._internal();

  String? _selectedReceiptPrinter;
  String? _selectedKotPrinter;
  String _paperWidthFormat = '80mm'; // '80mm' | '58mm'
  String _colorMode = 'monochrome'; // 'monochrome' | 'color'
  bool _autoPrintKot = false;
  bool _silentPrintEnabled = true;

  String? get selectedReceiptPrinter => _selectedReceiptPrinter;
  String? get selectedKotPrinter => _selectedKotPrinter;
  String get paperWidthFormat => _paperWidthFormat;
  String get colorMode => _colorMode;
  bool get autoPrintKot => _autoPrintKot;
  bool get silentPrintEnabled => _silentPrintEnabled;

  final Map<String, Uint8List> _imageCache = {};

  /// Pre-compute high-contrast monochrome image using GPU/dart:ui luminance filter
  Future<Uint8List> _convertToMonochrome(Uint8List bytes) async {
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      final image = frame.image;

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final paint = Paint()
        ..colorFilter = const ColorFilter.matrix(<double>[
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0,     0,     0,     1, 0,
        ]);

      canvas.drawImage(image, Offset.zero, paint);
      final picture = recorder.endRecording();
      final monoImage = await picture.toImage(image.width, image.height);
      final byteData = await monoImage.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        return byteData.buffer.asUint8List();
      }
    } catch (e) {
      if (kDebugMode) print('[PrinterService] Monochrome conversion fallback: $e');
    }
    return bytes;
  }

  /// Load and cache image bytes (both raw color and pre-computed monochrome)
  Future<pw.MemoryImage?> _loadPdfImage(String? url, {bool isMonochrome = true}) async {
    if (url == null || url.trim().isEmpty) return null;
    final resolvedUrl = AppConfig.resolveMediaUrl(url.trim());
    if (resolvedUrl.isEmpty) return null;

    try {
      final cacheKey = isMonochrome ? 'mono_$resolvedUrl' : 'color_$resolvedUrl';
      if (_imageCache.containsKey(cacheKey)) {
        return pw.MemoryImage(_imageCache[cacheKey]!);
      }

      Uint8List? rawBytes = _imageCache['color_$resolvedUrl'];
      if (rawBytes == null) {
        final dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 4),
            receiveTimeout: const Duration(seconds: 5),
          ),
        );
        final response = await dio.get<List<int>>(
          resolvedUrl,
          options: Options(responseType: ResponseType.bytes),
        );
        if (response.data != null && response.data!.isNotEmpty) {
          rawBytes = Uint8List.fromList(response.data!);
          _imageCache['color_$resolvedUrl'] = rawBytes;
        }
      }

      if (rawBytes == null) return null;

      if (isMonochrome) {
        final monoBytes = await _convertToMonochrome(rawBytes);
        _imageCache['mono_$resolvedUrl'] = monoBytes;
        return pw.MemoryImage(monoBytes);
      } else {
        return pw.MemoryImage(rawBytes);
      }
    } catch (e) {
      if (kDebugMode) print('[PrinterService] Could not load print image ($resolvedUrl): $e');
    }
    return null;
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _selectedReceiptPrinter = prefs.getString('pos_receipt_printer');
    _selectedKotPrinter = prefs.getString('pos_kot_printer');
    _paperWidthFormat = prefs.getString('pos_paper_width') ?? '80mm';
    _colorMode = prefs.getString('pos_print_color_mode') ?? 'monochrome';
    _autoPrintKot = prefs.getBool('pos_auto_print_kot') ?? false;
    _silentPrintEnabled = prefs.getBool('pos_silent_print') ?? true;
  }

  Future<void> saveSettings({
    String? receiptPrinter,
    String? kotPrinter,
    String? paperWidth,
    String? colorMode,
    bool? autoPrintKot,
    bool? silentPrint,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    if (receiptPrinter != null) {
      _selectedReceiptPrinter = receiptPrinter;
      await prefs.setString('pos_receipt_printer', receiptPrinter);
    }
    if (kotPrinter != null) {
      _selectedKotPrinter = kotPrinter;
      await prefs.setString('pos_kot_printer', kotPrinter);
    }
    if (paperWidth != null) {
      _paperWidthFormat = paperWidth;
      await prefs.setString('pos_paper_width', paperWidth);
    }
    if (colorMode != null) {
      _colorMode = colorMode;
      await prefs.setString('pos_print_color_mode', colorMode);
    }
    if (autoPrintKot != null) {
      _autoPrintKot = autoPrintKot;
      await prefs.setBool('pos_auto_print_kot', autoPrintKot);
    }
    if (silentPrint != null) {
      _silentPrintEnabled = silentPrint;
      await prefs.setBool('pos_silent_print', silentPrint);
    }
  }

  /// Get list of installed Windows printers
  Future<List<Printer>> getInstalledPrinters() async {
    try {
      return await Printing.listPrinters();
    } catch (e) {
      if (kDebugMode) print('[PrinterService] Error listing printers: $e');
      return [];
    }
  }

  /// Find matching printer object by name
  Future<Printer?> _findPrinter(String? name) async {
    if (name == null || name.isEmpty) return null;
    final printers = await getInstalledPrinters();
    for (final p in printers) {
      if (p.name.toLowerCase() == name.toLowerCase()) {
        return p;
      }
    }
    return printers.isNotEmpty ? printers.first : null;
  }

  /// SILENT DIRECT PRINT CUSTOMER BILL (0 Windows Popups)
  Future<bool> printCustomerBill({
    required OrderModel order,
    required BillConfigModel billConfig,
    String? overridePrinterName,
  }) async {
    try {
      final targetPrinterName = overridePrinterName ?? _selectedReceiptPrinter;
      final printer = await _findPrinter(targetPrinterName);

      final pdfBytes = await generateBillPdf(order: order, billConfig: billConfig);

      if (printer != null && _silentPrintEnabled) {
        // Direct silent print to physical Windows spooler printer
        return await Printing.directPrintPdf(
          printer: printer,
          onLayout: (_) => pdfBytes,
          name: 'Bill_${order.orderId}',
        );
      } else {
        // Fallback: standard print preview if no printer configured
        return await Printing.layoutPdf(
          onLayout: (_) => pdfBytes,
          name: 'Bill_${order.orderId}',
        );
      }
    } catch (e) {
      if (kDebugMode) print('[PrinterService] Print Error: $e');
      return false;
    }
  }

  /// SILENT DIRECT PRINT KITCHEN ORDER TICKET (KOT)
  Future<bool> printKitchenKot({
    required OrderModel order,
    String? overridePrinterName,
  }) async {
    try {
      final targetPrinterName = overridePrinterName ?? _selectedKotPrinter ?? _selectedReceiptPrinter;
      final printer = await _findPrinter(targetPrinterName);

      final pdfBytes = await generateKotPdf(order: order);

      if (printer != null && _silentPrintEnabled) {
        return await Printing.directPrintPdf(
          printer: printer,
          onLayout: (_) => pdfBytes,
          name: 'KOT_${order.orderId}',
        );
      } else {
        return await Printing.layoutPdf(
          onLayout: (_) => pdfBytes,
          name: 'KOT_${order.orderId}',
        );
      }
    } catch (e) {
      if (kDebugMode) print('[PrinterService] KOT Print Error: $e');
      return false;
    }
  }

  /// PDF Generator for Thermal Receipts (80mm & 58mm)
  Future<Uint8List> generateBillPdf({
    required OrderModel order,
    required BillConfigModel billConfig,
  }) async {
    final is58mm = (billConfig.billWidthFormat == '58mm' || _paperWidthFormat == '58mm');
    final isMono = (_colorMode == 'monochrome');

    // Pre-fetch header logo and footer QR images asynchronously based on color mode
    final logoImage = await _loadPdfImage(billConfig.logoUrl, isMonochrome: isMono);
    final qrImage = await _loadPdfImage(billConfig.qrImageUrl, isMonochrome: isMono);

    final pdf = pw.Document();
    final double pageWidth = is58mm ? (58 * PdfPageFormat.mm) : (80 * PdfPageFormat.mm);
    final pageFormat = PdfPageFormat(
      pageWidth,
      double.infinity,
      marginLeft: is58mm ? 4 * PdfPageFormat.mm : 6 * PdfPageFormat.mm,
      marginRight: is58mm ? 4 * PdfPageFormat.mm : 6 * PdfPageFormat.mm,
      marginTop: 6 * PdfPageFormat.mm,
      marginBottom: 6 * PdfPageFormat.mm,
    );

    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs. ', decimalDigits: 2);
    final dateFormat = DateFormat('dd-MMM-yyyy hh:mm a');

    pdf.addPage(
      pw.Page(
        pageFormat: pageFormat,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              // Header Restaurant Logo (if uploaded)
              if (logoImage != null) ...[
                pw.Center(
                  child: pw.Container(
                    height: is58mm ? 36 : 48,
                    child: pw.Image(logoImage, fit: pw.BoxFit.contain),
                  ),
                ),
                pw.SizedBox(height: 4),
              ],

              // Header Restaurant Name
              pw.Text(
                billConfig.restaurantName.isNotEmpty ? billConfig.restaurantName.toUpperCase() : 'RESTAURANT',
                style: pw.TextStyle(fontSize: is58mm ? 12 : 14, fontWeight: pw.FontWeight.bold),
                textAlign: pw.TextAlign.center,
              ),
              if (billConfig.addressLine1.isNotEmpty)
                pw.Text(billConfig.addressLine1, style: pw.TextStyle(fontSize: is58mm ? 8 : 9), textAlign: pw.TextAlign.center),
              if (billConfig.addressLine2.isNotEmpty)
                pw.Text(billConfig.addressLine2, style: pw.TextStyle(fontSize: is58mm ? 8 : 9), textAlign: pw.TextAlign.center),
              if (billConfig.cityZip.isNotEmpty)
                pw.Text(billConfig.cityZip, style: pw.TextStyle(fontSize: is58mm ? 8 : 9), textAlign: pw.TextAlign.center),
              if (billConfig.phone.isNotEmpty)
                pw.Text('Ph: ${billConfig.phone}', style: pw.TextStyle(fontSize: is58mm ? 8 : 9), textAlign: pw.TextAlign.center),

              // Licenses
              if (billConfig.gstin.isNotEmpty || billConfig.fssaiNo.isNotEmpty) ...[
                pw.SizedBox(height: 3),
                if (billConfig.gstin.isNotEmpty)
                  pw.Text('GSTIN: ${billConfig.gstin}', style: pw.TextStyle(fontSize: is58mm ? 7.5 : 8.5)),
                if (billConfig.fssaiNo.isNotEmpty)
                  pw.Text('FSSAI: ${billConfig.fssaiNo}', style: pw.TextStyle(fontSize: is58mm ? 7.5 : 8.5)),
              ],

              pw.SizedBox(height: 4),
              pw.Divider(thickness: 1, borderStyle: pw.BorderStyle.dashed),

              // Order Meta
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Order: ${order.orderId}', style: pw.TextStyle(fontSize: is58mm ? 8.5 : 9.5, fontWeight: pw.FontWeight.bold)),
                  pw.Text(
                    order.isTakeout ? 'TAKEOUT' : 'TABLE ${order.tableNumber}',
                    style: pw.TextStyle(fontSize: is58mm ? 8.5 : 9.5, fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
              pw.Align(
                alignment: pw.Alignment.centerLeft,
                child: pw.Text('Date: ${dateFormat.format(order.createdAt)}', style: pw.TextStyle(fontSize: is58mm ? 7.5 : 8.5)),
              ),

              pw.Divider(thickness: 1, borderStyle: pw.BorderStyle.dashed),

              // Table Headers
              pw.Row(
                children: [
                  pw.Expanded(flex: 5, child: pw.Text('ITEM', style: pw.TextStyle(fontSize: is58mm ? 8 : 9, fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(flex: 2, child: pw.Text('QTY', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: is58mm ? 8 : 9, fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(flex: 3, child: pw.Text('AMOUNT', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: is58mm ? 8 : 9, fontWeight: pw.FontWeight.bold))),
                ],
              ),
              pw.Divider(thickness: 0.5),

              // Items List
              ...order.items.map((item) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 1.5),
                  child: pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Expanded(
                        flex: 5,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              '${item.name}${item.isPacked ? ' (PACK)' : ''}',
                              style: pw.TextStyle(fontSize: is58mm ? 8 : 9),
                            ),
                            if (item.customization.isNotEmpty)
                              pw.Text(
                                '* ${item.customization}',
                                style: pw.TextStyle(fontSize: is58mm ? 6.5 : 7.5, fontStyle: pw.FontStyle.italic),
                              ),
                          ],
                        ),
                      ),
                      pw.Expanded(
                        flex: 2,
                        child: pw.Text('${item.quantity}', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: is58mm ? 8 : 9)),
                      ),
                      pw.Expanded(
                        flex: 3,
                        child: pw.Text(
                          currencyFormat.format(item.totalInRupees),
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(fontSize: is58mm ? 8 : 9),
                        ),
                      ),
                    ],
                  ),
                );
              }),

              pw.Divider(thickness: 1, borderStyle: pw.BorderStyle.dashed),

              // Calculations Breakdown
              _buildTaxRow('Subtotal', currencyFormat.format(order.subtotalInRupees), is58mm),
              if (!order.isGstExempt && order.cgstInRupees > 0)
                _buildTaxRow('CGST (${order.cgstPercent}%)', currencyFormat.format(order.cgstInRupees), is58mm),
              if (!order.isGstExempt && order.sgstInRupees > 0)
                _buildTaxRow('SGST (${order.sgstPercent}%)', currencyFormat.format(order.sgstInRupees), is58mm),
              if (!order.isServiceTaxExempt && order.serviceTaxInRupees > 0)
                _buildTaxRow('Service Tax (${order.serviceTaxPercent}%)', currencyFormat.format(order.serviceTaxInRupees), is58mm),
              if (order.roundOffInRupees != 0)
                _buildTaxRow('Round Off', currencyFormat.format(order.roundOffInRupees), is58mm),

              pw.Divider(thickness: 1),

              // Grand Total
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('GRAND TOTAL', style: pw.TextStyle(fontSize: is58mm ? 10 : 12, fontWeight: pw.FontWeight.bold)),
                  pw.Text(currencyFormat.format(order.totalInRupees), style: pw.TextStyle(fontSize: is58mm ? 10 : 12, fontWeight: pw.FontWeight.bold)),
                ],
              ),

              pw.Divider(thickness: 1, borderStyle: pw.BorderStyle.dashed),

              // Payment Status
              pw.Text(
                'Payment Mode: ${order.paymentType ?? 'UPI'} (${order.paymentStatus.toUpperCase()})',
                style: pw.TextStyle(fontSize: is58mm ? 8 : 9, fontWeight: pw.FontWeight.bold),
              ),

              pw.SizedBox(height: 6),

              // Side-by-Side Footer (Thank You Greeting & Footer QR)
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  // Left: Thank You Greeting & Watermark
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        if (billConfig.showThankYouMessage && billConfig.thankYouMessage.isNotEmpty)
                          pw.Text(
                            billConfig.thankYouMessage,
                            style: pw.TextStyle(
                              fontSize: is58mm ? 8.5 : 10,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        if (billConfig.showPoweredBy && billConfig.customWatermark.isNotEmpty) ...[
                          pw.SizedBox(height: 2),
                          pw.Text(
                            billConfig.customWatermark.toUpperCase(),
                            style: pw.TextStyle(
                              fontSize: is58mm ? 6.5 : 7.5,
                              color: isMono ? PdfColors.black : PdfColors.grey700,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Right: QR Code & Caption
                  if (qrImage != null) ...[
                    pw.SizedBox(width: 8),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.all(2),
                          decoration: pw.BoxDecoration(
                            border: pw.Border.all(color: isMono ? PdfColors.black : PdfColors.grey500, width: 0.8),
                            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(3)),
                          ),
                          child: pw.Image(
                            qrImage,
                            height: is58mm ? 42 : 54,
                            width: is58mm ? 42 : 54,
                            fit: pw.BoxFit.contain,
                          ),
                        ),
                        if (billConfig.qrCaption.isNotEmpty) ...[
                          pw.SizedBox(height: 2),
                          pw.SizedBox(
                            width: is58mm ? 54 : 70,
                            child: pw.Text(
                              billConfig.qrCaption,
                              style: pw.TextStyle(
                                fontSize: is58mm ? 5.5 : 6.5,
                                fontWeight: pw.FontWeight.bold,
                              ),
                              textAlign: pw.TextAlign.center,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// PDF Generator for Kitchen Order Tickets (KOT)
  Future<Uint8List> generateKotPdf({required OrderModel order}) async {
    final pdf = pw.Document();
    final double pageWidth = (80 * PdfPageFormat.mm);
    final pageFormat = PdfPageFormat(
      pageWidth,
      double.infinity,
      marginLeft: 6 * PdfPageFormat.mm,
      marginRight: 6 * PdfPageFormat.mm,
      marginTop: 6 * PdfPageFormat.mm,
      marginBottom: 6 * PdfPageFormat.mm,
    );

    final dateFormat = DateFormat('dd-MMM-yyyy hh:mm a');

    pdf.addPage(
      pw.Page(
        pageFormat: pageFormat,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text('KITCHEN ORDER TICKET (KOT)', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 4),
              pw.Divider(thickness: 1.5),

              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    order.isTakeout ? '🛍️ TAKEOUT' : 'TABLE ${order.tableNumber}',
                    style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
                  ),
                  pw.Text('ID: ${order.orderId}', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.Align(
                alignment: pw.Alignment.centerLeft,
                child: pw.Text('Time: ${dateFormat.format(order.createdAt)}', style: const pw.TextStyle(fontSize: 9)),
              ),
              pw.Divider(thickness: 1, borderStyle: pw.BorderStyle.dashed),

              // Items
              pw.Row(
                children: [
                  pw.Expanded(flex: 7, child: pw.Text('ITEM', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(flex: 3, child: pw.Text('QTY', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold))),
                ],
              ),
              pw.Divider(thickness: 0.5),

              ...order.items.map((item) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2.5),
                  child: pw.Row(
                    children: [
                      pw.Expanded(
                        flex: 7,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              '${item.name}${item.isPacked ? ' [PACK]' : ''}',
                              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
                            ),
                            if (item.customization.isNotEmpty)
                              pw.Text(
                                '* ${item.customization}',
                                style: pw.TextStyle(fontSize: 9.5, fontStyle: pw.FontStyle.italic),
                              ),
                          ],
                        ),
                      ),
                      pw.Expanded(
                        flex: 3,
                        child: pw.Text(
                          'x ${item.quantity}',
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                );
              }),

              pw.Divider(thickness: 1.5),
              pw.Text('Total Items: ${order.items.fold(0, (sum, i) => sum + i.quantity)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  pw.Widget _buildTaxRow(String label, String value, bool is58mm) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontSize: is58mm ? 7.5 : 8.5)),
          pw.Text(value, style: pw.TextStyle(fontSize: is58mm ? 7.5 : 8.5)),
        ],
      ),
    );
  }
}
