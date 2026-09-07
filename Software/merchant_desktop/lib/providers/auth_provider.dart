import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/websocket_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final WebSocketService _wsService = WebSocketService();

  UserModel? _user;
  bool _isLoading = false;
  String? _error;
  String _themeMode = 'light'; // 'light' | 'dark'

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == 'dark';

  Future<void> init() async {
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
    _error = null;
    notifyListeners();

    try {
      final success = await _authService.sendOtp(phone);
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    _error = null;
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
        _error = res['message'] ?? 'OTP verification failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginWithPassword(String identifier, String password) async {
    _isLoading = true;
    _error = null;
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
        _error = res['message'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> switchRole(String targetRole) async {
    _isLoading = true;
    _error = null;
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
      _error = e.toString();
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
