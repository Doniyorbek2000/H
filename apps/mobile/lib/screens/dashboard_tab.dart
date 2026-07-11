import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_state.dart';
import 'home_screen.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  Map<String, dynamic>? _overview;
  List<dynamic> _aiQueue = [];
  bool _offline = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final ov = await ApiClient.instance.get('/dashboard/overview');
      final aiq = await ApiClient.instance
          .get('/appeals?status=OPERATOR_REVIEW&limit=5&sortBy=priority&sortOrder=desc');
      if (!mounted) return;
      setState(() {
        _overview = ov.data as Map<String, dynamic>;
        _aiQueue = (aiq.data['data'] as List?) ?? [];
        _offline = ov.fromCache;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Boshqaruv paneli'),
            Text(user?['fullName'] ?? '',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? ListView(children: [
                const SizedBox(height: 120),
                Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 8),
                Center(child: Text(_error!)),
              ])
            : _overview == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      OfflineBanner(visible: _offline),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 1.9,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        children: [
                          _StatCard('Jami', _overview!['total'], Icons.inbox, Colors.blue),
                          _StatCard('Bugun', _overview!['today'], Icons.today, Colors.cyan),
                          _StatCard('Jarayonda', _overview!['inProgress'], Icons.schedule,
                              Colors.amber),
                          _StatCard('Bajarilgan', _overview!['completed'], Icons.check_circle,
                              Colors.green),
                          _StatCard('Kechikkan', _overview!['overdue'], Icons.warning,
                              Colors.red),
                          _StatCard('Shoshilinch', _overview!['urgent'], Icons.priority_high,
                              Colors.deepOrange),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(children: [
                        const Icon(Icons.smart_toy, size: 18, color: Color(0xFF7C3AED)),
                        const SizedBox(width: 6),
                        Text('AI tavsiyalari — ko‘rik kutmoqda',
                            style: Theme.of(context).textTheme.titleSmall),
                      ]),
                      const SizedBox(height: 8),
                      if (_aiQueue.isEmpty)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('AI ko‘rigini kutayotgan murojaatlar yo‘q ✅'),
                          ),
                        ),
                      ..._aiQueue.map((a) => Card(
                            child: ListTile(
                              dense: true,
                              leading: const Icon(Icons.smart_toy_outlined,
                                  color: Color(0xFF7C3AED)),
                              title: Text(a['title'] ?? '',
                                  maxLines: 1, overflow: TextOverflow.ellipsis),
                              subtitle: Text(
                                'AI: ${a['aiCategorySuggestion'] ?? '—'} → ${a['aiDepartmentSuggestion'] ?? '—'}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: Text(a['appealNumber'] ?? '',
                                  style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
                            ),
                          )),
                    ],
                  ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final dynamic value;
  final IconData icon;
  final Color color;
  const _StatCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${value ?? 0}',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text(label,
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
