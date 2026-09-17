const HostApplication = require('../models/HostApplication');

/**
 * Database schema migrations run on startup
 */
async function runDatabaseMigrations() {
  // Dual-device HostApplication schema migration
  try {
    const legacyApps = await HostApplication.find({
      $or: [
        { deviceType: { $exists: true } },
        { quantity: { $exists: true } }
      ]
    });
    if (legacyApps.length > 0) {
      console.log(`[Migration] Found ${legacyApps.length} legacy host application documents. Migrating...`);
      for (const app of legacyApps) {
        const type = app.get('deviceType');
        const qty = app.get('quantity') || 0;

        if (type === 'tablet') {
          app.requestTablet = true;
          app.tabletQuantity = qty;
          app.requestScreen = false;
          app.screenQuantity = 0;
        } else if (type === 'screen') {
          app.requestScreen = true;
          app.screenQuantity = qty;
          app.requestTablet = false;
          app.tabletQuantity = 0;
        }

        // Remove legacy fields
        app.set('deviceType', undefined);
        app.set('quantity', undefined);

        await app.save();
      }
      console.log('[Migration] HostApplication database migration completed successfully.');
    }
  } catch (migError) {
    console.error('[Migration] Failed to run HostApplication migration:', migError.message);
  }
}

module.exports = { runDatabaseMigrations };
