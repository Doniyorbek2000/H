import 'package:flutter/material.dart';

import 'appeals_tab.dart';
import 'dashboard_tab.dart';
import 'notifications_tab.dart';
import 'profile_tab.dart';
import 'qr_scan_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      const DashboardTab(),
      const AppealsTab(),
      const NotificationsTab(),
      const ProfileTab(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      floatingActionButton: _index == 1
          ? FloatingActionButton(
              tooltip: 'QR skanerlash',
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const QrScanScreen())),
              child: const Icon(Icons.qr_code_scanner),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Panel'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Murojaatlar'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), label: 'Xabarlar'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profil'),
        ],
      ),
    );
  }
}

/// Offline rejim banneri
class OfflineBanner extends StatelessWidget {
  final bool visible;
  const OfflineBanner({super.key, required this.visible});

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: Colors.amber.shade700,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: const Text(
        '📴 Offline rejim — keshdan ko‘rsatilmoqda',
        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
        textAlign: TextAlign.center,
      ),
    );
  }
}
