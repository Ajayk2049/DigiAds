const Device = require('../../models/Device');
const AdBooking = require('../../models/AdBooking');
const AdImpression = require('../../models/AdImpression');
const { resolveAdDuration, computeImpressionExpiresAt } = require('./telemetryUtils');

/**
 * Skip telemetry logging and DB writes for free fallback ads, platform promos, and venue specials
 */
function isNonBillableAd(bookingId) {
  return !bookingId ||
    bookingId === 'unknown' ||
    bookingId.startsWith('FALLBACK') ||
    bookingId.startsWith('PAD') ||
    bookingId.startsWith('VENUE_AD') ||
    bookingId === 'FALLBACK' ||
    bookingId === 'PAD' ||
    bookingId === 'VENUE_AD';
}

/**
 * Record a single ad impression
 */
async function recordSingleImpression(deviceId, bookingId, durationSeconds, interactiveClicks) {
  if (isNonBillableAd(bookingId)) {
    return { skipped: true };
  }

  console.log(`[gRPC telemetry] Device ${deviceId} tracked impression for Booking ${bookingId}: ${durationSeconds}s, Clicks: ${interactiveClicks}`);

  const booking = await AdBooking.findOne({ bookingId }).lean();
  const deviceDoc = await Device.findOne({ deviceId }).select('hostApplicationId').lean();

  const resolvedDuration = resolveAdDuration(booking, durationSeconds);
  const clicks = Number(interactiveClicks) || 0;
  const expiresAt = computeImpressionExpiresAt(booking);

  await AdImpression.create({
    bookingId,
    advertiserId: booking ? (booking.advertiserId || booking.userId) : null,
    deviceId: deviceId || null,
    hostApplicationId: booking ? booking.hostApplicationId : (deviceDoc ? deviceDoc.hostApplicationId : null),
    durationSeconds: resolvedDuration,
    interactiveClicks: clicks,
    createdAt: new Date(),
    expiresAt
  });

  // Atomically increment cumulative lifetime stats on AdBooking document (verified against device venue)
  if (booking) {
    const bookingOutletId = booking.outletId ? booking.outletId.toString() : null;
    const deviceHostAppId = (deviceDoc && deviceDoc.hostApplicationId) ? deviceDoc.hostApplicationId.toString() : null;

    if (bookingOutletId && deviceHostAppId && bookingOutletId !== deviceHostAppId) {
      console.warn(`[Security Warning] Impression attribution skipped: Device ${deviceId} (Venue: ${deviceHostAppId}) reported for Booking ${bookingId} (Target Venue: ${bookingOutletId})`);
    } else {
      await AdBooking.updateOne(
        { bookingId },
        {
          $inc: {
            totalPlays: 1,
            totalDurationSeconds: resolvedDuration,
            totalClicks: clicks
          }
        }
      );
    }
  }

  return { skipped: false };
}

/**
 * Record a batch of offline synced ad impressions
 */
async function recordBatchImpressions(deviceId, impressions) {
  const deviceDoc = await Device.findOne({ deviceId }).select('hostApplicationId').lean();

  if (!Array.isArray(impressions) || impressions.length === 0) {
    return;
  }

  console.log(`[gRPC telemetry] Device ${deviceId} syncing ${impressions.length} batched offline ad impressions`);

  // 1. Filter out non-billable and invalid items
  const validImpressions = impressions.filter(item => !isNonBillableAd(item && item.bookingId));
  if (validImpressions.length === 0) return;

  // 2. Batch-fetch all referenced bookings in a single query
  const uniqueBookingIds = [...new Set(validImpressions.map(i => i.bookingId))];
  const bookings = await AdBooking.find({ bookingId: { $in: uniqueBookingIds } }).lean();
  const bookingMap = new Map();
  bookings.forEach(b => bookingMap.set(b.bookingId, b));

  const docsToInsert = [];
  const bookingIncrements = new Map(); // bookingId -> { totalPlays, totalDurationSeconds, totalClicks }
  const deviceHostAppId = (deviceDoc && deviceDoc.hostApplicationId) ? deviceDoc.hostApplicationId.toString() : null;

  for (const item of validImpressions) {
    const { bookingId, durationSeconds, interactiveClicks } = item;
    const booking = bookingMap.get(bookingId);
    const resolvedDuration = resolveAdDuration(booking, durationSeconds);
    const clicks = Number(interactiveClicks) || 0;
    const expiresAt = computeImpressionExpiresAt(booking);

    docsToInsert.push({
      bookingId,
      advertiserId: booking ? (booking.advertiserId || booking.userId) : null,
      deviceId: deviceId || null,
      hostApplicationId: booking ? booking.hostApplicationId : (deviceDoc ? deviceDoc.hostApplicationId : null),
      durationSeconds: resolvedDuration,
      interactiveClicks: clicks,
      createdAt: new Date(),
      expiresAt
    });

    // Accumulate cumulative counters with venue verification
    if (booking) {
      const bookingOutletId = booking.outletId ? booking.outletId.toString() : null;
      if (bookingOutletId && deviceHostAppId && bookingOutletId !== deviceHostAppId) {
        console.warn(`[Security Warning] Batch impression attribution skipped: Device ${deviceId} (Venue: ${deviceHostAppId}) reported for Booking ${bookingId} (Target Venue: ${bookingOutletId})`);
      } else {
        const current = bookingIncrements.get(bookingId) || { totalPlays: 0, totalDurationSeconds: 0, totalClicks: 0 };
        current.totalPlays += 1;
        current.totalDurationSeconds += resolvedDuration;
        current.totalClicks += clicks;
        bookingIncrements.set(bookingId, current);
      }
    }
  }

  // 3. Batch insert impressions in chunks of 200 to prevent 16MB BSON and driver socket saturation
  if (docsToInsert.length > 0) {
    const CHUNK_SIZE = 200;
    for (let i = 0; i < docsToInsert.length; i += CHUNK_SIZE) {
      const chunk = docsToInsert.slice(i, i + CHUNK_SIZE);
      await AdImpression.insertMany(chunk, { ordered: false });
    }
  }

  // 4. Batch update booking totals using bulkWrite in chunks of 200
  if (bookingIncrements.size > 0) {
    const bulkOps = [];
    for (const [bId, inc] of bookingIncrements.entries()) {
      bulkOps.push({
        updateOne: {
          filter: { bookingId: bId },
          update: {
            $inc: {
              totalPlays: inc.totalPlays,
              totalDurationSeconds: inc.totalDurationSeconds,
              totalClicks: inc.totalClicks
            }
          }
        }
      });
    }
    if (bulkOps.length > 0) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
        const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
        await AdBooking.bulkWrite(chunk, { ordered: false });
      }
    }
  }
}

module.exports = {
  isNonBillableAd,
  recordSingleImpression,
  recordBatchImpressions
};
