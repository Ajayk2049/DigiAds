import 'dart:async';
import 'package:flutter/material.dart';
import '../services/websocket_service.dart';
import 'modals/server_config_modal.dart';

/// Persistent orange banner shown directly below navigation bar when server is offline
class OfflineBanner extends StatelessWidget {
  final VoidCallback? onConfigureServer;

  const OfflineBanner({super.key, this.onConfigureServer});

  @override
  Widget build(BuildContext context) {
    final ws = WebSocketService();
    return ValueListenableBuilder<bool>(
      valueListenable: ws.connectionNotifier,
      builder: (context, isOnline, _) {
        if (isOnline) return const SizedBox.shrink();

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.orange.shade800,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.15),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_rounded, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              const Text(
                'Server Offline — Reconnecting automatically...',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 12),
              InkWell(
                onTap: () {
                  if (onConfigureServer != null) {
                    onConfigureServer!();
                  } else {
                    ServerConfigModal.show(context);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'Configure IP',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Floating green pill notification that animates in when server connection is restored
class BackOnlineBanner extends StatefulWidget {
  final double top;
  final double right;

  const BackOnlineBanner({
    super.key,
    this.top = 70,
    this.right = 24,
  });

  @override
  State<BackOnlineBanner> createState() => _BackOnlineBannerState();
}

class _BackOnlineBannerState extends State<BackOnlineBanner> {
  final WebSocketService _ws = WebSocketService();
  bool _wasOffline = false;
  bool _showBackOnline = false;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _ws.connectionNotifier.addListener(_onConnectionChanged);
    if (!_ws.isConnected) {
      _wasOffline = true;
    }
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _ws.connectionNotifier.removeListener(_onConnectionChanged);
    super.dispose();
  }

  void _onConnectionChanged() {
    final isOnline = _ws.isConnected;
    if (isOnline && _wasOffline) {
      setState(() {
        _wasOffline = false;
        _showBackOnline = true;
      });
      _dismissTimer?.cancel();
      _dismissTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _showBackOnline = false);
        }
      });
    } else if (!isOnline) {
      setState(() {
        _wasOffline = true;
        _showBackOnline = false;
      });
      _dismissTimer?.cancel();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_showBackOnline) return const SizedBox.shrink();

    return Positioned(
      top: widget.top,
      right: widget.right,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            _dismissTimer?.cancel();
            setState(() => _showBackOnline = false);
          },
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.shade600,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_done_rounded, color: Colors.white, size: 16),
                SizedBox(width: 6),
                Text(
                  'Back Online',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
