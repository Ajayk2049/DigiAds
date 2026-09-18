import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/websocket_service.dart';
import '../utils/error_utils.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final WebSocketService _wsService = WebSocketService();

  UserModel? _user;
  bool _isInitializing = true;
  bool _isLoading = false;
  String? _error;
  Timer? _errorTimer;
  String _themeMode = 'light'; // 'light' | 'dark'

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isInitializing => _isInitializing;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == 'dark';

  void _setError(String? err) {
    _errorTimer?.cancel();
    _error = err;
    if (err != null) {
      _errorTimer = Timer(const Duration(seconds: 5), () {
        _error = null;
        notifyListeners();
      });
    }
  }

  void clearError() {
    _errorTimer?.cancel();
    if (_error != null) {
      _error = null;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _errorTimer?.cancel();
    super.dispose();
  }

  Future<void> init() async {
    _isInitializing = true;
    _isLoading = true;
    notifyListeners();

    await AppConfig.loadConfig();

    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTheme = prefs.getString('theme_mode');
      if (savedTheme != null) {
        _themeMode = savedTheme;
      }
    } catch (_) {}

    _user = await _authService.getSavedSession();
    if (_user != null) {
      _wsService.connect();
    }

    _isInitializing = false;
    _isLoading = false;
    notifyListeners();
  }

  void toggleTheme() async {
    _themeMode = _themeMode == 'light' ? 'dark' : 'light';
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('theme_mode', _themeMode);
    } catch (_) {}
  }

  Future<bool> sendOtp(String phone) async {
    _isLoading = true;
    _setError(null);
    notifyListeners();

    try {
      final success = await _authService.sendOtp(phone);
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _setError(ErrorUtils.parseError(e));
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    _setError(null);
    notifyListeners();

    try {
      final res = await _authService.verifyOtp(phone, otp);
      if (res['success'] == true) {
        _user = res['user'];
        _wsService.connect();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _setError(res['message'] ?? 'OTP verification failed');
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _setError(ErrorUtils.parseError(e));
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginWithPassword(String identifier, String password) async {
    _isLoading = true;
    _setError(null);
    notifyListeners();

    try {
      final res = await _authService.loginWithPassword(identifier, password);
      if (res['success'] == true) {
        _user = res['user'];
        _wsService.connect();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _setError(res['message'] ?? 'Login failed');
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _setError(ErrorUtils.parseError(e));
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> switchRole(String targetRole) async {
    _isLoading = true;
    _setError(null);
    notifyListeners();

    try {
      final updatedUser = await _authService.switchRole(targetRole);
      if (updatedUser != null) {
        _user = updatedUser;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _setError(ErrorUtils.parseError(e));
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _wsService.disconnect();
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
