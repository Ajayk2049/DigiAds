import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

import 'config.dart';
import 'constants/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/venue_provider.dart';
import 'providers/orders_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/printer_provider.dart';
import 'services/api_service.dart';

import 'screens/auth/login_screen.dart';
import 'screens/main_layout.dart';
import 'services/tray_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AppConfig.loadConfig();
  ApiService().refreshBaseUrl();

  // Desktop Window Configuration
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
    await windowManager.ensureInitialized();

    const WindowOptions windowOptions = WindowOptions(
      size: Size(1280, 800),
      minimumSize: Size(1024, 680),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      title: 'DigiAds Merchant POS',
    );

    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });

    // Initialize System Tray & Notifications
    await TrayNotificationService().init();
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
        ChangeNotifierProvider(create: (_) => VenueProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
        ChangeNotifierProvider(create: (_) => PrinterProvider()..init()),
      ],
      child: const DigiAdsMerchantApp(),
    ),
  );
}

class DigiAdsMerchantApp extends StatelessWidget {
  const DigiAdsMerchantApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return MaterialApp(
      title: 'DigiAds Venue Admin POS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: auth.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      home: auth.isLoading
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : (auth.isAuthenticated ? const MainLayout() : const LoginScreen()),
    );
  }
}
