import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'state/auth_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartMurojaatApp());
}

const _primary = Color(0xFF1E40AF);

class SmartMurojaatApp extends StatelessWidget {
  const SmartMurojaatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthState()..init(),
      child: MaterialApp(
        title: 'Smart Murojaat AI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: _primary),
          appBarTheme: const AppBarTheme(centerTitle: false),
        ),
        darkTheme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: _primary, brightness: Brightness.dark),
        ),
        home: Consumer<AuthState>(
          builder: (context, auth, _) {
            if (auth.loading) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }
            return auth.isLoggedIn ? const HomeScreen() : const LoginScreen();
          },
        ),
      ),
    );
  }
}
