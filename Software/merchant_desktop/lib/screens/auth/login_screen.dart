import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../../config.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handlePasswordLogin() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    if (identifier.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your mobile number/email and password')),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    await auth.loginWithPassword(identifier, password);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Center(
        child: Container(
          width: 420,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
            border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.06),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Brand Logo & Header
              Center(
                child: Column(
                  children: [
                    SvgPicture.asset(
                      'assets/icons/digiads-logo.svg',
                      height: 38,
                      placeholderBuilder: (context) => Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                            ),
                            child: const Icon(LucideIcons.store, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'DIGIADS',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: 1.5),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 0.8),
                      ),
                      child: const Text(
                        'MERCHANT POS WORKSTATION',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Error Display
              if (auth.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.dangerBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    border: Border.all(color: AppColors.danger.withValues(alpha: 0.3), width: 0.8),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.x, color: AppColors.danger, size: 14),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.error!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
              ],

              // Mobile Number or Email
              TextField(
                controller: _identifierController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Mobile Number or Email',
                  hintText: 'e.g. 9876543210 or merchant@digiads.in',
                  prefixIcon: Icon(LucideIcons.user, size: 16),
                ),
              ),
              const SizedBox(height: 14),

              // Password
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _handlePasswordLogin(),
                decoration: InputDecoration(
                  labelText: 'Account Password',
                  hintText: 'Enter your password',
                  prefixIcon: const Icon(LucideIcons.lock, size: 16),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? LucideIcons.eye : Icons.visibility_off_rounded,
                      size: 16,
                      color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              const SizedBox(height: 22),

              // Login Button
              ElevatedButton(
                onPressed: auth.isLoading ? null : _handlePasswordLogin,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: auth.isLoading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('LOGIN TO POS WORKSTATION', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.8)),
              ),

              const SizedBox(height: 16),

              // Server Host Config Link
              Center(
                child: TextButton.icon(
                  onPressed: _showServerConfigModal,
                  icon: const Icon(Icons.dns, size: 13, color: AppColors.primary),
                  label: Text(
                    'Server: ${AppConfig.serverHost}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
                if (mounted) {
                  setState(() {});
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Server host set to $newHost')),
                  );
                }
              }
            },
            child: const Text('SAVE & CONNECT'),
          ),
        ],
      ),
    );
  }
}
