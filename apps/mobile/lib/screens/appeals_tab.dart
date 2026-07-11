import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/offline_queue.dart';
import '../util/labels.dart';
import 'appeal_detail_screen.dart';
import 'home_screen.dart';

class AppealsTab extends StatefulWidget {
  const AppealsTab({super.key});

  @override
  State<AppealsTab> createState() => _AppealsTabState();
}

class _AppealsTabState extends State<AppealsTab> {
  List<dynamic> _appeals = [];
  bool _loading = true;
  bool _offline = false;
  String? _error;
  String _statusFilter = '';
  int _page = 1;
  int _totalPages = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final params = StringBuffer('/appeals?limit=20&page=$_page');
      if (_statusFilter.isNotEmpty) params.write('&status=$_statusFilter');
      final res = await ApiClient.instance.get(params.toString());
      // Online tasdiqlandi -> offline navbatdagi amallarni yuboramiz
      if (!res.fromCache) {
        final sent = await OfflineQueue.instance.flush();
        if (sent > 0 && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('📤 $sent ta offline amal yuborildi')),
          );
        }
      }
      if (!mounted) return;
      setState(() {
        _appeals = (res.data['data'] as List?) ?? [];
        _totalPages = res.data['meta']?['totalPages'] ?? 1;
        _offline = res.fromCache;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Murojaatlar'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (v) {
              setState(() {
                _statusFilter = v == 'ALL' ? '' : v;
                _page = 1;
              });
              _load();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'ALL', child: Text('Barchasi')),
              ...statusLabels.entries
                  .map((e) => PopupMenuItem(value: e.key, child: Text(e.value))),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [
                    const SizedBox(height: 120),
                    Center(child: Text(_error!)),
                  ])
                : Column(
                    children: [
                      OfflineBanner(visible: _offline),
                      Expanded(
                        child: _appeals.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 120),
                                Center(child: Text('Murojaatlar topilmadi 📭')),
                              ])
                            : ListView.builder(
                                itemCount: _appeals.length,
                                itemBuilder: (context, i) {
                                  final a = _appeals[i] as Map<String, dynamic>;
                                  return Card(
                                    margin: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 4),
                                    child: ListTile(
                                      onTap: () async {
                                        await Navigator.of(context).push(MaterialPageRoute(
                                          builder: (_) =>
                                              AppealDetailScreen(appealId: a['id']),
                                        ));
                                        _load();
                                      },
                                      title: Text(a['title'] ?? '',
                                          maxLines: 1, overflow: TextOverflow.ellipsis),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${a['appealNumber']} · ${a['category']?['name'] ?? '—'}',
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                          const SizedBox(height: 4),
                                          Wrap(spacing: 6, children: [
                                            StatusChip(a['status'] ?? ''),
                                            PriorityChip(a['priority'] ?? ''),
                                          ]),
                                        ],
                                      ),
                                      trailing: const Icon(Icons.chevron_right),
                                    ),
                                  );
                                },
                              ),
                      ),
                      if (_totalPages > 1)
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                onPressed: _page > 1
                                    ? () {
                                        setState(() => _page--);
                                        _load();
                                      }
                                    : null,
                                icon: const Icon(Icons.chevron_left),
                              ),
                              Text('$_page / $_totalPages'),
                              IconButton(
                                onPressed: _page < _totalPages
                                    ? () {
                                        setState(() => _page++);
                                        _load();
                                      }
                                    : null,
                                icon: const Icon(Icons.chevron_right),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
      ),
    );
  }
}
