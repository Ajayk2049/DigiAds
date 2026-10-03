const AdBooking = require('../../models/AdBooking');
const { probeVideoMetadata } = require('../../utils/videoUtils');
const fs = require('fs');

/**
 * Validates target booking existence, ownership, payment completion, and expected media type
 */
async function validateTargetBooking(bookingId, reqUser, expectedMediaType) {
  if (!bookingId) return { booking: null };

  try {
    const isMongoId = bookingId.match(/^[0-9a-fA-F]{24}$/);
    const query = isMongoId ? { _id: bookingId } : { bookingId };

    if (reqUser && reqUser.role !== 'admin') {
      query.advertiserId = reqUser.uid;
    }

    const booking = await AdBooking.findOne(query);
    if (!booking) {
      return { error: 'Ad booking campaign not found.', statusCode: 404 };
    }
    if (booking.mediaType && booking.mediaType !== expectedMediaType) {
      const typeLabel = expectedMediaType === 'video' ? 'Dynamic Video' : 'Static Image';
      return {
        error: `Security Policy Violation: This ad campaign is registered for ${typeLabel} ads only.`,
        statusCode: 400
      };
    }
    if (booking.paymentStatus !== 'completed') {
      return { error: 'Media upload is locked until campaign payment is completed.', statusCode: 403 };
    }
    if (booking.approvalStatus !== 'pending') {
      return { error: `Media upload is locked. Campaign has already been ${booking.approvalStatus}.`, statusCode: 403 };
    }

    return { booking };
  } catch (err) {
    return { error: 'Invalid bookingId provided.', statusCode: 400 };
  }
}

/**
 * Probes video duration and checks against campaign or default limits
 */
async function checkVideoDuration(tempPath, allowedMaxDuration) {
  try {
    const metadata = await probeVideoMetadata(tempPath, 5000);
    const durationSeconds = metadata?.format?.duration || 0;
    if (durationSeconds > allowedMaxDuration + 0.5) {
      try { await fs.promises.unlink(tempPath); } catch (_) {}
      const userFriendlyError = allowedMaxDuration === 30
        ? `Uploaded video duration (${Math.round(durationSeconds)}s) exceeds your paid 30-second plan limit. Please upload a video under 30s or select the 60s plan.`
        : `Uploaded video duration (${Math.round(durationSeconds)}s) exceeds maximum platform limit of 60 seconds.`;
      return { isValid: false, error: userFriendlyError, durationSeconds };
    }
    return { isValid: true, durationSeconds };
  } catch (probeErr) {
    console.warn('ffprobe duration check warning:', probeErr.message);
    return { isValid: true, durationSeconds: 0 };
  }
}

module.exports = {
  validateTargetBooking,
  checkVideoDuration
};
