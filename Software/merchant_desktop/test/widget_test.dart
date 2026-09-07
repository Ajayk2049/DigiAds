import 'package:flutter_test/flutter_test.dart';
import 'package:merchant_desktop/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const DigiAdsMerchantApp());
  });
}

