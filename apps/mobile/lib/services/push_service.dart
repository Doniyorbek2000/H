import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../screens/appeal_detail_screen.dart';

/// Global navigator — push bosilganda kerakli sahifaga o'tish uchun.
final navigatorKey = GlobalKey<NavigatorState>();

/// FCM push xizmati.
/// Firebase konfiguratsiyasi (google-services.json / GoogleService-Info.plist)
/// bo'lmasa — jimgina o'chiriladi, ilova polling rejimida ishlashda davom etadi.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  bool enabled = false;

  Future<void> init() async {
    try {
      await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;

      // Ruxsat so'rash (iOS/Android 13+)
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      // Tokenni backendga yuborish
      final token = await messaging.getToken();
      if (token != null) {
        await _registerToken(token);
      }
      messaging.onTokenRefresh.listen(_registerToken);

      // Foydalanuvchi push'ni bosib ilovani ochганда
      FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
      final initial = await messaging.getInitialMessage();
      if (initial != null) _handleTap(initial);

      enabled = true;
    } catch (_) {
      // Firebase sozlanmagan — push o'chiq, polling ishlaydi
      enabled = false;
    }
  }

  Future<void> _registerToken(String token) async {
    try {
      await ApiClient.instance.post('/auth/fcm-token', {'token': token});
    } catch (_) {}
  }

  /// Push bosilganda: meta.appealId bo'lsa murojaat sahifasini ochamiz
  void _handleTap(RemoteMessage message) {
    final appealId = message.data['appealId'];
    if (appealId != null && appealId.toString().isNotEmpty) {
      navigatorKey.currentState?.push(
        MaterialPageRoute(builder: (_) => AppealDetailScreen(appealId: appealId.toString())),
      );
    }
  }

  /// Logoutda tokenni serverdan o'chirish
  Future<void> unregister() async {
    if (!enabled) return;
    try {
      await ApiClient.instance.post('/auth/fcm-token', {'token': null});
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }
}
