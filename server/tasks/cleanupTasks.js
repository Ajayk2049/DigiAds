const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const releaseController = require('../controllers/releaseController');

/**
 * Comprehensive non-blocking cleanup of orphaned upload scratch files across /tmp and uploads staging
 */
async function cleanupOrphanedTempFiles(maxAgeMs = 6 * 60 * 60 * 1000) {
  try {
    const now = Date.now();
    let count = 0;

    // Queue-aware exclusion: gather all temp paths currently pending or active in BullMQ or fallbackQueue
    let excludedPaths = new Set();
    try {
      const videoQueueService = require('../services/videoQueueService');
      excludedPaths = await videoQueueService.getActiveOrQueuedTempPaths();
    } catch (_) { }

    // Scan directories holding transient upload fragments
    const targets = [
      { dir: os.tmpdir(), isMatch: (f) => f.startsWith('tmp-ad-upload-') || f.startsWith('tmp-host-promo-') || f.startsWith('tmp-pad-') || f.startsWith('staging_') },
      { dir: path.join(__dirname, '..', 'uploads', 'ads', 'staging'), isMatch: (f) => f.startsWith('staging_') || f.endsWith('.tmp') },
      { dir: path.join(__dirname, '..', 'uploads', 'staging'), isMatch: (f) => f.startsWith('staging_') || f.endsWith('.tmp') }
    ];

    for (const target of targets) {
      try {
        const files = await fs.readdir(target.dir);
        for (const file of files) {
          if (target.isMatch(file)) {
            const filePath = path.join(target.dir, file);
            const resolvedPath = path.resolve(filePath);

            // 1. Never delete any file currently active or pending in the transcode queue
            if (excludedPaths.has(resolvedPath)) continue;

            try {
              if (maxAgeMs > 0) {
                const stat = await fs.stat(filePath);
                if (now - stat.mtimeMs < maxAgeMs) continue; // Keep recent and queued files
              }
              await fs.unlink(filePath);
              count++;
            } catch (_) { }
          }
        }
      } catch (_) { }
    }

    if (count > 0) {
      console.log(`[CLEANUP] Pruned ${count} orphaned upload scratch file(s) older than ${Math.round(maxAgeMs / 3600000)}h.`);
    }
  } catch (err) {
    console.warn('[CLEANUP] Temp scratch cleaner notice:', err.message);
  }
}

/**
 * Start background OTA revoked releases disk cleanup task (runs on boot & every 24 hours)
 */
function startOtaDiskCleanupTask() {
  console.log('[OTA Disk Cleanup] Initializing background revoked releases cleanup task (24h)...');
  releaseController.cleanupOldRevokedReleases().catch(() => { });
  const otaTimer = setInterval(() => {
    releaseController.cleanupOldRevokedReleases().catch(() => { });
  }, 24 * 60 * 60 * 1000);
  if (typeof otaTimer.unref === 'function') {
    otaTimer.unref();
  }
}

/**
 * Initialize all disk cleanup tasks
 */
function startBackgroundCleanupTasks() {
  // 1. Run safe cleanup on boot: only prune stale orphaned scratch files older than 6 hours
  // NEVER wipe all files on boot so active queue inputs from PM2 restarts are preserved!
  cleanupOrphanedTempFiles(6 * 60 * 60 * 1000).catch(() => { });

  // 2. Periodic background sweeper every 60 minutes: prunes scratch files older than 6 hours (unref'd)
  const tempSweeperTimer = setInterval(() => {
    cleanupOrphanedTempFiles(6 * 60 * 60 * 1000).catch(() => { });
  }, 60 * 60 * 1000);
  if (typeof tempSweeperTimer.unref === 'function') {
    tempSweeperTimer.unref();
  }

  // 3. OTA cleanup task
  startOtaDiskCleanupTask();
}

module.exports = {
  cleanupOrphanedTempFiles,
  startOtaDiskCleanupTask,
  startBackgroundCleanupTasks
};
