import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import 'constants.dart';
import 'generated/menu.pbgrpc.dart';

/// Downloads and caches food-menu images to local app storage so the
/// catalog can render fully offline.
///
/// On each menu fetch we:
///  - Look at every item's imageUrl and calculate its unique hash.
///  - Skip any image we already have on disk matching itemId + urlHash.
///  - If an item's photo was updated, purge the obsolete image file and download the new one.
///  - Store the file under `<docs>/menu_images/<itemId>_<hash>.img`.
///  - Notify UI listeners (ChangeNotifier) the instant a download finishes.
class MenuImageCache extends ChangeNotifier {
  final String serverHost;
  final int httpPort;
  final http.Client _client;
  Directory? _imagesDir;

  /// Synchronous in-memory lookup map for cached image files (cacheKey -> File)
  final Map<String, File> _fileCache = {};

  /// Per-item download progress (itemId -> 0..1) for the optional overlay.
  final Map<String, double> progress = {};

  /// Total downloads completed in the current batch.
  int _downloaded = 0;
  int get downloaded => _downloaded;
  int _total = 0;
  int get total => _total;

  /// True while a priming batch is in flight.
  bool get isPriming => _priming != null;
  Future<int>? _priming;

  MenuImageCache({required this.serverHost, this.httpPort = 4200})
      : _client = http.Client();

  /// Short 8-character MD5 hash of an imageUrl to detect photo updates.
  String _urlHash(String url) {
    if (url.isEmpty) return 'none';
    return md5.convert(utf8.encode(url.trim())).toString().substring(0, 8);
  }

  /// Combined cache key ensuring changes to imageUrl trigger cache invalidation.
  String _cacheKey(String itemId, [String? imageUrl]) {
    if (imageUrl == null || imageUrl.trim().isEmpty) {
      return itemId;
    }
    return '${itemId}_${_urlHash(imageUrl)}';
  }

  /// Synchronously retrieve a cached file without disk I/O async delay.
  File? localFileForSync(String itemId, [String? imageUrl]) {
    if (itemId.isEmpty) return null;
    if (imageUrl != null && imageUrl.isNotEmpty) {
      final key = _cacheKey(itemId, imageUrl);
      if (_fileCache.containsKey(key)) return _fileCache[key];
    }
    return _fileCache[itemId];
  }

  Future<Directory> _ensureDir() async {
    if (_imagesDir != null) return _imagesDir!;
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/menu_images');
    if (!await dir.exists()) await dir.create(recursive: true);
    _imagesDir = dir;

    // Scan existing disk cache and populate _fileCache map
    try {
      if (await dir.exists()) {
        final entities = await dir.list().toList();
        for (final entity in entities) {
          if (entity is File && entity.path.endsWith('.img')) {
            final fileName = entity.path.split(Platform.pathSeparator).last;
            final key = fileName.replaceAll('.img', '');
            if (await entity.length() > 0) {
              _fileCache[key] = entity;
              // If file is formatted like "itemId_hash", also map by itemId
              // as a fallback if hash isn't passed
              if (key.contains('_')) {
                final baseId = key.substring(0, key.lastIndexOf('_'));
                _fileCache.putIfAbsent(baseId, () => entity);
              } else {
                _fileCache[key] = entity;
              }
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[MENU_IMG] Error priming in-memory map: $e');
    }

    return dir;
  }

  /// Build the absolute http URL for a server-relative imageUrl.
  String _resolveUrl(String imageUrl) {
    if (imageUrl.isEmpty) return '';
    if (imageUrl.contains('/uploads/')) {
      final sub = imageUrl.split('/uploads/')[1];
      return buildServerUrl(serverHost, defaultPort: httpPort, path: '/uploads/$sub');
    }
    if (imageUrl.startsWith('http')) return imageUrl;
    return buildServerUrl(serverHost, defaultPort: httpPort, path: imageUrl);
  }

  /// Local on-disk file for a given item, or null if not yet cached.
  Future<File?> localFileFor(String itemId, [String? imageUrl]) async {
    if (itemId.isEmpty) return null;
    final syncMatch = localFileForSync(itemId, imageUrl);
    if (syncMatch != null) return syncMatch;

    final dir = await _ensureDir();
    final key = _cacheKey(itemId, imageUrl);
    final f = File('${dir.path}/$key.img');
    if (await f.exists() && await f.length() > 0) {
      _fileCache[key] = f;
      _fileCache[itemId] = f;
      return f;
    }

    // Fallback check for legacy non-hashed filename
    final legacyFile = File('${dir.path}/$itemId.img');
    if (await legacyFile.exists() && await legacyFile.length() > 0) {
      _fileCache[itemId] = legacyFile;
      return legacyFile;
    }

    return null;
  }

  /// Iterate the menu and download every missing or updated image.
  Future<int> primeFromMenu(List<MenuItem> items) {
    final future = _doPrime(items);
    _priming = future;
    return future;
  }

  Future<int> _doPrime(List<MenuItem> items) async {
    if (items.isEmpty) {
      _priming = null;
      return 0;
    }
    await _ensureDir();
    _downloaded = 0;
    _total = 0;
    progress.clear();

    final pending = <MenuItem>[];
    for (final item in items) {
      if (item.imageUrl.isEmpty) continue;
      final cached = await localFileFor(item.itemId, item.imageUrl);
      if (cached != null) continue;
      pending.add(item);
    }
    _total = pending.length;
    if (_total == 0) {
      _priming = null;
      return 0;
    }

    int newCount = 0;
    for (final item in pending) {
      final url = _resolveUrl(item.imageUrl);
      final ok = await _downloadOne(item.itemId, url, item.imageUrl);
      progress[item.itemId] = 1.0;
      if (ok) {
        newCount++;
        _downloaded++;
      }
    }
    _priming = null;
    return newCount;
  }

  Future<bool> _downloadOne(String itemId, String url, String rawImageUrl) async {
    if (url.isEmpty) return false;
    try {
      final dir = await _ensureDir();
      final key = _cacheKey(itemId, rawImageUrl);
      final target = File('${dir.path}/$key.img.tmp');
      if (await target.exists()) await target.delete();

      final resp = await _client.get(Uri.parse(url));
      if (resp.statusCode != 200 || resp.bodyBytes.isEmpty) return false;
      await target.writeAsBytes(resp.bodyBytes, flush: true);

      // Clean up any older cached images for this itemId (e.g. previous photo versions)
      try {
        final existingFiles = await dir.list().toList();
        for (final entity in existingFiles) {
          if (entity is File && entity.path.endsWith('.img')) {
            final fName = entity.path.split(Platform.pathSeparator).last;
            if (fName == '$itemId.img' || (fName.startsWith('${itemId}_') && fName != '$key.img')) {
              await entity.delete();
            }
          }
        }
      } catch (cleanErr) {
        debugPrint('[MENU_IMG] Error cleaning old cache files for $itemId: $cleanErr');
      }

      final finalFile = File('${dir.path}/$key.img');
      if (await finalFile.exists()) await finalFile.delete();
      await target.rename(finalFile.path);

      _fileCache[key] = finalFile;
      _fileCache[itemId] = finalFile;

      // Broadcast update so any mounted CachedMenuImage widgets update immediately
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[MENU_IMG] failed $itemId: $e');
      return false;
    }
  }

  /// Drop every cached image. Called by "Reset device" to free disk.
  Future<void> clear() async {
    _fileCache.clear();
    final dir = await _ensureDir();
    if (await dir.exists()) {
      await for (final entity in dir.list()) {
        try {
          await entity.delete(recursive: true);
        } catch (_) {}
      }
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }
}
