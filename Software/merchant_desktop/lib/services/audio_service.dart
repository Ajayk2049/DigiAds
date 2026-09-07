import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;

  final AudioPlayer _player = AudioPlayer();

  AudioService._internal() {
    _player.setReleaseMode(ReleaseMode.stop);
  }

  Future<void> playOrderChime() async {
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/order_chime.mp3'));
    } catch (e) {
      if (kDebugMode) print('[AudioService] Asset sound fallback: $e');
      SystemSound.play(SystemSoundType.alert);
    }
  }

  Future<void> playWaiterAlert() async {
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/waiter_alert.mp3'));
    } catch (e) {
      if (kDebugMode) print('[AudioService] Waiter alert fallback: $e');
      SystemSound.play(SystemSoundType.alert);
    }
  }

  void dispose() {
    _player.dispose();
  }
}
