const path = require('path');
const fs = require('fs');
const HostApplication = require('../../models/HostApplication');
const logger = require('../../utils/logger');

/**
 * Derives human-searchable venue subfolder name: [sanitized_venue_name]_[hostApplicationId]
 * @param {string} hostApplicationId 
 * @returns {Promise<{ venueSlug: string, folderName: string }>}
 */
async function getVenueFolderInfo(hostApplicationId) {
  let venueSlug = 'venue';
  let folderName = 'general';

  if (hostApplicationId) {
    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (hostApp) {
        const rawName = hostApp.outletName || hostApp.restaurantName || 'venue';
        venueSlug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'venue';
        folderName = `${venueSlug}_${hostApp._id.toString()}`;
      } else {
        folderName = `venue_${hostApplicationId}`;
      }
    } catch (e) {
      folderName = `venue_${hostApplicationId}`;
    }
  }
  return { venueSlug, folderName };
}

/**
 * Universal helper to safely delete physical media file from server/uploads/ with traversal protection
 * @param {string} mediaUrl 
 */
async function unlinkMediaFile(mediaUrl) {
  if (!mediaUrl || !mediaUrl.includes('/uploads/')) return;
  const relPath = mediaUrl.split('/uploads/')[1];
  if (!relPath) return;

  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  const fullPath = path.resolve(uploadsDir, relPath);

  // Prevent path traversal attacks
  if (!fullPath.startsWith(uploadsDir)) {
    logger.warn({ fullPath }, 'Blocked path traversal attempt in unlinkMediaFile');
    return;
  }

  try {
    await fs.promises.unlink(fullPath);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      logger.error({ err: e.message }, 'unlinkMediaFile Error');
    }
  }
}

module.exports = {
  getVenueFolderInfo,
  unlinkMediaFile
};
