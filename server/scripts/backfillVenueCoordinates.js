const mongoose = require('mongoose');
const config = require('../config/config');
const mongoUri = config.mongoUri || process.env.MONGO_URI || process.env.MONGODB_URI;
const HostApplication = require('../models/HostApplication');
const geocodeService = require('../services/geocodeService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBackfill() {
  console.log('=====================================================');
  console.log('📍 DigiAds - Venue Coordinates Geocoding Backfill Tool');
  console.log('=====================================================');
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}...`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully.\n');

    // Find venues that have null/invalid coordinates or all approved venues
    const venues = await HostApplication.find({
      $or: [
        { latitude: null },
        { longitude: null },
        { latitude: { $exists: false } },
        { longitude: { $exists: false } }
      ]
    });

    console.log(`Found ${venues.length} venue(s) requiring geo-coordinate resolution.\n`);

    if (venues.length === 0) {
      console.log('🎉 All venues already have valid geo-coordinates. Nothing to backfill!');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      const addressSummary = `${venue.doorNo || ''} ${venue.street || ''}, ${venue.city || ''}, ${venue.state || ''} - ${venue.zipCode || ''}`.trim();
      
      console.log(`[${i + 1}/${venues.length}] Geocoding: "${venue.outletName}" (${venue.venueId || venue._id})`);
      console.log(`   Address: ${addressSummary}`);

      try {
        const geo = await geocodeService.resolveCoordinates({
          street: venue.street,
          city: venue.city,
          state: venue.state,
          zipCode: venue.zipCode
        });

        venue.latitude = geo.latitude;
        venue.longitude = geo.longitude;
        await venue.save();

        console.log(`   ✅ Resolved: [Lat: ${geo.latitude}, Lng: ${geo.longitude}] via (${geo.source})\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Failed to geocode venue: ${err.message}\n`);
        failedCount++;
      }

      // Respect OSM Nominatim 1 req/sec policy
      if (i < venues.length - 1) {
        await sleep(1100);
      }
    }

    console.log('=====================================================');
    console.log(`🏁 Backfill Completed: ${successCount} updated, ${failedCount} failed.`);
    console.log('=====================================================');
  } catch (error) {
    console.error('Fatal error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

runBackfill();
