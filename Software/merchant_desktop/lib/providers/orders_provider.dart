import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/audio_service.dart';
import '../services/tray_notification_service.dart';
import '../services/printer_service.dart';

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

  List<OrderModel> get liveOrders => _liveOrders;
  List<OrderModel> get paymentOrders => _paymentOrders;
  bool get isLoading => _isLoading;
  String? get error => _error;

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

      // Automated KOT Print (if enabled in settings)
      if (_printer.autoPrintKot) {
        _printer.printKitchenKot(order: order);
      }
    }
  }

  void _handleOrderUpdate(Map<String, dynamic> data) {
    final orderJson = data['data'] ?? data['order'];
    if (orderJson != null && orderJson is Map<String, dynamic>) {
      final order = OrderModel.fromJson(orderJson);
      _upsertOrder(order);
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
      }
    } else {
      if (payIndex >= 0) {
        _paymentOrders.removeAt(payIndex);
      }
    }

    notifyListeners();
  }

  Future<void> fetchLiveOrders(String? hostApplicationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = <String, dynamic>{};
      if (hostApplicationId != null && hostApplicationId.isNotEmpty) {
        query['hostApplicationId'] = hostApplicationId;
      }

      final res = await _api.get('/host/orders', queryParameters: query);
      if (res.data['success'] == true && res.data['data'] != null) {
        final list = (res.data['data'] as List<dynamic>)
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();

        // Separate active live orders from historical completed payments (matching web portal)
        _liveOrders = list.where((o) =>
          o.tableStatus != 'completed' &&
          o.tableStatus != 'completed_acked' &&
          o.orderStatus != 'cancelled' &&
          o.paymentStatus != 'completed'
        ).toList();

        _paymentOrders = list.where((o) =>
          o.paymentStatus == 'completed' &&
          (o.totalAmount > 0 || o.items.isNotEmpty)
        ).toList();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
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
