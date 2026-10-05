import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/audio_service.dart';
import '../services/tray_notification_service.dart';
import '../services/printer_service.dart';
import '../utils/error_utils.dart';

class OrdersProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final WebSocketService _ws = WebSocketService();
  final AudioService _audio = AudioService();
  final TrayNotificationService _tray = TrayNotificationService();
  final PrinterService _printer = PrinterService();

  List<OrderModel> _liveOrders = [];
  List<OrderModel> _paymentOrders = [];
  bool _isLoading = false;
  String? _error;

  int _paymentPage = 1;
  int _totalPaymentPages = 1;
  int _totalPaymentCount = 0;
  bool _isLoadingPayments = false;
  String? _paymentError;

  List<OrderModel> get liveOrders => _liveOrders;
  List<OrderModel> get paymentOrders => _paymentOrders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get paymentPage => _paymentPage;
  int get totalPaymentPages => _totalPaymentPages;
  int get totalPaymentCount => _totalPaymentCount;
  bool get isLoadingPayments => _isLoadingPayments;
  String? get paymentError => _paymentError;

  OrdersProvider() {
    _setupWebSocketListeners();
  }

  void _setupWebSocketListeners() {
    _ws.addListener('new_order', _handleIncomingOrder);
    _ws.addListener('order_update', _handleOrderUpdate);
    _ws.addListener('waiter_call', _handleWaiterCall);
  }

  void _handleIncomingOrder(Map<String, dynamic> data) {
    final orderJson = data['data'] ?? data['order'];
    if (orderJson != null && orderJson is Map<String, dynamic>) {
      final order = OrderModel.fromJson(orderJson);
      _upsertOrder(order);

      // Play Audio Chime & Show Desktop Notification
      _audio.playOrderChime();
      _tray.showToast(
        title: 'New Order: ${order.isTakeout ? 'Takeout' : 'Table ${order.tableNumber}'}',
        body: '${order.items.length} items - Rs. ${order.totalInRupees.toStringAsFixed(2)}',
      );

      // Automated KOT Print: trigger on order arrival
      if (_printer.kotPrintTrigger == 'arrival') {
        _printer.printKitchenKot(order: order, isAutomatic: true);
      }
    }
  }

  void _handleOrderUpdate(Map<String, dynamic> data) {
    final orderJson = data['data'] ?? data['order'];
    if (orderJson != null && orderJson is Map<String, dynamic>) {
      final order = OrderModel.fromJson(orderJson);
      final existingIndex = _liveOrders.indexWhere((o) => o.orderId == order.orderId);
      final prevStatus = existingIndex != -1 ? _liveOrders[existingIndex].orderStatus : null;

      _upsertOrder(order);

      // Automated KOT Print: trigger when order is accepted from remote/kiosk
      if (_printer.kotPrintTrigger == 'accepted' &&
          order.orderStatus == 'cooking' &&
          prevStatus == 'placed') {
        _printer.printKitchenKot(order: order, isAutomatic: true);
      }
    }
  }

  void _handleWaiterCall(Map<String, dynamic> data) {
    final orderJson = data['data'] ?? data['order'];
    if (orderJson != null && orderJson is Map<String, dynamic>) {
      final order = OrderModel.fromJson(orderJson);
      _upsertOrder(order);
      _audio.playWaiterAlert();
      _tray.showToast(
        title: 'Customer Waiter Assistance',
        body: 'Table ${order.tableNumber} requested assistance: ${order.waiterCallOption ?? 'Service'}',
      );
    }
  }

  void _upsertOrder(OrderModel order) {
    final isLive = order.tableStatus != 'completed' &&
        order.tableStatus != 'completed_acked' &&
        order.orderStatus != 'cancelled' &&
        order.paymentStatus != 'completed';
    final isCompletedPayment = order.paymentStatus == 'completed' &&
        (order.totalAmount > 0 || order.items.isNotEmpty);

    final liveIndex = _liveOrders.findIndexByOrderId(order.orderId);
    if (isLive) {
      if (liveIndex >= 0) {
        _liveOrders[liveIndex] = order;
      } else {
        _liveOrders.insert(0, order);
      }
    } else {
      if (liveIndex >= 0) {
        _liveOrders.removeAt(liveIndex);
      }
    }

    final payIndex = _paymentOrders.findIndexByOrderId(order.orderId);
    if (isCompletedPayment) {
      if (payIndex >= 0) {
        _paymentOrders[payIndex] = order;
      } else {
        _paymentOrders.insert(0, order);
        _totalPaymentCount++;
      }
    } else {
      if (payIndex >= 0) {
        _paymentOrders.removeAt(payIndex);
        if (_totalPaymentCount > 0) _totalPaymentCount--;
      }
    }

    notifyListeners();
  }

  Future<void> fetchLiveOrders(String? hostApplicationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = <String, dynamic>{
        'tableStatus': 'active',
      };
      if (hostApplicationId != null && hostApplicationId.isNotEmpty) {
        query['hostApplicationId'] = hostApplicationId;
      }

      final res = await _api.get('/host/orders', queryParameters: query);
      if (res.data['success'] == true && res.data['data'] != null) {
        _liveOrders = (res.data['data'] as List<dynamic>)
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      _error = ErrorUtils.parseError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchPaymentHistory({
    String? hostApplicationId,
    int page = 1,
    int limit = 40,
    String? startDate,
    String? endDate,
    String? search,
  }) async {
    _isLoadingPayments = true;
    _paymentError = null;
    notifyListeners();

    try {
      final query = <String, dynamic>{
        'paymentStatus': 'completed',
        'page': page,
        'limit': limit,
      };
      if (hostApplicationId != null && hostApplicationId.isNotEmpty) {
        query['hostApplicationId'] = hostApplicationId;
      }
      if (startDate != null && startDate.isNotEmpty) {
        query['startDate'] = startDate;
      }
      if (endDate != null && endDate.isNotEmpty) {
        query['endDate'] = endDate;
      }
      if (search != null && search.trim().isNotEmpty) {
        query['search'] = search.trim();
      }

      final res = await _api.get('/host/orders', queryParameters: query);
      if (res.data['success'] == true && res.data['data'] != null) {
        _paymentOrders = (res.data['data'] as List<dynamic>)
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();

        final pagination = res.data['pagination'];
        if (pagination != null && pagination is Map<String, dynamic>) {
          _paymentPage = (pagination['page'] as num?)?.toInt() ?? page;
          _totalPaymentPages = (pagination['totalPages'] as num?)?.toInt() ?? 1;
          _totalPaymentCount = (pagination['total'] as num?)?.toInt() ?? _paymentOrders.length;
        } else {
          _paymentPage = page;
          _totalPaymentPages = 1;
          _totalPaymentCount = _paymentOrders.length;
        }
      }
    } catch (e) {
      _paymentError = ErrorUtils.parseError(e);
    } finally {
      _isLoadingPayments = false;
      notifyListeners();
    }
  }

  Future<List<OrderModel>> fetchOrdersForExport({
    String? hostApplicationId,
    required String startDate,
    required String endDate,
  }) async {
    try {
      final query = <String, dynamic>{
        'paymentStatus': 'completed',
        'startDate': startDate,
        'endDate': endDate,
        'export': 'true',
      };
      if (hostApplicationId != null && hostApplicationId.isNotEmpty) {
        query['hostApplicationId'] = hostApplicationId;
      }
      final res = await _api.get('/host/orders', queryParameters: query);
      if (res.data['success'] == true && res.data['data'] != null) {
        return (res.data['data'] as List<dynamic>)
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<void> updateOrderStatus(String orderId, String newStatus) async {
    try {
      final res = await _api.post('/host/orders/update-status', data: {
        'orderId': orderId,
        'orderStatus': newStatus,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final updated = OrderModel.fromJson(res.data['data']);
        _upsertOrder(updated);

        // Automated KOT Print: trigger when merchant accepts order
        if (_printer.kotPrintTrigger == 'accepted' && newStatus == 'cooking') {
          _printer.printKitchenKot(order: updated, isAutomatic: true);
        }
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> closeTable(String orderId) async {
    try {
      final res = await _api.post('/host/orders/close-table', data: {
        'orderId': orderId,
      });
      if (res.data['success'] == true) {
        _liveOrders.removeWhere((o) => o.orderId == orderId);
        notifyListeners();
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> markPaymentReceived(String orderId, String paymentType) async {
    try {
      final res = await _api.post('/host/orders/payment-received', data: {
        'orderId': orderId,
        'paymentType': paymentType,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final updated = OrderModel.fromJson(res.data['data']);
        _liveOrders.removeWhere((o) => o.orderId == orderId);
        _paymentOrders.insert(0, updated);
        notifyListeners();
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> toggleGstExemption(String orderId, bool isExempt) async {
    try {
      final res = await _api.post('/host/orders/toggle-gst', data: {
        'orderId': orderId,
        'removeGst': isExempt,
        'isGstExempt': isExempt,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final updated = OrderModel.fromJson(res.data['data']);
        _upsertOrder(updated);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> toggleServiceTaxExemption(String orderId, bool isExempt) async {
    try {
      final res = await _api.post('/host/orders/toggle-service-tax', data: {
        'orderId': orderId,
        'removeServiceTax': isExempt,
        'isServiceTaxExempt': isExempt,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final updated = OrderModel.fromJson(res.data['data']);
        _upsertOrder(updated);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> serviceWaiter(String orderId) async {
    try {
      final res = await _api.post('/host/orders/service-waiter', data: {
        'orderId': orderId,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final updated = OrderModel.fromJson(res.data['data']);
        _upsertOrder(updated);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<bool> createTakeoutOrder({
    required String hostApplicationId,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      final res = await _api.post('/host/orders/takeout', data: {
        'hostApplicationId': hostApplicationId,
        'items': items,
      });
      if (res.data['success'] == true && res.data['data'] != null) {
        final newOrder = OrderModel.fromJson(res.data['data']);
        _upsertOrder(newOrder);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

extension on List<OrderModel> {
  int findIndexByOrderId(String orderId) {
    for (int i = 0; i < length; i++) {
      if (this[i].orderId == orderId) return i;
    }
    return -1;
  }
}
