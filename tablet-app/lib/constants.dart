import 'package:flutter/material.dart';

// ───────────────────────── Durations ─────────────────────────

/// Heartbeat ping interval to the gRPC server.
const Duration kHeartbeatInterval = Duration(seconds: 15);

/// Background ad sync interval after a successful first sync.
const Duration kSyncInterval = Duration(minutes: 2);

/// Retry delay for ad sync when the server is unreachable.
const Duration kSyncRetryDelay = Duration(seconds: 10);

/// How long a static (non-video) ad card is displayed.
const Duration kStaticAdDisplayDuration = Duration(seconds: 8);

/// Dip-to-black duration between video transitions.
const Duration kFadeDuration = Duration(milliseconds: 200);

/// Brief black gap between videos while the next controller initializes.
const Duration kTransitionBlackDuration = Duration(milliseconds: 350);

/// Inactivity timeout before the kiosk returns to ad slideshow.
const Duration kInactivityTimeout = Duration(seconds: 60);

/// Abandoned unsubmitted cart expiration timeout before cart is automatically cleared.
const Duration kAbandonedCartTimeout = Duration(minutes: 15);

/// Position poll frequency for video completion detection.
const Duration kPositionPollInterval = Duration(milliseconds: 500);

/// Watchdog interval to detect stalled video decoders.
const Duration kWatchdogInterval = Duration(seconds: 1);

/// How many consecutive watchdog stalls before force-advancing.
const int kWatchdogStallThreshold = 5;

/// Tolerance window for detecting video completion (ms before end).
const Duration kVideoEndTolerance = Duration(milliseconds: 500);

/// Payment status polling interval during checkout.
const Duration kPaymentPollInterval = Duration(seconds: 3);

/// HTTP request timeout for activation and sync calls.
const Duration kHttpTimeout = Duration(seconds: 10);

/// Video download timeout.
const Duration kDownloadTimeout = Duration(minutes: 5);

/// Max download retries per ad file.
const int kMaxDownloadRetries = 3;

/// Max consecutive boot sync retries before giving up and scheduling background retries.
const int kBootSyncRetries = 3;

/// Delay between boot sync retry attempts.
const Duration kBootSyncRetryDelay = Duration(seconds: 5);

/// Aggressive retry interval when the server was unreachable during boot.
const Duration kBootAggressiveRetryInterval = Duration(seconds: 30);

/// Minimum file size (bytes) to consider a download valid.
const int kMinValidFileSize = 1000;

// ───────────────────────── Dynamic Server URL Builders ─────────────────────────

/// Builds a clean HTTP/HTTPS URL from a serverHost string and optional default port.
String buildServerUrl(String serverHost, {int defaultPort = 4200, String path = ''}) {
  String host = serverHost.trim();
  if (host.isEmpty) return '';

  bool isHttps = host.startsWith('https://');
  // Strip protocol prefix if present
  host = host.replaceFirst(RegExp(r'^https?:\/\/'), '').replaceFirst(RegExp(r'\/.*$'), '');

  final cleanPath = path.isEmpty ? '' : (path.startsWith('/') ? path : '/$path');

  // If host already contains a port (e.g. 192.168.1.100:4000)
  if (host.contains(':')) {
    final scheme = isHttps ? 'https' : 'http';
    return '$scheme://$host$cleanPath';
  }

  // If host is a standard domain name without a port (e.g. test-api.digiads.space)
  if (host.contains('.') && !RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(host)) {
    if (defaultPort == 443 || isHttps) {
      return 'https://$host$cleanPath';
    } else if (defaultPort == 80) {
      return 'http://$host$cleanPath';
    }
  }

  final scheme = isHttps ? 'https' : 'http';
  return '$scheme://$host:$defaultPort$cleanPath';
}

/// Builds a clean WS/WSS URL from a serverHost string and optional default port.
String buildWsUrl(String serverHost, {int defaultPort = 4200, String path = ''}) {
  String host = serverHost.trim();
  if (host.isEmpty) return '';

  bool isWss = host.startsWith('https://') || host.startsWith('wss://');
  host = host.replaceFirst(RegExp(r'^(https?|wss?):\/\/'), '').replaceFirst(RegExp(r'\/.*$'), '');

  final cleanPath = path.isEmpty ? '' : (path.startsWith('/') ? path : '/$path');

  if (host.contains(':')) {
    final scheme = isWss ? 'wss' : 'ws';
    return '$scheme://$host$cleanPath';
  }

  if (host.contains('.') && !RegExp(r'^\d+\.\d+\.\d+\.\d+$').hasMatch(host)) {
    if (defaultPort == 443 || isWss) {
      return 'wss://$host$cleanPath';
    } else if (defaultPort == 80) {
      return 'ws://$host$cleanPath';
    }
  }

  final scheme = isWss ? 'wss' : 'ws';
  return '$scheme://$host:$defaultPort$cleanPath';
}

/// Extracts pure IP or Hostname for gRPC ClientChannel (removes protocol and ports).
String cleanGrpcHost(String serverHost) {
  String host = serverHost.trim();
  if (host.isEmpty) return '127.0.0.1';
  host = host.replaceFirst(RegExp(r'^(https?|wss?):\/\/'), '').replaceFirst(RegExp(r'\/.*$'), '');
  if (host.contains(':')) {
    host = host.split(':').first;
  }
  return host;
}

/// Theme check interval.
const Duration kThemeCheckInterval = Duration(minutes: 5);

// ───────────────────────── Colors ─────────────────────────

const Color kScaffoldBg = Color(0xFFE4DFEB); // Lavender/grey/cream background
const Color kCardBg = Color(0xFFFFFFFF); // Pure white card background
const Color kAccentBlue = Color(0xFF56A4E1); // Accent blue color
const Color kSidebarBg = Color(0xFFDCD7E3); // Slightly darker tone for sidebar
const Color kTextDark = Color(0xFF1E1B4B); // Dark indigo for text
const Color kTextGrey = Color(0xFF64748B); // Slate gray for descriptions
const Color kDividerColor = Color(0xFFCBD5E1); // Slate gray divider

// ───────────────────────── EdgeInsets (const, zero allocation) ─────────────────────────

const EdgeInsets kCardPadding = EdgeInsets.all(16.0);
const EdgeInsets kCatalogPadding = EdgeInsets.all(24.0);
const EdgeInsets kSetupCardPadding = EdgeInsets.all(32.0);
const EdgeInsets kCategoryLabelPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kGradientOverlayPadding = EdgeInsets.fromLTRB(16, 24, 16, 16);
const EdgeInsets kCheckoutTotalPadding = EdgeInsets.symmetric(vertical: 12.0);
const EdgeInsets kFloatingCartPadding = EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0);

// ───────────────────────── TextStyles (const, zero allocation) ─────────────────────────

const TextStyle kCardTitleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCardDescriptionStyle = TextStyle(
  fontSize: 11,
  color: kTextGrey,
);

const TextStyle kCardPriceStyle = TextStyle(
  fontSize: 15,
  fontWeight: FontWeight.w900,
  color: kAccentBlue,
);

const TextStyle kCategoryHeaderStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCartButtonTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kAccentBlue,
  fontSize: 12,
);

const TextStyle kQuantityTextStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kAccentBlue,
  fontSize: 14,
);

const TextStyle kOrderHeaderStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 24,
  color: kTextDark,
);

const TextStyle kOrderItemTitleStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kOrderItemSubtitleStyle = TextStyle(
  color: kTextGrey,
  fontSize: 12,
);

const TextStyle kTotalLabelStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kTotalValueStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.w900,
  color: kAccentBlue,
);

const TextStyle kSetupTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  letterSpacing: 0.5,
  color: kTextDark,
);

const TextStyle kSetupSubtitleStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kErrorTextStyle = TextStyle(
  color: Colors.redAccent,
  fontSize: 12,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdWaitingTextStyle = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.bold,
  color: kTextGrey,
);

const TextStyle kAdDeviceIdStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
  fontWeight: FontWeight.bold,
);

const TextStyle kAdSponsoredStyle = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.bold,
  letterSpacing: 2,
  color: kAccentBlue,
);

const TextStyle kAdTitleStyle = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kAdSubtitleStyle = TextStyle(
  fontSize: 14,
  color: kTextGrey,
);

const TextStyle kFloatingCartItemsStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
  color: Colors.white,
);

const TextStyle kFloatingCartTotalStyle = TextStyle(
  fontWeight: FontWeight.w900,
  fontSize: 18,
  color: Colors.white,
);

const TextStyle kCheckoutTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
  color: kTextDark,
);

const TextStyle kCheckoutQRTitleStyle = TextStyle(
  fontWeight: FontWeight.bold,
  fontSize: 16,
  color: kTextDark,
);

const TextStyle kCheckoutOrderIdStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kCheckoutWaitingStyle = TextStyle(
  fontSize: 12,
  color: kTextGrey,
);

const TextStyle kEmptyCartStyle = TextStyle(
  color: kTextGrey,
);

// ───────────────────────── Decorations ─────────────────────────

const BorderRadius kCardBorderRadius = BorderRadius.all(Radius.circular(24));
const BorderRadius kImageBorderRadius = BorderRadius.all(Radius.circular(18));
const BorderRadius kInputBorderRadius = BorderRadius.all(Radius.circular(16));
const BorderRadius kFloatingCartBorderRadius = BorderRadius.all(Radius.circular(16));

// ───────────────────────── Grid Delegates ─────────────────────────

const SliverGridDelegateWithFixedCrossAxisCount kMenuGridDelegate =
    SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  crossAxisSpacing: 20,
  mainAxisSpacing: 20,
  childAspectRatio: 0.85, // Moderately taller cards to hold bottom stepper/layout cleanly
);

// ───────────────────────── Storage ─────────────────────────

const String kAdsDirectoryPath = '/sdcard/AIBotInk/ads_tablet';
const String kPlaylistCacheKey = 'local_playlist';
const String kLastSyncTimeKey = 'last_sync_time';

// ───────────────────────── Video layout ─────────────────────────

/// Extra pixels added to the video container to push the hardware decoder
/// green stripe off-screen for Rockchip/Mali budget tablets.
const double kVideoOverflowPx = 80.0;

// ───────────────────────── Dynamic Category Helpers ─────────────────────────

/// Smart culinary keyword mapper returning the most suitable icon for any
/// custom category created by venue admins.
IconData getCategoryIcon(String category) {
  final cat = category.toLowerCase().trim();

  if (cat.contains('popular') || cat.contains('trending') || cat.contains('bestseller') || cat.contains('top')) {
    return Icons.insights;
  }
  if (cat.contains('starter') || cat.contains('appetizer') || cat.contains('snack') || cat.contains('finger') || cat.contains('chaat') || cat.contains('munch')) {
    return Icons.fastfood;
  }
  if (cat.contains('soup') || cat.contains('broth') || cat.contains('ramen') || cat.contains('noodle') || cat.contains('pasta') || cat.contains('chowmein') || cat.contains('maggi')) {
    return Icons.soup_kitchen;
  }
  if (cat.contains('pizza')) {
    return Icons.local_pizza;
  }
  if (cat.contains('burger') || cat.contains('sandwich') || cat.contains('wrap') || cat.contains('roll') || cat.contains('sub') || cat.contains('frankie') || cat.contains('shawarma')) {
    return Icons.lunch_dining;
  }
  if (cat.contains('main') || cat.contains('curry') || cat.contains('gravy') || cat.contains('entree') || cat.contains('dal') || cat.contains('sabji') || cat.contains('sabzi') || cat.contains('paneer')) {
    return Icons.dinner_dining;
  }
  if (cat.contains('rice') || cat.contains('biryani') || cat.contains('pulao') || cat.contains('fried rice') || cat.contains('thali') || cat.contains('bowl') || cat.contains('khichdi')) {
    return Icons.rice_bowl;
  }
  if (cat.contains('bread') || cat.contains('roti') || cat.contains('naan') || cat.contains('paratha') || cat.contains('bakery') || cat.contains('toast') || cat.contains('kulcha')) {
    return Icons.bakery_dining;
  }
  if (cat.contains('breakfast') || cat.contains('brunch') || cat.contains('morning') || cat.contains('egg') || cat.contains('omelette') || cat.contains('waffle') || cat.contains('pancake') || cat.contains('dosa') || cat.contains('idli')) {
    return Icons.breakfast_dining;
  }
  if (cat.contains('salad') || cat.contains('veg') || cat.contains('healthy') || cat.contains('green') || cat.contains('diet') || cat.contains('sprout') || cat.contains('raw')) {
    return Icons.eco;
  }
  if (cat.contains('seafood') || cat.contains('fish') || cat.contains('prawn') || cat.contains('crab') || cat.contains('sushi') || cat.contains('squid') || cat.contains('salmon')) {
    return Icons.set_meal;
  }
  if (cat.contains('bbq') || cat.contains('grill') || cat.contains('tandoor') || cat.contains('kebab') || cat.contains('kabab') || cat.contains('steak') || cat.contains('meat') || cat.contains('chicken') || cat.contains('mutton') || cat.contains('tikka')) {
    return Icons.outdoor_grill;
  }
  if (cat.contains('dessert') || cat.contains('sweet') || cat.contains('cake') || cat.contains('pastry') || cat.contains('cookie') || cat.contains('brownie') || cat.contains('chocolate') || cat.contains('mithai') || cat.contains('halwa') || cat.contains('gulab')) {
    return Icons.cookie;
  }
  if (cat.contains('ice cream') || cat.contains('icecream') || cat.contains('gelato') || cat.contains('sundae') || cat.contains('kulfi') || cat.contains('shake') || cat.contains('smoothie') || cat.contains('falooda')) {
    return Icons.icecream;
  }
  if (cat.contains('beverage') || cat.contains('drink') || cat.contains('tea') || cat.contains('chai') || cat.contains('coffee') || cat.contains('juice') || cat.contains('soda') || cat.contains('water') || cat.contains('lassi')) {
    return Icons.local_cafe;
  }
  if (cat.contains('bar') || cat.contains('cocktail') || cat.contains('mocktail') || cat.contains('wine') || cat.contains('beer') || cat.contains('alcohol') || cat.contains('liquor') || cat.contains('whiskey') || cat.contains('vodka') || cat.contains('shots')) {
    return Icons.local_bar;
  }
  if (cat.contains('special') || cat.contains('chef') || cat.contains('signature') || cat.contains('today') || cat.contains('featured') || cat.contains('exclusive') || cat.contains('premium')) {
    return Icons.star_rounded;
  }
  if (cat.contains('combo') || cat.contains('deal') || cat.contains('offer') || cat.contains('saver') || cat.contains('pack') || cat.contains('family')) {
    return Icons.local_offer;
  }
  if (cat.contains('kid') || cat.contains('child') || cat.contains('junior')) {
    return Icons.child_care;
  }
  if (cat.contains('sauce') || cat.contains('dip') || cat.contains('side') || cat.contains('extra') || cat.contains('addon') || cat.contains('chutney') || cat.contains('raita') || cat.contains('papad')) {
    return Icons.add_circle_outline;
  }

  return Icons.restaurant;
}

/// Smart culinary keyword mapper returning helpful, appetizing category subtitles.
String getCategorySubtitle(String category) {
  final cat = category.toLowerCase().trim();

  if (cat.contains('popular') || cat.contains('trending') || cat.contains('bestseller') || cat.contains('top')) {
    return "Crowd favorites & most-ordered dishes";
  }
  if (cat.contains('starter') || cat.contains('appetizer') || cat.contains('snack') || cat.contains('finger') || cat.contains('chaat')) {
    return "Freshly prepared starters & finger bites";
  }
  if (cat.contains('main') || cat.contains('curry') || cat.contains('gravy') || cat.contains('dal') || cat.contains('paneer')) {
    return "Hearty main dishes prepared fresh on order";
  }
  if (cat.contains('rice') || cat.contains('biryani') || cat.contains('pulao') || cat.contains('thali')) {
    return "Aromatic rice bowls, biryanis & regional thalis";
  }
  if (cat.contains('pizza')) {
    return "Handcrafted pizzas with premium cheese & toppings";
  }
  if (cat.contains('burger') || cat.contains('sandwich') || cat.contains('wrap') || cat.contains('roll') || cat.contains('shawarma')) {
    return "Juicy burgers, toasted sandwiches & wraps";
  }
  if (cat.contains('soup') || cat.contains('noodle') || cat.contains('pasta') || cat.contains('broth') || cat.contains('ramen')) {
    return "Warm comforting broths, pastas & noodles";
  }
  if (cat.contains('dessert') || cat.contains('sweet') || cat.contains('cake') || cat.contains('pastry') || cat.contains('brownie') || cat.contains('mithai')) {
    return "Sweet endings & pastries to satisfy your cravings";
  }
  if (cat.contains('ice cream') || cat.contains('icecream') || cat.contains('shake') || cat.contains('smoothie') || cat.contains('kulfi')) {
    return "Chilled treats, milkshakes & frozen delights";
  }
  if (cat.contains('beverage') || cat.contains('drink') || cat.contains('tea') || cat.contains('chai') || cat.contains('coffee') || cat.contains('juice') || cat.contains('lassi')) {
    return "Refreshments, cold beverages, teas and coffees";
  }
  if (cat.contains('bar') || cat.contains('cocktail') || cat.contains('mocktail') || cat.contains('wine') || cat.contains('beer')) {
    return "Handcrafted cocktails, mocktails & spirits";
  }
  if (cat.contains('salad') || cat.contains('veg') || cat.contains('healthy') || cat.contains('sprout')) {
    return "Crisp greens, fresh salads & healthy choices";
  }
  if (cat.contains('breakfast') || cat.contains('brunch') || cat.contains('morning') || cat.contains('dosa') || cat.contains('egg')) {
    return "Morning classics, eggs & wholesome breakfast";
  }
  if (cat.contains('bread') || cat.contains('roti') || cat.contains('naan') || cat.contains('paratha') || cat.contains('kulcha')) {
    return "Freshly baked tandoori rotis, naans & breads";
  }
  if (cat.contains('seafood') || cat.contains('fish') || cat.contains('prawn') || cat.contains('crab')) {
    return "Fresh catches & coastal seafood specialties";
  }
  if (cat.contains('bbq') || cat.contains('grill') || cat.contains('kebab') || cat.contains('tandoor') || cat.contains('tikka')) {
    return "Smoky grills, skewers & flame-roasted specialties";
  }
  if (cat.contains('special') || cat.contains('chef') || cat.contains('signature')) {
    return "Chef-curated signature culinary creations";
  }
  if (cat.contains('combo') || cat.contains('deal') || cat.contains('offer') || cat.contains('family')) {
    return "Value meal combos & curated feast pairings";
  }
  if (cat.contains('sauce') || cat.contains('dip') || cat.contains('side') || cat.contains('addon') || cat.contains('chutney')) {
    return "Delicious accompaniments, chutneys & extra dips";
  }
  return "Tasteful creations from our expert chefs";
}

