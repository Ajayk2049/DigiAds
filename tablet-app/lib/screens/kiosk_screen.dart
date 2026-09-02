import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grpc/grpc.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:fixnum/fixnum.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../generated/device.pbgrpc.dart';
import '../generated/menu.pbgrpc.dart';
import '../generated/order.pbgrpc.dart';

import 'package:package_info_plus/package_info_plus.dart';
import '../constants.dart';
import '../services/update_service.dart';
import '../menu_state.dart';
import '../ad_player_service.dart';
import '../ad_sync_service.dart';
import '../widgets/ad_view.dart';
import '../widgets/menu_catalog.dart';
import '../widgets/order_summary.dart';
import '../widgets/checkout_modal.dart';
import '../widgets/payment_qr_widget.dart';
import '../widgets/download_progress_indicator.dart';
import '../menu_image_cache.dart';
import 'settings_screen.dart';
import 'device_setup_screen.dart';

// ═══════════════════════════════════════════════════════════════════
//  KIOSK SCREEN — Main kiosk orchestrator (ANR-safe startup)
// ═══════════════════════════════════════════════════════════════════

class KioskScreen extends StatefulWidget {
  final String serverHost;
  final String deviceId;
  final String token;
  final String hostApplicationId;
  final String bypassPassword;
  final String tableNumber;
  final VoidCallback onReset;

  const KioskScreen({
    super.key,
    required this.serverHost,
    required this.deviceId,
    required this.token,
    required this.hostApplicationId,
    required this.bypassPassword,
    required this.tableNumber,
    required this.onReset,
  });

  @override
  State<KioskScreen> createState() => _KioskScreenState();
}

class _KioskScreenState extends State<KioskScreen> with WidgetsBindingObserver {
  // ── Broad state ──
  bool _isIdle = false;
  bool _showCart = false;
  bool _kioskReady = false;
  bool _isOnline = true;
  bool _pendingMenuReload = false;
  String _outletName = '';
  String _selectedCategory = 'Popular';
  late String _tableNumber;
  bool _showWaiterStatus = false;
  String _waiterStatusText = '';
  String _waiterStatusOption = '';
  Timer? _waiterVanishTimer;
  Timer? _abandonedCartTimer;

  // ── gRPC ──
  ClientChannel? _channel;
  DeviceServiceClient? _deviceClient;
  MenuServiceClient? _menuClient;
  OrderServiceClient? _orderClient;
  CallOptions? _callOptions;
  Timer? _heartbeatTimer;


  // ── Decoupled services ──
  late final AdPlayerService _adPlayer;
  late final AdSyncService _adSync;
  late final MenuImageCache _imageCache;
  final CartNotifier _cart = CartNotifier();
  final MenuNotifier _menu = MenuNotifier();

  // ── Back-online banner ──
  bool _backOnlineVisible = false;
  Timer? _backOnlineTimer;

  // ── Close table / payment state ──
  Map<String, dynamic>? _tableSession;
  bool _showOrderDetailsModal = false;

  // ── Timers ──
  Timer? _inactivityTimer;
  Timer? _cancelledVanishTimer;

  // ── Ad scheduling & frequency ──
  List<String> _masterAdPlaylist = [];
  Map<String, int> _adFrequencies = {};
  Map<String, int> _lastPlayedTimes = {};

  // ── Controllers & Brand Tap Counter ──
  final _passwordController = TextEditingController();
  int _brandTapCount = 0;
  Timer? _brandTapResetTimer;

  void _onBrandIconTapped() {
    _brandTapCount++;
    _brandTapResetTimer?.cancel();

    if (_brandTapCount >= 5) {
      _brandTapCount = 0;
      _promptUnlock();
      return;
    }

    // Single tap or rapid taps < 5 shows marketing toast
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Powered by DigiAds.Space',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          textAlign: TextAlign.center,
        ),
        duration: Duration(seconds: 2),
        backgroundColor: Color(0xFF0764BF),
        behavior: SnackBarBehavior.floating,
      ),
    );

    // Reset tap counter if next tap is not within 1.5s
    _brandTapResetTimer = Timer(const Duration(milliseconds: 1500), () {
      _brandTapCount = 0;
    });
  }

  static const MethodChannel _perfChannel = MethodChannel('com.digiads.tabletop/performance');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _enableLockTaskMode();
    _tableNumber = widget.tableNumber;

    _adPlayer = AdPlayerService(onImpression: _trackAdImpression);
    _adSync = AdSyncService(
      serverHost: widget.serverHost,
      token: widget.token,
      adsDirectory: kAdsDirectoryPath,
      onPlaylistUpdated: _onPlaylistUpdated,
    );
    _imageCache = MenuImageCache(serverHost: widget.serverHost);

    // ═══ CRITICAL ANR FIX ═══
    WidgetsBinding.instance.addPostFrameCallback((_) => _deferredBootstrap());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      _enableLockTaskMode();
    }
  }

  WebSocket? _socket;
  bool _isWsConnected = false;

  // ────────────────── Deferred bootstrap ──────────────────

  Future<void> _deferredBootstrap() async {
    // Every stage is individually guarded. On a cold boot the network stack, DNS and
    // storage are often not ready yet; before this, a single throw here left
    // _kioskReady false forever and the tablet sat on the splash screen until a
    // manual power cycle.
    try {
      _initGrpc();
    } catch (e) {
      debugPrint('[BOOT] gRPC init failed: $e');
    }
    try {
      await _registerAndStartHeartbeat();
    } catch (e) {
      debugPrint('[BOOT] Device registration failed: $e');
    }
    try {
      await _fetchMenu();
    } catch (e) {
      debugPrint('[BOOT] Menu fetch failed: $e');
    }
    try {
      await _bootAds();
    } catch (e) {
      debugPrint('[BOOT] Ad boot failed: $e');
    }
    try {
      _initWebSocket();
    } catch (e) {
      debugPrint('[BOOT] WebSocket init failed: $e');
    }

    // Local timer to check for ad unlocks periodically when the playlist is empty
    Timer.periodic(const Duration(seconds: 30), (timer) {
      if (mounted) {
        if (_isIdle && _adPlayer.state.value.playlist.isEmpty && _masterAdPlaylist.isNotEmpty) {
          final eligible = _getEligiblePlaylist(_masterAdPlaylist);
          if (eligible.isNotEmpty) {
            debugPrint('[SCHEDULER] Ads unlocked! Resuming ad loop.');
            _adPlayer.startLoop(eligible);
          }
        }
      } else {
        timer.cancel();
      }
    });

    if (mounted) {
      setState(() {
        _kioskReady = true;
      });
      _resetIdleTimer();
    }
  }

  void _initGrpc() {
    _channel = ClientChannel(
      cleanGrpcHost(widget.serverHost),
      port: 4201,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );
    _deviceClient = DeviceServiceClient(_channel!);
    _menuClient = MenuServiceClient(_channel!);
    _orderClient = OrderServiceClient(_channel!);
    _callOptions = CallOptions(
      metadata: {'authorization': 'Bearer ${widget.token}'},
      timeout: kHttpTimeout,
    );
  }

  Timer? _wsPingTimer;
  Timer? _otaCheckTimer;
  Timer? _wsReconnectTimer;
  bool _isConnectingWs = false;

  void _initWebSocket() async {
    if (_isConnectingWs) return;
    _isConnectingWs = true;

    _wsReconnectTimer?.cancel();
    _wsPingTimer?.cancel();
    _otaCheckTimer?.cancel();

    // Store reference and null out _socket so closing it doesn't trigger onDone handlers
    final oldSocket = _socket;
    _socket = null;
    if (oldSocket != null) {
      try {
        await oldSocket.close();
      } catch (_) {}
    }

    try {
      final host = widget.serverHost;
      final wsUrl = buildWsUrl(host, path: '/ws/device?token=${widget.token}');
      debugPrint('[WS] Connecting to $wsUrl');
      
      final newSocket = await WebSocket.connect(wsUrl).timeout(const Duration(seconds: 10));
      _socket = newSocket;
      _isWsConnected = true;
      debugPrint('[WS] Connected successfully');
      _markOnline();

      // Periodic ping timer every 15s to keep lastHeartbeat fresh on server
      _wsPingTimer?.cancel();
      _wsPingTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
        if (_socket != null && _socket == newSocket && _isWsConnected) {
          try {
            String appVer = '1.0.0';
            int verCode = 1;
            try {
              final info = await PackageInfo.fromPlatform();
              appVer = info.version;
              verCode = int.tryParse(info.buildNumber) ?? 1;
            } catch (_) {}

            newSocket.add(jsonEncode({
              'event': 'ping',
              'deviceId': widget.deviceId,
              'appVersion': appVer,
              'versionCode': verCode,
            }));
          } catch (e) {
            debugPrint('[WS] Ping send failed: $e');
          }
        }
      });

      // Initial post-boot/connect OTA check
      UpdateService.checkForUpdate(
        serverHost: widget.serverHost,
        isIdle: _isIdle && _cart.value.isEmpty,
      );

      // Periodic background OTA update check every 6 hours
      _otaCheckTimer?.cancel();
      _otaCheckTimer = Timer.periodic(const Duration(hours: 6), (_) {
        UpdateService.checkForUpdate(
          serverHost: widget.serverHost,
          isIdle: _isIdle && _cart.value.isEmpty,
        );
      });

      newSocket.listen(
        (data) {
          try {
            final payload = jsonDecode(data as String) as Map<String, dynamic>;
            final event = payload['event'] as String? ?? '';
            final errType = payload['error'] as String? ?? '';
            if (errType == 'UNAUTHORIZED' || (payload['message'] as String? ?? '').contains('revoked')) {
              debugPrint('[WS] Device registration revoked by server. Wiping local credentials...');
              _socket?.close();
              _isWsConnected = false;
              _wsPingTimer?.cancel();
              SharedPreferences.getInstance().then((prefs) async {
                await prefs.remove('token');
                await prefs.remove('serverHost');
                await prefs.remove('deviceId');
                await prefs.remove('hostApplicationId');
                await prefs.remove('bypassPassword');
                await prefs.remove('tableNumber');
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => DeviceSetupScreen(onActivate: (_, __, ___, ____, _____, ______) {})),
                    (route) => false,
                  );
                }
              });
              return;
            }
            if (event == 'table_session') {
              debugPrint('[WS] Table session payload: $payload');
              _processTableSession(jsonEncode(payload));
            } else if (event == 'reload_menu') {
              debugPrint('[WS] Menu update reload request received');
              _fetchMenu();
            } else if (event == 'reload_ads') {
              debugPrint('[WS] Ad update reload request received from server');
              _adSync.syncNow();
            } else if (event == 'app_update') {
              debugPrint('[WS] App update event received from server');
              UpdateService.checkForUpdate(
                serverHost: widget.serverHost,
                isIdle: _isIdle && _cart.value.isEmpty,
              );
            } else if (event == 'release_cancelled') {
              debugPrint('[WS] Release revoked/cancelled by admin. Purging pending APK...');
              UpdateService.purgePendingUpdate();
            } else if (event == 'connected') {
              // Server connection established/restored.
              _adSync.syncNow();
              Timer(const Duration(seconds: 2), () {
                if (mounted && _socket == newSocket) {
                  final status = _tableSession?['status'] as String? ?? '';
                  final orderStatus = (_tableSession?['orderStatus'] as String? ?? '').toLowerCase();
                  if (orderStatus == 'cancelled' || status == 'completed') {
                    setState(() {
                      _tableSession = null;
                      _showOrderDetailsModal = false;
                    });
                    if (_pendingMenuReload && (_isIdle || _cart.value.isEmpty)) {
                      _pendingMenuReload = false;
                      _fetchMenu();
                    }
                  }
                }
              });
            } else if (event == 'pong') {
              // Heartbeat ack from server
            }
          } catch (e) {
            debugPrint('[WS] Error processing msg: $e');
          }
        },
        onError: (err) {
          debugPrint('[WS] Socket error: $err');
          if (_socket == newSocket) {
            _wsPingTimer?.cancel();
            _markOffline();
            _reconnectWebSocket();
          }
        },
        onDone: () {
          debugPrint('[WS] Socket closed by host');
          if (_socket == newSocket) {
            _wsPingTimer?.cancel();
            _markOffline();
            _reconnectWebSocket();
          }
        },
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('[WS] Socket connection failed: $e');
      if (_socket == null || _socket == oldSocket) {
        _wsPingTimer?.cancel();
        _markOffline();
        _reconnectWebSocket();
      }
    } finally {
      _isConnectingWs = false;
    }
  }

  void _reconnectWebSocket() {
    _isWsConnected = false;
    _wsReconnectTimer?.cancel();
    _wsReconnectTimer = Timer(const Duration(seconds: 5), () {
      if (mounted) {
        _initWebSocket();
      }
    });
  }

  Future<void> _registerAndStartHeartbeat() async {
    try {
      final req = RegisterDeviceRequest()
        ..deviceId = widget.deviceId
        ..deviceType = 'tablet'
        ..hostApplicationId = widget.hostApplicationId;
      await _deviceClient!.registerDevice(req, options: _callOptions);
      debugPrint('gRPC Device registered successfully');
      _markOnline();
    } catch (e) {
      debugPrint('gRPC Device registration failed: $e');
    }
  }

  void _markOnline() {
    if (!_isOnline && mounted) {
      setState(() => _isOnline = true);
      _showBackOnlineBanner();
    }
  }

  void _markOffline() {
    if (_isOnline && mounted) {
      setState(() => _isOnline = false);
    }
  }

  /// Show a non-blocking, auto-dismissing top-right banner instead of a
  /// modal dialog. Auto-dismisses after 3 seconds, OR instantly on any
  /// tap anywhere on the screen.
  void _showBackOnlineBanner() {
    if (!mounted) return;
    setState(() => _backOnlineVisible = true);
    _backOnlineTimer?.cancel();
    _backOnlineTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      setState(() => _backOnlineVisible = false);
    });
  }

  void _dismissBackOnlineBanner() {
    if (!_backOnlineVisible) return;
    _backOnlineTimer?.cancel();
    setState(() => _backOnlineVisible = false);
  }

  Future<void> _fetchMenu() async {
    _menu.setLoading();
    _adSync.progress.value = const SyncProgress(
      isActive: true,
      label: 'Fetching menu...',
      filesCompleted: 0,
      filesTotal: 0,
      bytesDownloaded: 0,
      bytesTotal: 0,
      currentFileName: '',
    );
    try {
      final req = GetMenuRequest()
        ..deviceId = widget.deviceId
        ..merchantId = '';
      final response = await _menuClient!.getMenu(req, options: _callOptions);
      if (mounted) {
        setState(() {
          _outletName = response.message; // server's outlet name; may be empty
          if (_selectedCategory.isEmpty && response.items.isNotEmpty) {
            _selectedCategory = 'Popular';
          }
        });
        _menu.setItems(response.items);
        // Cache menu + outletName to SharedPreferences for offline use
        await _cacheMenu(response.items, response.message);
      }
      // Prime the image cache in the background — UI stays responsive.
      // The download_progress_indicator widget (if mounted) will show this.
      unawaited(_imageCache.primeFromMenu(response.items));
    } catch (e) {
      debugPrint('Menu fetch failed: $e');
      if (mounted) {
        _menu.setError();
        // Load cached menu instead of mock data
        await _loadCachedMenu();
      }
    } finally {
      _adSync.progress.value = const SyncProgress.idle();
    }
  }

  Future<void> _cacheMenu(List<MenuItem> items, String outletName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final menuJson = {
        'outletName': outletName,
        'items': items.map((item) => {
          'itemId': item.itemId,
          'name': item.name,
          'description': item.description,
          'price': item.price.toInt(),
          'category': item.category,
          'imageUrl': item.imageUrl,
          'isAvailable': item.isAvailable,
          'isPopular': item.isPopular,
        }).toList(),
      };
      await prefs.setString('cachedMenu', jsonEncode(menuJson));
    } catch (e) {
      debugPrint('Failed to cache menu: $e');
    }
  }

  Future<void> _loadCachedMenu() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedMenuJson = prefs.getString('cachedMenu');
      if (cachedMenuJson == null || cachedMenuJson.isEmpty) return;

      final dynamic decoded = jsonDecode(cachedMenuJson);
      // Support both new shape ({outletName, items}) and the old shape
      // (bare list) for backwards compatibility with previously installed
      // devices.
      List<dynamic> menuData;
      String? cachedOutletName;
      if (decoded is Map<String, dynamic>) {
        cachedOutletName = decoded['outletName'] as String?;
        menuData = decoded['items'] as List<dynamic>? ?? const [];
      } else if (decoded is List) {
        menuData = decoded;
      } else {
        return;
      }

      final items = menuData.map((data) {
        return MenuItem()
          ..itemId = data['itemId'] as String
          ..name = data['name'] as String
          ..description = data['description'] as String? ?? ''
          ..price = Int64(data['price'] as int)
          ..category = data['category'] as String
          ..imageUrl = data['imageUrl'] as String? ?? ''
          ..isAvailable = data['isAvailable'] as bool? ?? true
          ..isPopular = data['isPopular'] as bool? ?? false;
      }).toList();

      if (items.isEmpty) return;
      _menu.setItems(items);
      if (mounted) {
        setState(() {
          // Only adopt the cached outletName if we don't already have a
          // fresh one from the server response this session.
          if (_outletName.isEmpty && cachedOutletName != null) {
            _outletName = cachedOutletName;
          }
          if (_selectedCategory.isEmpty) {
            _selectedCategory = 'Popular';
          }
        });
      }
      debugPrint('Loaded ${items.length} items from cache');
    } catch (e) {
      debugPrint('Failed to load cached menu: $e');
    }
  }

  // ────────────────── Ad lifecycle ──────────────────

  Future<void> _loadFrequenciesAndTimestamps() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Load frequencies map
      final freqStr = prefs.getString('ad_frequencies_map');
      if (freqStr != null) {
        final decoded = jsonDecode(freqStr) as Map<String, dynamic>;
        _adFrequencies = decoded.map((k, v) => MapEntry(k, v as int));
        debugPrint('Loaded ${_adFrequencies.length} ad frequencies from cache');
      }
      
      // Load last played times map
      final timesStr = prefs.getString('ad_last_played_times');
      if (timesStr != null) {
        final decoded = jsonDecode(timesStr) as Map<String, dynamic>;
        _lastPlayedTimes = decoded.map((k, v) => MapEntry(k, v as int));
        debugPrint('Loaded ${_lastPlayedTimes.length} last played times from cache');
      }

      // Purge corrupted/bloated legacy offline impression queue if > 100 entries
      final queue = prefs.getStringList('offline_ad_impressions') ?? [];
      if (queue.length > 100) {
        await prefs.remove('offline_ad_impressions');
        debugPrint('[CLEANUP] Purged bloated legacy offline impression queue (${queue.length} items)');
      }
    } catch (e) {
      debugPrint('Error loading ad schedules from cache: $e');
    }
  }

  Future<void> _saveLastPlayedTimes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_lastPlayedTimes);
      await prefs.setString('ad_last_played_times', encoded);
    } catch (e) {
      debugPrint('Error saving last played times: $e');
    }
  }

  String _getBookingId(String path) {
    if (path.startsWith('static__')) {
      final parts = path.split('__');
      return parts.length >= 2 ? parts[1] : '';
    } else if (path.startsWith('img__')) {
      final parts = path.split('__');
      if (parts.length >= 2) {
        final rawId = parts[1];
        // Strip trailing image index '_0', '_1', etc.
        return rawId.replaceFirst(RegExp(r'_\d+$'), '');
      }
    } else {
      final fileName = path.split('/').last.split('\\').last;
      final withoutAdPrefix = fileName.startsWith('ad_') ? fileName.substring(3) : fileName;
      final idx = withoutAdPrefix.lastIndexOf('.');
      final withoutExt = idx != -1 ? withoutAdPrefix.substring(0, idx) : withoutAdPrefix;

      // Check if known campaign bookingId matches
      for (final campaign in _adSync.adCampaigns) {
        final bId = campaign['bookingId'] as String?;
        if (bId != null && bId.isNotEmpty && withoutExt.startsWith(bId)) {
          return bId;
        }
      }

      // If video contains '_vid_' or '_img_' separator from ad_sync_service
      if (withoutExt.contains('_vid_')) {
        return withoutExt.substring(0, withoutExt.indexOf('_vid_'));
      }
      if (withoutExt.contains('_img_')) {
        return withoutExt.substring(0, withoutExt.indexOf('_img_'));
      }

      if (withoutExt.startsWith('VENUE_AD_')) {
        final sub = withoutExt.substring('VENUE_AD_'.length).split('_').first;
        return 'VENUE_AD_$sub';
      }
      if (withoutExt.startsWith('PAD_')) {
        final sub = withoutExt.substring('PAD_'.length).split('_').first;
        return 'PAD_$sub';
      }
      if (withoutExt.startsWith('FALLBACK_')) {
        final sub = withoutExt.substring('FALLBACK_'.length).split('_').first;
        return 'FALLBACK_$sub';
      }
      if (withoutExt.startsWith('AD_')) {
        final parts = withoutExt.split('_');
        if (parts.length >= 2) {
          return '${parts[0]}_${parts[1]}';
        }
      }
      return withoutExt;
    }
    return '';
  }

  List<String> _getEligiblePlaylist(List<String> master) {
    if (master.isEmpty) return [];
    
    final now = DateTime.now().millisecondsSinceEpoch;
    final eligible = <String>[];
    
    for (final path in master) {
      final bookingId = _getBookingId(path);
      if (bookingId.isEmpty) {
        eligible.add(path);
        continue;
      }

      // In-venue promos, platform house ads, and fallback ads are always continuous (zero cooldown)
      if (bookingId.startsWith('VENUE_AD') ||
          bookingId.startsWith('PAD') ||
          bookingId.startsWith('FALLBACK')) {
        eligible.add(path);
        continue;
      }
      
      final freqMin = _adFrequencies[bookingId] ?? 0;
      if (freqMin == 0) {
        // Continuous loop
        eligible.add(path);
        continue;
      }
      
      // Calculate buffer
      int bufferMin = 5;
      if (freqMin <= 30) {
        bufferMin = 3;
      } else if (freqMin > 120) {
        bufferMin = 15;
      }
      
      final cooldownMs = (freqMin - bufferMin) * 60 * 1000;
      final lastPlayed = _lastPlayedTimes[bookingId] ?? 0;
      
      if (now - lastPlayed >= cooldownMs) {
        eligible.add(path);
      } else {
        final remainingMins = ((cooldownMs - (now - lastPlayed)) / (60 * 1000)).toStringAsFixed(1);
        debugPrint('[SCHEDULER] Ad $bookingId is on cooldown for $remainingMins more mins.');
      }
    }
    
    // Fallback: if all ads are blocked by cooldowns, check if we have any continuous loop ads
    // in the master list. If there are no continuous loop ads at all, we bypass the filter
    // so the hourly ads loop continuously. If continuous ads do exist, we return empty/standby.
    if (eligible.isEmpty) {
      bool hasContinuous = false;
      for (final path in master) {
        final bookingId = _getBookingId(path);
        final freqMin = _adFrequencies[bookingId] ?? 0;
        if (freqMin == 0) {
          hasContinuous = true;
          break;
        }
      }
      if (!hasContinuous) {
        debugPrint('[SCHEDULER] All hourly ads on cooldown and no continuous loop ads exist. Bypassing filter.');
        return List.from(master);
      }
      debugPrint('[SCHEDULER] All eligible ads on cooldown. Transitioning to standby screen.');
      return [];
    }
    
    return eligible;
  }

  Future<void> _bootAds() async {
    debugPrint('[BOOT] Starting sync sequence...');

    if (Platform.isAndroid) {
      // MANAGE_EXTERNAL_STORAGE only exists on API 30+. Requesting it on Android 8.1
      // (API 27) returns permanentlyDenied and, on some Rockchip builds, throws from
      // the platform channel — which aborts _deferredBootstrap() before the ad player
      // ever starts. Try the scoped permission first and treat any failure as
      // non-fatal so boot always continues.
      try {
        if (!await Permission.storage.isGranted) {
          await Permission.storage.request();
        }
        if (!await Permission.storage.isGranted) {
          await Permission.manageExternalStorage.request();
        }
      } catch (e) {
        debugPrint('[BOOT] Storage permission request skipped: $e');
      }
    }

    List<String> cachedPlaylist = const [];
    try {
      cachedPlaylist = await _adSync.boot();
    } catch (e) {
      // A failed ad sync must never prevent the kiosk from reaching _kioskReady,
      // otherwise the device sits on the splash screen forever after a reboot.
      debugPrint('[BOOT] Ad sync failed, continuing with no playlist: $e');
    }
    _masterAdPlaylist = List.from(cachedPlaylist);
    await _loadFrequenciesAndTimestamps();
    
    final eligible = _getEligiblePlaylist(_masterAdPlaylist);
    if (eligible.isNotEmpty && _isIdle) {
      _adPlayer.startLoop(eligible);
    }
  }

  void _onPlaylistUpdated(
      List<String> newPlaylist, List<String> activeFileNames) async {
    if (!mounted) return;
    _masterAdPlaylist = List.from(newPlaylist);
    await _loadFrequenciesAndTimestamps();
    
    final eligible = _getEligiblePlaylist(_masterAdPlaylist);
    
    if (_adPlayer.state.value.playlist.isEmpty && eligible.isNotEmpty) {
      if (_isIdle) _adPlayer.startLoop(eligible);
    } else {
      _adPlayer.updatePlaylist(eligible);
    }
    _adSync.setProtectedPaths(_adPlayer.activeFilePaths);
  }

  void _trackAdImpression(String adSource, [int durationSeconds = 0]) async {
    final bookingId = _getBookingId(adSource);
    
    // Update dynamic playback tracker (DO NOT call _rebuildAndApplyPlaylist here to prevent reentrancy loops)
    if (bookingId.isNotEmpty && bookingId != 'unknown') {
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
    
    try {
      final req = AdImpressionRequest()
        ..deviceId = widget.deviceId
        ..bookingId = bookingId
        ..durationSeconds = durationSeconds
        ..interactiveClicks = 0;
      await _deviceClient!.trackAdImpression(req, options: _callOptions);
      // Attempt background flush of queued offline impressions
      _flushOfflineImpressions();
    } catch (e) {
      debugPrint('gRPC Track ad impression telemetry failed, saving offline: $e');
      _enqueueOfflineImpression(bookingId, durationSeconds);
    }
  }

  void _enqueueOfflineImpression(String bookingId, int durationSeconds) async {
    if (bookingId == 'unknown' || bookingId.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> queue = prefs.getStringList('offline_ad_impressions') ?? [];
      // Hard cap queue to max 50 items to prevent RAM/SharedPreferences thrashing
      if (queue.length >= 50) {
        queue.removeAt(0);
      }
      final itemJson = '{"b":"$bookingId","d":$durationSeconds,"t":${DateTime.now().millisecondsSinceEpoch}}';
      queue.add(itemJson);
      await prefs.setStringList('offline_ad_impressions', queue);
      debugPrint('Offline ad impression enqueued. Total queue size: ${queue.length}');
    } catch (err) {
      debugPrint('Error enqueuing offline ad impression: $err');
    }
  }

  bool _isFlushingOffline = false;

  void _flushOfflineImpressions() async {
    if (_deviceClient == null || _isFlushingOffline) return;
    _isFlushingOffline = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> queue = prefs.getStringList('offline_ad_impressions') ?? [];
      if (queue.isEmpty) {
        _isFlushingOffline = false;
        return;
      }

      // Process in small batches of max 20 entries
      final batchSize = math.min(queue.length, 20);
      final batch = queue.sublist(0, batchSize);
      final remainingQueue = List<String>.from(queue.sublist(batchSize));

      debugPrint('Flushing ${batch.length} offline ad impressions to server (Remaining: ${remainingQueue.length})...');
      for (final raw in batch) {
        try {
          final parts = raw.replaceAll('{', '').replaceAll('}', '').split(',');
          String b = '';
          int d = 0;
          for (final p in parts) {
            final kv = p.split(':');
            if (kv.length == 2) {
              final k = kv[0].replaceAll('"', '').trim();
              final v = kv[1].replaceAll('"', '').trim();
              if (k == 'b') b = v;
              if (k == 'd') d = int.tryParse(v) ?? 0;
            }
          }
          if (b.isNotEmpty && b != 'unknown') {
            final req = AdImpressionRequest()
              ..deviceId = widget.deviceId
              ..bookingId = b
              ..durationSeconds = d
              ..interactiveClicks = 0;
            await _deviceClient!.trackAdImpression(req, options: _callOptions);
          }
        } catch (_) {
          remainingQueue.add(raw);
        }
      }

      if (remainingQueue.isEmpty) {
        await prefs.remove('offline_ad_impressions');
        debugPrint('Successfully flushed offline ad impressions');
      } else {
        await prefs.setStringList('offline_ad_impressions', remainingQueue);
      }
    } catch (e) {
      debugPrint('Flush offline impressions attempt deferred: $e');
    } finally {
      _isFlushingOffline = false;
    }
  }

  // ────────────────── Idle/Activity management ──────────────────

  void _resetIdleTimer() {
    _inactivityTimer?.cancel();
    if (!_isIdle) {
      _inactivityTimer = Timer(kInactivityTimeout, () {
        if (mounted) {
          // Preserve unsubmitted cart items across idle ad transitions
          setState(() {
            _isIdle = true;
            _showCart = false;
          });
          _startAbandonedCartTimer();
          final eligible = _getEligiblePlaylist(_masterAdPlaylist);
          if (eligible.isNotEmpty) {
            _adPlayer.startLoop(eligible);
          } else {
            _adPlayer.resume();
          }
          if (_pendingMenuReload) {
            _pendingMenuReload = false;
            _fetchMenu();
          }
        }
      });
    }
  }

  void _cancelIdleTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = null;
  }

  void _startAbandonedCartTimer() {
    _abandonedCartTimer?.cancel();
    if (_cart.value.isNotEmpty) {
      _abandonedCartTimer = Timer(kAbandonedCartTimeout, () {
        if (mounted) {
          _cart.clear();
          setState(() {});
          debugPrint(
              '[CART] Abandoned unplaced cart cleared after ${kAbandonedCartTimeout.inMinutes} minutes of inactivity.');
        }
      });
    }
  }

  void _cancelAbandonedCartTimer() {
    _abandonedCartTimer?.cancel();
    _abandonedCartTimer = null;
  }

  void _enterMenuMode() {
    _cancelAbandonedCartTimer();
    setState(() {
      _isIdle = false;
      _showCart = false;
      _selectedCategory = 'Popular';
    });
    _adPlayer.pause();
    _resetIdleTimer();
  }

  void _returnToAds() {
    _cancelAbandonedCartTimer();
    _cart.clear();
    setState(() {
      _isIdle = true;
      _showCart = false;
      _tableSession = null;
    });
    _adSync.syncNow();
    _adPlayer.resume();
    _cancelIdleTimer();
  }

  /// Process table session state from heartbeat: close_table → show QR,
  /// completed → dismiss QR and return to ads.
  void _processTableSession(String? jsonStr) {
    if (jsonStr == null || jsonStr.isEmpty) {
      if (_tableSession != null && _tableSession!['status'] == 'active') {
        setState(() {
          _tableSession = null;
        });
      }
      return;
    }
    try {
      final data = jsonDecode(jsonStr) as Map<String, dynamic>;
      final status = data['status'] as String? ?? '';

      // Process waiter request state
      final waiterCallStatus = data['waiterCallStatus'] as String? ?? 'none';
      final waiterCallOption = data['waiterCallOption'] as String? ?? '';

      if (waiterCallStatus == 'pending') {
        _waiterVanishTimer?.cancel();
        setState(() {
          _showWaiterStatus = true;
          _waiterStatusText = 'Request Made';
          _waiterStatusOption = waiterCallOption;
        });
      } else if (waiterCallStatus == 'serviced') {
        if (_showWaiterStatus && _waiterStatusText == 'Request Made') {
          setState(() {
            _waiterStatusText = 'Request Accepted';
          });
          _waiterVanishTimer?.cancel();
          _waiterVanishTimer = Timer(const Duration(seconds: 5), () {
            if (mounted) {
              setState(() {
                _showWaiterStatus = false;
              });
            }
          });
        }
      }

      final orderStatus = (data['orderStatus'] as String? ?? '').toLowerCase();

      if (orderStatus == 'cancelled') {
        // Show status bar as "Order Cancelled" for 3 seconds, then vanish. NO Thank You popup.
        setState(() {
          _tableSession = data;
        });
        _cancelledVanishTimer?.cancel();
        _cancelledVanishTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() {
              _tableSession = null;
              _showOrderDetailsModal = false;
            });
          }
        });
        return;
      }

      if (status == 'close_table') {
        _adPlayer.pause();
        _cancelIdleTimer();
        setState(() {
          _tableSession = data;
          _isIdle = true;
        });
      } else if (status == 'active') {
        setState(() {
          _tableSession = data;
        });
      } else if (status == 'completed') {
        final prevOrderStatus = (_tableSession?['orderStatus'] as String? ?? '').toLowerCase();
        final prevAmount = _tableSession?['amount'] as int? ?? 0;

        if (prevOrderStatus == 'cancelled') {
          // If previous state was cancelled, just clear without Thank You popup
          _returnToAds();
          return;
        }

        setState(() => _tableSession = null);
        
        if (prevAmount > 0) {
          // Show Thank You Popup
          BuildContext? dialogContext;
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (dialogCtx) {
              dialogContext = dialogCtx;
              return AlertDialog(
                shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
                backgroundColor: kCardBg,
                content: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SvgPicture.asset(
                        'assets/digiads-logo.svg',
                        width: 260,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Thank You!',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: kTextDark,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Do visit again.',
                        style: TextStyle(
                          fontSize: 16,
                          color: kTextGrey,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );

          // Auto dismiss after 3 seconds and return to ads
          Future.delayed(const Duration(seconds: 3), () {
            if (mounted) {
              if (dialogContext != null && dialogContext!.mounted) {
                Navigator.pop(dialogContext!);
              }
              _returnToAds();
            }
          });
        } else {
          // No amount → return to ads immediately (no Thank You popup)
          _returnToAds();
        }
      }
    } catch (e) {
      debugPrint('Failed to parse table session: $e');
    }
  }

  // ────────────────── Order placement ──────────────────

  void _placeOrder() {
    if (!_isOnline) return;
    final snapshot = _cart.value;
    if (snapshot.isEmpty) return;
    final menuItems = _menu.value.items;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => OrderCheckoutModal(
        orderClient: _orderClient!,
        callOptions: _callOptions!,
        deviceId: widget.deviceId,
        tableNumber: _tableNumber,
        menuItems: menuItems,
        cart: snapshot.toMap(),
        totalAmountPaise: (snapshot.totalPrice(menuItems) * 100).toInt(),
        onOrderCompleted: () {
          _cart.clear();
          setState(() {
            _isIdle = true;
            _showCart = false;
          });
          _adPlayer.resume();
          _cancelIdleTimer();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Order placed successfully! Sent to kitchen."),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  // ────────────────── Unlock/Reset ──────────────────

  void _enableLockTaskMode() async {
    try {
      await _perfChannel.invokeMethod('startKioskMode');
    } catch (e) {
      debugPrint('Lock task mode start skipped or not supported: $e');
    }
  }

  void _promptUnlock() {
    _passwordController.clear();
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
        title: const Text("Enter Exit Password"),
        content: TextField(
          controller: _passwordController,
          obscureText: true,
          autofocus: true,
          decoration: const InputDecoration(hintText: "Enter password to exit kiosk"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              final entered = _passwordController.text.trim();
              String expected = widget.bypassPassword.trim();
              if (expected.isEmpty) {
                final prefs = await SharedPreferences.getInstance();
                expected = (prefs.getString('bypassPassword') ?? '').trim();
              }

              if (entered.isNotEmpty && entered == expected) {
                if (dialogCtx.mounted) {
                  Navigator.pop(dialogCtx);
                }
                if (mounted) {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (settingsCtx) => SettingsScreen(
                        serverHost: widget.serverHost,
                        deviceId: widget.deviceId,
                        token: widget.token,
                        hostApplicationId: widget.hostApplicationId,
                        bypassPassword: expected,
                        tableNumber: _tableNumber,
                        onBackToKiosk: () {
                          _enableLockTaskMode();
                          Navigator.of(settingsCtx).pop();
                        },
                      ),
                    ),
                  );
                  if (mounted) {
                    _enableLockTaskMode();
                    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
                  }
                }
              } else {
                if (dialogCtx.mounted) {
                  ScaffoldMessenger.of(dialogCtx).showSnackBar(
                    const SnackBar(content: Text("Incorrect password")),
                  );
                }
              }
            },
            child: const Text("Unlock"),
          )
        ],
      ),
    );
  }

  // ────────────────── Lifecycle ──────────────────

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _socket?.close();
    _wsPingTimer?.cancel();
    _otaCheckTimer?.cancel();
    _wsReconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _inactivityTimer?.cancel();
    _backOnlineTimer?.cancel();
    _waiterVanishTimer?.cancel();
    _cancelledVanishTimer?.cancel();
    _passwordController.dispose();
    _adPlayer.dispose();
    _adSync.dispose();
    _imageCache.dispose();
    _cart.dispose();
    _menu.dispose();
    _channel?.shutdown();
    super.dispose();
  }

  // ────────────────── Build ──────────────────

  @override
  Widget build(BuildContext context) {
    if (!_kioskReady) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/SplashScreen.png',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
            const Positioned(
              bottom: 80,
              left: 0,
              right: 0,
              child: Column(
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white54,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Preparing your experience…',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 13,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            // Show download progress during initial sync
            DownloadProgressIndicator(progress: _adSync.progress),
          ],
        ),
      );
    }

    if (_isIdle) {
      // Show payment QR if table is in close_table mode
      if (_tableSession != null && _tableSession!['status'] == 'close_table') {
        return PaymentQrWidget(
          upiUrl: _tableSession!['upiUrl'] as String? ?? '',
          amountPaise: _tableSession!['amount'] as int? ?? 0,
          orderId: _tableSession!['orderId'] as String? ?? '',
          tableNumber: _tableSession!['tableNumber'] as String? ?? '',
          onUnlock: _promptUnlock,
          items: _tableSession!['items'] as List<dynamic>?,
          subtotalPaise: _tableSession!['subtotal'] as int?,
          cgstPaise: _tableSession!['cgst'] as int?,
          sgstPaise: _tableSession!['sgst'] as int?,
          gstPaise: _tableSession!['gst'] as int?,
          serviceTaxPaise: _tableSession!['serviceTax'] as int?,
          otherChargesPaise: _tableSession!['otherCharges'] as int?,
          roundOffPaise: _tableSession!['roundOff'] as int?,
          cgstPercent: (_tableSession!['cgstPercent'] as num?)?.toDouble(),
          sgstPercent: (_tableSession!['sgstPercent'] as num?)?.toDouble(),
          serviceTaxPercent: (_tableSession!['serviceTaxPercent'] as num?)?.toDouble(),
        );
      }

      return Scaffold(
        body: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: (_) {
            _dismissBackOnlineBanner();
            _enterMenuMode();
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              AdViewWidget(
                playerState: _adPlayer.state,
                deviceId: widget.deviceId,
                adCampaigns: _adSync.adCampaigns,
              ),
              // Show download progress during background sync
              DownloadProgressIndicator(progress: _adSync.progress),
              // Non-blocking back-online banner (auto-dismisses in 3s, tap anywhere)
              if (_backOnlineVisible) _buildBackOnlineBanner(),
              // Floating unplaced cart resume indicator (appears only when items are in cart)
              ValueListenableBuilder<CartSnapshot>(
                valueListenable: _cart,
                builder: (context, cart, _) {
                  if (cart.isEmpty) return const SizedBox.shrink();
                  return Positioned(
                    bottom: 28,
                    right: 28,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(30),
                        onTap: () {
                          _dismissBackOnlineBanner();
                          _enterMenuMode();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xEE111827),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                                color: kAccentBlue, width: 1.5),
                            boxShadow: const [
                              BoxShadow(
                                color: Colors.black54,
                                blurRadius: 16,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.shopping_bag_outlined,
                                  color: kAccentBlue, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                '${cart.totalItemCount} ${cart.totalItemCount == 1 ? "item" : "items"} in cart — Tap to order',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(Icons.arrow_forward_ios_rounded,
                                  color: kAccentBlue, size: 12),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      );
    }

    return Listener(
      onPointerDown: (_) {
        if (_backOnlineVisible) _dismissBackOnlineBanner();
        _resetIdleTimer();
      },
      child: Scaffold(
        backgroundColor: kScaffoldBg,
        body: SafeArea(
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!_isOnline) _buildOfflineBanner(),
                  _buildHeader(),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Divider(color: kDividerColor, height: 1),
                  ),
                  Expanded(
                    child: _showCart ? _buildCartBody() : _buildMenuBody(),
                  ),
                ],
              ),
              // Show download progress during background sync
              DownloadProgressIndicator(progress: _adSync.progress),
              // Non-blocking back-online banner (auto-dismisses in 3s, tap anywhere)
              if (_backOnlineVisible) _buildBackOnlineBanner(),
              // Order Items List Popup Modal (No amounts, touch anywhere or OK to dismiss)
              if (_showOrderDetailsModal) _buildOrderDetailsModal(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackOnlineBanner() {
    return Positioned(
      top: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Container(
            key: const ValueKey('back-online-banner'),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.green.shade600,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_done_rounded, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text(
                  'Back Online',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: Colors.orange.shade800,
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_rounded, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Text(
            'Server Offline — Browsing only',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartBody() {
    final isMobile = MediaQuery.sizeOf(context).width < 600;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        isMobile ? 12 : 40,
        isMobile ? 8 : 24,
        isMobile ? 12 : 40,
        isMobile ? 12 : 24,
      ),
      child: Column(
        children: [
          Expanded(
            child: OrderSummaryPanel(
              cartNotifier: _cart,
              menuItems: _menu.value.items,
              showHeader: false,
              onPlaceOrder: _isOnline ? _placeOrder : () {},
              serverHost: widget.serverHost,
              imageCache: _imageCache,
            ),
          ),
          if (!_isOnline)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_off_rounded, color: Colors.white54, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Checkout Unavailable — Connecting…',
                    style: TextStyle(
                      color: Colors.white54,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMenuBody() {
    final isMobile = MediaQuery.sizeOf(context).width < 600;

    return Stack(
      children: [
        if (isMobile)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHorizontalCategoryBar(),
              Container(height: 1, color: kDividerColor),
              Expanded(
                child: MenuCatalogWidget(
                  menuNotifier: _menu,
                  cartNotifier: _cart,
                  serverHost: widget.serverHost,
                  viewportHeight: MediaQuery.of(context).size.height,
                  selectedCategory: _selectedCategory,
                  imageCache: _imageCache,
                  isOnline: _isOnline,
                ),
              ),
            ],
          )
        else
          Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSidebar(),
              Container(width: 1, color: kDividerColor),
              Expanded(
                child: MenuCatalogWidget(
                  menuNotifier: _menu,
                  cartNotifier: _cart,
                  serverHost: widget.serverHost,
                  viewportHeight: MediaQuery.of(context).size.height,
                  selectedCategory: _selectedCategory,
                  imageCache: _imageCache,
                  isOnline: _isOnline,
                ),
              ),
            ],
          ),
        _buildFloatingCartBar(),
        _buildLiveSessionStatusBar(),
      ],
    );
  }

  Widget _buildHeader() {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isMobile = screenWidth < 600;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        isMobile ? 12 : 24,
        isMobile ? 10 : 20,
        isMobile ? 12 : 24,
        isMobile ? 8 : 16,
      ),
      child: Row(
        children: [
          if (_showCart) ...[
            ElevatedButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                setState(() => _showCart = false);
              },
              icon: Icon(Icons.arrow_back_rounded, color: Colors.white, size: isMobile ? 16 : 24),
              label: Text(
                "BACK",
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: isMobile ? 12 : 15,
                  color: Colors.white,
                  letterSpacing: isMobile ? 0.5 : 1,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: kAccentBlue,
                minimumSize: isMobile ? const Size(76, 40) : const Size(120, 56),
                padding: EdgeInsets.symmetric(
                  horizontal: isMobile ? 10 : 24,
                  vertical: isMobile ? 8 : 18,
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 3,
              ),
            ),
            SizedBox(width: isMobile ? 8 : 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _showCart
                    ? (isMobile
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                "Your Cart",
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: kTextDark,
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                "${_outletName.toUpperCase()} (Table $_tableNumber)",
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: kTextGrey,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          )
                        : Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(
                                  text: "${_outletName.toUpperCase()} ",
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: kAccentBlue,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                TextSpan(
                                  text: "(Table $_tableNumber)",
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.normal,
                                    color: kTextGrey,
                                  ),
                                ),
                              ],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ))
                    : Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: _outletName,
                              style: TextStyle(
                                fontSize: isMobile ? 18 : 26,
                                fontWeight: FontWeight.w800,
                                color: kTextDark,
                                letterSpacing: 0.3,
                                height: 1.15,
                              ),
                            ),
                            TextSpan(
                              text: "  •  Table $_tableNumber",
                              style: TextStyle(
                                fontSize: isMobile ? 12 : 15,
                                fontWeight: FontWeight.normal,
                                color: kTextGrey,
                                height: 1.15,
                              ),
                            ),
                          ],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                if (_showCart && !isMobile) ...[
                  const SizedBox(height: 2),
                  const Text(
                    "Your Cart",
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: kTextDark,
                    ),
                  ),
                ],
              ],
            ),
          ),
          SizedBox(width: isMobile ? 6 : 16),
          ElevatedButton.icon(
            onPressed: _showCallWaiterDialog,
            icon: Icon(Icons.room_service_rounded, color: Colors.white, size: isMobile ? 14 : 20),
            label: Text(
              isMobile ? "WAITER" : "CALL WAITER",
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: isMobile ? 10 : 14,
                color: Colors.white,
                letterSpacing: 0.6,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: kAccentBlue,
              padding: EdgeInsets.symmetric(
                horizontal: isMobile ? 8 : 20,
                vertical: isMobile ? 8 : 16,
              ),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 3,
            ),
          ),
          SizedBox(width: isMobile ? 6 : 16),
          GestureDetector(
            onTap: _onBrandIconTapped,
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              height: isMobile ? 32 : 52,
              width: isMobile ? 32 : 52,
              child: SvgPicture.asset(
                'assets/digiads-icon.svg',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCallWaiterDialog() {
    showDialog(
      context: context,
      builder: (dialogCtx) {
        return AlertDialog(
          backgroundColor: kCardBg,
          shape: const RoundedRectangleBorder(borderRadius: kCardBorderRadius),
          title: const Text(
            "How can we help you?",
            style: TextStyle(fontWeight: FontWeight.bold, color: kTextDark, fontSize: 22),
            textAlign: TextAlign.center,
          ),
          content: Container(
            width: 320,
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(child: _buildWaiterOptionCard(dialogCtx, "Water", Icons.local_drink_rounded)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildWaiterOptionCard(dialogCtx, "Cutlery", Icons.flatware_rounded)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildWaiterOptionCard(dialogCtx, "Cleaning", Icons.cleaning_services_rounded)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildWaiterOptionCard(dialogCtx, "Others", Icons.help_outline_rounded)),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text(
                "Cancel",
                style: TextStyle(color: kTextGrey, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildWaiterOptionCard(BuildContext dialogCtx, String option, IconData icon) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: InkWell(
        onTap: () {
          Navigator.pop(dialogCtx);
          _triggerCallWaiter(option);
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: kSidebarBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: kDividerColor, width: 1.5),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: kAccentBlue, size: 40),
              const SizedBox(height: 12),
              Text(
                option,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: kTextDark,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _triggerCallWaiter(String option) async {
    try {
      _waiterVanishTimer?.cancel();
      setState(() {
        _showWaiterStatus = true;
        _waiterStatusText = 'Request Made';
        _waiterStatusOption = option;
      });

      if (_socket != null && _isWsConnected) {
        _socket!.add(jsonEncode({
          'event': 'call_waiter',
          'waiterOption': option,
          'tableNumber': _tableNumber
        }));
      } else if (_deviceClient != null) {
        final req = HeartbeatRequest()
          ..deviceId = widget.deviceId
          ..callWaiter = true
          ..waiterOption = option
          ..tableNumber = _tableNumber;
        _deviceClient!.sendHeartbeat(req, options: _callOptions).then((resp) {
          debugPrint('[gRPC] Call waiter acknowledged by server');
        }).catchError((err) {
          debugPrint('[gRPC] Call waiter fallback error: $err');
          return null;
        });
      }
    } catch (e) {
      debugPrint('Call waiter failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Failed to call waiter. Please try again."),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  List<String> _computeCategories() {
    const defaultCategoriesOrder = ['Popular', 'Starters', 'Main Course', 'Dessert', 'Beverages'];
    final categories = <String>['Popular']; // Always include 'Popular' as category #1

    for (final cat in ['Starters', 'Main Course', 'Dessert', 'Beverages']) {
      if (_menu.value.items.any((item) => item.category.toLowerCase() == cat.toLowerCase())) {
        categories.add(cat);
      }
    }
    for (final item in _menu.value.items) {
      if (!defaultCategoriesOrder.any((cat) => cat.toLowerCase() == item.category.toLowerCase()) &&
          !categories.contains(item.category)) {
        categories.add(item.category);
      }
    }
    if (categories.isEmpty) categories.addAll(defaultCategoriesOrder);

    // If active category not in available list, default to first category
    if (!categories.any((c) => c.toLowerCase() == _selectedCategory.toLowerCase())) {
      _selectedCategory = categories.first;
    }
    return categories;
  }

  Widget _buildHorizontalCategoryBar() {
    final categories = _computeCategories();

    return Container(
      height: 52,
      color: kSidebarBg,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = cat.toLowerCase() == _selectedCategory.toLowerCase();
          final iconData = getCategoryIcon(cat);

          return Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedCategory = cat);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? kAccentBlue : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? kAccentBlue : Colors.grey.shade300,
                    width: 1.5,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: kAccentBlue.withValues(alpha: 0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          )
                        ]
                      : const [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 3,
                            offset: Offset(0, 1),
                          )
                        ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      iconData,
                      size: 18,
                      color: isSelected ? Colors.white : kTextDark,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      cat,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        color: isSelected ? Colors.white : kTextDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSidebar() {
    final categories = _computeCategories();

    return Container(
      width: 120,
      color: kSidebarBg,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 0),
      child: Column(
        children: [
          Expanded(
            child: ListView.separated(
              itemCount: categories.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final cat = categories[index];
                final isSelected = cat.toLowerCase() == _selectedCategory.toLowerCase();

                final iconData = getCategoryIcon(cat);

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() => _selectedCategory = cat);
                    },
                    child: SizedBox(
                      height: 72,
                      child: Stack(
                        children: [
                          // Vertical left-edge active pill indicator matching reference UI
                          if (isSelected)
                            Positioned(
                              left: 0,
                              top: 16,
                              bottom: 16,
                              child: Container(
                                width: 5,
                                decoration: const BoxDecoration(
                                  color: kAccentBlue,
                                  borderRadius: BorderRadius.horizontal(right: Radius.circular(4)),
                                ),
                              ),
                            ),
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    iconData,
                                    color: isSelected ? kTextDark : kTextDark.withValues(alpha: 0.75),
                                    size: 28,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    cat,
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                      color: isSelected ? kTextDark : kTextDark.withValues(alpha: 0.8),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingCartBar() {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: _cart,
      builder: (context, cart, _) {
        if (cart.isEmpty) return const SizedBox.shrink();

        final isMobile = MediaQuery.sizeOf(context).width < 600;

        return Positioned(
          bottom: isMobile ? 16 : 24,
          left: isMobile ? 16 : 144,
          right: isMobile ? 16 : 24,
          child: GestureDetector(
            onTap: _isOnline ? () => setState(() => _showCart = true) : null,
            child: Container(
              height: isMobile ? 64 : 72,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: kFloatingCartBorderRadius,
                border: Border.all(
                  color: const Color(0xFF1E1B4B),
                  width: 2.0,
                ),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
                ],
              ),
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 14 : 24, vertical: isMobile ? 6 : 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        decoration: const BoxDecoration(color: kAccentBlue, shape: BoxShape.circle),
                        padding: EdgeInsets.all(isMobile ? 8 : 10),
                        child: Badge(
                          isLabelVisible: cart.isNotEmpty,
                          label: Text('${cart.totalItemCount}', style: const TextStyle(color: Colors.white)),
                          child: Icon(Icons.shopping_cart_outlined, color: Colors.white, size: isMobile ? 18 : 20),
                        ),
                      ),
                      SizedBox(width: isMobile ? 10 : 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                              "${cart.totalItemCount} ${cart.totalItemCount == 1 ? "item" : "items"} in cart",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: isMobile ? 13 : 15,
                                  color: kTextDark)),
                          Text("Total: Rs. ${cart.totalPrice(_menu.value.items).toStringAsFixed(2)}",
                              style: TextStyle(fontSize: isMobile ? 11 : 12, color: kTextGrey)),
                        ],
                      ),
                    ],
                  ),
                  if (_isOnline)
                    Container(
                      decoration: BoxDecoration(
                        color: kAccentBlue,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: EdgeInsets.symmetric(horizontal: isMobile ? 14 : 24, vertical: isMobile ? 10 : 12),
                      child: Row(
                        children: [
                          Text("View Cart", style: TextStyle(fontWeight: FontWeight.bold, fontSize: isMobile ? 12 : 14, color: Colors.white)),
                          const SizedBox(width: 6),
                          const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.cloud_off_rounded, size: 16, color: Colors.grey),
                          SizedBox(width: 6),
                          Text('Offline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLiveSessionStatusBar() {
    return ValueListenableBuilder<CartSnapshot>(
      valueListenable: _cart,
      builder: (context, cart, _) {
        if (cart.isNotEmpty) {
          return const SizedBox.shrink();
        }

        final isMobile = MediaQuery.sizeOf(context).width < 600;

        if (_showWaiterStatus) {
          final isAccepted = _waiterStatusText == 'Request Accepted';
          return Positioned(
            bottom: isMobile ? 16 : 24,
            left: isMobile ? 16 : 144,
            right: isMobile ? 16 : 24,
            child: Container(
              height: isMobile ? 64 : 76,
              decoration: BoxDecoration(
                color: isAccepted ? const Color(0xFF059669) : Colors.red.shade600,
                borderRadius: kFloatingCartBorderRadius,
                border: Border.all(color: isAccepted ? Colors.green.shade900 : Colors.red.shade900, width: 3.0),
                boxShadow: const [
                  BoxShadow(color: Colors.black38, blurRadius: 12, offset: Offset(0, 4)),
                ],
              ),
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 14 : 24, vertical: isMobile ? 6 : 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                        padding: EdgeInsets.all(isMobile ? 8 : 10),
                        child: Icon(
                          isAccepted ? Icons.check_circle_outline_rounded : Icons.room_service_rounded,
                          color: Colors.white,
                          size: isMobile ? 18 : 22,
                        ),
                      ),
                      SizedBox(width: isMobile ? 10 : 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _waiterStatusText,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: isMobile ? 13 : 15,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            "Service requested: $_waiterStatusOption",
                            style: TextStyle(
                              fontSize: isMobile ? 10 : 11,
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }

        if (_tableSession == null) {
          return const SizedBox.shrink();
        }

        final rawItems = _tableSession!['items'] as List<dynamic>? ?? [];
        final amountPaise = _tableSession!['amount'] as int? ?? 0;

        // If there are no food items and total amount is 0, this is only a service/waiter request, not an active food order
        if (rawItems.isEmpty && amountPaise == 0) {
          return const SizedBox.shrink();
        }

        final orderStatus = (_tableSession!['orderStatus'] as String? ?? 'placed').toLowerCase();
        final tableStatus = (_tableSession!['status'] as String? ?? '').toLowerCase();

        // Only hide if completed session and NOT a cancelled order being displayed for 3s
        if (tableStatus == 'completed' && orderStatus != 'cancelled') {
          return const SizedBox.shrink();
        }
        final orderId = _tableSession!['orderId'] as String? ?? '';
        int rawSubtotalPaise = _tableSession!['subtotal'] as int? ?? 0;
        if (rawSubtotalPaise <= 0) {
          for (final item in rawItems) {
            if (item is Map) {
              final p = item['price'] as int? ?? 0;
              final q = item['quantity'] as int? ?? 1;
              rawSubtotalPaise += (p * q);
            }
          }
        }
        final displayPaise = rawSubtotalPaise > 0 ? rawSubtotalPaise : amountPaise;
        final displayFormatted = (displayPaise / 100).toStringAsFixed(2);
        final bool isCancelled = orderStatus == 'cancelled';

        IconData iconData;
        String statusTitle;
        String statusSubtitle;

        switch (orderStatus.toLowerCase()) {
          case 'placed':
            iconData = Icons.watch_later_outlined;
            statusTitle = 'Order Placed';
            statusSubtitle = 'Waiting for kitchen confirmation…';
            break;
          case 'confirmed':
          case 'preparing':
            iconData = Icons.check_circle_outline_rounded;
            statusTitle = 'Order Confirmed';
            statusSubtitle = 'Preparing your food shortly…';
            break;
          case 'cooking':
            iconData = Icons.soup_kitchen;
            statusTitle = 'Preparing & Cooking';
            statusSubtitle = 'Chefs are working on your food!';
            break;
          case 'served':
            iconData = Icons.restaurant_rounded;
            statusTitle = 'Delivered & Served';
            statusSubtitle = 'Enjoy your meal!';
            break;
          case 'cancelled':
            iconData = Icons.cancel_outlined;
            statusTitle = 'Order Cancelled';
            statusSubtitle = 'Please contact the staff.';
            break;
          default:
            iconData = Icons.receipt_long_rounded;
            statusTitle = 'Active Order';
            statusSubtitle = 'Status: $orderStatus';
        }

        return Positioned(
          bottom: isMobile ? 16 : 24,
          left: isMobile ? 16 : 144,
          right: isMobile ? 16 : 24,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: kFloatingCartBorderRadius,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _showOrderDetailsModal = true);
              },
              child: Container(
                height: isMobile ? 64 : 76,
                decoration: BoxDecoration(
                  color: isCancelled ? Colors.red.shade700 : kAccentBlue,
                  borderRadius: kFloatingCartBorderRadius,
                  border: Border.all(
                    color: isCancelled ? Colors.red.shade900 : const Color(0xFF1E1B4B),
                    width: 3.0,
                  ),
                  boxShadow: const [
                    BoxShadow(color: Colors.black38, blurRadius: 12, offset: Offset(0, 4)),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                            padding: const EdgeInsets.all(10),
                            child: Icon(iconData, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  statusTitle,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: Colors.white,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  statusSubtitle,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.white.withValues(alpha: 0.85),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Row(
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                displayPaise > 0 ? 'Total: ₹$displayFormatted' : 'Order Placed',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                  color: Colors.white,
                                ),
                              ),
                              if (orderId.isNotEmpty)
                                Text(
                                  'ID: ${orderId.length > 8 ? "${orderId.substring(0, 8)}..." : orderId}',
                                  style: TextStyle(
                                    fontSize: 9,
                                    color: Colors.white.withValues(alpha: 0.75),
                                    fontFamily: 'monospace',
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 22),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildOrderDetailsModal() {
    if (!_showOrderDetailsModal || _tableSession == null) {
      return const SizedBox.shrink();
    }

    final rawItems = _tableSession!['items'] as List<dynamic>? ?? [];
    if (rawItems.isEmpty) {
      return const SizedBox.shrink();
    }
    final orderId = _tableSession!['orderId'] as String? ?? '';
    final orderStatus = _tableSession!['orderStatus'] as String? ?? 'placed';

    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.65),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(24),
        child: Material(
          color: kCardBg,
          borderRadius: kCardBorderRadius,
          elevation: 12,
          clipBehavior: Clip.hardEdge,
          child: Container(
            width: 480,
            constraints: const BoxConstraints(maxHeight: 520),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: kAccentBlue.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.restaurant_menu_rounded, color: kAccentBlue, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Ordered Food Items",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextDark),
                            ),
                            Text(
                              "Status: ${orderStatus.toUpperCase()} • ID: $orderId",
                              style: const TextStyle(fontSize: 11, color: kTextGrey, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: kTextGrey),
                      onPressed: () => setState(() => _showOrderDetailsModal = false),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: Colors.black12),
                const SizedBox(height: 16),

                // Food Items List (Scrollable, touch-safe)
                Flexible(
                  child: rawItems.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: Text("No items found in active order.", style: TextStyle(color: kTextGrey)),
                          ),
                        )
                      : ListView.separated(
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          shrinkWrap: true,
                          itemCount: rawItems.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = rawItems[index];
                            final name = item['name'] as String? ?? 'Item';
                            final qty = item['quantity'] as int? ?? 1;

                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: kScaffoldBg,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: kTextDark,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: kAccentBlue.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      "x $qty",
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 13,
                                        color: kAccentBlue,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 20),

                // Primary OK Button (ONLY this button or top X dismisses modal)
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kAccentBlue,
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      setState(() => _showOrderDetailsModal = false);
                    },
                    child: const Text(
                      "OK",
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        letterSpacing: 1.2,
                      ),
                    ),
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
