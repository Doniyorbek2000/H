import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../api/api_client.dart';
import '../util/labels.dart';

/// QR kod skanerlash: murojaat raqami (SM-...) kodlangan QR ni o'qib,
/// murojaat holatini ochadi. QR ichida to'liq URL bo'lsa ham raqamni ajratadi.
class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  bool _handled = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handled) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;
    final match = RegExp(r'SM-\d{8}-\d{4}').firstMatch(raw);
    if (match == null) return;
    _handled = true;
    final number = match.group(0)!;
    try {
      final res = await ApiClient.instance.get('/appeals/track/$number');
      final a = res.data as Map<String, dynamic>;
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(number, style: const TextStyle(fontFamily: 'monospace', fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(a['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              StatusChip(a['status'] ?? ''),
              const SizedBox(height: 8),
              Text('Kategoriya: ${a['category']?['name'] ?? '—'}'),
              Text('Bo‘lim: ${a['department']?['name'] ?? '—'}'),
              Text('Muddat: ${fmtDate(a['deadlineAt'])}'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Yopish'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Topilmadi: $e')));
        _handled = false;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('QR skanerlash')),
      body: Stack(
        children: [
          MobileScanner(onDetect: _onDetect),
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Text(
              'Murojaat QR kodini ramka ichiga joylashtiring',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                backgroundColor: Colors.black.withValues(alpha: 0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
