import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants.dart';
import 'device_setup_screen.dart';
import 'download_progress_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS SCREEN
//
//  Reached via the unlock dialog in kiosk mode. This is the ONLY
//  place from which navigation back to setup / download progress
//  is allowed — the kiosk never exposes these directly.
// ═══════════════════════════════════════════════════════════════════

class SettingsScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final String tableNumber;
  final VoidCallback onBackToKiosk;

  const SettingsScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.tableNumber,
    required this.onBackToKiosk,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const MethodChannel _perfChannel =
      MethodChannel('com.digiads.tabletop/performance');

  bool _bootGuardTripped = false;
  String _appVersion = 'Loading...';

  @override
  void initState() {
    super.initState();
    _readBootGuard();
    _loadVersionInfo();
  }

  Future<void> _loadVersionInfo() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() {
          _appVersion = 'v${info.version} (Build ${info.buildNumber})';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _appVersion = 'v1.0.0+1';
        });
      }
    }
  }

  Future<void> _readBootGuard() async {
    try {
      final tripped =
          await _perfChannel.invokeMethod<bool>('isCircuitBreakerTripped');
      if (mounted) setState(() => _bootGuardTripped = tripped ?? false);
    } catch (e) {
      debugPrint('[SETTINGS] Boot guard read failed: $e');
    }
  }

  /// Clears the boot-guard counter and re-arms kiosk lockdown. Used after the
  /// underlying fault has been dealt with, so the tablet resumes normal kiosk
  /// behaviour on the next boot.
  Future<void> _clearBootGuard() async {
    try {
      await _perfChannel.invokeMethod('resetCircuitBreaker');
      await _perfChannel.invokeMethod('startKioskMode');
      if (!mounted) return;
      setState(() => _bootGuardTripped = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Safe Mode cleared. Kiosk lockdown re-armed.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to clear Safe Mode: $e')),
      );
    }
  }

  Future<void> _resetDevice() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text('Reset device to clean slate?'),
        content: const Text(
          'This will permanently clear all saved credentials, server configuration, '
          'table assignment, cached ad videos, and menu images from this tablet.\n\n'
          'The device will be completely locked out of this venue until a new setup is performed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reset Clean Slate'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    // 1. Clear SharedPreferences while retaining physical hardware_id
    final prefs = await SharedPreferences.getInstance();
    final hardwareId = prefs.getString('hardware_id');
    await prefs.clear();
    if (hardwareId != null && hardwareId.isNotEmpty) {
      await prefs.setString('hardware_id', hardwareId);
    }

    // 2. Wipe cached ad video files
    try {
      final adsDir = Directory(kAdsDirectoryPath);
      if (await adsDir.exists()) {
        await adsDir.delete(recursive: true);
      }
    } catch (e) {
      debugPrint('[RESET] Failed to delete ads dir: $e');
    }

    // 3. Wipe cached menu images
    try {
      final docs = await getApplicationDocumentsDirectory();
      final menuImagesDir = Directory('${docs.path}/menu_images');
      if (await menuImagesDir.exists()) {
        await menuImagesDir.delete(recursive: true);
      }
    } catch (e) {
      debugPrint('[RESET] Failed to delete menu images: $e');
    }

    // 4. Reset circuit breaker / safe mode counter
    try {
      await _perfChannel.invokeMethod('resetCircuitBreaker');
    } catch (_) {}

    if (!mounted) return;

    // 5. Navigate to clean-slate setup screen, clearing the entire backstack
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => const DeviceSetupScreen(
          isReRun: false,
        ),
      ),
      (route) => false,
    );
  }

  void _reRunSetup() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (setupCtx) => DeviceSetupScreen(
          isReRun: true,
          initialServerHost: widget.serverHost,
          initialDeviceId: widget.deviceId,
          initialTableNumber: widget.tableNumber,
          initialBypassPassword: widget.bypassPassword,
          onCancel: () => Navigator.of(setupCtx).pop(),
        ),
      ),
    );
  }

  void _reDownloadContent() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DownloadProgressScreen(
          serverHost: widget.serverHost,
          deviceId: widget.deviceId,
          token: widget.token,
          hostApplicationId: widget.hostApplicationId,
          bypassPassword: widget.bypassPassword,
          tableNumber: widget.tableNumber,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kiosk Settings'),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBackToKiosk,
        ),
      ),
      backgroundColor: kScaffoldBg,
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_bootGuardTripped) _buildSafeModeBanner(),
          _buildInfoCard(),
          const SizedBox(height: 20),
          _buildActionCard(
            icon: Icons.refresh_rounded,
            title: 'Re-download menu & ads',
            subtitle: 'Re-fetch from the server without changing credentials.',
            onTap: _reDownloadContent,
          ),
          _buildActionCard(
            icon: Icons.settings_remote_rounded,
            title: 'Re-run setup',
            subtitle: 'Change server IP, device ID, table number or password.',
            onTap: _reRunSetup,
          ),
          _buildActionCard(
            icon: Icons.lock_reset_rounded,
            title: 'Reset device',
            subtitle: 'Clear all credentials and wiped cached assets. Returns to clean slate.',
            onTap: _resetDevice,
            danger: true,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () async {
              try {
                try {
                  await _perfChannel.invokeMethod('stopKioskMode');
                } catch (_) {}
                await _perfChannel.invokeMethod('openAndroidSettings');
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to open Android Settings: $e')),
                );
              }
            },
            icon: const Icon(Icons.settings_applications_rounded, color: Colors.white),
            label: const Text(
              "System Settings",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSafeModeBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: kCardBorderRadius,
        border: Border.all(color: Colors.amber.shade700, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.amber.shade900, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'SAFE MODE ACTIVE',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                    color: Colors.amber.shade900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'This tablet restarted repeatedly without completing a stable run. Kiosk '
            'lockdown, the status-bar policy and native video playback are disabled so '
            'the device stays usable for on-site recovery.\n\n'
            'Once the cause is resolved, clear Safe Mode to restore normal kiosk operation.',
            style: TextStyle(fontSize: 12, color: kTextDark, height: 1.45),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _clearBootGuard,
              icon: const Icon(Icons.restart_alt_rounded, size: 18, color: Colors.white),
              label: const Text(
                'Clear Safe Mode & Re-arm Kiosk',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber.shade800,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kCardBg,
        borderRadius: kCardBorderRadius,
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Device',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextGrey, letterSpacing: 1.2),
          ),
          const SizedBox(height: 6),
          _kv('App Version', _appVersion),
          _kv('Device ID', widget.deviceId),
          _kv('Server', widget.serverHost),
          _kv('Table', widget.tableNumber),
          _kv('Outlet ID', widget.hostApplicationId),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(k, style: const TextStyle(fontSize: 13, color: kTextGrey)),
          ),
          Expanded(
            child: Text(
              v.isEmpty ? '—' : v,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kTextDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool danger = false,
  }) {
    final color = danger ? Colors.red.shade600 : Colors.blueAccent;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: kCardBg,
        borderRadius: kCardBorderRadius,
        child: InkWell(
          borderRadius: kCardBorderRadius,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: kCardBorderRadius,
              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kTextDark)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: const TextStyle(fontSize: 12, color: kTextGrey)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: kTextGrey.withValues(alpha: 0.5)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
