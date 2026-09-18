import 'package:flutter/material.dart';
import '../../config.dart';
import '../../constants/app_colors.dart';
import '../../services/api_service.dart';
import '../../services/websocket_service.dart';

class ServerConfigModal extends StatefulWidget {
  final VoidCallback? onReconnected;

  const ServerConfigModal({super.key, this.onReconnected});

  static Future<void> show(BuildContext context, {VoidCallback? onReconnected}) {
    return showDialog(
      context: context,
      builder: (ctx) => ServerConfigModal(onReconnected: onReconnected),
    );
  }

  @override
  State<ServerConfigModal> createState() => _ServerConfigModalState();
}

class _ServerConfigModalState extends State<ServerConfigModal> {
  late final TextEditingController _controller;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    String host = AppConfig.serverHost;
    if (host.endsWith(':4000')) {
      host = host.replaceAll(':4000', '');
    }
    _controller = TextEditingController(text: host);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final newHost = _controller.text.trim();
    if (newHost.isEmpty) return;

    setState(() => _isSaving = true);
    try {
      await AppConfig.setServerHost(newHost);
      ApiService().refreshBaseUrl();
      WebSocketService().connect();

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Server host set to ${AppConfig.serverHost}. Reconnected.')),
        );
        widget.onReconnected?.call();
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _handleResetDefault() async {
    setState(() => _isSaving = true);
    try {
      await AppConfig.resetToDefault();
      ApiService().refreshBaseUrl();
      WebSocketService().connect();

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reset to default DigiAds Cloud (test-api.digiads.space). Reconnected.')),
        );
        widget.onReconnected?.call();
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.dns, color: AppColors.primary, size: 18),
          SizedBox(width: 8),
          Text('Server Connection IP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Enter the backend server IP address on your local Wi-Fi network (e.g. 192.168.0.100 or 127.0.0.1):',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Server IP / Host',
              hintText: '192.168.0.100',
              helperText: 'Default port: 4000 (auto-applied for IPs)',
              prefixIcon: Icon(Icons.wifi, size: 16),
            ),
            onSubmitted: (_) => _handleSave(),
          ),
          if (!AppConfig.isCustomHostSet) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Row(
                children: [
                  Icon(Icons.cloud_done, size: 14, color: AppColors.primary),
                  SizedBox(width: 6),
                  Text(
                    'Currently using official DigiAds Cloud server',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
      actions: [
        if (AppConfig.isCustomHostSet)
          TextButton.icon(
            onPressed: _isSaving ? null : _handleResetDefault,
            icon: const Icon(Icons.cloud_sync, size: 14),
            label: const Text('RESET TO CLOUD', style: TextStyle(fontSize: 11)),
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
          ),
        TextButton(
          onPressed: _isSaving ? null : () => Navigator.pop(context),
          child: const Text('CANCEL'),
        ),
        ElevatedButton(
          onPressed: _isSaving ? null : _handleSave,
          child: _isSaving
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('SAVE & RECONNECT'),
        ),
      ],
    );
  }
}
