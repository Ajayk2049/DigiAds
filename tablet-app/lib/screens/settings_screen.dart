import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  @override
  void initState() {
    super.initState();
    _readBootGuard();
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

  /// Last-resort field recovery. These kiosks have no USB port, so without an
  /// on-screen way to surrender Device Owner a wedged unit can only be fixed by
  /// a factory reset.
  Future<void> _releaseDeviceOwner() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text('Release Device Owner?'),
        content: const Text(
          'This permanently surrenders enterprise Device Owner privileges for this '
          'app. Kiosk Lock Task mode will stop working and CANNOT be granted again '
          'without a full factory reset of the tablet.\n\n'
          'Only do this if the tablet is stuck in a reboot loop and no other '
          'recovery option is available.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Release'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final released =
          await _perfChannel.invokeMethod<bool>('clearDeviceOwner') ?? false;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(released
              ? 'Device Owner released. Kiosk lockdown is now disabled.'
              : 'App is not Device Owner — nothing to release.'),
          backgroundColor: released ? Colors.orange.shade800 : Colors.grey,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to release Device Owner: $e')),
      );
    }
  }

  Future<void> _resetDevice() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text('Reset device?'),
        content: const Text(
          'This will clear all saved credentials. You will need to run setup again before the kiosk can connect to a server.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('serverHost');
    await prefs.remove('deviceId');
    await prefs.remove('hostApplicationId');
    await prefs.remove('bypassPassword');
    await prefs.remove('tableNumber');
    await prefs.remove('cachedMenu');
    await prefs.remove('local_playlist');
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => DeviceSetupScreen(onActivate: _activate)),
    );
  }

  void _activate(String host, String dId, String tok, String hAppId, String pass, String tbl) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DownloadProgressScreen(
          serverHost: host,
          deviceId: dId,
          token: tok,
          hostApplicationId: hAppId,
          bypassPassword: pass,
          tableNumber: tbl,
        ),
      ),
    );
  }

  void _reRunSetup() async {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => DeviceSetupScreen(onActivate: _activate)),
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
            subtitle: 'Change server, device ID or table number.',
            onTap: _reRunSetup,
          ),
          _buildActionCard(
            icon: Icons.lock_reset_rounded,
            title: 'Reset device',
            subtitle: 'Clear all credentials. Requires full setup before kiosk can run.',
            onTap: _resetDevice,
            danger: true,
          ),
          _buildActionCard(
            icon: Icons.admin_panel_settings_rounded,
            title: 'Release Device Owner',
            subtitle:
                'Emergency only. Surrenders kiosk lockdown permanently — cannot be undone without a factory reset.',
            onTap: _releaseDeviceOwner,
            danger: true,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () async {
              try {
                await const MethodChannel('com.digiads.tabletop/performance').invokeMethod('openAndroidSettings');
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to open Android Settings: $e')),
                  );
                }
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
