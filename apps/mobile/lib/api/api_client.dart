import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// API javobi: ma'lumot + offline keshdan kelgan-kelmagani
class ApiResult {
  final dynamic data;
  final bool fromCache;
  ApiResult(this.data, {this.fromCache = false});
}

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => message;
}

/// Backend bilan ishlash: JWT + refresh rotation + offline kesh.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const _storage = FlutterSecureStorage();
  String baseUrl = 'http://10.0.2.2:3001'; // Android emulator -> host

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString('server_url') ?? baseUrl;
  }

  Future<void> setServer(String url) async {
    baseUrl = url.replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', baseUrl);
  }

  Future<String?> get accessToken => _storage.read(key: 'access');
  Future<String?> get refreshToken => _storage.read(key: 'refresh');

  Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: 'access', value: access);
    await _storage.write(key: 'refresh', value: refresh);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: 'access');
    await _storage.delete(key: 'refresh');
  }

  Future<Map<String, String>> _headers({bool json = true}) async {
    final token = await accessToken;
    return {
      if (json) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<bool> _tryRefresh() async {
    final refresh = await refreshToken;
    if (refresh == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      );
      if (res.statusCode >= 400) return false;
      final data = jsonDecode(res.body);
      await saveTokens(data['accessToken'], data['refreshToken']);
      return true;
    } catch (_) {
      return false;
    }
  }

  Never _throw(http.Response res) {
    String message = 'Xatolik: ${res.statusCode}';
    try {
      final body = jsonDecode(res.body);
      final m = body['message'];
      message = m is List ? m.join('; ') : (m ?? message).toString();
    } catch (_) {}
    throw ApiException(res.statusCode, message);
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Object? body,
    bool retried = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _headers();
    late http.Response res;
    switch (method) {
      case 'GET':
        res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 20));
      case 'POST':
        res = await http
            .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(const Duration(seconds: 30));
      case 'PATCH':
        res = await http
            .patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(const Duration(seconds: 30));
      case 'DELETE':
        res = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 30));
      default:
        throw ArgumentError(method);
    }
    if (res.statusCode == 401 && !retried && await _tryRefresh()) {
      return _send(method, path, body: body, retried: true);
    }
    return res;
  }

  /// GET — muvaffaqiyatda keshga yozadi, tarmoq xatosida keshdan qaytaradi (offline rejim)
  Future<ApiResult> get(String path) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final res = await _send('GET', path);
      if (res.statusCode >= 400) _throw(res);
      await prefs.setString('cache:$path', res.body);
      return ApiResult(jsonDecode(res.body));
    } on ApiException {
      rethrow;
    } catch (_) {
      final cached = prefs.getString('cache:$path');
      if (cached != null) return ApiResult(jsonDecode(cached), fromCache: true);
      throw ApiException(0, 'Internet yo‘q va keshda ma’lumot topilmadi');
    }
  }

  Future<dynamic> post(String path, [Object? body]) async {
    final res = await _send('POST', path, body: body);
    if (res.statusCode >= 400) _throw(res);
    return res.body.isEmpty ? null : jsonDecode(res.body);
  }

  Future<dynamic> patch(String path, [Object? body]) async {
    final res = await _send('PATCH', path, body: body);
    if (res.statusCode >= 400) _throw(res);
    return res.body.isEmpty ? null : jsonDecode(res.body);
  }

  /// Fayl(lar)ni murojaatga biriktirish (multipart)
  Future<void> uploadAttachments(
    String appealId,
    List<({List<int> bytes, String filename, String mime})> files,
  ) async {
    final req = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/appeals/$appealId/attachments'),
    );
    final token = await accessToken;
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    for (final f in files) {
      final parts = f.mime.split('/');
      req.files.add(http.MultipartFile.fromBytes(
        'files',
        f.bytes,
        filename: f.filename,
        contentType: MediaType(parts[0], parts.length > 1 ? parts[1] : 'octet-stream'),
      ));
    }
    final streamed = await req.send().timeout(const Duration(seconds: 60));
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 401 && await _tryRefresh()) {
      return uploadAttachments(appealId, files);
    }
    if (res.statusCode >= 400) _throw(res);
  }
}
