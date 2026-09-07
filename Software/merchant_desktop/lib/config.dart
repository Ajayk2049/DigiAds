import 'package:shared_preferences/shared_preferences.dart';

/// Centralized Environment Configuration (Zero-Hardcoding Policy)
class AppConfig {
  static const bool isProduction = bool.fromEnvironment('dart.vm.product');

  // Default Host
  static const String devApiHost = '127.0.0.1:4200';
  static const String prodApiHost = 'https://api.digiads.app';

  static String _activeHost = devApiHost;

  static String get serverHost => _activeHost;

  /// Load persisted server host IP on app launch
  static Future<void> loadConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedHost = prefs.getString('custom_server_host');
      if (savedHost != null && savedHost.trim().isNotEmpty) {
        _activeHost = savedHost.trim();
      }
    } catch (_) {}
  }

  /// Update active server host and persist
  static Future<void> setServerHost(String host) async {
    _activeHost = host.trim().replaceFirst('http://', '').replaceFirst('https://', '');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_server_host', _activeHost);
    } catch (_) {}
  }

  static String get serverRootUrl {
    if (_activeHost.isNotEmpty) {
      if (_activeHost.startsWith('http://') || _activeHost.startsWith('https://')) {
        return _activeHost;
      }
      return 'http://$_activeHost';
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
    if (subpath.contains('/uploads/ads/')) {
      subpath = subpath.replaceFirst('/uploads/ads/', '/uploads/creative/');
    }
    return '$serverRootUrl$subpath';
  }
}
