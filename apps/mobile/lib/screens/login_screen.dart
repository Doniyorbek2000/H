import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _server = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _showServer = false;

  @override
  void initState() {
    super.initState();
    _server.text = ApiClient.instance.baseUrl;
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = context.read<AuthState>();
    try {
      if (_server.text.trim().isNotEmpty) {
        await ApiClient.instance.setServer(_server.text.trim());
      }
      await auth.login(_identifier.text.trim(), _password.text);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E3A8A), Color(0xFF1D4ED8)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  const Icon(Icons.account_balance, size: 56, color: Colors.white),
                  const SizedBox(height: 12),
                  const Text('Smart Murojaat AI',
                      style: TextStyle(
                          fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                  const Text('Rahbarlar va xodimlar uchun mobil ilova',
                      style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 24),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _identifier,
                            decoration: const InputDecoration(
                              labelText: 'Email yoki telefon',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _password,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Parol',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                          if (_showServer) ...[
                            const SizedBox(height: 12),
                            TextField(
                              controller: _server,
                              decoration: const InputDecoration(
                                labelText: 'Server manzili',
                                prefixIcon: Icon(Icons.dns_outlined),
                                helperText: 'Masalan: https://api.murojaat.uz',
                              ),
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(_error!,
                                style: TextStyle(color: Theme.of(context).colorScheme.error)),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: _busy ? null : _submit,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(_busy ? 'Kirilmoqda...' : 'Kirish'),
                            ),
                          ),
                          TextButton(
                            onPressed: () => setState(() => _showServer = !_showServer),
                            child: Text(_showServer ? 'Serverni yashirish' : '⚙️ Server sozlamasi'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
