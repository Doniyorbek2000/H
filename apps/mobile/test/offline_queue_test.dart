import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_murojaat_mobile/api/offline_queue.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('enqueue navbat sonini oshiradi', () async {
    final q = OfflineQueue.instance;
    await q.clear();
    expect(await q.pendingCount, 0);
    await q.enqueue('POST', '/appeals/1/status', {'status': 'ACCEPTED'});
    await q.enqueue('POST', '/appeals/1/comment', {'message': 'salom'});
    expect(await q.pendingCount, 2);
  });

  test('clear navbatni tozalaydi', () async {
    final q = OfflineQueue.instance;
    await q.enqueue('PATCH', '/appeals/2', {'latitude': 41.0});
    expect(await q.pendingCount, greaterThan(0));
    await q.clear();
    expect(await q.pendingCount, 0);
  });
}
