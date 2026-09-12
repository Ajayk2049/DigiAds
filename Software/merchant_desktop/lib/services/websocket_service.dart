import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config.dart';

typedef WebSocketEventHandler = void Function(Map<String, dynamic> data);

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;

  WebSocketChannel? _channel;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  int _reconnectAttempts = 0;
  bool _isConnected = false;
  bool _isConnecting = false;

  final Map<String, List<WebSocketEventHandler>> _listeners = {};

  bool get isConnected => _isConnected;

  WebSocketService._internal();

  void addListener(String event, WebSocketEventHandler handler) {
    if (!_listeners.containsKey(event)) {
      _listeners[event] = [];
    }
    _listeners[event]!.add(handler);
  }

  void removeListener(String event, WebSocketEventHandler handler) {
    _listeners[event]?.remove(handler);
  }

  Future<void> connect() async {
    if (_isConnected || _isConnecting) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null || token.isEmpty) {
      if (kDebugMode) print('[WS] No auth token available for WebSocket');
      return;
    }

    _isConnecting = true;
    final wsUrl = '${AppConfig.webSocketUrl}/ws/orders?token=$token';

    try {
      if (kDebugMode) print('[WS] Connecting to $wsUrl');
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _channel!.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onDone: () {
          if (kDebugMode) print('[WS] Disconnected');
          _onDisconnected();
        },
        onError: (error) {
          if (kDebugMode) print('[WS] Error: $error');
          _onDisconnected();
        },
      );

      _isConnected = true;
      _isConnecting = false;
      _startHeartbeat();
    } catch (e) {
      if (kDebugMode) print('[WS] Connection exception: $e');
      _onDisconnected();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final parsed = jsonDecode(message.toString()) as Map<String, dynamic>;
      final event = parsed['event'] ?? parsed['type'] ?? 'message';

      if (event == 'connected') {
        _isConnected = true;
        _reconnectAttempts = 0;
      }

      // Notify all specific event listeners
      if (_listeners.containsKey(event)) {
        for (final handler in _listeners[event]!) {
          handler(parsed);
        }
      }

      // Also notify wildcard listeners
      if (_listeners.containsKey('*')) {
        for (final handler in _listeners['*']!) {
          handler(parsed);
        }
      }
    } catch (e) {
      if (kDebugMode) print('[WS] Failed to parse message: $e');
    }
  }

  void _startHeartbeat() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 25), (timer) {
      if (_isConnected && _channel != null) {
        try {
          _channel!.sink.add(jsonEncode({'type': 'ping', 'timestamp': DateTime.now().millisecondsSinceEpoch}));
        } catch (_) {}
      }
    });
  }

  void _onDisconnected() {
    _isConnected = false;
    _isConnecting = false;
    _pingTimer?.cancel();
    _channel = null;

    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    // Exponential backoff: 2s, 3s, 4.5s... up to max 30s
    final expSeconds = (2.0 * math.pow(1.5, math.min(_reconnectAttempts, 6))).clamp(2.0, 30.0);
    // Randomized jitter (0 to 1500ms) to desynchronize simultaneous reconnects
    final jitterMs = math.Random().nextInt(1500);
    final delay = Duration(milliseconds: (expSeconds * 1000).toInt() + jitterMs);

    if (kDebugMode) print('[WS] Reconnect attempt #$_reconnectAttempts scheduled in ${delay.inMilliseconds}ms');
    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  void disconnect() {
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _isConnecting = false;
  }
}
