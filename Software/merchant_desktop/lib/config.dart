import 'package:shared_preferences/shared_preferences.dart';

/// Centralized Environment Configuration (Zero-Hardcoding Policy)
class AppConfig {
  static const bool isProduction = bool.fromEnvironment('dart.vm.product');

  // Default Host
  static const String devApiHost = '127.0.0.1:4000';
  static const String prodApiHost = 'test-api.digiads.space';

  static String _activeHost = prodApiHost;
  static bool _isExplicitHttps = true;

  static String get serverHost => _activeHost;
  static bool get isCustomHostSet => _activeHost != prodApiHost;

  /// Load persisted server host IP on app launch. Defaults to production cloud if not set.
  static Future<void> loadConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedHost = prefs.getString('custom_server_host');
      if (savedHost != null && savedHost.trim().isNotEmpty) {
        final trimmed = savedHost.trim();
        _isExplicitHttps = trimmed.startsWith('https://');
        String cleaned = trimmed.replaceFirst(RegExp(r'^https?:\/\/'), '');
        if (!cleaned.contains(':')) {
          final isIpOrLocal = cleaned == 'localhost' ||
              RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(cleaned);
          if (isIpOrLocal) {
            cleaned = '$cleaned:4000';
          }
        }
        _activeHost = cleaned;
      } else {
        _activeHost = prodApiHost;
        _isExplicitHttps = true;
      }
    } catch (_) {
      _activeHost = prodApiHost;
      _isExplicitHttps = true;
    }
  }

  /// Reset server host to canonical cloud default
  static Future<void> resetToDefault() async {
    _activeHost = prodApiHost;
    _isExplicitHttps = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('custom_server_host');
    } catch (_) {}
  }

  /// Update active server host and persist
  static Future<void> setServerHost(String host) async {
    final trimmed = host.trim();
    _isExplicitHttps = trimmed.startsWith('https://');
    String cleaned = trimmed.replaceFirst(RegExp(r'^https?:\/\/'), '');

    // If host has no port and is an IP or localhost, automatically default to port 4000
    if (!cleaned.contains(':')) {
      final isIpOrLocal = cleaned == 'localhost' ||
          RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(cleaned);
      if (isIpOrLocal) {
        cleaned = '$cleaned:4000';
      }
    }

    _activeHost = cleaned;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_server_host', cleaned);
    } catch (_) {}
  }

  static String get serverRootUrl {
    if (_activeHost.isNotEmpty) {
      if (_activeHost.startsWith('http://') || _activeHost.startsWith('https://')) {
        return _activeHost;
      }
      final isDomain = !_activeHost.contains(':') &&
          _activeHost.contains('.') &&
          !RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(_activeHost);
      final scheme = (_isExplicitHttps || isDomain) ? 'https' : 'http';
      return '$scheme://$_activeHost';
    }
    return 'http://$devApiHost';
  }

  static String get apiBaseUrl => '$serverRootUrl/api/v1';

  static String get webSocketUrl {
    final root = serverRootUrl;
    if (root.startsWith('https://')) {
      return root.replaceFirst('https://', 'wss://');
    }
    return root.replaceFirst('http://', 'ws://');
  }

  /// Resolve media image/video URLs correctly
  static String resolveMediaUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    String subpath = url;
    if (url.contains('/uploads/')) {
      subpath = '/uploads/${url.split('/uploads/')[1]}';
    } else if (!url.startsWith('/')) {
      subpath = '/$url';
    }
    return '$serverRootUrl$subpath';
  }
}
