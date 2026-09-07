import 'dart:io';
import 'package:excel/excel.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import '../models/order_model.dart';

class ExcelExportService {
  static Future<String?> exportPaymentHistory({
    required String venueName,
    required List<OrderModel> orders,
    required DateTime startDate,
    required DateTime endDate,
    bool openAfterExport = true,
  }) async {
    final excel = Excel.createExcel();
    final String sheetName = 'Payment History';

    // Rename default sheet
    final defaultSheet = excel.getDefaultSheet();
    if (defaultSheet != null && defaultSheet != sheetName) {
      excel.rename(defaultSheet, sheetName);
    }

    final sheet = excel[sheetName];

    final dateFormatter = DateFormat('dd-MMM-yyyy');
    final dateTimeFormatter = DateFormat('dd-MMM-yyyy hh:mm a');

    // Row 1: Merged Title Banner (Row index 0)
    sheet.merge(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 0),
        CellIndex.indexByColumnRow(columnIndex: 11, rowIndex: 0));
    final titleCell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 0));
    titleCell.value = TextCellValue('${venueName.toUpperCase()} - PAYMENT & TRANSACTION HISTORY');
    titleCell.cellStyle = CellStyle(
      bold: true,
      fontSize: 14,
      fontColorHex: ExcelColor.fromHexString('#FFFFFF'),
      backgroundColorHex: ExcelColor.fromHexString('#0069A8'),
      horizontalAlign: HorizontalAlign.Center,
      verticalAlign: VerticalAlign.Center,
    );

    // Row 2: Subtitle Metadata (Row index 1)
    sheet.merge(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 1),
        CellIndex.indexByColumnRow(columnIndex: 11, rowIndex: 1));
    final subtitleCell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 1));
    subtitleCell.value = TextCellValue(
        'Report Period: ${dateFormatter.format(startDate)} to ${dateFormatter.format(endDate)}  |  Generated On: ${dateTimeFormatter.format(DateTime.now())}');
    subtitleCell.cellStyle = CellStyle(
      italic: true,
      fontSize: 10,
      fontColorHex: ExcelColor.fromHexString('#475569'),
      horizontalAlign: HorizontalAlign.Center,
    );

    // Row 4: Table Headers (Row index 3)
    final headers = [
      'Sl. No.',
      'Date & Time',
      'Order ID',
      'Type / Location',
      'Items Summary',
      'Payment Mode',
      'Subtotal (Rs.)',
      'CGST (Rs.)',
      'SGST (Rs.)',
      'Service Tax (Rs.)',
      'Round Off (Rs.)',
      'Grand Total (Rs.)',
    ];

    for (int col = 0; col < headers.length; col++) {
      final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: 3));
      cell.value = TextCellValue(headers[col]);
      cell.cellStyle = CellStyle(
        bold: true,
        fontSize: 10,
        fontColorHex: ExcelColor.fromHexString('#FFFFFF'),
        backgroundColorHex: ExcelColor.fromHexString('#1E293B'),
        horizontalAlign: col >= 6 ? HorizontalAlign.Right : (col == 0 || col == 2 ? HorizontalAlign.Center : HorizontalAlign.Left),
        verticalAlign: VerticalAlign.Center,
      );
    }

    // Data Rows
    double sumSubtotal = 0;
    double sumCgst = 0;
    double sumSgst = 0;
    double sumServiceTax = 0;
    double sumRoundOff = 0;
    double sumGrandTotal = 0;

    for (int i = 0; i < orders.length; i++) {
      final ord = orders[i];
      final rowIndex = i + 4;

      final itemsSummary = ord.items
          .map((item) => '${item.name}${item.isPacked ? ' (PACK)' : ''} (x${item.quantity})')
          .join(', ');

      sumSubtotal += ord.subtotalInRupees;
      sumCgst += ord.isGstExempt ? 0 : ord.cgstInRupees;
      sumSgst += ord.isGstExempt ? 0 : ord.sgstInRupees;
      sumServiceTax += ord.isServiceTaxExempt ? 0 : ord.serviceTaxInRupees;
      sumRoundOff += ord.roundOffInRupees;
      sumGrandTotal += ord.totalInRupees;

      final rowData = [
        (i + 1).toString(),
        dateTimeFormatter.format(ord.createdAt),
        ord.orderId,
        ord.isTakeout ? 'TAKEOUT' : 'Table ${ord.tableNumber}',
        itemsSummary,
        ord.paymentType ?? 'UPI',
        ord.subtotalInRupees.toStringAsFixed(2),
        (ord.isGstExempt ? 0 : ord.cgstInRupees).toStringAsFixed(2),
        (ord.isGstExempt ? 0 : ord.sgstInRupees).toStringAsFixed(2),
        (ord.isServiceTaxExempt ? 0 : ord.serviceTaxInRupees).toStringAsFixed(2),
        ord.roundOffInRupees.toStringAsFixed(2),
        ord.totalInRupees.toStringAsFixed(2),
      ];

      for (int col = 0; col < rowData.length; col++) {
        final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: rowIndex));
        cell.value = TextCellValue(rowData[col]);
        cell.cellStyle = CellStyle(
          fontSize: 9,
          horizontalAlign: col >= 6 ? HorizontalAlign.Right : (col == 0 || col == 2 ? HorizontalAlign.Center : HorizontalAlign.Left),
        );
      }
    }

    // Total Summary Row
    final summaryRowIndex = orders.length + 4;
    final summaryData = [
      '',
      'TOTAL SUMMARY',
      '${orders.length} Orders',
      '',
      '',
      '',
      sumSubtotal.toStringAsFixed(2),
      sumCgst.toStringAsFixed(2),
      sumSgst.toStringAsFixed(2),
      sumServiceTax.toStringAsFixed(2),
      sumRoundOff.toStringAsFixed(2),
      sumGrandTotal.toStringAsFixed(2),
    ];

    for (int col = 0; col < summaryData.length; col++) {
      final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: summaryRowIndex));
      cell.value = TextCellValue(summaryData[col]);
      cell.cellStyle = CellStyle(
        bold: true,
        fontSize: 10,
        backgroundColorHex: ExcelColor.fromHexString('#F1F5F9'),
        horizontalAlign: col >= 6 ? HorizontalAlign.Right : HorizontalAlign.Center,
      );
    }

    // Set Column Auto-Widths
    sheet.setColumnWidth(0, 8);
    sheet.setColumnWidth(1, 24);
    sheet.setColumnWidth(2, 18);
    sheet.setColumnWidth(3, 18);
    sheet.setColumnWidth(4, 38);
    sheet.setColumnWidth(5, 14);
    sheet.setColumnWidth(6, 15);
    sheet.setColumnWidth(7, 13);
    sheet.setColumnWidth(8, 13);
    sheet.setColumnWidth(9, 15);
    sheet.setColumnWidth(10, 15);
    sheet.setColumnWidth(11, 18);

    // Save File to Downloads directory
    final downloadsDir = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
    final cleanVenue = venueName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    final startStr = DateFormat('yyyy-MM-dd').format(startDate);
    final endStr = DateFormat('yyyy-MM-dd').format(endDate);
    final filePath = '${downloadsDir.path}\\${cleanVenue}_Payment_History_${startStr}_to_$endStr.xlsx';

    final fileBytes = excel.encode();
    if (fileBytes != null) {
      final file = File(filePath);
      await file.writeAsBytes(fileBytes);

      if (openAfterExport) {
        await OpenFilex.open(filePath);
      }
      return filePath;
    }
    return null;
  }
}
