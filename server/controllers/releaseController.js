const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AppRelease = require('../models/AppRelease');
const Device = require('../models/Device');

class ReleaseController {
  // GET /api/v1/releases/latest?appType=...
  async getLatestRelease(req, reply) {
    try {
      const { appType } = req.query;
      if (!appType) {
        return reply.code(400).send({ success: false, error: 'appType parameter is required' });
      }

      const release = await AppRelease.findOne({
        appType,
        status: 'active',
      }).sort({ versionCode: -1 });

      if (!release) {
        return reply.send({ success: true, release: null });
      }

      return reply.send({
        success: true,
        release: {
          id: release._id,
          appType: release.appType,
          versionName: release.versionName,
          versionCode: release.versionCode,
          sha256: release.sha256,
          downloadPath: release.downloadPath,
          isMandatory: release.isMandatory,
          releaseNotes: release.releaseNotes,
        },
      });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, error: err.message });
    }
  }

  /**
   * Auto-clean physical APK binary files from server disk for revoked/inactive releases older than 15 days.
   * Keeps all MongoDB history (versionName, versionCode, sha256, releaseNotes, metrics) intact.
   */
  async cleanupOldRevokedReleases() {
    try {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const staleRevokedReleases = await AppRelease.find({
        status: { $in: ['revoked', 'inactive'] },
        isDiskCleaned: { $ne: true },
        createdAt: { $lte: fifteenDaysAgo },
      });

      const uploadsDir = path.join(__dirname, '../../uploads/releases');
      let cleanedCount = 0;

      for (const rel of staleRevokedReleases) {
        if (rel.fileName) {
          const filePath = path.join(uploadsDir, rel.fileName);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[OTA Disk Cleanup] Unlinked 15d+ old revoked release binary: ${rel.fileName}`);
            } catch (unlinkErr) {
              console.error(`[OTA Disk Cleanup] Failed to unlink ${rel.fileName}:`, unlinkErr.message);
            }
          }
        }
        rel.isDiskCleaned = true;
        rel.cleanedAt = new Date();
        await rel.save();
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        console.log(`[OTA Disk Cleanup] Auto-cleaned ${cleanedCount} revoked/inactive APK binary file(s) older than 15 days.`);
      }
    } catch (err) {
      console.error('[OTA Disk Cleanup] Sweep error:', err.message);
    }
  }

  // GET /api/v1/releases/download/:releaseId
  async downloadRelease(req, reply) {
    try {
      const { releaseId } = req.params;
      const release = await AppRelease.findById(releaseId);
      if (!release) {
        return reply.code(404).send({ success: false, error: 'Release not found' });
      }

      if (release.isDiskCleaned) {
        return reply.code(404).send({ success: false, error: 'APK binary file has been auto-cleaned from disk after 15+ days. Release metadata and history preserved.' });
      }

      const uploadsDir = path.join(__dirname, '../../uploads/releases');
      const filePath = path.join(uploadsDir, release.fileName);

      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ success: false, error: 'APK file missing on server' });
      }

      const stream = fs.createReadStream(filePath);
      reply.header('Content-Type', 'application/vnd.android.package-archive');
      reply.header('Content-Disposition', `attachment; filename="${release.fileName}"`);
      reply.header('X-SHA256', release.sha256);
      return reply.send(stream);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, error: err.message });
    }
  }

  // Admin GET /api/v1/admin/releases
  async listReleases(req, reply) {
    try {
      const releases = await AppRelease.find().sort({ createdAt: -1 });
      const devices = await Device.find({}, 'deviceId deviceType lastKnownAppVersion lastKnownVersionCode status lastHeartbeat');

      const releaseCounts = {};
      devices.forEach(d => {
        if (d.lastKnownVersionCode) {
          releaseCounts[d.lastKnownVersionCode] = (releaseCounts[d.lastKnownVersionCode] || 0) + 1;
        }
      });

      const enrichedReleases = releases.map(rel => {
        const doc = rel.toObject();
        doc.deviceCount = releaseCounts[rel.versionCode] || 0;
        return doc;
      });

      return reply.send({ success: true, releases: enrichedReleases, devices });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, error: err.message });
    }
  }

  // Admin POST /api/v1/admin/releases/upload
  async uploadRelease(req, reply) {
    try {
      const appType = req.headers['x-app-type'] || req.query.appType || 'TABLET_APP';
      const versionName = req.headers['x-version-name'] || req.query.versionName || '1.0.1';
      const versionCode = req.headers['x-version-code'] || req.query.versionCode || '2';
      const releaseNotes = req.headers['x-release-notes'] ? decodeURIComponent(req.headers['x-release-notes']) : (req.query.releaseNotes || '');
      const isMandatory = (req.headers['x-is-mandatory'] || req.query.isMandatory) === 'true';

      if (!appType || !versionName || !versionCode) {
        return reply.code(400).send({ success: false, error: 'Missing required release metadata headers (x-app-type, x-version-name, x-version-code)' });
      }

      const uploadsDir = path.join(__dirname, '../../uploads/releases');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeFileName = `${appType.toLowerCase()}_v${versionName}_${Date.now()}.apk`;
      const targetPath = path.join(uploadsDir, safeFileName);

      // Stream raw binary body directly to disk to handle large APKs (>60MB) cleanly
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(targetPath);
        req.raw.pipe(fileStream);
        req.raw.on('end', resolve);
        req.raw.on('error', reject);
        fileStream.on('error', reject);
      });

      // Compute SHA-256 hash of saved file
      const fileBuffer = fs.readFileSync(targetPath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();

      const newRelease = await AppRelease.create({
        appType,
        versionName,
        versionCode: parseInt(versionCode, 10),
        sha256,
        fileName: safeFileName,
        downloadPath: `/api/v1/releases/download/placeholder`,
        isMandatory,
        releaseNotes,
        status: 'active',
      });

      newRelease.downloadPath = `/api/v1/releases/download/${newRelease._id}`;
      await newRelease.save();

      // Proactively notify connected devices over WebSocket
      if (global.deviceSockets) {
        for (const [dId, socket] of global.deviceSockets.entries()) {
          try {
            socket.send(JSON.stringify({ event: 'app_update', release: newRelease }));
          } catch (_) { }
        }
      }

      return reply.send({ success: true, release: newRelease });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, error: err.message });
    }
  }

  // Admin PUT /api/v1/admin/releases/:releaseId/status
  async toggleReleaseStatus(req, reply) {
    try {
      const { releaseId } = req.params;
      const { status } = req.body;
      const release = await AppRelease.findByIdAndUpdate(releaseId, { status }, { new: true });

      // If release was revoked or inactivated, broadcast release_cancelled event to all connected devices
      if (status === 'inactive' || status === 'revoked') {
        if (global.deviceSockets) {
          for (const [dId, socket] of global.deviceSockets.entries()) {
            try {
              socket.send(JSON.stringify({ event: 'release_cancelled', releaseId }));
            } catch (_) { }
          }
        }
        // Trigger 15d+ auto-cleanup evaluation
        this.cleanupOldRevokedReleases().catch(() => { });
      }

      return reply.send({ success: true, release });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, error: err.message });
    }
  }
}

module.exports = new ReleaseController();
