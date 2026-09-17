import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();

  String _formatPhone(String raw) {
    final trimmed = raw.trim();
    if (trimmed.startsWith('+')) {
      return '+${trimmed.replaceAll(RegExp(r'\D'), '')}';
    }
    final digits = trimmed.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10) {
      return '+91$digits';
    } else if (digits.length == 12 && digits.startsWith('91')) {
      return '+$digits';
    }
    return '+$digits';
  }

  Future<bool> sendOtp(String phone) async {
    final formattedPhone = _formatPhone(phone);
    final response = await _api.post('/auth/send-otp', data: {
      'phone': formattedPhone,
    });
    return response.data['success'] == true;
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    final formattedPhone = _formatPhone(phone);
    final response = await _api.post('/auth/verify-otp', data: {
      'phone': formattedPhone,
      'otp': otp,
    });

    if (response.data['success'] == true && response.data['data'] != null) {
      final token = response.data['data']['token'];
      final user = UserModel.fromJson(response.data['data']['user']);
      await _saveSession(token, user);
      return {'success': true, 'token': token, 'user': user};
    }
    return {'success': false, 'message': response.data['message'] ?? 'OTP verification failed'};
  }

  Future<Map<String, dynamic>> loginWithPassword(String identifier, String password) async {
    final clean = identifier.trim();
    String formattedIdentifier = clean;
    if (clean.startsWith('+')) {
      formattedIdentifier = '+${clean.replaceAll(RegExp(r'\D'), '')}';
    } else if (RegExp(r'^\d{10}$').hasMatch(clean)) {
      formattedIdentifier = '+91$clean';
    }

    final response = await _api.post('/auth/login', data: {
      'identifier': formattedIdentifier,
      'password': password,
    });

    if (response.data['success'] == true && response.data['data'] != null) {
      final token = response.data['data']['token'];
      final user = UserModel.fromJson(response.data['data']['user']);
      await _saveSession(token, user);
      return {'success': true, 'token': token, 'user': user};
    }
    return {'success': false, 'message': response.data['message'] ?? 'Login failed'};
  }

  Future<UserModel?> switchRole(String targetRole) async {
    final response = await _api.post('/auth/switch-role', data: {'role': targetRole});
    if (response.data['success'] == true && response.data['data'] != null) {
      final token = response.data['data']['token'];
      final user = UserModel.fromJson(response.data['data']['user']);
      await _saveSession(token, user);
      return user;
    }
    return null;
  }

  Future<void> _saveSession(String token, UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('user_id', user.id);
    await prefs.setString('user_name', user.name);
    await prefs.setString('user_phone', user.phone);
    await prefs.setString('user_email', user.email);
    await prefs.setString('user_role', user.role);
    await prefs.setStringList('user_roles', user.roles);
  }

  Future<UserModel?> getSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null || token.isEmpty) return null;

    return UserModel(
      id: prefs.getString('user_id') ?? '',
      name: prefs.getString('user_name') ?? '',
      phone: prefs.getString('user_phone') ?? '',
      email: prefs.getString('user_email') ?? '',
      role: prefs.getString('user_role') ?? 'merchant',
      roles: prefs.getStringList('user_roles') ?? ['merchant'],
    );
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_id');
    await prefs.remove('user_name');
    await prefs.remove('user_phone');
    await prefs.remove('user_email');
    await prefs.remove('user_role');
    await prefs.remove('user_roles');
  }
}
