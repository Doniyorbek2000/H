import 'package:flutter_test/flutter_test.dart';
import 'package:smart_murojaat_mobile/main.dart';

void main() {
  testWidgets('Ilova ishga tushadi', (tester) async {
    await tester.pumpWidget(const SmartMurojaatApp());
    expect(find.byType(SmartMurojaatApp), findsOneWidget);
  });
}
