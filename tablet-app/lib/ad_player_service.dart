import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'constants.dart';

class AdPlayerState {
  final String currentSource;
  final List<String> playlist;
  final bool isTransitioning;
  final String transitionType; // 'same_campaign_top' or 'new_campaign_left'

  const AdPlayerState({
    this.currentSource = '',
    this.playlist = const [],
    this.isTransitioning = false,
    this.transitionType = 'new_campaign_left',
  });
}

typedef AdImpressionCallback = void Function(String adSource, int durationSeconds);

class AdPlayerService {
  final ValueNotifier<AdPlayerState> state = ValueNotifier(const AdPlayerState());
  final AdImpressionCallback? onImpression;

  AdPlayerService({this.onImpression}) {
    _channel.setMethodCallHandler(_handleMethodCall);
  }

  static const MethodChannel _channel = MethodChannel('com.digiads.tabletop/native_video');

  List<String> _playlist = [];
  List<String>? _pendingPlaylist;
  int _currentIndex = 0;
  String _previousSource = '';
  Timer? _staticTimer;
  Timer? _videoWatchdogTimer;
  bool _isPaused = false;
  bool _disposed = false;

  List<String> get activeFilePaths {
    if (_playlist.isEmpty) return [];
    final path = _currentSource;
    if (path.startsWith('static__') || path.startsWith('img__')) return [];
    return [path];
  }

  void startLoop(List<String> playlist) {
    if (_disposed) return;
    _isPaused = false;  // Starting a new loop always clears paused state
    _playlist = List.from(playlist);
    _pendingPlaylist = null;
    _currentIndex = 0;
    _playCurrent();
  }

  void updatePlaylist(List<String> newPlaylist) {
    if (_disposed) return;

    if (newPlaylist.isEmpty) {
      _stopAndClear();
      _playlist = [];
      _pendingPlaylist = null;
      _currentIndex = 0;
      _channel.invokeMethod('stopVideo');
      _emitState();
      return;
    }

    // If currently idle or no ads playing, apply immediately
    if (_playlist.isEmpty || _isPaused) {
      _playlist = List.from(newPlaylist);
      _pendingPlaylist = null;
      _currentIndex = 0;
      if (!_isPaused) _playCurrent();
      _emitState();
      return;
    }

    // If actively playing an ad, queue as pending so the active ad finishes gracefully
    _pendingPlaylist = List.from(newPlaylist);
    debugPrint('[AD_PLAYER] New playlist queued as pending (${newPlaylist.length} ads). Active ad will finish.');
  }

  void pause() {
    _isPaused = true;
    _stopAndClear();
    _channel.invokeMethod('pause');
    _emitState();
  }

  void resume() {
    if (_disposed) return;
    _isPaused = false;
    if (_pendingPlaylist != null) {
      _playlist = List.from(_pendingPlaylist!);
      _pendingPlaylist = null;
      _currentIndex = 0;
    }
    if (_playlist.isNotEmpty) {
      _playCurrent();
    }
  }

  void dispose() {
    _disposed = true;
    _staticTimer?.cancel();
    _videoWatchdogTimer?.cancel();
    state.dispose();
  }

  String get _currentSource =>
      _currentIndex >= 0 && _currentIndex < _playlist.length
          ? _playlist[_currentIndex]
          : '';

  void _playCurrent() {
    if (_disposed) return;
    final source = _currentSource;

    if (source.isEmpty) {
      _emitState();
      return;
    }

    if (source.startsWith('static__') || source.startsWith('img__')) {
      _staticTimer?.cancel();
      _videoWatchdogTimer?.cancel();
      _channel.invokeMethod('pause');
      onImpression?.call(source, kStaticAdDisplayDuration.inSeconds);
      _emitState();
      _staticTimer = Timer(kStaticAdDisplayDuration, () {
        if (!_disposed && !_isPaused) _advance();
      });
      return;
    }

    // Video playback
    _staticTimer?.cancel();
    _videoWatchdogTimer?.cancel();
    _emitState();
    if (!_isPaused) {
      _channel.invokeMethod('playVideo', {'path': source});
      // Watchdog timer: auto-advance only if hardware media decoder hangs completely
      _videoWatchdogTimer = Timer(const Duration(seconds: 35), () {
        if (!_disposed && !_isPaused) {
          debugPrint('[AD_PLAYER] Video watchdog timer expired (35s) for $source. Advancing.');
          _advance();
        }
      });
    }
  }

  void _advance() {
    if (_disposed || _isPaused) return;

    _staticTimer?.cancel();
    _videoWatchdogTimer?.cancel();

    // Check if a pending playlist was queued during playback of the finished ad
    if (_pendingPlaylist != null) {
      final pending = _pendingPlaylist!;
      _pendingPlaylist = null;
      _previousSource = _currentSource;
      _playlist = List.from(pending);

      if (_playlist.isEmpty) {
        _stopAndClear();
        _currentIndex = 0;
        _channel.invokeMethod('stopVideo');
        _emitState();
        return;
      }

      final prevIdx = _playlist.indexOf(_previousSource);
      if (prevIdx >= 0) {
        _currentIndex = (prevIdx + 1) % _playlist.length;
      } else {
        _currentIndex = 0;
      }
      _playCurrent();
      return;
    }

    if (_playlist.isEmpty) return;

    // Single-item repeat loop
    if (_playlist.length <= 1) {
      final source = _currentSource;
      if (source.startsWith('static__') || source.startsWith('img__')) {
        onImpression?.call(source, kStaticAdDisplayDuration.inSeconds);
        _staticTimer = Timer(kStaticAdDisplayDuration, () {
          if (!_disposed && !_isPaused) _advance();
        });
      } else {
        _playCurrent();
      }
      return;
    }

    _previousSource = _currentSource;
    _currentIndex = (_currentIndex + 1) % _playlist.length;
    _playCurrent();
  }

  void _stopAndClear() {
    _staticTimer?.cancel();
    _staticTimer = null;
    _videoWatchdogTimer?.cancel();
    _videoWatchdogTimer = null;
  }

  Future<void> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onVideoComplete':
        _videoWatchdogTimer?.cancel();
        final args = call.arguments as Map?;
        final dur = (args?['duration'] as num?)?.toInt() ?? 0;
        onImpression?.call(_currentSource, dur > 0 ? dur : 30);
        if (!_disposed && !_isPaused) _advance();
        break;
      case 'onVideoError':
        _videoWatchdogTimer?.cancel();
        debugPrint('[NATIVE_PLAYER] Playback error: ${call.arguments}');
        if (!_disposed && !_isPaused) _advance();
        break;
    }
  }

  String _extractCampaignId(String src) {
    if (src.isEmpty) return '';
    if (src.startsWith('static__') || src.startsWith('img__')) {
      final parts = src.split('__');
      if (parts.length >= 2) {
        final rawId = parts[1];
        if (rawId.startsWith('VENUE_AD_')) {
          final sub = rawId.substring('VENUE_AD_'.length).split('_').first;
          return 'VENUE_AD_$sub';
        }
        if (rawId.startsWith('PAD_')) {
          final sub = rawId.substring('PAD_'.length).split('_').first;
          return 'PAD_$sub';
        }
        if (rawId.startsWith('FALLBACK_')) {
          final sub = rawId.substring('FALLBACK_'.length).split('_').first;
          return 'FALLBACK_$sub';
        }
        return rawId.split('_').first;
      }
    }

    final filename = src.split('/').last.split('\\').last;
    if (filename.startsWith('ad_VENUE_AD_')) {
      final sub = filename.substring('ad_VENUE_AD_'.length).split('_').first;
      return 'VENUE_AD_$sub';
    }
    if (filename.startsWith('ad_PAD_')) {
      final sub = filename.substring('ad_PAD_'.length).split('_').first;
      return 'PAD_$sub';
    }
    if (filename.startsWith('ad_FALLBACK_')) {
      final sub = filename.substring('ad_FALLBACK_'.length).split('_').first;
      return 'FALLBACK_$sub';
    }
    if (filename.startsWith('ad_')) {
      final afterPrefix = filename.substring(3);
      final idx = afterPrefix.lastIndexOf('.');
      final withoutExt = idx != -1 ? afterPrefix.substring(0, idx) : afterPrefix;
      return withoutExt.split('_').first;
    }
    return filename;
  }

  void _emitState() {
    if (_disposed) return;
    final prevCamp = _extractCampaignId(_previousSource);
    final currCamp = _extractCampaignId(_currentSource);

    final transitionType = (prevCamp.isNotEmpty && currCamp.isNotEmpty && prevCamp == currCamp)
        ? 'same_campaign_top'
        : 'new_campaign_left';

    state.value = AdPlayerState(
      currentSource: _currentSource,
      playlist: List.unmodifiable(_playlist),
      isTransitioning: false,
      transitionType: transitionType,
    );
  }
}
