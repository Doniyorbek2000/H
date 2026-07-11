import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// Offline yozish navbati (outbox).
/// Internet yo'q paytda bajarilgan POST/PATCH amallar navbatga saqlanadi va
/// aloqa tiklanganda ketma-ket qayta yuboriladi. Shu tariqa xodim oflaynda
/// murojaat holatini o'zgartirsa yoki izoh qoldirsa — amal yo'qolmaydi.
class OfflineQueue {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  static const _key = 'offline_outbox';

  Future<List<Map<String, dynamic>>> _read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  Future<void> _write(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(items));
  }

  Future<int> get pendingCount async => (await _read()).length;

  /// Amalni navbatga qo'shish (masalan tarmoq xatosidan keyin)
  Future<void> enqueue(String method, String path, Object? body) async {
    final items = await _read();
    items.add({
      'method': method,
      'path': path,
      'body': body,
      'ts': DateTime.now().toIso8601String(),
    });
    await _write(items);
  }

  /// Navbatni qayta yuborish. Muvaffaqiyatlilar o'chiriladi; tarmoq
  /// xatosida to'xtaydi (keyingi urinishga qoldiriladi). Yuborilgan soni.
  Future<int> flush() async {
    final items = await _read();
    if (items.isEmpty) return 0;
    var sent = 0;
    final remaining = <Map<String, dynamic>>[];
    for (var i = 0; i < items.length; i++) {
      final it = items[i];
      try {
        if (it['method'] == 'POST') {
          await ApiClient.instance.post(it['path'] as String, it['body']);
        } else {
          await ApiClient.instance.patch(it['path'] as String, it['body']);
        }
        sent++;
      } on ApiException catch (e) {
        // Server rad etgan (4xx) — qayta yubormaymiz (tashlab yuboramiz)
        if (e.status >= 400 && e.status < 500) {
          continue;
        }
        // Tarmoq/server xatosi — qolganini keyingi safar yuboramiz
        remaining.addAll(items.sublist(i));
        break;
      } catch (_) {
        remaining.addAll(items.sublist(i));
        break;
      }
    }
    await _write(remaining);
    return sent;
  }

  Future<void> clear() async => _write([]);
}
