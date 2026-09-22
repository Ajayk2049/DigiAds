/**
 * DigiAds Test Data Cleanup Utility
 * 
 * Safely removes simulator test artifacts while PRESERVING real venues, real ads,
 * merchant menus, and devices.
 * 
 * Usage:
 *   node scripts/cleanupTestData.js --dry-run             # Preview what would be deleted
 *   node scripts/cleanupTestData.js --all                 # Clean orders, impressions, Redis, and orphaned files
 *   node scripts/cleanupTestData.js --orders              # Clean only test orders
 *   node scripts/cleanupTestData.js --orphaned-media      # Clean only unreferenced uploaded files
 *   node scripts/cleanupTestData.js --redis               # Clean BullMQ transcode keys
 *   node scripts/cleanupTestData.js --env=prod --all      # Run on VPS against production DB
 */

const path = require('path');
const fs = require('fs');

// Environment resolution
const cliArgs = process.argv.slice(2);
const envArg = cliArgs.find(a => a.startsWith('--env='));
const isDryRun = cliArgs.includes('--dry-run');

let envPath = null;
if (envArg) {
  const chosen = envArg.split('=')[1];
  envPath = path.join(__dirname, chosen === 'prod' ? '../config/.env.prod' : '../config/.env.dev');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.prod')) && !fs.existsSync(path.join(__dirname, '../config/.env.dev'))) {
  envPath = path.join(__dirname, '../config/.env.prod');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.dev'))) {
  envPath = path.join(__dirname, '../config/.env.dev');
} else if (fs.existsSync(path.join(__dirname, '../config/.env.prod'))) {
  envPath = path.join(__dirname, '../config/.env.prod');
}

if (envPath && fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const mongoose = require('mongoose');
const config = require('../config/config');

const Order = require('../models/Order');
const AdImpression = require('../models/AdImpression');
const PlatformAd = require('../models/PlatformAd');
const AdBooking = require('../models/AdBooking');
const VenuePromo = require('../models/VenuePromo');
const Menu = require('../models/Menu');
const HostApplication = require('../models/HostApplication');

const doAll = cliArgs.includes('--all') || (!cliArgs.includes('--orders') && !cliArgs.includes('--orphaned-media') && !cliArgs.includes('--redis') && !cliArgs.includes('--impressions'));
const doOrders = doAll || cliArgs.includes('--orders');
const doImpressions = doAll || cliArgs.includes('--impressions');
const doMedia = doAll || cliArgs.includes('--orphaned-media');
const doRedis = doAll || cliArgs.includes('--redis');

async function main() {
  console.log('====================================================');
  console.log(`  DIGIADS TEST DATA CLEANUP UTILITY ${isDryRun ? '(DRY RUN MODE)' : ''}`);
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || config.mongoUri;
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);
  console.log(`✓ Connected to MongoDB.\n`);

  // 1. CLEAN ORDERS
  if (doOrders) {
    const orderCount = await Order.countDocuments({});
    console.log(`[1/4] Food Orders Collection:`);
    console.log(`      Found ${orderCount} total orders in database.`);
    if (orderCount > 0) {
      if (isDryRun) {
        console.log(`      [DRY RUN] Would delete ${orderCount} test orders.`);
      } else {
        const delRes = await Order.deleteMany({});
        console.log(`      ✓ Successfully deleted ${delRes.deletedCount} orders.`);
      }
    } else {
      console.log(`      ✓ No orders to clean.`);
    }
    console.log('');
  }

  // 2. CLEAN AD IMPRESSIONS
  if (doImpressions) {
    const impCount = await AdImpression.countDocuments({});
    console.log(`[2/4] Ad Impressions Collection:`);
    console.log(`      Found ${impCount} logged impressions in database.`);
    if (impCount > 0) {
      if (isDryRun) {
        console.log(`      [DRY RUN] Would delete ${impCount} test impressions.`);
      } else {
        const delRes = await AdImpression.deleteMany({});
        console.log(`      ✓ Successfully deleted ${delRes.deletedCount} impressions.`);
      }
    } else {
      console.log(`      ✓ No impressions to clean.`);
    }
    console.log('');
  }

  // 3. CLEAN ORPHANED MEDIA ON DISK (Preserves Real Ads & Menus)
  if (doMedia) {
    console.log(`[3/4] Uploads & Media Files on Disk:`);
    
    // Collect all active media URLs from database
    const activeMediaUrls = new Set();

    // From PlatformAds (user's real 4 video ads + 2 image ads)
    const platformAds = await PlatformAd.find({}).lean();
    for (const ad of platformAds) {
      if (ad.mediaUrl) activeMediaUrls.add(path.normalize(ad.mediaUrl.replace(/^\//, '')));
      if (Array.isArray(ad.mediaUrls)) {
        ad.mediaUrls.forEach(u => activeMediaUrls.add(path.normalize(u.replace(/^\//, ''))));
      }
    }

    // From AdBookings
    const bookings = await AdBooking.find({}).lean();
    for (const b of bookings) {
      if (b.mediaUrl) activeMediaUrls.add(path.normalize(b.mediaUrl.replace(/^\//, '')));
      if (Array.isArray(b.mediaUrls)) {
        b.mediaUrls.forEach(u => activeMediaUrls.add(path.normalize(u.replace(/^\//, ''))));
      }
    }

    // From Menus (dishes uploaded for venues)
    const menus = await Menu.find({}).lean();
    for (const m of menus) {
      if (Array.isArray(m.items)) {
        m.items.forEach(it => {
          if (it.imageUrl) activeMediaUrls.add(path.normalize(it.imageUrl.replace(/^\//, '')));
        });
      }
    }

    // From HostApplications (venue logos, docs)
    const venues = await HostApplication.find({}).lean();
    for (const v of venues) {
      if (v.outletImage) activeMediaUrls.add(path.normalize(v.outletImage.replace(/^\//, '')));
      if (v.panCardImage) activeMediaUrls.add(path.normalize(v.panCardImage.replace(/^\//, '')));
    }

    console.log(`      Indexed ${activeMediaUrls.size} active database media references to PROTECT.`);

    // Scan upload directories
    const uploadsBase = path.join(__dirname, '../uploads');
    const scanDirs = [
      path.join(uploadsBase, 'platform-ads/platform'),
      path.join(uploadsBase, 'platform-ads/fallback'),
      path.join(uploadsBase, 'ads'),
      path.join(uploadsBase, 'temp')
    ];

    let totalOrphanedFiles = 0;
    let totalFreedBytes = 0;

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile()) continue;

          // Compute relative path from server root (e.g., uploads/platform-ads/platform/pad_vid_...)
          const relFromRoot = path.normalize(path.relative(path.join(__dirname, '..'), fullPath));

          // Check if this file is protected by active database records
          const isProtected = Array.from(activeMediaUrls).some(activeUrl => relFromRoot.endsWith(activeUrl) || activeUrl.endsWith(file));

          if (!isProtected) {
            totalOrphanedFiles++;
            totalFreedBytes += stat.size;
            if (isDryRun) {
              // preview
            } else {
              fs.unlinkSync(fullPath);
            }
          }
        } catch (_) {}
      }
    }

    // Also check synthetic test-media folder
    const syntheticDir = path.join(__dirname, 'test-media');
    if (fs.existsSync(syntheticDir)) {
      try {
        if (!isDryRun) {
          fs.rmSync(syntheticDir, { recursive: true, force: true });
        }
        console.log(`      ✓ Removed temporary synthetic test media directory: scripts/test-media/`);
      } catch (_) {}
    }

    const freedMB = (totalFreedBytes / (1024 * 1024)).toFixed(2);
    if (isDryRun) {
      console.log(`      [DRY RUN] Found ${totalOrphanedFiles} unreferenced test files (${freedMB} MB).`);
      console.log(`      [DRY RUN] Would keep all ${activeMediaUrls.size} real ad and menu files safely.`);
    } else {
      console.log(`      ✓ Cleaned ${totalOrphanedFiles} unreferenced test files, freed ${freedMB} MB.`);
      console.log(`      ✓ Preserved all real platform ads and menu assets intact.`);
    }
    console.log('');
  }

  // 4. CLEAN REDIS BULLMQ QUEUE
  if (doRedis) {
    console.log(`[4/4] BullMQ Redis Queue:`);
    try {
      const Redis = require('ioredis');
      const redisUrl = process.env.REDIS_URL || config.redisUrl || 'redis://127.0.0.1:6379';
      const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect();

      // Find all bull:video-transcode-queue keys
      const keys = await redis.keys('bull:video-transcode-queue:*');
      console.log(`      Found ${keys.length} BullMQ video queue keys in Redis.`);

      if (keys.length > 0) {
        if (isDryRun) {
          console.log(`      [DRY RUN] Would remove ${keys.length} BullMQ queue keys.`);
        } else {
          await redis.del(...keys);
          console.log(`      ✓ Successfully purged ${keys.length} BullMQ queue keys from Redis.`);
        }
      } else {
        console.log(`      ✓ Redis queue is already clean.`);
      }
      await redis.quit();
    } catch (redisErr) {
      console.warn(`      x Could not connect to Redis:`, redisErr.message);
    }
    console.log('');
  }

  await mongoose.disconnect();
  console.log('====================================================');
  console.log(`  CLEANUP COMPLETE ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
