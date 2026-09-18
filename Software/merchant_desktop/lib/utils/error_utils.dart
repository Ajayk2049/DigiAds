import 'package:dio/dio.dart';

/// Centralized Error Parser Utility
/// Extracts and transforms raw network and Dio exceptions into user-friendly messages.
/// Strictly avoids exposing raw IP addresses, internal domains, or verbose stack traces.
class ErrorUtils {
  static String parseError(dynamic e) {
    if (e == null) return 'An unexpected error occurred.';

    if (e is DioException) {
      // 1. Check if backend returned a structured error message in the response
      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map) {
          final msg = data['message'] ?? data['error'] ?? data['msg'];
          if (msg != null && msg.toString().trim().isNotEmpty) {
            return _cleanText(msg.toString().trim());
          }
        } else if (data is String &&
            data.trim().isNotEmpty &&
            !data.contains('<!DOCTYPE html>') &&
            data.length < 200) {
          return _cleanText(data.trim());
        }
      }

      // 2. Map DioException types to clean messages
      switch (e.type) {
        case DioExceptionType.connectionError:
          final underlying = e.error?.toString().toLowerCase() ?? '';
          if (underlying.contains('refused') || underlying.contains('1225')) {
            return 'Unable to connect to the server. The server appears offline or the connection was refused.';
          }
          if (underlying.contains('failed host') ||
              underlying.contains('nodename') ||
              underlying.contains('not known')) {
            return 'Cannot resolve server address. Please check your internet connection or server settings.';
          }
          return 'Unable to reach the server. Please check your network connection.';

        case DioExceptionType.connectionTimeout:
          return 'Connection timed out while trying to reach the server. Please try again.';

        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'The server took too long to respond. Please try again.';

        case DioExceptionType.badResponse:
          final statusCode = e.response?.statusCode;
          if (statusCode == 401) {
            return 'Invalid credentials or unauthorized access.';
          } else if (statusCode == 403) {
            return 'Access denied. You do not have permission to perform this action.';
          } else if (statusCode == 404) {
            return 'The requested resource was not found on the server.';
          } else if (statusCode != null && statusCode >= 500) {
            return 'Internal server error. Please try again shortly.';
          }
          return 'Request failed with status code ${statusCode ?? 'unknown'}.';

        case DioExceptionType.cancel:
          return 'Request was cancelled.';

        case DioExceptionType.badCertificate:
          return 'Security certificate validation failed.';

        default:
          return 'Network error occurred. Please check your connection.';
      }
    }

    final raw = e.toString();
    if (raw.startsWith('Exception: ')) {
      return _cleanText(raw.substring('Exception: '.length));
    }

    final lower = raw.toLowerCase();
    if (lower.contains('socketexception') || lower.contains('connection refused')) {
      return 'Unable to connect to the server. The server appears offline or the connection was refused.';
    }

    return _cleanText(raw);
  }

  /// Strips out raw IP addresses, ports, or technical noise if present in server strings
  static String _cleanText(String text) {
    // Remove IPv4 addresses with optional ports e.g. 192.168.0.101:4000
    String cleaned = text.replaceAll(RegExp(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b'), '');
    // Remove common socket/dio clutter
    cleaned = cleaned.replaceAll(RegExp(r'DioException.*?:', caseSensitive: false), '');
    cleaned = cleaned.replaceAll(RegExp(r'SocketException.*?:', caseSensitive: false), '');
    cleaned = cleaned.replaceAll(RegExp(r'\(OS Error.*?\)', caseSensitive: false), '');
    cleaned = cleaned.replaceAll(RegExp(r'\s{2,}'), ' ').trim();
    return cleaned.isEmpty ? 'An unexpected error occurred.' : cleaned;
  }
}
