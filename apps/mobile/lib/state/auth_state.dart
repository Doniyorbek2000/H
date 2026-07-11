import 'package:flutter/foundation.dart';

import '../api/api_client.dart';

/// Autentifikatsiya holati (provider)
class AuthState extends ChangeNotifier {
  Map<String, dynamic>? user;
  bool loading = true;

  bool get isLoggedIn => user != null;

  Future<void> init() async {
    await ApiClient.instance.init();
    final token = await ApiClient.instance.accessToken;
    if (token != null) {
      try {
        final res = await ApiClient.instance.get('/auth/me');
        user = res.data as Map<String, dynamic>;
      } catch (_) {
        user = null;
      }
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String identifier, String password) async {
    final data = await ApiClient.instance.post('/auth/login', {
      'identifier': identifier,
      'password': password,
    });
    await ApiClient.instance.saveTokens(data['accessToken'], data['refreshToken']);
    user = data['user'] as Map<String, dynamic>;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await ApiClient.instance.post('/auth/logout', {});
    } catch (_) {}
    await ApiClient.instance.clearTokens();
    user = null;
    notifyListeners();
  }
}
