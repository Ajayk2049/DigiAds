/**
 * gRPC Ad Telemetry Duration and Expiration Utilities
 */

/**
 * Telemetry duration resolution helper:
 * - Image Ads: Platform decided duration (1 image = 8s, 2 images = 16s)
 * - Video Ads: Actual video runtime (from gRPC telemetry or probed booking.mediaDuration)
 */
const resolveAdDuration = (booking, durationSeconds) => {
  let resolvedDuration = Number(durationSeconds) > 0 ? Number(durationSeconds) : 0;
  if (booking) {
    const rawUrls = (booking.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
    const isImageCampaign = booking.mediaType === 'image' || rawUrls.some(u => u.endsWith('.webp') || u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg'));

    if (isImageCampaign) {
      resolvedDuration = rawUrls.length >= 2 ? 16 : 8;
    } else {
      resolvedDuration = (resolvedDuration > 0 && resolvedDuration !== 15)
        ? resolvedDuration
        : (booking.mediaDuration || 15);
    }
  } else if (resolvedDuration === 0) {
    resolvedDuration = 8;
  }
  return resolvedDuration;
};

/**
 * Compute dynamic TTL expiration date for AdImpression telemetry (Plan duration + 1 day buffer)
 */
const computeImpressionExpiresAt = (booking) => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (booking) {
    const durationDays = Number(booking.adDurationDays) || 7;
    const createdAtMs = booking.createdAt ? new Date(booking.createdAt).getTime() : now;
    const planPlusOneMs = createdAtMs + ((durationDays + 1) * ONE_DAY_MS);
    // Guarantee minimum 24-hour retention from receipt for offline-synced or late impressions
    return new Date(Math.max(planPlusOneMs, now + ONE_DAY_MS));
  }
  return new Date(now + (8 * ONE_DAY_MS)); // Fallback: 8 days (7-day plan + 1-day grace)
};

module.exports = {
  resolveAdDuration,
  computeImpressionExpiresAt
};
