import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:grpc/grpc.dart';
import 'package:video_player/video_player.dart';
import 'package:permission_handler/permission_handler.dart';

import 'generated/device.pbgrpc.dart';

// ---------------------------------------------------------------------------
// App State Machine & Dynamic Server URL Builder
// ---------------------------------------------------------------------------
enum PlayerState { booting, waiting, playing }

String buildServerUrl(String serverHost, {int defaultPort = 4200, String path = ''}) {
  String host = serverHost.trim();
  if (host.isEmpty) return '';

  bool isHttps = host.startsWith('https://');
  host = host.replaceFirst(RegExp(r'^https?:\/\/'), '').replaceFirst(RegExp(r'\/.*$'), '');

  final cleanPath = path.isEmpty ? '' : (path.startsWith('/') ? path : '/$path');

  if (host.contains(':')) {
    final scheme = isHttps ? 'https' : 'http';
    return '$scheme://$host$cleanPath';
  }

  if (host.contains('.') && !RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(host)) {
    if (defaultPort == 443 || isHttps) {
      return 'https://$host$cleanPath';
    } else if (defaultPort == 80) {
      return 'http://$host$cleanPath';
    }
  }

  final scheme = isHttps ? 'https' : 'http';
  return '$scheme://$host:$defaultPort$cleanPath';
}

String cleanGrpcHost(String serverHost) {
  String host = serverHost.trim();
  if (host.isEmpty) return '127.0.0.1';
  host = host.replaceFirst(RegExp(r'^(https?|wss?):\/\/'), '').replaceFirst(RegExp(r'\/.*$'), '');
  if (host.contains(':')) {
    host = host.split(':').first;
  }
  return host;
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token') ?? '';
  final serverHost = prefs.getString('serverHost') ?? '';
  final deviceId = prefs.getString('deviceId') ?? '';
  final hostApplicationId = prefs.getString('hostApplicationId') ?? '';

  runApp(LandscapeAdScreenApp(
    initialActivated: token.isNotEmpty,
    initialServerHost: serverHost,
    initialDeviceId: deviceId,
    initialToken: token,
    initialHostApplicationId: hostApplicationId,
  ));
}

class LandscapeAdScreenApp extends StatelessWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;

  const LandscapeAdScreenApp({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DigiAds Screen',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.indigo,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF030712),
      ),
      home: MainDeviceRouter(
        initialActivated: initialActivated,
        initialServerHost: initialServerHost,
        initialDeviceId: initialDeviceId,
        initialToken: initialToken,
        initialHostApplicationId: initialHostApplicationId,
      ),
    );
  }
}

class MainDeviceRouter extends StatefulWidget {
  final bool initialActivated;
  final String initialServerHost;
  final String initialDeviceId;
  final String initialToken;
  final String initialHostApplicationId;

  const MainDeviceRouter({
    super.key,
    required this.initialActivated,
    required this.initialServerHost,
    required this.initialDeviceId,
    required this.initialToken,
    required this.initialHostApplicationId,
  });

  @override
  State<MainDeviceRouter> createState() => _MainDeviceRouterState();
}

class _MainDeviceRouterState extends State<MainDeviceRouter> {
  bool _isActivated = false;
  String _serverHost = '';
  String _deviceId = '';
  String _token = '';
  String _hostApplicationId = '';

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _isActivated = widget.initialActivated;
    _serverHost = widget.initialServerHost;
    _deviceId = widget.initialDeviceId;
    _token = widget.initialToken;
    _hostApplicationId = widget.initialHostApplicationId;
  }

  void _onActivate(String serverHost, String deviceId, String token, String hostApplicationId) {
    setState(() {
      _serverHost = serverHost;
      _deviceId = deviceId;
      _token = token;
      _hostApplicationId = hostApplicationId;
      _isActivated = true;
    });
  }

  void _onReset() async {
    final prefs = await SharedPreferences.getInstance();
    final hardwareId = prefs.getString('hardware_id');
    await prefs.clear();
    if (hardwareId != null && hardwareId.isNotEmpty) {
      await prefs.setString('hardware_id', hardwareId);
    }

    // Wipe cached ads from storage
    try {
      final adsDir = Directory('/storage/emulated/0/Download/DigiAds/ScreenAds');
      if (await adsDir.exists()) {
        await adsDir.delete(recursive: true);
      }
    } catch (e) {
      debugPrint('[RESET] Failed to delete screen ads dir: $e');
    }

    setState(() {
      _isActivated = false;
      _serverHost = '';
      _deviceId = '';
      _token = '';
      _hostApplicationId = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!_isActivated) {
      return ScreenSetupScreen(onActivate: _onActivate);
    }
    return AdPlayerScreen(
      serverHost: _serverHost,
      deviceId: _deviceId,
      token: _token,
      hostApplicationId: _hostApplicationId,
      onReset: _onReset,
      onReconfigure: () {
        setState(() {
          _isActivated = false;
        });
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Setup Screen — Zero hardcoding, clean input fields, reconfigure support
// ---------------------------------------------------------------------------
class ScreenSetupScreen extends StatefulWidget {
  final Function(String, String, String, String) onActivate;
  final String? initialServerHost;
  final String? initialDeviceId;
  final VoidCallback? onCancel;

  const ScreenSetupScreen({
    super.key,
    required this.onActivate,
    this.initialServerHost,
    this.initialDeviceId,
    this.onCancel,
  });

  @override
  State<ScreenSetupScreen> createState() => _ScreenSetupScreenState();
}

class _ScreenSetupScreenState extends State<ScreenSetupScreen> {
  late final TextEditingController _serverHostController;
  late final TextEditingController _serverPortController;
  late final TextEditingController _deviceIdController;
  String _error = '';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    String rawHost = widget.initialServerHost ?? '';
    String defaultPort = '4000';
    if (rawHost.contains(':')) {
      final parts = rawHost.split(':');
      rawHost = parts[0];
      if (parts.length > 1 && parts[1].isNotEmpty) {
        defaultPort = parts[1];
      }
    }
    _serverHostController = TextEditingController(text: rawHost);
    _serverPortController = TextEditingController(text: defaultPort);
    _deviceIdController = TextEditingController(text: widget.initialDeviceId ?? '');
  }

  @override
  void dispose() {
    _serverHostController.dispose();
    _serverPortController.dispose();
    _deviceIdController.dispose();
    super.dispose();
  }

  void _submit() async {
    setState(() {
      _error = '';
      _loading = true;
    });

    final host = _serverHostController.text.trim();
    final portStr = _serverPortController.text.trim();
    final port = int.tryParse(portStr) ?? 4000;
    final serverHost = host.contains(':') ? host : (port == 80 || port == 443 ? host : '$host:$port');
    final deviceId = _deviceIdController.text.trim();

    if (host.isEmpty || deviceId.isEmpty) {
      setState(() {
        _error = 'Both Server Host / IP and Device ID are required.';
        _loading = false;
      });
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      String? hardwareId = prefs.getString('hardware_id');
      if (hardwareId == null) {
        hardwareId = 'hw_scr_${DateTime.now().millisecondsSinceEpoch}_$deviceId';
        await prefs.setString('hardware_id', hardwareId);
      }

      final url = Uri.parse(buildServerUrl(serverHost, defaultPort: port, path: '/api/v1/auth/device/activate'));
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceId': deviceId,
          'hardwareId': hardwareId,
          'deviceType': 'screen',
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['data']['token'];
        final hostApplicationId = data['data']['hostApplicationId'];

        await prefs.setString('serverHost', serverHost);
        await prefs.setString('deviceId', deviceId);
        await prefs.setString('token', token);
        await prefs.setString('hostApplicationId', hostApplicationId);

        widget.onActivate(serverHost, deviceId, token, hostApplicationId);
      } else {
        setState(() {
          _error = data['message'] ?? 'Activation failed: Check credentials.';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Connection failed: Ensure server is running and reachable at $serverHost';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            width: 480,
            padding: const EdgeInsets.all(36),
            decoration: BoxDecoration(
              color: const Color(0xFF111827),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white12),
              boxShadow: const [
                BoxShadow(color: Colors.black54, blurRadius: 30, offset: Offset(0, 10)),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.tv_rounded, size: 64, color: Colors.indigoAccent),
                const SizedBox(height: 16),
                const Text(
                  "DigiAds Screen Setup",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Connect this wall display screen to your DigiAds network.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 24),
                if (_error.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error,
                            style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 7,
                      child: TextField(
                        controller: _serverHostController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: "Server Host / IP Address",
                          hintText: "e.g. 192.168.1.100 or api.digiads.space",
                          hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                          prefixIcon: const Icon(Icons.dns_rounded, color: Colors.indigoAccent),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 3,
                      child: TextField(
                        controller: _serverPortController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: "Port",
                          hintText: "4000",
                          hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                          prefixIcon: const Icon(Icons.numbers_rounded, color: Colors.indigoAccent),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _deviceIdController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: "Device ID",
                    hintText: "e.g. DEV_SCR_A1B2",
                    hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    prefixIcon: const Icon(Icons.tv_rounded, color: Colors.indigoAccent),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    if (widget.onCancel != null) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _loading ? null : widget.onCancel,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: const BorderSide(color: Colors.white24),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Text("Cancel", style: TextStyle(color: Colors.white70)),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.indigoAccent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 4,
                        ),
                        child: _loading
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text("Authorize & Bind Screen", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AD PLAYER SCREEN — Robust Offline-First 24/7 Playback Engine
// ---------------------------------------------------------------------------
class AdPlayerScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final VoidCallback onReset;
  final VoidCallback onReconfigure;

  const AdPlayerScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.onReset,
    required this.onReconfigure,
  });

  @override
  State<AdPlayerScreen> createState() => _AdPlayerScreenState();
}

class _AdPlayerScreenState extends State<AdPlayerScreen> with WidgetsBindingObserver {
  // gRPC
  late ClientChannel _channel;
  late DeviceServiceClient _deviceClient;
  late CallOptions _callOptions;
  Timer? _heartbeatTimer;

  // ---------- State Machine ----------
  PlayerState _playerState = PlayerState.booting;
  String _statusMessage = 'Initializing...';

  // ---------- Playlist ----------
  List<String> _localPlaylist = []; // file paths or 'img__...' or 'static__...' strings
  int _currentAdIndex = 0;

  // ---------- Single Video Controller & Timers (Low-RAM 60 FPS) ----------
  VideoPlayerController? _videoController;
  Timer? _staticAdTimer;
  Timer? _videoWatchdogTimer;

  // ---------- Sync ----------
  bool _isSyncing = false;
  int _syncRetryCount = 0;
  Timer? _syncTimer;

  // ---------- Storage directory ----------
  late String _adsDirectory;

  // ---------- Ad scheduling & frequency ----------
  List<String> _masterAdPlaylist = [];
  Map<String, int> _adFrequencies = {};
  Map<String, int> _adDurations = {};
  Map<String, int> _lastPlayedTimes = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    // Limit memory image cache to 30MB for 1GB RAM budget Android 10 hardware
    PaintingBinding.instance.imageCache.maximumSizeBytes = 30 * 1024 * 1024;
    _boot();
  }

  // =====================================================================
  // BOOT SEQUENCE
  // =====================================================================
  void _boot() async {
    print('[BOOT] Starting offline-first boot sequence...');

    // 1. Ensure storage permissions and directory
    await _ensureStorageReady();

    // 2. Load cached playlist and start playback immediately if available
    await _loadCachedPlaylist();

    // 3. Init gRPC for heartbeat / telemetry
    _initGrpc();

    // 4. Start gRPC heartbeat loop
    _startHeartbeat();

    // 5. Initial sync with server in background
    _attemptSync();
  }

  Future<void> _ensureStorageReady() async {
    if (Platform.isAndroid) {
      final manageStatus = await Permission.manageExternalStorage.status;
      if (!manageStatus.isGranted) {
        await Permission.manageExternalStorage.request();
      }
      final storageStatus = await Permission.storage.status;
      if (!storageStatus.isGranted) {
        await Permission.storage.request();
      }
    }

    final baseDir = Directory('/storage/emulated/0/Download/DigiAds/ScreenAds');
    if (!baseDir.existsSync()) {
      baseDir.createSync(recursive: true);
    }
    _adsDirectory = baseDir.path;
    print('[BOOT] Ads directory ready: $_adsDirectory');
  }

  Future<void> _loadCachedPlaylist() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getStringList('local_playlist');

    if (cached != null && cached.isNotEmpty) {
      final valid = cached.where((path) {
        if (path.startsWith('static__') || path.startsWith('img__')) return true;
        final file = File(path);
        return file.existsSync() && file.lengthSync() > 1000;
      }).toList();

      if (valid.isNotEmpty) {
        print('[BOOT] Found ${valid.length} valid cached ads. Starting playback immediately.');
        _masterAdPlaylist = List.from(valid);
        await _loadFrequenciesAndTimestamps();
        final eligible = _getEligiblePlaylist(_masterAdPlaylist);
        setState(() {
          _localPlaylist = eligible;
          _playerState = PlayerState.playing;
          _statusMessage = '';
        });
        _startPlaybackLoop();
        return;
      }
    }

    // No cached playlist in prefs — scan filesystem for leftover video files
    final dir = Directory(_adsDirectory);
    if (dir.existsSync()) {
      final files = dir.listSync().whereType<File>().where((f) {
        return (f.path.endsWith('.mp4') || f.path.endsWith('.webm')) && f.lengthSync() > 1000;
      }).toList();

      if (files.isNotEmpty) {
        final recovered = files.map((f) => f.path).toList();
        print('[BOOT] Recovered ${recovered.length} ads from filesystem. Starting playback.');
        _masterAdPlaylist = List.from(recovered);
        await _loadFrequenciesAndTimestamps();
        final eligible = _getEligiblePlaylist(_masterAdPlaylist);
        setState(() {
          _localPlaylist = eligible;
          _playerState = PlayerState.playing;
          _statusMessage = '';
        });
        _startPlaybackLoop();
        return;
      }
    }

    // No cached content at all — enter waiting state
    print('[BOOT] No cached ads found. Entering waiting state.');
    setState(() {
      _playerState = PlayerState.waiting;
      _statusMessage = 'Connecting to server...';
    });
  }

  // =====================================================================
  // gRPC SETUP & HEARTBEAT
  // =====================================================================
  void _initGrpc() {
    _channel = ClientChannel(
      cleanGrpcHost(widget.serverHost),
      port: 4201,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );

    _deviceClient = DeviceServiceClient(_channel);
    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: const Duration(seconds: 10),
    );
  }

  void _startHeartbeat() async {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      try {
        final req = HeartbeatRequest()
          ..deviceId = widget.deviceId;

        final res = await _deviceClient.sendHeartbeat(req, options: _callOptions);

        if (res.hasCommand()) {
          final cmd = res.command.toLowerCase();
          if (cmd == 'refresh' || cmd == 'sync' || cmd == 'reload_ads') {
            print('[HEARTBEAT] Server requested ad refresh: $cmd');
            _attemptSync();
          } else if (cmd == 'reboot') {
            print('[HEARTBEAT] Server requested reboot.');
          }
        }
      } catch (e) {
        print('[HEARTBEAT] Heartbeat failed: $e');
      }
    });
  }

  // =====================================================================
  // SERVER SYNC — Backoff retry engine
  // =====================================================================
  Future<void> _attemptSync() async {
    if (_isSyncing) return;

    print('[SYNC] Attempting server sync (retry #$_syncRetryCount)...');

    try {
      final url = Uri.parse(buildServerUrl(widget.serverHost, path: '/api/v1/auth/device/ads'));
      final response = await http.get(
        url,
        headers: {'Authorization': 'Bearer ${widget.token}'},
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final List serverAds = data['data'] ?? [];
        _syncRetryCount = 0;

        print('[SYNC] Server reachable. Got ${serverAds.length} ads.');

        if (serverAds.isNotEmpty) {
          await _syncAndDownloadAds(serverAds);
        } else {
          print('[SYNC] Server returned empty ads list.');
        }

        // Schedule periodic re-sync every 5 minutes
        _schedulePeriodicSync();
        return;
      }
    } catch (e) {
      print('[SYNC] Failed to reach server: $e');
    }

    // Sync failed — schedule retry with backoff
    _scheduleRetrySync();
  }

  void _scheduleRetrySync() {
    _syncTimer?.cancel();
    _syncRetryCount++;
    final delay = const Duration(seconds: 10);

    print('[SYNC] Scheduling retry in ${delay.inSeconds}s (attempt #$_syncRetryCount)');

    if (mounted && _playerState == PlayerState.waiting) {
      setState(() {
        _statusMessage = 'Server unreachable. Retrying in ${delay.inSeconds}s...';
      });
    }

    _syncTimer = Timer(delay, () {
      if (mounted) _attemptSync();
    });
  }

  void _schedulePeriodicSync() {
    _syncTimer?.cancel();
    _syncRetryCount = 0;

    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      if (mounted) _attemptSync();
    });
  }

  // =====================================================================
  // DOWNLOAD ENGINE — Per-file silent background download
  // =====================================================================
  Future<void> _syncAndDownloadAds(List<dynamic> serverAds) async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // Save frequencies and durations mapping to cache
      final prefs = await SharedPreferences.getInstance();
      final Map<String, int> frequencies = {};
      final Map<String, int> durations = {};
      for (final ad in serverAds) {
        final bookingId = ad['bookingId'] as String? ?? 'unknown';
        final freqMin = ad['frequencyMinutes'] as int? ?? 0;
        final durSec = ad['durationSeconds'] as int? ?? 10;
        frequencies[bookingId] = freqMin;
        durations[bookingId] = durSec;
      }
      await prefs.setString('ad_frequencies_map', jsonEncode(frequencies));
      await prefs.setString('ad_durations_map', jsonEncode(durations));

      final List<String> newLocalPaths = [];
      final List<String> activeFileNames = [];

      for (int i = 0; i < serverAds.length; i++) {
        final ad = serverAds[i];
        final mediaUrl = ad['mediaUrl'] as String? ?? '';
        final bookingId = ad['bookingId'] as String? ?? 'unknown';

        if (mediaUrl.isNotEmpty &&
            (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm'))) {
          // Video ad — download as ad_[bookingId].[ext]
          final absoluteUrl = mediaUrl.startsWith('http')
              ? mediaUrl
              : buildServerUrl(widget.serverHost, path: mediaUrl);

          final fileExt = mediaUrl.split('.').last;
          final fileName = 'ad_$bookingId.$fileExt';
          final localFile = File('$_adsDirectory/$fileName');
          activeFileNames.add(fileName);

          // Download if file doesn't exist or is too small (corrupt)
          if (!localFile.existsSync() || localFile.lengthSync() < 1000) {
            final success = await _downloadWithRetry(absoluteUrl, localFile, i + 1, serverAds.length);
            if (!success) {
              print('[DOWNLOAD] Skipping ad $bookingId after failed download.');
              continue;
            }
          } else {
            print('[DOWNLOAD] Ad $bookingId already cached: ${localFile.path}');
          }

          newLocalPaths.add(localFile.path);
        } else if (mediaUrl.isNotEmpty &&
            (mediaUrl.endsWith('.webp') || mediaUrl.endsWith('.jpg') || mediaUrl.endsWith('.jpeg') || mediaUrl.endsWith('.png'))) {
          // Image ad — download and register as img__ entry
          final absoluteUrl = mediaUrl.startsWith('http')
              ? mediaUrl
              : buildServerUrl(widget.serverHost, path: mediaUrl);

          final fileExt = mediaUrl.split('.').last;
          final fileName = 'img_$bookingId.$fileExt';
          final localFile = File('$_adsDirectory/$fileName');
          activeFileNames.add(fileName);

          if (!localFile.existsSync() || localFile.lengthSync() < 500) {
            final success = await _downloadWithRetry(absoluteUrl, localFile, i + 1, serverAds.length);
            if (!success) {
              print('[DOWNLOAD] Skipping image ad $bookingId after failed download.');
              continue;
            }
          } else {
            print('[DOWNLOAD] Image ad $bookingId already cached: ${localFile.path}');
          }

          // Register as img__[localPath] so the player knows it is an image
          newLocalPaths.add('img__${localFile.path}');
        } else {
          // Non-video/image ad (static text card)
          newLocalPaths.add(
            'static__${ad['bookingId']}__${ad['title'] ?? ''}__${ad['subtitle'] ?? ad['description'] ?? ''}',
          );
        }
      }

      // Update playlist, handle playback transition and file cleanup safely
      await _updatePlaylist(newLocalPaths, activeFileNames);
    } catch (e) {
      print('[SYNC] Download error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _updatePlaylist(List<String> newPlaylist, List<String> activeFileNames) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('local_playlist', newPlaylist);
    await prefs.setString('last_sync_time', DateTime.now().toIso8601String());

    _masterAdPlaylist = List.from(newPlaylist);
    await _loadFrequenciesAndTimestamps();
    final eligible = _getEligiblePlaylist(_masterAdPlaylist);

    if (!mounted) return;

    if (eligible.isEmpty) {
      print('[PLAYER] New playlist is empty. Stopping playback.');
      _staticAdTimer?.cancel();
      _videoWatchdogTimer?.cancel();
      if (_videoController != null) {
        final old = _videoController;
        _videoController = null;
        old?.removeListener(_videoListener);
        old?.dispose();
      }
      setState(() {
        _localPlaylist = [];
        _playerState = PlayerState.waiting;
        _statusMessage = 'No ads available. Waiting for content...';
      });
      _cleanupOldFiles(activeFileNames);
      return;
    }

    final isPlaying = _playerState == PlayerState.playing;

    if (!isPlaying) {
      // Not playing yet (waiting or booting) -> start loop
      setState(() {
        _localPlaylist = eligible;
        _playerState = PlayerState.playing;
        _statusMessage = '';
      });
      _cleanupOldFiles(activeFileNames);
      _startPlaybackLoop();
      return;
    }

    // Currently playing -> preserve active ad playback without interrupting active stream
    final currentPlayingSource = _localPlaylist.isNotEmpty && _currentAdIndex < _localPlaylist.length
        ? _localPlaylist[_currentAdIndex]
        : '';

    final currentPlayingIndexInNew = eligible.indexOf(currentPlayingSource);

    if (currentPlayingIndexInNew != -1) {
      print('[PLAYER] Playlist updated. Currently playing ad is still valid.');
      setState(() {
        _localPlaylist = eligible;
        _currentAdIndex = currentPlayingIndexInNew;
      });
      _cleanupOldFiles(activeFileNames);
    } else {
      print('[PLAYER] Playlist updated. Active ad will finish before transitioning to new playlist.');
      setState(() {
        _localPlaylist = eligible;
      });
      _cleanupOldFiles(activeFileNames);
    }
  }

  Future<bool> _downloadWithRetry(String url, File targetFile, int current, int total) async {
    const maxRetries = 3;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        print('[DOWNLOAD] Attempt $attempt: $url');
        final response = await http.get(Uri.parse(url)).timeout(const Duration(minutes: 5));

        if (response.statusCode == 200 && response.bodyBytes.length > 1000) {
          await targetFile.writeAsBytes(response.bodyBytes);
          print('[DOWNLOAD] Success: ${targetFile.path}');
          return true;
        }
      } catch (e) {
        print('[DOWNLOAD] Attempt $attempt failed: $e');
      }

      if (attempt < maxRetries) {
        await Future.delayed(Duration(seconds: 2 * attempt));
      }
    }

    return false;
  }

  void _cleanupOldFiles(List<String> activeFileNames) {
    try {
      final dir = Directory(_adsDirectory);
      if (!dir.existsSync()) return;

      for (var entity in dir.listSync()) {
        if (entity is File) {
          final name = entity.path.split('/').last.split('\\').last;
          if ((name.startsWith('ad_') || name.startsWith('img_')) && !activeFileNames.contains(name)) {
            print('[CLEANUP] Removing old ad file: ${entity.path}');
            entity.deleteSync();
          }
        }
      }
    } catch (e) {
      print('[CLEANUP] Error: $e');
    }
  }

  // =====================================================================
  // PLAYBACK ENGINE — Single Controller 60 FPS Native Texture + Pure Black Letterboxing
  // =====================================================================
  void _startPlaybackLoop() {
    if (_localPlaylist.isEmpty) return;

    print('[PLAYER] Starting playback loop with ${_localPlaylist.length} ads.');
    _currentAdIndex = 0;
    _playCurrentAd();
  }

  void _playCurrentAd() async {
    _staticAdTimer?.cancel();
    _videoWatchdogTimer?.cancel();

    // Clean up previous video controller immediately to free VPU decoder on 1GB RAM
    if (_videoController != null) {
      final old = _videoController;
      _videoController = null;
      old?.removeListener(_videoListener);
      old?.dispose();
    }

    if (_localPlaylist.isEmpty) {
      print('[PLAYER] Playlist is empty. Going to waiting state.');
      setState(() {
        _playerState = PlayerState.waiting;
        _statusMessage = 'No ads available. Waiting for content...';
      });
      return;
    }

    _currentAdIndex = _currentAdIndex % _localPlaylist.length;
    final adSource = _localPlaylist[_currentAdIndex];

    print('[PLAYER] Playing ad index $_currentAdIndex: $adSource');

    if (adSource.startsWith('static__')) {
      // Static text ad card — show for 8 seconds
      if (mounted) setState(() {});
      _staticAdTimer = Timer(const Duration(seconds: 8), () {
        _trackImpression(adSource, 8);
        _advanceToNextAd();
      });
    } else if (adSource.startsWith('img__')) {
      // Image ad — show for designated duration
      final bookingId = _getBookingId(adSource);
      final durationSec = _adDurations[bookingId] ?? 10;
      print('[PLAYER] Showing image ad: $adSource for ${durationSec}s');
      if (_localPlaylist.length <= 1) {
        _staticAdTimer = Timer(Duration(seconds: durationSec), () {
          _trackImpression(adSource, durationSec);
          _advanceToNextAd();
        });
        return;
      }
      if (mounted) setState(() {});
      _staticAdTimer = Timer(Duration(seconds: durationSec), () {
        _trackImpression(adSource, durationSec);
        _advanceToNextAd();
      });
    } else {
      // Native Video ad — 60 FPS Hardware Decoded Texture
      final file = File(adSource);
      if (!file.existsSync() || file.lengthSync() < 1000) {
        print('[PLAYER] File missing or corrupt: $adSource. Skipping.');
        _advanceToNextAd();
        return;
      }

      try {
        final controller = VideoPlayerController.file(file);
        await controller.initialize();
        await controller.setVolume(0.0);
        if (!mounted) {
          controller.dispose();
          return;
        }

        _videoController = controller;
        controller.addListener(_videoListener);
        await controller.play();

        if (mounted) setState(() {});

        // Safety watchdog: advance if video completes or stalls
        final dur = controller.value.duration;
        final timeout = dur > Duration.zero ? dur + const Duration(seconds: 4) : const Duration(seconds: 35);
        _videoWatchdogTimer = Timer(timeout, () {
          print('[WATCHDOG] Video timer expired for $adSource');
          _onVideoComplete();
        });
      } catch (e) {
        print('[PLAYER] Controller init error for $adSource: $e');
        _advanceToNextAd();
      }
    }
  }

  void _videoListener() {
    final controller = _videoController;
    if (controller == null || !mounted) return;
    final pos = controller.value.position;
    final dur = controller.value.duration;
    if (dur > Duration.zero && pos >= dur) {
      _onVideoComplete();
    }
  }

  void _onVideoComplete() {
    _videoWatchdogTimer?.cancel();
    if (_localPlaylist.isNotEmpty) {
      final adSource = _localPlaylist[_currentAdIndex % _localPlaylist.length];
      final dur = _videoController?.value.duration.inSeconds ?? 0;
      _trackImpression(adSource, dur);
    }
    _advanceToNextAd();
  }

  void _advanceToNextAd() {
    if (_localPlaylist.isEmpty) return;

    _loadFrequenciesAndTimestamps().then((_) {
      final eligible = _getEligiblePlaylist(_masterAdPlaylist);
      if (eligible.isEmpty) {
        print('[PLAYER] No eligible ads after frequency filter. Repeating full master list.');
        _currentAdIndex = (_currentAdIndex + 1) % _localPlaylist.length;
      } else {
        _localPlaylist = eligible;
        _currentAdIndex = (_currentAdIndex + 1) % eligible.length;
      }

      _playCurrentAd();
    });
  }

  // =====================================================================
  // AD FREQUENCY & RE-BUILDING LOGIC
  // =====================================================================
  Future<void> _loadFrequenciesAndTimestamps() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final freqStr = prefs.getString('ad_frequencies_map');
      if (freqStr != null) {
        final decoded = jsonDecode(freqStr) as Map<String, dynamic>;
        _adFrequencies = decoded.map((k, v) => MapEntry(k, v as int));
      }
      final durStr = prefs.getString('ad_durations_map');
      if (durStr != null) {
        final decoded = jsonDecode(durStr) as Map<String, dynamic>;
        _adDurations = decoded.map((k, v) => MapEntry(k, v as int));
      }
      final timesStr = prefs.getString('ad_last_played_times');
      if (timesStr != null) {
        final decoded = jsonDecode(timesStr) as Map<String, dynamic>;
        _lastPlayedTimes = decoded.map((k, v) => MapEntry(k, v as int));
      }
    } catch (e) {
      print('Error loading ad schedules: $e');
    }
  }

  Future<void> _saveLastPlayedTimes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('ad_last_played_times', jsonEncode(_lastPlayedTimes));
    } catch (e) {
      print('Error saving last played times: $e');
    }
  }

  String _getBookingId(String path) {
    if (path.startsWith('img__')) {
      final inner = path.substring(5);
      final fileName = inner.split('/').last.split('\\').last;
      if (fileName.startsWith('img_')) {
        return fileName.replaceAll('img_', '').split('.').first;
      }
      return inner;
    } else if (path.startsWith('static__')) {
      final parts = path.split('__');
      if (parts.length >= 2) return parts[1];
    } else {
      final fileName = path.split('/').last.split('\\').last;
      if (fileName.startsWith('ad_')) {
        return fileName.replaceAll('ad_', '').split('.').first;
      }
    }
    return '';
  }

  List<String> _getEligiblePlaylist(List<String> master) {
    if (master.isEmpty) return [];

    final now = DateTime.now().millisecondsSinceEpoch;
    final List<String> eligible = [];

    for (final path in master) {
      final bookingId = _getBookingId(path);
      if (bookingId.isEmpty) {
        eligible.add(path);
        continue;
      }

      final freqMin = _adFrequencies[bookingId] ?? 0;
      if (freqMin <= 0) {
        eligible.add(path);
        continue;
      }

      final lastPlayed = _lastPlayedTimes[bookingId] ?? 0;
      final diffMillis = now - lastPlayed;
      final freqMillis = freqMin * 60 * 1000;

      if (lastPlayed == 0 || diffMillis >= freqMillis) {
        eligible.add(path);
      }
    }

    if (eligible.isEmpty) {
      return List.from(master);
    }

    return eligible;
  }

  // =====================================================================
  // TELEMETRY (Billable ads only)
  // =====================================================================
  void _trackImpression(String adSource, [int durationSeconds = 0]) {
    String bookingId = 'unknown';
    if (adSource.startsWith('static__') || adSource.startsWith('img__')) {
      final parts = adSource.split('__');
      if (parts.length >= 2) bookingId = parts[1].split('_').first;
    } else {
      final fileName = adSource.split('/').last.split('\\').last;
      if (fileName.startsWith('ad_')) {
        bookingId = fileName.replaceAll('ad_', '').split('.').first;
      }
    }

    if (bookingId != 'unknown' && bookingId.isNotEmpty) {
      _lastPlayedTimes[bookingId] = DateTime.now().millisecondsSinceEpoch;
      _saveLastPlayedTimes();
    }

    // Skip telemetry for fallback ads, platform house ads, venue promos, and unknown sources
    final isNonBillable = bookingId == 'unknown' ||
        bookingId.isEmpty ||
        bookingId.startsWith('FALLBACK') ||
        bookingId.startsWith('PAD') ||
        bookingId.startsWith('VENUE_AD') ||
        bookingId == 'FALLBACK' ||
        bookingId == 'PAD' ||
        bookingId == 'VENUE_AD';

    if (isNonBillable) return;

    // Fire-and-forget telemetry for billable 3rd-party ads
    try {
      final req = AdImpressionRequest()
        ..deviceId = widget.deviceId
        ..bookingId = bookingId
        ..durationSeconds = durationSeconds
        ..interactiveClicks = 0;
      _deviceClient.trackAdImpression(req, options: _callOptions).ignore();
    } catch (e) {
      // Ignore telemetry errors
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      if (_videoController != null && !_videoController!.value.isPlaying) {
        _videoController!.play();
      }
    } else if (state == AppLifecycleState.paused) {
      _videoController?.pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    _syncTimer?.cancel();
    _staticAdTimer?.cancel();
    _videoWatchdogTimer?.cancel();
    if (_videoController != null) {
      final old = _videoController;
      _videoController = null;
      old?.removeListener(_videoListener);
      old?.dispose();
    }
    _channel.shutdown();
    super.dispose();
  }

  // =====================================================================
  // BUILD UI — Clean full-screen ad display with zero popups
  // =====================================================================
  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Main player content
          _buildMainContent(),

          // Subtle unobtrusive settings trigger in top-right corner
          Positioned(
            top: 16,
            right: 16,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(30),
                onTap: _openSettingsScreen,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.settings_outlined,
                    color: Colors.white24,
                    size: 22,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openSettingsScreen() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ScreenSettingsScreen(
          serverHost: widget.serverHost,
          deviceId: widget.deviceId,
          token: widget.token,
          hostApplicationId: widget.hostApplicationId,
          activePlaylistCount: _localPlaylist.length,
          onReSync: () async {
            _syncRetryCount = 0;
            await _attemptSync();
          },
          onReconfigure: () {
            Navigator.of(context).pop();
            widget.onReconfigure();
          },
          onReset: () {
            Navigator.of(context).pop();
            widget.onReset();
          },
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_playerState) {
      case PlayerState.booting:
        return _buildSplashScreen('Starting up DigiAds Screen...');

      case PlayerState.waiting:
        return _buildWaitingScreen();

      case PlayerState.playing:
        return _buildPlayerView();
    }
  }

  Widget _buildSplashScreen(String message) {
    return Container(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.tv_rounded, size: 80, color: Colors.indigoAccent),
            const SizedBox(height: 24),
            const Text(
              'DigiAds Screen',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 32),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaitingScreen() {
    return Container(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_find_rounded, size: 80, color: Colors.indigoAccent),
            const SizedBox(height: 24),
            const Text(
              'DigiAds Wall Screen',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Device ID: ${widget.deviceId}',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), letterSpacing: 1),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _statusMessage,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            TextButton.icon(
              onPressed: () {
                _syncRetryCount = 0;
                _attemptSync();
              },
              icon: const Icon(Icons.refresh, color: Colors.indigoAccent, size: 18),
              label: const Text(
                'Retry Sync Now',
                style: TextStyle(color: Colors.indigoAccent, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerView() {
    if (_localPlaylist.isEmpty) return _buildSplashScreen('Loading ad creatives...');

    final adSource = _localPlaylist[_currentAdIndex % _localPlaylist.length];
    final hasImage = adSource.startsWith('img__');
    final hasStatic = adSource.startsWith('static__');

    if (hasImage) {
      // Full-screen image ad with clean black containment (0% content crop)
      final imagePath = adSource.substring(5);
      final imageFile = File(imagePath);
      return Container(
        color: Colors.black,
        width: double.infinity,
        height: double.infinity,
        child: imageFile.existsSync()
            ? Image.file(
                imageFile,
                fit: BoxFit.contain,
                width: double.infinity,
                height: double.infinity,
                gaplessPlayback: true,
                cacheWidth: 1920,
                errorBuilder: (context, error, stackTrace) => const Center(
                  child: Icon(Icons.broken_image, size: 80, color: Colors.white24),
                ),
              )
            : const Center(
                child: Icon(Icons.image_not_supported, size: 80, color: Colors.white24),
              ),
      );
    } else if (hasStatic) {
      // Static text fallback card
      String title = 'DigiAds Display';
      String subtitle = '';
      final parts = adSource.split('__');
      if (parts.length >= 4) {
        title = parts[2];
        subtitle = parts[3];
      }

      return Container(
        color: Colors.black,
        width: double.infinity,
        height: double.infinity,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.tv_rounded, size: 100, color: Colors.indigoAccent),
              const SizedBox(height: 24),
              Text(
                'DIGIADS WALL SCREEN: ${widget.deviceId}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.indigoAccent,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 16, color: Color(0xFF94A3B8)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    } else {
      // Full-content aspect-ratio video player with pure black letterboxing (0% crop)
      final isReady = _videoController != null && _videoController!.value.isInitialized;
      if (isReady) {
        final aspect = _videoController!.value.aspectRatio;
        return Container(
          color: Colors.black,
          width: double.infinity,
          height: double.infinity,
          child: Center(
            child: AspectRatio(
              aspectRatio: aspect > 0 ? aspect : 16 / 9,
              child: VideoPlayer(_videoController!),
            ),
          ),
        );
      } else {
        return Container(
          color: Colors.black,
          width: double.infinity,
          height: double.infinity,
          child: const Center(
            child: CircularProgressIndicator(color: Colors.indigoAccent),
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SCREEN SETTINGS SCREEN — Complete parity with tablet settings
// ---------------------------------------------------------------------------
class ScreenSettingsScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final int activePlaylistCount;
  final Future<void> Function() onReSync;
  final VoidCallback onReconfigure;
  final VoidCallback onReset;

  const ScreenSettingsScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.activePlaylistCount,
    required this.onReSync,
    required this.onReconfigure,
    required this.onReset,
  });

  @override
  State<ScreenSettingsScreen> createState() => _ScreenSettingsScreenState();
}

class _ScreenSettingsScreenState extends State<ScreenSettingsScreen> {
  static const MethodChannel _systemChannel = MethodChannel('com.digiads.screen/system');
  bool _isReSyncing = false;

  Future<void> _handleReSync() async {
    setState(() => _isReSyncing = true);
    try {
      await widget.onReSync();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ads re-download and playlist refresh completed!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to re-sync: $e')),
      );
    } finally {
      if (mounted) setState(() => _isReSyncing = false);
    }
  }

  Future<void> _handleReset() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Reset Screen Device?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'This will clear all saved credentials, stored tokens, and cached ads.\n\n'
          'The screen will return to initial setup and require re-authorization.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('Reset Device', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      widget.onReset();
      if (!mounted) return;
      Navigator.of(context).pop();
    }
  }

  Future<void> _openAndroidSettings() async {
    try {
      await _systemChannel.invokeMethod('openAndroidSettings');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to open Android Settings: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Screen Display Settings',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              'Device ID: ${widget.deviceId}',
              style: const TextStyle(fontSize: 11, color: Colors.indigoAccent),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Info Card
          _buildInfoCard(),

          const SizedBox(height: 24),

          const Text(
            "DEVICE & NETWORK CONTROLS",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 1),
          ),
          const SizedBox(height: 12),

          // Operational Actions
          _buildActionCard(
            icon: Icons.refresh_rounded,
            title: 'Re-download & Sync Ads',
            subtitle: 'Force an immediate sync with the server to fetch and cache the latest ad creatives.',
            isLoading: _isReSyncing,
            onTap: _isReSyncing ? null : _handleReSync,
          ),
          const SizedBox(height: 12),

          _buildActionCard(
            icon: Icons.settings_remote_rounded,
            title: 'Re-configure Screen Connection',
            subtitle: 'Update Server Host / IP address or assign a different Device ID.',
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ScreenSetupScreen(
                    initialServerHost: widget.serverHost,
                    initialDeviceId: widget.deviceId,
                    onActivate: (host, dId, tok, hAppId) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (_) => LandscapeAdScreenApp(
                            initialActivated: true,
                            initialServerHost: host,
                            initialDeviceId: dId,
                            initialToken: tok,
                            initialHostApplicationId: hAppId,
                          ),
                        ),
                        (route) => false,
                      );
                    },
                    onCancel: () => Navigator.of(context).pop(),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),

          _buildActionCard(
            icon: Icons.lock_reset_rounded,
            title: 'Reset Screen Device',
            subtitle: 'Clear all credentials and return to factory setup. Requires re-authorization.',
            isDanger: true,
            onTap: _handleReset,
          ),
          const SizedBox(height: 12),

          _buildActionCard(
            icon: Icons.settings_applications_rounded,
            title: 'Open Android System Settings',
            subtitle: 'Configure device WiFi network, display resolution, sound, or system time.',
            onTap: _openAndroidSettings,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.indigoAccent.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.info_outline_rounded, color: Colors.indigoAccent, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'System & Connection Information',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Device ID', widget.deviceId),
          _buildInfoRow('Server Host', widget.serverHost),
          _buildInfoRow('Venue Application ID', widget.hostApplicationId.isNotEmpty ? widget.hostApplicationId : 'Not Assigned'),
          _buildInfoRow('Display Type', 'Wall Display Screen (16:9 Landscape)'),
          _buildInfoRow('Active Playlist', '${widget.activePlaylistCount} Ads in rotation'),
          _buildInfoRow('Package Name', 'com.digiads.screen'),
          _buildInfoRow('App Version', 'v1.0.0 (Build 1)'),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
    bool isDanger = false,
    bool isLoading = false,
  }) {
    return Material(
      color: const Color(0xFF111827),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDanger ? Colors.redAccent.withOpacity(0.3) : Colors.white10,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDanger ? Colors.redAccent.withOpacity(0.15) : Colors.indigoAccent.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isDanger ? Colors.redAccent : Colors.indigoAccent,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDanger ? Colors.redAccent : Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
              if (isLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
                )
              else
                Icon(
                  Icons.chevron_right_rounded,
                  color: isDanger ? Colors.redAccent : Colors.white38,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
