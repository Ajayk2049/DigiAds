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
    _controller = TextEditingController(text: AppConfig.serverHost);
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
          SnackBar(content: Text('Server host set to $newHost. Reconnected.')),
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
            'Enter the backend server IP and port on your local Wi-Fi network (e.g. 192.168.0.100:4200 or 127.0.0.1:4200):',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Server Host & Port',
              hintText: '192.168.0.100:4200',
              prefixIcon: Icon(Icons.wifi, size: 16),
            ),
            onSubmitted: (_) => _handleSave(),
          ),
        ],
      ),
      actions: [
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
