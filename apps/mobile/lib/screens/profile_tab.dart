import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_state.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user ?? {};
    const roleLabels = {
      'SUPER_ADMIN': 'Super administrator',
      'ADMIN': 'Administrator',
      'OPERATOR': 'Operator',
      'EXECUTOR': 'Mas’ul xodim',
      'MANAGER': 'Bo‘lim rahbari',
      'LEADER': 'Rahbar',
      'CITIZEN': 'Fuqaro',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              child: Text(
                (user['fullName'] ?? '?').toString().isNotEmpty
                    ? (user['fullName'] as String)[0]
                    : '?',
                style: const TextStyle(fontSize: 32),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(user['fullName'] ?? '',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          Center(child: Text(roleLabels[user['role']] ?? user['role'] ?? '')),
          const SizedBox(height: 24),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.email_outlined),
                title: const Text('Email'),
                subtitle: Text(user['email'] ?? '—'),
              ),
              ListTile(
                leading: const Icon(Icons.phone_outlined),
                title: const Text('Telefon'),
                subtitle: Text(user['phone'] ?? '—'),
              ),
              ListTile(
                leading: const Icon(Icons.business_outlined),
                title: const Text('Tashkilot'),
                subtitle: Text(user['organization']?['name'] ?? '—'),
              ),
              ListTile(
                leading: const Icon(Icons.dns_outlined),
                title: const Text('Server'),
                subtitle: Text(ApiClient.instance.baseUrl),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          FilledButton.tonal(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.errorContainer,
              foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
            ),
            onPressed: () => auth.logout(),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Text('Chiqish'),
            ),
          ),
        ],
      ),
    );
  }
}
