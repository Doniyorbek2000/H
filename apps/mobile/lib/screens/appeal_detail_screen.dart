import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:signature/signature.dart';

import '../api/api_client.dart';
import '../api/offline_queue.dart';
import '../util/labels.dart';

class AppealDetailScreen extends StatefulWidget {
  final String appealId;
  const AppealDetailScreen({super.key, required this.appealId});

  @override
  State<AppealDetailScreen> createState() => _AppealDetailScreenState();
}

class _AppealDetailScreenState extends State<AppealDetailScreen> {
  Map<String, dynamic>? _appeal;
  String? _error;
  bool _busy = false;
  final _comment = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/appeals/${widget.appealId}');
      if (mounted) {
        setState(() {
          _appeal = res.data as Map<String, dynamic>;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _snack(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? Colors.red.shade700 : Colors.green.shade700,
    ));
  }

  Future<void> _run(Future<void> Function() fn, String ok) async {
    setState(() => _busy = true);
    try {
      await fn();
      _snack(ok);
      await _load();
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Tarmoqqa bog'liq amal: internet yo'q bo'lsa (status 0) offline navbatga
  /// saqlanadi va aloqa tiklanganda avtomatik yuboriladi.
  Future<void> _runQueued(String method, String path, Object? body, String ok) async {
    setState(() => _busy = true);
    try {
      if (method == 'POST') {
        await ApiClient.instance.post(path, body);
      } else {
        await ApiClient.instance.patch(path, body);
      }
      _snack(ok);
      await _load();
    } on ApiException catch (e) {
      if (e.status == 0) {
        await OfflineQueue.instance.enqueue(method, path, body);
        _snack('📴 Internet yo‘q — amal navbatga saqlandi, aloqa tiklanganda yuboriladi');
      } else {
        _snack(e.message, error: true);
      }
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeStatus() async {
    final status = await showModalBottomSheet<String>(
      context: context,
      builder: (_) => ListView(
        children: statusLabels.entries
            .map((e) => ListTile(
                  leading: CircleAvatar(
                      radius: 6, backgroundColor: statusColors[e.key] ?? Colors.grey),
                  title: Text(e.value),
                  onTap: () => Navigator.of(context).pop(e.key),
                ))
            .toList(),
      ),
    );
    if (status == null) return;
    await _runQueued(
      'POST',
      '/appeals/${widget.appealId}/status',
      {'status': status},
      'Holat yangilandi',
    );
  }

  Future<void> _addComment() async {
    if (_comment.text.trim().isEmpty) return;
    final msg = _comment.text.trim();
    _comment.clear();
    await _runQueued(
      'POST',
      '/appeals/${widget.appealId}/comment',
      {'message': msg},
      'Izoh qo‘shildi',
    );
  }

  Future<void> _uploadPhoto(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 80);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    await _run(
      () => ApiClient.instance.uploadAttachments(widget.appealId, [
        (bytes: bytes, filename: picked.name, mime: 'image/jpeg'),
      ]),
      'Foto yuklandi',
    );
  }

  Future<void> _attachLocation() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      _snack('Joylashuvga ruxsat berilmadi', error: true);
      return;
    }
    final pos = await Geolocator.getCurrentPosition();
    await _run(
      () => ApiClient.instance.patch('/appeals/${widget.appealId}', {
        'latitude': pos.latitude,
        'longitude': pos.longitude,
      }),
      'GPS joylashuv biriktirildi',
    );
  }

  /// Ovozli izoh yozib, audio fayl sifatida biriktirish
  Future<void> _recordVoiceNote() async {
    final recorder = AudioRecorder();
    if (!await recorder.hasPermission()) {
      _snack('Mikrofonga ruxsat berilmadi', error: true);
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/ovozli_izoh_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);

    if (!mounted) return;
    final send = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.mic, color: Colors.red),
          SizedBox(width: 8),
          Text('Yozilmoqda...'),
        ]),
        content: const Text('Ovozli izohingizni ayting, so‘ng "To‘xtatish va yuborish"ni bosing.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Bekor qilish'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(true),
            icon: const Icon(Icons.stop, size: 18),
            label: const Text('To‘xtatish va yuborish'),
          ),
        ],
      ),
    );
    final recordedPath = await recorder.stop();
    recorder.dispose();
    if (send != true || recordedPath == null) return;

    final bytes = await File(recordedPath).readAsBytes();
    await _run(
      () => ApiClient.instance.uploadAttachments(widget.appealId, [
        (bytes: bytes, filename: 'ovozli_izoh.m4a', mime: 'audio/mp4'),
      ]),
      'Ovozli izoh biriktirildi',
    );
  }

  Future<void> _signAndConfirm() async {
    final controller = SignatureController(penStrokeWidth: 3, penColor: Colors.blue.shade900);
    final Uint8List? png = await showDialog<Uint8List>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Elektron imzo'),
        content: SizedBox(
          width: 320,
          height: 200,
          child: Signature(controller: controller, backgroundColor: Colors.grey.shade200),
        ),
        actions: [
          TextButton(
            onPressed: () => controller.clear(),
            child: const Text('Tozalash'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Bekor qilish'),
          ),
          FilledButton(
            onPressed: () async {
              final data = await controller.toPngBytes();
              if (context.mounted) Navigator.of(context).pop(data);
            },
            child: const Text('Tasdiqlash'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (png == null) return;
    await _run(() async {
      await ApiClient.instance.uploadAttachments(widget.appealId, [
        (bytes: png, filename: 'elektron_imzo.png', mime: 'image/png'),
      ]);
      await ApiClient.instance.post('/appeals/${widget.appealId}/comment', {
        'message': '✍️ Elektron imzo bilan tasdiqlandi',
        'isInternal': true,
      });
    }, 'Elektron imzo biriktirildi');
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: Center(child: Text(_error!)));
    }
    final a = _appeal;
    if (a == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }
    final comments = (a['comments'] as List?) ?? [];
    final history = (a['statusHistory'] as List?) ?? [];
    final attachments = (a['attachments'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(a['appealNumber'] ?? '',
            style: const TextStyle(fontFamily: 'monospace', fontSize: 16)),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Wrap(spacing: 6, runSpacing: 6, children: [
            StatusChip(a['status'] ?? ''),
            PriorityChip(a['priority'] ?? ''),
          ]),
          const SizedBox(height: 10),
          Text(a['title'] ?? '',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(a['description'] ?? ''),
          const SizedBox(height: 12),

          // AI tavsiyalar
          if (a['aiSummary'] != null)
            Card(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(children: [
                      Icon(Icons.smart_toy, size: 18, color: Color(0xFF7C3AED)),
                      SizedBox(width: 6),
                      Text('AI tahlil',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
                    ]),
                    const SizedBox(height: 8),
                    Text('📝 ${a['aiSummary']}'),
                    Text('📂 Kategoriya: ${a['aiCategorySuggestion'] ?? '—'}'),
                    Text('🏢 Bo‘lim: ${a['aiDepartmentSuggestion'] ?? '—'}'),
                    if (a['aiResponseDraft'] != null) ...[
                      const SizedBox(height: 6),
                      Text('💬 Javob loyihasi: ${a['aiResponseDraft']}',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                    ],
                  ],
                ),
              ),
            ),

          // Ma'lumotlar
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _row('👤 Fuqaro', '${a['citizenName']} (${a['citizenPhone']})'),
                  _row('📂 Kategoriya', a['category']?['name'] ?? '—'),
                  _row('🏢 Bo‘lim', a['department']?['name'] ?? '—'),
                  _row('🧑‍💼 Mas’ul', a['assignedTo']?['fullName'] ?? '—'),
                  _row('🏘 Mahalla', a['mahalla'] ?? '—'),
                  _row('⏰ Muddat', fmtDate(a['deadlineAt'])),
                  if (a['latitude'] != null)
                    _row('📍 GPS', '${a['latitude']}, ${a['longitude']}'),
                ],
              ),
            ),
          ),

          // Amallar
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            FilledButton.icon(
              onPressed: _busy ? null : _changeStatus,
              icon: const Icon(Icons.sync, size: 18),
              label: const Text('Holat'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _uploadPhoto(ImageSource.camera),
              icon: const Icon(Icons.photo_camera, size: 18),
              label: const Text('Foto'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _uploadPhoto(ImageSource.gallery),
              icon: const Icon(Icons.photo_library, size: 18),
              label: const Text('Galereya'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : _attachLocation,
              icon: const Icon(Icons.my_location, size: 18),
              label: const Text('GPS'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : _recordVoiceNote,
              icon: const Icon(Icons.mic, size: 18),
              label: const Text('Ovoz'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : _signAndConfirm,
              icon: const Icon(Icons.draw, size: 18),
              label: const Text('Imzo'),
            ),
          ]),

          // Fayllar
          if (attachments.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('📎 Fayllar (${attachments.length})',
                style: Theme.of(context).textTheme.titleSmall),
            ...attachments.map((f) => ListTile(
                  dense: true,
                  leading: const Icon(Icons.attach_file),
                  title: Text(f['fileName'] ?? '', maxLines: 1),
                  subtitle: Text('${((f['size'] ?? 0) / 1024).round()} KB'),
                )),
          ],

          // Izohlar
          const SizedBox(height: 12),
          Text('💬 Izohlar (${comments.length})',
              style: Theme.of(context).textTheme.titleSmall),
          ...comments.map((c) => Card(
                child: ListTile(
                  dense: true,
                  title: Text(c['message'] ?? ''),
                  subtitle: Text(
                      '${c['user']?['fullName'] ?? 'Tizim'} · ${fmtDate(c['createdAt'])}'
                      '${c['isInternal'] == true ? ' · 🔒 ichki' : ''}'),
                ),
              )),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _comment,
                decoration: const InputDecoration(hintText: 'Izoh yozing...'),
              ),
            ),
            IconButton(
              onPressed: _busy ? null : _addComment,
              icon: const Icon(Icons.send),
            ),
          ]),

          // Tarix
          const SizedBox(height: 12),
          Text('🕓 Holatlar tarixi', style: Theme.of(context).textTheme.titleSmall),
          ...history.map((h) => ListTile(
                dense: true,
                leading: CircleAvatar(
                    radius: 5,
                    backgroundColor: statusColors[h['toStatus']] ?? Colors.grey),
                title: Text(statusLabels[h['toStatus']] ?? h['toStatus'] ?? ''),
                subtitle: Text(
                    '${h['changedBy']?['fullName'] ?? 'Tizim'} · ${fmtDate(h['createdAt'])}'),
              )),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 110,
              child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
