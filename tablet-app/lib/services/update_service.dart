import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

class UpdateService {
  static const MethodChannel _perfChannel =
      MethodChannel('com.digiads.tabletop/performance');

  static bool _isDownloading = false;

  /// Main OTA evaluation trigger. Called periodically or on WebSocket app_update event.
  static Future<void> checkForUpdate({
    required String serverHost,
    required bool isIdle,
    bool forceTestMode = false,
  }) async {
    if (_isDownloading) {
      debugPrint('[OTA] Download currently in progress. Skipping check.');
      return;
    }

    try {
      final currentInfo = await PackageInfo.fromPlatform();
      final currentVersionCode = int.tryParse(currentInfo.buildNumber) ?? 1;

      // Construct zero-hardcoded dynamic server URL using saved serverHost
      final url = Uri.parse('http://$serverHost:4200/api/v1/releases/latest?appType=TABLET_APP');
      final res = await http.get(url).timeout(const Duration(seconds: 10));

      if (res.statusCode != 200) {
        debugPrint('[OTA] No update available or server returned ${res.statusCode}');
        return;
      }

      final data = jsonDecode(res.body);
      if (data['success'] != true || data['release'] == null) return;

      final release = data['release'];
      final targetVersionCode = (release['versionCode'] as num).toInt();
      final expectedSha256 = (release['sha256'] as String).toLowerCase();
      final downloadPath = release['downloadPath'] as String;
      final isMandatory = release['isMandatory'] == true;

      debugPrint('[OTA] Server version code: $targetVersionCode | Current: $currentVersionCode');

      if (targetVersionCode <= currentVersionCode) {
        debugPrint('[OTA] Current version is up-to-date.');
        return;
      }

      // Check if we already have this pending APK saved locally
      final tempDir = await getApplicationDocumentsDirectory();
      final pendingApk = File('${tempDir.path}/pending_update.apk');

      bool isDownloadedAndVerified = false;
      if (await pendingApk.exists()) {
        final localSha = await _streamCalculateSha256(pendingApk);
        if (localSha == expectedSha256) {
          isDownloadedAndVerified = true;
          debugPrint('[OTA] Verified pending update APK already cached locally.');
        } else {
          await pendingApk.delete();
        }
      }

      if (!isDownloadedAndVerified) {
        _isDownloading = true;
        debugPrint('[OTA] Downloading update from $downloadPath...');
        final downloadUrl = Uri.parse('http://$serverHost:4200$downloadPath');
        final response = await http.get(downloadUrl);

        if (response.statusCode == 200) {
          await pendingApk.writeAsBytes(response.bodyBytes);
          final downloadedSha = await _streamCalculateSha256(pendingApk);
          if (downloadedSha != expectedSha256) {
            debugPrint('[OTA] SHA-256 mismatch! Expected $expectedSha256, got $downloadedSha');
            await pendingApk.delete();
            _isDownloading = false;
            return;
          }
          debugPrint('[OTA] APK downloaded and verified successfully.');
        } else {
          debugPrint('[OTA] Failed to download APK: ${response.statusCode}');
          _isDownloading = false;
          return;
        }
        _isDownloading = false;
      }

      // Evaluate 2-Phase Installation Guardrails
      await _evaluateAndInstall(
        pendingApk: pendingApk,
        isIdle: isIdle,
        isMandatory: isMandatory,
        forceTestMode: forceTestMode,
      );
    } catch (e) {
      _isDownloading = false;
      debugPrint('[OTA] Error during update check: $e');
    }
  }

  static Future<void> _evaluateAndInstall({
    required File pendingApk,
    required bool isIdle,
    required bool isMandatory,
    required bool forceTestMode,
  }) async {
    final now = DateTime.now();
    // Phase 2 Production Guardrail: 11:00 PM - 12:00 AM local device time + idle OR mandatory flag
    final is11pmWindow = now.hour == 23;

    if (forceTestMode || (isMandatory && isIdle) || (is11pmWindow && isIdle)) {
      debugPrint('[OTA] Conditions met (TestMode: $forceTestMode, Mandatory: $isMandatory, 11PM: $is11pmWindow, Idle: $isIdle). Installing silent update...');
      try {
        final success = await _perfChannel.invokeMethod<bool>('installApk', {
          'apkPath': pendingApk.path,
        });
        debugPrint('[OTA] installApk MethodChannel result: $success');
        // Instantly delete pending APK from sandbox so it never loops on subsequent boots
        if (await pendingApk.exists()) {
          await pendingApk.delete();
          debugPrint('[OTA] Cleaned up pending_update.apk sandbox file.');
        }
      } catch (e) {
        debugPrint('[OTA] Native installation call failed: $e');
      }
    } else {
      debugPrint('[OTA] Update cached locally. Waiting for 11:00 PM idle window. Current hour: ${now.hour}');
    }
  }

  /// Purge cached pending update APK when admin revokes a release
  static Future<void> purgePendingUpdate() async {
    try {
      final tempDir = await getApplicationDocumentsDirectory();
      final pendingApk = File('${tempDir.path}/pending_update.apk');
      if (await pendingApk.exists()) {
        await pendingApk.delete();
        debugPrint('[OTA] Revoked release signal received. Pending update APK purged successfully.');
      }
    } catch (e) {
      debugPrint('[OTA] Error purging pending update APK: $e');
    }
  }

  /// Streaming SHA256 computation to avoid loading entire file into memory and blocking UI thread
  static Future<String> _streamCalculateSha256(File file) async {
    final stream = file.openRead();
    final digest = await sha256.bind(stream).first;
    return digest.toString().toLowerCase();
  }
}
