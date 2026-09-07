import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:local_notifier/local_notifier.dart';
import 'package:tray_manager/tray_manager.dart';
import 'package:window_manager/window_manager.dart';

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

  /// Check if Start with Windows is enabled
  static Future<bool> isAutoStartEnabled() async {
    if (!Platform.isWindows) return false;
    try {
      final res = await Process.run('powershell', [
        '-NoProfile',
        '-Command',
        'Get-ItemPropertyValue -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "DigiAdsMerchantPOS" -ErrorAction SilentlyContinue'
      ]);
      return res.stdout.toString().trim().isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Toggle Start with Windows in Windows Registry
  static Future<void> toggleAutoStart(bool enable) async {
    if (!Platform.isWindows) return;
    try {
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
