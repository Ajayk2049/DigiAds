import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:local_notifier/local_notifier.dart';
import 'package:tray_manager/tray_manager.dart';
import 'package:window_manager/window_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TrayNotificationService with TrayListener, WindowListener {
  static final TrayNotificationService _instance = TrayNotificationService._internal();
  factory TrayNotificationService() => _instance;

  TrayNotificationService._internal();

  Future<void> init() async {
    if (kIsWeb) return;

    try {
      // Listen to window events (prevent hard close & minimize to tray)
      windowManager.addListener(this);
      await windowManager.setPreventClose(true);

      // Initialize local notifier for Windows Toast Notifications
      await localNotifier.setup(
        appName: 'DigiAds Venue Admin',
        shortcutPolicy: ShortcutPolicy.requireCreate,
      );

      // Initialize System Tray
      trayManager.addListener(this);
      await trayManager.setIcon(
        'assets/icons/app_icon.ico', // Windows Tray Icon
      );

      final Menu menu = Menu(
        items: [
          MenuItem(
            key: 'show_window',
            label: 'Open DigiAds POS',
          ),
          MenuItem.separator(),
          MenuItem(
            key: 'exit_app',
            label: 'Exit POS',
          ),
        ],
      );
      await trayManager.setContextMenu(menu);
      await trayManager.setToolTip('DigiAds Merchant POS');

      // Ensure Start with Windows is pre-configured and enabled by default on all installs
      await ensureDefaultAutoStart();
    } catch (e) {
      if (kDebugMode) print('[TrayService] Init error: $e');
    }
  }

  @override
  void onWindowClose() async {
    final isPreventClose = await windowManager.isPreventClose();
    if (isPreventClose) {
      await windowManager.hide();
      await showToast(
        title: 'DigiAds POS Running in Background',
        body: 'The workstation is minimized to the system tray. Click the tray icon to restore.',
      );
    }
  }

  @override
  void onTrayIconMouseDown() {
    windowManager.show();
    windowManager.focus();
  }

  @override
  void onTrayIconRightMouseDown() {
    trayManager.popUpContextMenu();
  }

  @override
  void onTrayMenuItemClick(MenuItem menuItem) {
    if (menuItem.key == 'show_window') {
      windowManager.show();
      windowManager.focus();
    } else if (menuItem.key == 'exit_app') {
      forceExit();
    }
  }

  /// Instant, clean termination of the entire desktop application
  static Future<void> forceExit() async {
    try {
      await windowManager.setPreventClose(false);
      await windowManager.destroy();
    } catch (_) {}
    exit(0);
  }

  /// Show Windows Toast Notification
  Future<void> showToast({
    required String title,
    required String body,
  }) async {
    try {
      final notification = LocalNotification(
        title: title,
        body: body,
      );
      notification.onShow = () {
        if (kDebugMode) print('[Notification] Toast displayed: $title');
      };
      notification.onClick = () {
        windowManager.show();
        windowManager.focus();
      };
      await notification.show();
    } catch (e) {
      if (kDebugMode) print('[Notification] Toast Error: $e');
    }
  }

  /// Ensure Start with Windows is pre-configured and enabled by default on initial install/launch
  static Future<void> ensureDefaultAutoStart() async {
    if (!Platform.isWindows) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final isExplicitlyDisabled = prefs.getBool('pos_autostart_disabled') ?? false;
      if (!isExplicitlyDisabled) {
        // Pre-configure and enable in Windows Registry automatically
        await toggleAutoStart(true);
      }
    } catch (e) {
      if (kDebugMode) print('[TrayService] Default autostart error: $e');
    }
  }

  /// Check if Start with Windows is enabled (Defaults to TRUE on all installs)
  static Future<bool> isAutoStartEnabled() async {
    if (!Platform.isWindows) return false;
    try {
      final prefs = await SharedPreferences.getInstance();
      final isExplicitlyDisabled = prefs.getBool('pos_autostart_disabled') ?? false;
      if (isExplicitlyDisabled) {
        return false;
      }

      // Check Windows Registry; if not yet in registry, write it now (default enabled)
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-Command',
        'Get-ItemPropertyValue -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "DigiAdsMerchantPOS" -ErrorAction SilentlyContinue'
      ]);
      final inRegistry = res.stdout.toString().trim().isNotEmpty;
      if (!inRegistry) {
        await toggleAutoStart(true);
      }
      return true;
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      return !(prefs.getBool('pos_autostart_disabled') ?? false);
    }
  }

  /// Toggle Start with Windows in Windows Registry
  static Future<void> toggleAutoStart(bool enable) async {
    if (!Platform.isWindows) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('pos_autostart_disabled', !enable);

      final exePath = Platform.resolvedExecutable;
      if (enable) {
        await Process.run('powershell', [
          '-NoProfile',
          '-Command',
          'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "DigiAdsMerchantPOS" -Value \'"$exePath"\''
        ]);
      } else {
        await Process.run('powershell', [
          '-NoProfile',
          '-Command',
          'Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "DigiAdsMerchantPOS" -ErrorAction SilentlyContinue'
        ]);
      }
    } catch (_) {}
  }
}
