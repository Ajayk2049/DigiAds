import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../models/order_model.dart';
import '../models/bill_config_model.dart';
import '../services/printer_service.dart';

class PrinterProvider extends ChangeNotifier {
  final PrinterService _service = PrinterService();

  List<Printer> _installedPrinters = [];
  bool _isLoading = false;

  List<Printer> get installedPrinters => _installedPrinters;
  String? get selectedReceiptPrinter => _service.selectedReceiptPrinter;
  String? get selectedKotPrinter => _service.selectedKotPrinter;
  String get paperWidthFormat => _service.paperWidthFormat;
  String get colorMode => _service.colorMode;
  bool get autoPrintKot => _service.autoPrintKot;
  bool get silentPrintEnabled => _service.silentPrintEnabled;
  bool get isLoading => _isLoading;

  Future<void> init() async {
    await _service.init();
    await refreshPrinters();
  }

  Future<void> refreshPrinters() async {
    _isLoading = true;
    notifyListeners();

    _installedPrinters = await _service.getInstalledPrinters();

    _isLoading = false;
    notifyListeners();
  }

  Future<void> updateReceiptPrinter(String? name) async {
    await _service.saveSettings(receiptPrinter: name);
    notifyListeners();
  }

  Future<void> updateKotPrinter(String? name) async {
    await _service.saveSettings(kotPrinter: name);
    notifyListeners();
  }

  Future<void> updatePaperWidth(String format) async {
    await _service.saveSettings(paperWidth: format);
    notifyListeners();
  }

  Future<void> updateColorMode(String mode) async {
    await _service.saveSettings(colorMode: mode);
    notifyListeners();
  }

  Future<void> toggleAutoPrintKot(bool enabled) async {
    await _service.saveSettings(autoPrintKot: enabled);
    notifyListeners();
  }

  Future<void> toggleSilentPrint(bool enabled) async {
    await _service.saveSettings(silentPrint: enabled);
    notifyListeners();
  }

  Future<bool> printCustomerBill({required OrderModel order, required BillConfigModel billConfig}) {
    return _service.printCustomerBill(order: order, billConfig: billConfig);
  }

  Future<bool> printKitchenKot({required OrderModel order}) {
    return _service.printKitchenKot(order: order);
  }

  Future<bool> printTestReceipt() async {
    final sampleOrder = OrderModel(
      id: 'test_order',
      orderId: 'ORD-TEST-01',
      hostApplicationId: 'test_app',
      tableNumber: '1',
      items: [
        OrderItemModel(name: 'Masala Dosa', price: 9000, quantity: 2),
        OrderItemModel(name: 'Filter Coffee', price: 3000, quantity: 2),
      ],
      totalAmount: 24000,
      subtotalAmount: 24000,
      orderStatus: 'served',
      paymentStatus: 'paid',
      paymentType: 'UPI',
      createdAt: DateTime.now(),
    );

    final sampleConfig = BillConfigModel(
      restaurantName: 'TEST VENUE RESTAURANT',
      addressLine1: '123 Main High Street',
      cityZip: 'Bengaluru - 560001',
      phone: '9876543210',
      gstin: '29ABCDE1234F1Z5',
      fssaiNo: '11223344556677',
      thankYouMessage: 'Test Print Successful!',
    );

    return _service.printCustomerBill(order: sampleOrder, billConfig: sampleConfig);
  }
}
