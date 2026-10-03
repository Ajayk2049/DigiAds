const fs = require('fs');
const path = require('path');
const os = require('os');
const HostApplication = require('../../models/HostApplication');
const VenuePromo = require('../../models/VenuePromo');
const videoQueue = require('../../utils/videoQueue');
const { probeVideoMetadata } = require('../../utils/videoUtils');

/**
 * Returns quota limits and defaults for a venue based on adMode and custom overrides.
 */
function resolveVenueQuotas(hostApp) {
  const isClosed = hostApp.allowOpenAds === false || hostApp.adMode === 'closed';

  const maxVideoSlots = hostApp.customMaxVideoSlots ?? (isClosed ? 3 : 2);
  const maxImageSlots = hostApp.customMaxImageSlots ?? (isClosed ? 8 : 3);
  const maxScreenVideoSlots = hostApp.customMaxScreenVideoSlots ?? (isClosed ? 3 : 2);
  const maxScreenImageSlots = hostApp.customMaxScreenImageSlots ?? (isClosed ? 8 : 3);
  const maxScreenSlots = hostApp.customMaxScreenSlots ?? (isClosed ? 8 : 3);

  const dailyVideoQuota = hostApp.customDailyVideoQuota ?? (isClosed ? 6 : 4);
  const dailyImageQuota = hostApp.customDailyImageQuota ?? (isClosed ? 15 : 10);
  const dailyScreenVideoQuota = hostApp.customDailyScreenVideoQuota ?? (isClosed ? 6 : 4);
  const dailyScreenImageQuota = hostApp.customDailyScreenImageQuota ?? (isClosed ? 15 : 10);
  const dailyScreenQuota = hostApp.customDailyScreenQuota ?? (isClosed ? 6 : 4);

  return {
    isClosed,
    maxVideoSlots,
    maxImageSlots,
    maxScreenVideoSlots,
    maxScreenImageSlots,
    maxScreenSlots,
    dailyVideoQuota,
    dailyImageQuota,
    dailyScreenVideoQuota,
    dailyScreenImageQuota,
    dailyScreenQuota
  };
}

/**
 * Checks and performs daily 2:00 AM IST quota reset
 */
async function check2AMQuotaReset(hostApp) {
  if (!hostApp) return;
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const istToday2AM = new Date(istNow);
  istToday2AM.setUTCHours(2, 0, 0, 0);

  let last2AMCutoff = istToday2AM;
  if (istNow < istToday2AM) {
    last2AMCutoff = new Date(istToday2AM.getTime() - 24 * 60 * 60 * 1000);
  }

  const lastReset = hostApp.lastQuotaResetDate ? new Date(hostApp.lastQuotaResetDate) : new Date(0);
  if (lastReset < last2AMCutoff) {
    const quotas = resolveVenueQuotas(hostApp);

    hostApp.dailyVideoChangesRemaining = quotas.dailyVideoQuota;
    hostApp.dailyImageChangesRemaining = quotas.dailyImageQuota;
    hostApp.dailyScreenVideoChangesRemaining = quotas.dailyScreenVideoQuota;
    hostApp.dailyScreenImageChangesRemaining = quotas.dailyScreenImageQuota;
    hostApp.dailyScreenChangesRemaining = quotas.dailyScreenQuota;
    hostApp.lastQuotaResetDate = now;
    await hostApp.save();
  }
}

/**
 * Probes video duration and validates against open/closed venue limits
 */
async function validateVideoDuration(tempPath, hostApp) {
  const isClosedMode = hostApp.adMode === 'closed' || hostApp.allowOpenAds === false;
  const maxAllowedSeconds = isClosedMode ? 60 : 30;

  try {
    const metadata = await probeVideoMetadata(tempPath, 5000);
    const durationSeconds = metadata?.format?.duration || 0;
    if (durationSeconds > maxAllowedSeconds + 0.5) {
      try { await fs.promises.unlink(tempPath); } catch (_) {}
      return {
        isValid: false,
        error: `Uploaded video duration (${Math.round(durationSeconds)}s) exceeds the ${maxAllowedSeconds}-second limit for ${isClosedMode ? 'Closed' : 'Open'} Ads Mode venues.`
      };
    }
  } catch (probeErr) {
    console.warn('[uploadHostPromoMedia] ffprobe duration check warning:', probeErr.message);
  }
  return { isValid: true };
}

/**
 * Calculates required quota deductions and pre-flight checks for slots
 */
async function calculateQuotaDeductions(slots, hostApp) {
  let videoConsumed = 0, imageConsumed = 0, screenVideoConsumed = 0, screenImageConsumed = 0, screenConsumed = 0;
  const slotChecks = [];

  for (const slot of slots) {
    if (!slot) continue;
    const { slotType, slotIndex, mediaUrl, isDeleted } = slot;
    const existingPromo = await VenuePromo.findOne({ hostApplicationId: hostApp._id, slotType, slotIndex });
    slotChecks.push({ slot, existingPromo });

    if (isDeleted || !mediaUrl) continue;
    const isNew = !existingPromo || existingPromo.mediaUrl !== mediaUrl;
    if (isNew) {
      if (slotType === 'video') videoConsumed++;
      else if (slotType === 'screen_video') screenVideoConsumed++;
      else if (slotType === 'screen_image') screenImageConsumed++;
      else if (slotType === 'screen') screenConsumed++;
      else imageConsumed++;
    }
  }

  const query = { _id: hostApp._id };
  const inc = {};
  if (videoConsumed > 0) { query.dailyVideoChangesRemaining = { $gte: videoConsumed }; inc.dailyVideoChangesRemaining = -videoConsumed; }
  if (screenVideoConsumed > 0) { query.dailyScreenVideoChangesRemaining = { $gte: screenVideoConsumed }; inc.dailyScreenVideoChangesRemaining = -screenVideoConsumed; }
  if (screenImageConsumed > 0) { query.dailyScreenImageChangesRemaining = { $gte: screenImageConsumed }; inc.dailyScreenImageChangesRemaining = -screenImageConsumed; }
  if (screenConsumed > 0) { query.dailyScreenChangesRemaining = { $gte: screenConsumed }; inc.dailyScreenChangesRemaining = -screenConsumed; }
  if (imageConsumed > 0) { query.dailyImageChangesRemaining = { $gte: imageConsumed }; inc.dailyImageChangesRemaining = -imageConsumed; }

  return {
    slotChecks,
    totalConsumed: videoConsumed + screenVideoConsumed + screenImageConsumed + screenConsumed + imageConsumed,
    query,
    inc
  };
}

/**
 * Validates and enqueues video transcode job for a promo slot with auto-refund on failure
 */
async function enqueuePromoTranscode({ hostApp, savedPromo, slot, mediaUrl }) {
  const resolvedTemp = path.resolve(slot.tempPath);
  const allowedTmp = path.resolve(os.tmpdir());
  const allowedUploads = path.resolve(__dirname, '..', '..', 'uploads');

  const isAllowedPath = resolvedTemp.startsWith(allowedTmp + path.sep) ||
    resolvedTemp.startsWith(allowedUploads + path.sep);

  if (!isAllowedPath) {
    console.warn(`[Security Warning] Blocked path traversal attempt in streamHostPromos: ${slot.tempPath}`);
    return false;
  }

  let tempFileExists = false;
  try {
    const stat = await fs.promises.stat(resolvedTemp);
    if (stat.size > 0) tempFileExists = true;
  } catch (_) {}

  if (!tempFileExists) {
    console.warn(`[streamHostPromos] Temp file does not exist or is empty: ${resolvedTemp}`);
    savedPromo.transcodeStatus = 'completed';
    savedPromo.isStreaming = true;
    await savedPromo.save();
    return false;
  }

  const filename = path.basename(mediaUrl);
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'host_promos', hostApp._id.toString());

  try {
    await videoQueue.enqueue({
      modelType: 'VenuePromo',
      recordId: savedPromo._id,
      tempPath: resolvedTemp,
      targetDir: uploadsDir,
      relativeSubdir: `host_promos/${hostApp._id}`,
      finalFilename: filename,
      hostApplicationId: hostApp._id
    });
    return true;
  } catch (queueErr) {
    try { await fs.promises.unlink(resolvedTemp); } catch (_) {}
    try {
      const refund = {};
      const { slotType } = slot;
      if (slotType === 'video') refund.dailyVideoChangesRemaining = 1;
      else if (slotType === 'screen_video') refund.dailyScreenVideoChangesRemaining = 1;
      else if (slotType === 'screen_image') refund.dailyScreenImageChangesRemaining = 1;
      else if (slotType === 'screen') refund.dailyScreenChangesRemaining = 1;
      else refund.dailyImageChangesRemaining = 1;

      await HostApplication.findOneAndUpdate({ _id: hostApp._id }, { $inc: refund });
      for (const [k, v] of Object.entries(refund)) {
        if (typeof hostApp[k] === 'number') hostApp[k] += v;
      }
      savedPromo.transcodeStatus = 'completed';
      savedPromo.isStreaming = true;
      await savedPromo.save();
    } catch (_) {}
    throw queueErr;
  }
}

function syncHostAppQuotas(hostApp, quotas) {
  const sync = (field, defaultVal) => {
    if (hostApp[field] === undefined || hostApp[field] === null) {
      hostApp[field] = defaultVal;
    } else {
      hostApp[field] = Math.min(defaultVal, hostApp[field]);
    }
    return hostApp[field];
  };
  return {
    dailyVideoChangesRemaining: sync('dailyVideoChangesRemaining', quotas.dailyVideoQuota),
    dailyImageChangesRemaining: sync('dailyImageChangesRemaining', quotas.dailyImageQuota),
    dailyScreenVideoChangesRemaining: sync('dailyScreenVideoChangesRemaining', quotas.dailyScreenVideoQuota),
    dailyScreenImageChangesRemaining: sync('dailyScreenImageChangesRemaining', quotas.dailyScreenImageQuota),
    dailyScreenChangesRemaining: sync('dailyScreenChangesRemaining', quotas.dailyScreenQuota)
  };
}

module.exports = {
  resolveVenueQuotas,
  check2AMQuotaReset,
  syncHostAppQuotas,
  validateVideoDuration,
  calculateQuotaDeductions,
  enqueuePromoTranscode
};
