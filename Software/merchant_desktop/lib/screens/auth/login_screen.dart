import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../../config.dart';
import '../../constants/app_colors.dart';
import '../../constants/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/modals/server_config_modal.dart';

class _LoginBenefit {
  final IconData icon;
  final String title;
  final String subtitle;
  const _LoginBenefit(this.icon, this.title, this.subtitle);
}

const _loginBenefits = [
  _LoginBenefit(LucideIcons.sparkles, 'Faster order flow', 'Fire KOTs to the kitchen in a single tap.'),
  _LoginBenefit(LucideIcons.printer, 'Quick KOT & bill printing', '80mm & 58mm thermal prints with bill designer.'),
  _LoginBenefit(LucideIcons.moon, 'Built for night counters', 'Full dark theme that is easy on the eyes.'),
  _LoginBenefit(LucideIcons.clock, 'Starts with Windows', 'Auto-launch so the counter is ready at boot.'),
  _LoginBenefit(LucideIcons.fileSpreadsheet, 'Excel reports in one click', 'Sales, payout & history exports.'),
  _LoginBenefit(LucideIcons.bellRing, 'Live order alerts', 'New orders, waiter calls & payments instantly.'),
];

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  int _logoTapCount = 0;
  DateTime? _lastLogoTapTime;

  void _handleLogoTap() {
    final now = DateTime.now();
    if (_lastLogoTapTime == null || now.difference(_lastLogoTapTime!) > const Duration(seconds: 2)) {
      _logoTapCount = 1;
    } else {
      _logoTapCount++;
    }
    _lastLogoTapTime = now;

    if (_logoTapCount >= 5) {
      _logoTapCount = 0;
      _openServerConfig();
    }
  }

  void _openServerConfig() {
    ServerConfigModal.show(context, onReconnected: () {
      if (mounted) setState(() {});
    });
  }

  Future<void> _openSignupUrl() async {
    const url = 'https://test-user.digiads.space/register?role=merchant';
    try {
      if (Platform.isWindows) {
        await Process.run('cmd', ['/c', 'start', '', url]);
      } else if (Platform.isMacOS) {
        await Process.run('open', [url]);
      } else if (Platform.isLinux) {
        await Process.run('xdg-open', [url]);
      }
    } catch (_) {}
  }

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

    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.keyS, control: true, shift: true): _openServerConfig,
        const SingleActivator(LogicalKeyboardKey.f12): _openServerConfig,
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: Stack(
            children: [
              LayoutBuilder(
                builder: (context, constraints) {
                  if (constraints.maxWidth < 760) {
                    return _buildNarrowLayout(context, auth, isDark);
                  }
                  return _buildWideLayout(context, auth, isDark);
                },
              ),
              Positioned(
                top: 16,
                right: 20,
                child: _ThemeSwitch(
                  isDark: auth.isDarkMode,
                  isDarkTheme: isDark,
                  onToggle: () => context.read<AuthProvider>().toggleTheme(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Wide screens: brand panel on the left, login card on the right.
  Widget _buildWideLayout(BuildContext context, AuthProvider auth, bool isDark) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 880),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
              border: Border.all(color: Theme.of(context).dividerColor, width: 0.8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.08),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(flex: 5, child: _buildBrandPanel(context, isDark)),
                    Expanded(flex: 4, child: _buildLoginForm(context, auth, isDark)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Narrow screens: compact brand header on top, login card below.
  Widget _buildNarrowLayout(BuildContext context, AuthProvider auth, bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(top: 56),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF16161B) : Colors.white,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: _handleLogoTap,
                  behavior: HitTestBehavior.opaque,
                  child: SvgPicture.asset(
                    'assets/icons/digiads-logo.svg',
                    height: 36,
                    placeholderBuilder: (_) => Text(
                      'DIGIADS',
                      style: TextStyle(
                        color: isDark ? AppColors.darkText : const Color(0xFF0C243B),
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Run your counter on autopilot.',
                  style: TextStyle(
                    color: isDark ? AppColors.darkText : const Color(0xFF0C243B),
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Orders, KOT, billing & reports — one Windows workstation.',
                  style: TextStyle(
                    color: isDark ? AppColors.darkMuted : const Color(0xFF5B6B7B),
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _BenefitChip(icon: LucideIcons.sparkles, label: 'Faster orders', isDark: isDark),
                    _BenefitChip(icon: LucideIcons.printer, label: 'KOT + bill printing', isDark: isDark),
                    _BenefitChip(icon: LucideIcons.moon, label: 'Dark theme', isDark: isDark),
                    _BenefitChip(icon: LucideIcons.clock, label: 'Starts with Windows', isDark: isDark),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildLoginCard(context, auth, isDark),
          ),
        ],
      ),
    );
  }

  // Left brand panel: adapts seamlessly to dark mode with brand blue accents.
  Widget _buildBrandPanel(BuildContext context, bool isDark) {
    final headlineColor = isDark ? AppColors.darkText : const Color(0xFF0C243B);
    final subtitleColor = isDark ? AppColors.darkMuted : const Color(0xFF5B6B7B);
    final footerColor = isDark ? AppColors.darkMuted.withValues(alpha: 0.5) : const Color(0xFF8A97A5);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF16161B) : Colors.white,
        border: Border(
          right: BorderSide(
            color: Theme.of(context).dividerColor,
            width: 0.8,
          ),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -70,
            top: -70,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: isDark ? 0.10 : 0.06),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            left: -50,
            bottom: -60,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: isDark ? 0.08 : 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: _handleLogoTap,
                  behavior: HitTestBehavior.opaque,
                  child: SvgPicture.asset(
                    'assets/icons/digiads-logo.svg',
                    height: 38,
                    placeholderBuilder: (_) => Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: const Icon(LucideIcons.store, color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'DIGIADS',
                          style: TextStyle(color: headlineColor, fontWeight: FontWeight.w900, fontSize: 20, letterSpacing: 1.5),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Run your counter on autopilot.',
                  style: TextStyle(color: headlineColor, fontSize: 22, fontWeight: FontWeight.w800, height: 1.2),
                ),
                const SizedBox(height: 8),
                Text(
                  'Orders, KOT, billing & reports — everything your venue needs in one Windows workstation.',
                  style: TextStyle(color: subtitleColor, fontSize: 12.5, height: 1.45),
                ),
                const SizedBox(height: 20),
                for (final benefit in _loginBenefits) ...[
                  _BenefitRow(benefit: benefit, isDark: isDark),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 16),
                Text(
                  'DIGIADS POS  •  SECURE WINDOWS WORKSTATION',
                  style: TextStyle(
                    color: footerColor,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Right side: the login form plateau.
  Widget _buildLoginForm(BuildContext context, AuthProvider auth, bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 26),
      child: _buildLoginCardContent(context, auth, isDark),
    );
  }

  Widget _buildLoginCard(BuildContext context, AuthProvider auth, bool isDark) {
    return Container(
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
      child: _buildLoginCardContent(context, auth, isDark),
    );
  }

  Widget _buildLoginCardContent(BuildContext context, AuthProvider auth, bool isDark) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Brand Logo & Header
        Center(
          child: GestureDetector(
            onTap: _handleLogoTap,
            behavior: HitTestBehavior.opaque,
            child: Column(
              children: [
                SvgPicture.asset(
                  'assets/icons/digiads-logo.svg',
                  height: 34,
                  placeholderBuilder: (context) => Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                        ),
                        child: const Icon(LucideIcons.store, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'DIGIADS',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, letterSpacing: 1.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.primary.withValues(alpha: 0.18) : AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    border: Border.all(
                      color: isDark ? AppColors.primary.withValues(alpha: 0.4) : AppColors.primary.withValues(alpha: 0.3),
                      width: 0.8,
                    ),
                  ),
                  child: Text(
                    'MERCHANT POS WORKSTATION',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: isDark ? const Color(0xFF60A5FA) : AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Error Display
        AnimatedCrossFade(
          duration: const Duration(milliseconds: 250),
          crossFadeState: auth.error != null ? CrossFadeState.showFirst : CrossFadeState.showSecond,
          firstChild: auth.error != null
              ? Container(
                  margin: const EdgeInsets.only(bottom: 18),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.dangerBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    border: Border.all(color: AppColors.danger.withValues(alpha: 0.3), width: 0.8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 1),
                        child: Icon(Icons.error_outline, color: AppColors.danger, size: 16),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.error ?? '',
                          style: const TextStyle(
                            color: AppColors.danger,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
          secondChild: const SizedBox.shrink(),
        ),

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
              : const Text('Login to DigiAds.space', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.8)),
        ),

        const SizedBox(height: 16),

        // Register link
        Center(
          child: Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Not registered yet? ',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                ),
              ),
              InkWell(
                onTap: _openSignupUrl,
                borderRadius: BorderRadius.circular(4),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                  child: Text(
                    'Click here to get registered',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BenefitRow extends StatelessWidget {
  final _LoginBenefit benefit;
  final bool isDark;
  const _BenefitRow({required this.benefit, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(benefit.icon, color: Colors.white, size: 14),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                benefit.title,
                style: TextStyle(
                  color: isDark ? AppColors.darkText : const Color(0xFF0C243B),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                benefit.subtitle,
                style: TextStyle(
                  color: isDark ? AppColors.darkMuted : const Color(0xFF5B6B7B),
                  fontSize: 11.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BenefitChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  const _BenefitChip({required this.icon, required this.label, this.isDark = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.primary.withValues(alpha: 0.18) : AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: isDark ? const Color(0xFF60A5FA) : AppColors.primary, size: 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: isDark ? const Color(0xFF60A5FA) : AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Sliding light/dark theme switch: the sun thumb sits left in light mode and
/// slides right while morphing into a moon in dark mode. Text follows suit.
class _ThemeSwitch extends StatelessWidget {
  final bool isDark;
  final bool isDarkTheme;
  final VoidCallback onToggle;
  const _ThemeSwitch({required this.isDark, required this.isDarkTheme, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        width: 136,
        height: 38,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: isDarkTheme ? AppColors.darkCardElevated : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDarkTheme ? Colors.white12 : const Color(0xFFE3EAF0),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDarkTheme ? 0.4 : 0.08),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Label rests in the free space opposite the thumb.
            Align(
              alignment: isDark ? Alignment.centerLeft : Alignment.centerRight,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Container(
                  key: ValueKey(isDark),
                  width: 86,
                  alignment: Alignment.center,
                  child: Text(
                    isDark ? 'Dark' : 'Light',
                    style: TextStyle(
                      color: isDarkTheme ? Colors.white70 : const Color(0xFF0C243B),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
            ),
            // Sliding thumb with rotating sun/moon icon.
            AnimatedAlign(
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeInOut,
              alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.4),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  transitionBuilder: (child, animation) => RotationTransition(
                    turns: animation,
                    child: ScaleTransition(scale: animation, child: child),
                  ),
                  child: Icon(
                    isDark ? LucideIcons.moon : LucideIcons.sun,
                    key: ValueKey(isDark),
                    color: Colors.white,
                    size: 15,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
