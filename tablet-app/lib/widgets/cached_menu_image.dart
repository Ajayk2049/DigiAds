import 'dart:io';

import 'package:flutter/material.dart';

import '../constants.dart';
import '../menu_image_cache.dart';

/// Image widget for a menu item that prefers the locally cached copy and
/// transparently falls back to the network URL when no local file exists.
/// Automatically updates to the local file the moment background download completes.
///
/// Usage:
/// ```dart
/// CachedMenuImage(
///   cache: imageCache,
///   itemId: item.itemId,
///   imageUrl: item.imageUrl,
///   serverHost: '10.0.2.2',
///   fit: BoxFit.cover,
///   fallback: const Icon(Icons.restaurant_menu),
/// )
/// ```
class CachedMenuImage extends StatefulWidget {
  final MenuImageCache cache;
  final String itemId;
  final String imageUrl;
  final String serverHost;
  final int httpPort;
  final BoxFit fit;
  final Widget? fallback;

  const CachedMenuImage({
    super.key,
    required this.cache,
    required this.itemId,
    required this.imageUrl,
    required this.serverHost,
    this.httpPort = 4200,
    this.fit = BoxFit.cover,
    this.fallback,
  });

  @override
  State<CachedMenuImage> createState() => _CachedMenuImageState();
}

class _CachedMenuImageState extends State<CachedMenuImage> {
  File? _local;
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    widget.cache.addListener(_onCacheChanged);
    _checkCache();
  }

  @override
  void didUpdateWidget(covariant CachedMenuImage old) {
    super.didUpdateWidget(old);
    if (old.cache != widget.cache) {
      old.cache.removeListener(_onCacheChanged);
      widget.cache.addListener(_onCacheChanged);
    }
    if (old.itemId != widget.itemId || old.imageUrl != widget.imageUrl || old.serverHost != widget.serverHost) {
      // If photo URL updated, evict old network image so Flutter doesn't cache stale bitmap
      if (old.imageUrl.isNotEmpty && old.imageUrl != widget.imageUrl) {
        try {
          final oldUrl = _buildNetworkUrl(old.serverHost, old.httpPort, old.imageUrl);
          PaintingBinding.instance.imageCache.evict(NetworkImage(oldUrl));
        } catch (_) {}
      }
      _checkCache();
    }
  }

  @override
  void dispose() {
    widget.cache.removeListener(_onCacheChanged);
    super.dispose();
  }

  void _onCacheChanged() {
    if (!mounted) return;
    _checkCache();
  }

  void _checkCache() {
    // 1. Try synchronous in-memory resolution first (Frame 1, zero flash!)
    final syncFile = widget.cache.localFileForSync(widget.itemId, widget.imageUrl);
    if (syncFile != null) {
      if (_local?.path != syncFile.path || !_checked) {
        setState(() {
          _local = syncFile;
          _checked = true;
        });
      }
      return;
    }

    // 2. If no valid sync cache for this specific imageUrl, show network fallback immediately!
    if (_local != null || !_checked) {
      setState(() {
        _local = null;
        _checked = true;
      });
    }
    _loadLocal();
  }

  Future<void> _loadLocal() async {
    if (widget.imageUrl.isEmpty) {
      if (mounted) setState(() => _checked = true);
      return;
    }
    final f = await widget.cache.localFileFor(widget.itemId, widget.imageUrl);
    if (!mounted) return;
    if (_local?.path != f?.path) {
      setState(() {
        _local = f;
        _checked = true;
      });
    }
  }

  static String _buildNetworkUrl(String serverHost, int httpPort, String imageUrl) {
    final u = imageUrl.trim();
    if (u.isEmpty) return '';
    if (u.contains('/uploads/')) {
      final sub = u.split('/uploads/')[1];
      return buildServerUrl(serverHost, defaultPort: httpPort, path: '/uploads/$sub');
    }
    if (u.startsWith('http')) return u;
    return buildServerUrl(serverHost, defaultPort: httpPort, path: u);
  }

  String get _networkUrl => _buildNetworkUrl(widget.serverHost, widget.httpPort, widget.imageUrl);

  @override
  Widget build(BuildContext context) {
    if (!_checked) {
      // Render the fallback while we look up the cache so the card has
      // a stable layout from the first frame.
      return widget.fallback ?? const SizedBox.shrink();
    }
    if (_local != null) {
      return Image.file(
        _local!,
        key: ValueKey(_local!.path),
        fit: widget.fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _network,
      );
    }
    return _network;
  }

  Widget get _network {
    final url = _networkUrl;
    if (url.isEmpty) return widget.fallback ?? const SizedBox.shrink();
    return Image.network(
      url,
      key: ValueKey(url),
      fit: widget.fit,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => widget.fallback ?? const SizedBox.shrink(),
    );
  }
}

