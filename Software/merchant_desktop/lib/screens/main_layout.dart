import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../constants/app_colors.dart';
import '../constants/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/venue_provider.dart';
import '../providers/orders_provider.dart';
import '../providers/menu_provider.dart';
import '../providers/printer_provider.dart';
import '../services/api_service.dart';
import '../services/tray_notification_service.dart';
import '../services/websocket_service.dart';

import 'orders/live_orders_screen.dart';
import 'menu/menu_manager_screen.dart';
import 'billing/payment_history_screen.dart';
import 'settings/printer_settings_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  String _activeTab = 'orders'; // Default to live orders

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }

  Future<void> _loadInitialData() async {
    final venueProv = context.read<VenueProvider>();
    await venueProv.fetchApplications();

    // Ensure WebSocket is connected for live real-time orders
    WebSocketService().connect();

    if (venueProv.selectedVenue != null) {
      final appId = venueProv.selectedVenue!.id;
      if (mounted) {
        context.read<OrdersProvider>().fetchLiveOrders(appId);
        context.read<MenuProvider>().fetchMenu(appId);
        context.read<PrinterProvider>().init();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();
    final venueProv = context.watch<VenueProvider>();
    final ordersProv = context.watch<OrdersProvider>();

    final user = auth.user;
    final selectedVenue = venueProv.selectedVenue;
    final unhandledOrdersCount = ordersProv.liveOrders.where((o) => o.orderStatus == 'placed').length;

    return Scaffold(
      body: Column(
        children: [
          // TOP NAVIGATION BAR (WEB-STYLE PORTAL HEADER)
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                // 1. BRAND LOGO & OUTLET TITLE
                Row(
                  children: [
                    SvgPicture.asset(
                      'assets/icons/Digiads-Icon.svg',
                      height: 28,
                      placeholderBuilder: (_) => Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        ),
                        child: const Icon(LucideIcons.store, color: Colors.white, size: 14),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'DIGIADS POS',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.1),
                    ),
                    const SizedBox(width: 12),
                    Container(height: 20, width: 1, color: Theme.of(context).dividerColor),
                    const SizedBox(width: 12),

                    // Venue Outlet Name (Clean Badge, NO Dropdown)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCard : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.store, size: 13, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            selectedVenue?.outletName.toUpperCase() ?? 'MYSORE DINING HALL',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(width: 20),

                // 2. HORIZONTAL TOP NAV TABS
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildTopNavItem(
                          id: 'orders',
                          label: 'Live Orders',
                          icon: LucideIcons.utensilsCrossed,
                          badgeCount: unhandledOrdersCount,
                          badgeColor: AppColors.danger,
                        ),
                        const SizedBox(width: 6),
                        _buildTopNavItem(
                          id: 'payments',
                          label: 'Payment History',
                          icon: LucideIcons.receipt,
                        ),
                        const SizedBox(width: 6),
                        _buildTopNavItem(
                          id: 'menu',
                          label: 'Menu Manager',
                          icon: LucideIcons.salad,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 12),

                // 3. RIGHT CONTROLS & ACTIONS
                Row(
                  children: [
                    // Dark/Light Theme Toggle
                    IconButton(
                      icon: Icon(auth.isDarkMode ? LucideIcons.sun : LucideIcons.moon, size: 16),
                      tooltip: 'Toggle Theme',
                      onPressed: auth.toggleTheme,
                    ),

                    const SizedBox(width: 8),

                    // Operator User Action Dropdown Menu
                    PopupMenuButton<String>(
                      tooltip: 'Operator Account Menu',
                      offset: const Offset(0, 42),
                      elevation: 8,
                      color: isDark ? AppColors.darkCardElevated : Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        side: BorderSide.none,
                      ),
                      padding: EdgeInsets.zero,
                      onSelected: (value) async {
                        if (value == 'printers') {
                          setState(() => _activeTab = 'printers');
                        } else if (value == 'server_config') {
                          _showServerConfigModal();
                        } else if (value == 'autostart') {
                          final isEnabled = await TrayNotificationService.isAutoStartEnabled();
                          await TrayNotificationService.toggleAutoStart(!isEnabled);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(!isEnabled
                                    ? 'DigiAds POS will now start automatically on Windows boot'
                                    : 'Start with Windows disabled'),
                              ),
                            );
                          }
                        } else if (value == 'exit_app') {
                          await TrayNotificationService.forceExit();
                        } else if (value == 'logout') {
                          auth.logout();
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          enabled: false,
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                user?.name.isNotEmpty == true ? user!.name : 'Merchant Workstation',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkText : AppColors.lightText,
                                ),
                              ),
                              Text(
                                user?.phone ?? '9876543210',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'printers',
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.print, size: 14, color: isDark ? AppColors.darkText : AppColors.lightText),
                              const SizedBox(width: 8),
                              const Text('POS Printers Setup', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'server_config',
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.dns, size: 14, color: isDark ? AppColors.darkText : AppColors.lightText),
                              const SizedBox(width: 8),
                              const Text('Server Connection IP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'autostart',
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.power_settings_new, size: 14, color: isDark ? AppColors.darkText : AppColors.lightText),
                              const SizedBox(width: 8),
                              const Text('Start with Windows', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(height: 6),
                        PopupMenuItem(
                          value: 'logout',
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.logout, size: 14, color: AppColors.danger),
                              const SizedBox(width: 8),
                              Text(
                                'Logout Workstation',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.danger),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'exit_app',
                          height: 34,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.cancel_outlined, size: 14, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                              const SizedBox(width: 8),
                              Text(
                                'Exit Application',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkCard : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 10,
                              backgroundColor: AppColors.primary,
                              child: Text(
                                user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'A',
                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              user?.name.isNotEmpty == true ? user!.name.toLowerCase() : 'ajay',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.keyboard_arrow_down, size: 12, color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // MAIN FULL-WIDTH WORKSPACE VIEW
          Expanded(
            child: Container(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: _buildCurrentTabScreen(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopNavItem({
    required String id,
    required String label,
    required IconData icon,
    int badgeCount = 0,
    Color? badgeColor,
  }) {
    final isSelected = _activeTab == id;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        onTap: () => setState(() => _activeTab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary
                : Colors.transparent,
            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 14,
                color: isSelected
                    ? Colors.white
                    : (isDark ? AppColors.darkMuted : AppColors.lightMuted),
              ),
              const SizedBox(width: 7),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                  color: isSelected
                      ? Colors.white
                      : (isDark ? AppColors.darkText : AppColors.lightText),
                ),
              ),
              if (badgeCount > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : (badgeColor ?? AppColors.primary),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$badgeCount',
                    style: TextStyle(
                      color: isSelected ? AppColors.primary : Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentTabScreen() {
    switch (_activeTab) {
      case 'orders':
        return const LiveOrdersScreen();
      case 'payments':
        return const PaymentHistoryScreen();
      case 'menu':
        return const MenuManagerScreen();
      case 'printers':
        return const PrinterSettingsScreen();
      default:
        return const LiveOrdersScreen();
    }
  }

  void _showServerConfigModal() {
    final controller = TextEditingController(text: AppConfig.serverHost);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.dns, color: AppColors.primary, size: 18),
            SizedBox(width: 8),
            Text('Server Connection IP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the backend server IP and port on your local Wi-Fi network (e.g. 192.168.0.100:4200 or 127.0.0.1:4200):',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Server Host & Port',
                hintText: '192.168.0.100:4200',
                prefixIcon: Icon(Icons.wifi, size: 16),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newHost = controller.text.trim();
              if (newHost.isNotEmpty) {
                await AppConfig.setServerHost(newHost);
                ApiService().refreshBaseUrl();
                WebSocketService().connect(); // Reconnect WebSocket to new host
                if (mounted) {
                  setState(() {});
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Server host set to $newHost. Reconnected.')),
                  );
                }
              }
            },
            child: const Text('SAVE & RECONNECT'),
          ),
        ],
      ),
    );
  }
}
