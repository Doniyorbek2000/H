import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_murojaat_mobile/util/labels.dart';

void main() {
  group('fmtDate', () {
    test('null -> tire', () {
      expect(fmtDate(null), '—');
    });

    test('yaroqsiz ISO -> tire', () {
      expect(fmtDate('shunchaki-matn'), '—');
    });

    test('yaroqli ISO -> dd.MM.yyyy HH:mm formati', () {
      // Mahalliy vaqtga o'giriladi; format shablonini tekshiramiz
      final out = fmtDate('2026-03-05T09:07:00Z');
      expect(out, matches(r'^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$'));
    });
  });

  group('label xaritalari', () {
    test('har bir status uchun nom va rang bor', () {
      for (final key in statusLabels.keys) {
        expect(statusColors.containsKey(key), isTrue, reason: '$key uchun rang yo‘q');
      }
    });

    test('har bir priority uchun nom va rang bor', () {
      for (final key in priorityLabels.keys) {
        expect(priorityColors.containsKey(key), isTrue, reason: '$key uchun rang yo‘q');
      }
    });

    test('kutilgan status kalitlari mavjud', () {
      for (final key in ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'OVERDUE']) {
        expect(statusLabels[key], isNotNull);
      }
    });
  });

  group('StatusChip / PriorityChip widget', () {
    testWidgets('StatusChip status nomini ko‘rsatadi', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: StatusChip('IN_PROGRESS'))),
      );
      expect(find.text('Jarayonda'), findsOneWidget);
    });

    testWidgets('noma’lum status kalitning o‘zini ko‘rsatadi', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: StatusChip('NOMALUM'))),
      );
      expect(find.text('NOMALUM'), findsOneWidget);
    });

    testWidgets('PriorityChip priority nomini ko‘rsatadi', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: PriorityChip('URGENT'))),
      );
      expect(find.text('Shoshilinch'), findsOneWidget);
    });
  });
}
