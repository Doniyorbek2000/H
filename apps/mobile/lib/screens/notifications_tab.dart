import 'dart:async';

import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../util/labels.dart';
import 'appeal_detail_screen.dart';
import 'home_screen.dart';

class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key});

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  List<dynamic> _items = [];
  int _unread = 0;
  bool _offline = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    // Push o'rniga polling (FCM ulanguncha); har 30 soniyada yangilanadi
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/notifications?limit=30');
      if (!mounted) return;
      setState(() {
        _items = (res.data['data'] as List?) ?? [];
        _unread = res.data['unreadCount'] ?? 0;
        _offline = res.fromCache;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Bildirishnomalar${_unread > 0 ? ' ($_unread)' : ''}'),
        actions: [
          if (_unread > 0)
            TextButton(
              onPressed: () async {
                await ApiClient.instance.patch('/notifications/read-all');
                _load();
              },
              child: const Text('Hammasini o‘qish'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: Column(
          children: [
            OfflineBanner(visible: _offline),
            Expanded(
              child: _items.isEmpty
                  ? ListView(children: const [
                      SizedBox(height: 120),
                      Center(child: Text('Bildirishnomalar yo‘q 🔕')),
                    ])
                  : ListView.builder(
                      itemCount: _items.length,
                      itemBuilder: (context, i) {
                        final n = _items[i] as Map<String, dynamic>;
                        final read = n['isRead'] == true;
                        return ListTile(
                          leading: Icon(
                            read ? Icons.notifications_none : Icons.notifications_active,
                            color: read ? Colors.grey : Theme.of(context).colorScheme.primary,
                          ),
                          title: Text(n['title'] ?? '',
                              style: TextStyle(
                                  fontWeight: read ? FontWeight.normal : FontWeight.bold)),
                          subtitle: Text(
                            '${n['message'] ?? ''}\n${fmtDate(n['createdAt'])}',
                            maxLines: 3,
                          ),
                          isThreeLine: true,
                          onTap: () async {
                            await ApiClient.instance.patch('/notifications/${n['id']}/read');
                            final appealId = n['meta']?['appealId'];
                            if (appealId != null && context.mounted) {
                              await Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => AppealDetailScreen(appealId: appealId),
                              ));
                            }
                            _load();
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
