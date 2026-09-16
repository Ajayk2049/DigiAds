const fs = require('fs').promises;
const MediaLog = require('../models/MediaLog');

/**
 * Execute a query to delete all log entries from the media tracking
 * database table where the created_at timestamp is older than 30 days.
 */
async function cleanupOldMediaLogs() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Unlink physical files for failed or abandoned logs older than 30 days
    const staleLogs = await MediaLog.find({
      createdAt: { $lt: cutoffDate },
      status: 'failed'
    }).select('outputPath').lean().limit(500);

    for (const log of staleLogs) {
      if (log.outputPath) {
        try { await fs.unlink(log.outputPath); } catch (_) {}
      }
    }

    const result = await MediaLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`[CLEANUP] Deleted ${result.deletedCount} old media logs older than 30 days.`);
    return result;
  } catch (error) {
    console.error('[CLEANUP] Error during media logs cleanup:', error.message);
    throw error;
  }
}

module.exports = {
  cleanupOldMediaLogs
};
