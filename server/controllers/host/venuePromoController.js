const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { v4: uuidv4 } = require('uuid');
const VenuePromo = require('../../models/VenuePromo');
const HostApplication = require('../../models/HostApplication');
const ModeChangeRequest = require('../../models/ModeChangeRequest');
const { getVenueFolderInfo } = require('./venueHelper');
const {
  resolveVenueQuotas,
  check2AMQuotaReset,
  syncHostAppQuotas,
  validateVideoDuration,
  calculateQuotaDeductions,
  enqueuePromoTranscode
} = require('./venuePromoHelper');
const { generateCustomId } = require('../../utils/idGenerator');
const { streamAndOptimizeImage } = require('../../utils/uploadHandler');
const { UPLOAD_LIMITS } = require('../../config/constants');
const videoQueueService = require('../../services/videoQueueService');

class VenuePromoController {
  async check2AMQuotaReset(hostApp) {
    return check2AMQuotaReset(hostApp);
  }

  /**
   * Fetch active venue promos and quota stats for merchant outlet
   */
  async getHostPromos(req, res) {
    const { hostApplicationId } = req.query || {};

    try {
      let hostApp = hostApplicationId
        ? await HostApplication.findById(hostApplicationId)
        : await HostApplication.findOne({ userId: req.user.uid, status: 'approved' });

      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      await check2AMQuotaReset(hostApp);
      const promos = await VenuePromo.find({ hostApplicationId: hostApp._id }).sort({ slotType: 1, slotIndex: 1 });
      const quotas = resolveVenueQuotas(hostApp);
      const syncedQuotas = syncHostAppQuotas(hostApp, quotas);

      await hostApp.save();

      return res.status(200).send({
        success: true,
        data: {
          promos,
          quotaStats: {
            ...quotas,
            ...syncedQuotas,
            isPaused: !!hostApp.isPaused,
            isRevoked: !!hostApp.isRevoked
          }
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'getHostPromos Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch host promos' });
    }
  }

  /**
   * Upload promo media (image or video)
   */
  async uploadHostPromoMedia(req, res) {
    const hostApplicationId = req.headers['x-host-application-id'] || req.query.hostApplicationId;
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'Host application ID required' });
    }

    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > UPLOAD_LIMITS.DEFAULT_BODY_LIMIT_BYTES) {
      return res.status(400).send({ success: false, message: 'Promo media file size exceeds maximum limit of 50MB' });
    }

    if (req.user && req.user.role !== 'admin') {
      const merchantApp = await HostApplication.findOne({ userId: req.user.uid });
      if (!merchantApp || merchantApp._id.toString() !== hostApplicationId.toString()) {
        return res.status(403).send({ success: false, message: 'Access denied: You can only upload promos to your own venue.' });
      }
    }

    let tempPath = null;
    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }
      if (hostApp.isPaused || hostApp.isRevoked) {
        return res.status(403).send({ success: false, message: 'Account is paused or revoked by platform admin' });
      }

      const filenameHeader = req.headers['x-filename'] || 'file.mp4';
      const ext = path.extname(filenameHeader).toLowerCase() || '.mp4';
      const isVideo = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
      const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      if (!isVideo && !isImage) {
        return res.status(400).send({ success: false, message: 'Unsupported file format' });
      }

      if (isVideo && hostApp.dailyVideoChangesRemaining !== undefined && hostApp.dailyVideoChangesRemaining <= 0 && hostApp.dailyScreenVideoChangesRemaining !== undefined && hostApp.dailyScreenVideoChangesRemaining <= 0) {
        res.header('Retry-After', '300');
        return res.status(429).send({
          success: false,
          message: 'Daily promo video change quota exhausted! Resets at 2:00 AM IST.'
        });
      }

      const { folderName } = await getVenueFolderInfo(hostApplicationId);
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'outlets', folderName, 'promos');
      await fs.promises.mkdir(uploadsDir, { recursive: true });

      if (isImage) {
        const uniqueFilename = `promo_img_${uuidv4().replace(/-/g, '').slice(0, 16)}.webp`;
        const filePath = path.join(uploadsDir, uniqueFilename);
        await streamAndOptimizeImage(req.body || req.raw, filePath, { width: 1920, height: 1080, quality: 85 });

        return res.status(200).send({
          success: true,
          data: {
            mediaUrl: `/uploads/outlets/${folderName}/promos/${uniqueFilename}`,
            mediaType: 'image',
            durationSeconds: 15
          }
        });
      }

      const canAccept = await videoQueueService.canAcceptJob();
      if (!canAccept) {
        res.header('Retry-After', '300');
        return res.status(429).send({
          success: false,
          message: 'Video transcoding queue is currently at maximum capacity. Please retry in a few minutes.'
        });
      }

      const uniqueFilename = `promo_vid_${uuidv4().replace(/-/g, '').slice(0, 16)}.mp4`;
      tempPath = path.join(os.tmpdir(), `tmp-host-promo-${Date.now()}${ext}`);
      const rawFilePath = path.join(uploadsDir, uniqueFilename);

      await pipeline(req.body || req.raw, fs.createWriteStream(tempPath));

      const check = await validateVideoDuration(tempPath, hostApp);
      if (!check.isValid) {
        return res.status(400).send({ success: false, message: check.error });
      }

      await fs.promises.copyFile(tempPath, rawFilePath);
      return res.status(200).send({
        success: true,
        message: 'Video uploaded! Background processing queued.',
        data: {
          mediaUrl: `/uploads/outlets/${folderName}/promos/${uniqueFilename}`,
          mediaType: 'video',
          durationSeconds: 30,
          transcodeStatus: 'pending',
          tempPath,
          targetDir: uploadsDir,
          relativeSubdir: `outlets/${folderName}/promos`,
          finalFilename: uniqueFilename
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'uploadHostPromoMedia Error');
      if (tempPath) {
        try { await fs.promises.unlink(tempPath); } catch (_) {}
      }
      return res.status(500).send({ success: false, message: 'Failed to upload and process promo media' });
    }
  }

  /**
   * Stream Host Promos: Batch update slots, deduct quota & notify devices
   */
  async streamHostPromos(req, res) {
    const { hostApplicationId, slots } = req.body || {};
    if (!hostApplicationId || !Array.isArray(slots)) {
      return res.status(400).send({ success: false, message: 'Invalid payload' });
    }

    try {
      let hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }
      if (hostApp.isPaused || hostApp.isRevoked) {
        return res.status(403).send({ success: false, message: 'Account is paused or revoked by admin' });
      }

      await check2AMQuotaReset(hostApp);

      const hasPendingVideo = slots.some(s => s && s.tempPath && s.mediaType === 'video');
      if (hasPendingVideo) {
        const canAccept = await videoQueueService.canAcceptJob();
        if (!canAccept) {
          res.header('Retry-After', '300');
          return res.status(429).send({
            success: false,
            message: 'Video transcoding queue is currently at maximum capacity. Please retry in a few minutes.'
          });
        }
      }

      const { slotChecks, totalConsumed, query, inc } = await calculateQuotaDeductions(slots, hostApp);
      if (totalConsumed > 0) {
        const updatedHostApp = await HostApplication.findOneAndUpdate(query, { $inc: inc }, { new: true });
        if (!updatedHostApp) {
          res.header('Retry-After', '300');
          return res.status(429).send({
            success: false,
            message: 'Daily promo change quota exhausted or concurrent update conflict! Resets at 2:00 AM IST.'
          });
        }
        hostApp = updatedHostApp;
      }

      for (const { slot, existingPromo } of slotChecks) {
        const { slotType, slotIndex, title, mediaUrl, mediaType, isDeleted } = slot;

        if (isDeleted) {
          if (existingPromo) {
            await VenuePromo.deleteOne({ _id: existingPromo._id });
          }
          continue;
        }

        const isNewMedia = (!existingPromo || existingPromo.mediaUrl !== mediaUrl) && mediaUrl;
        if (isNewMedia) {
          let savedPromo;
          if (existingPromo) {
            existingPromo.mediaUrl = mediaUrl;
            existingPromo.mediaType = mediaType;
            existingPromo.title = title || '';
            existingPromo.isStreaming = true;
            existingPromo.transcodeStatus = slot.tempPath ? 'pending' : 'completed';
            savedPromo = await existingPromo.save();
          } else {
            savedPromo = await VenuePromo.create({
              hostApplicationId: hostApp._id,
              slotType,
              slotIndex,
              title: title || '',
              mediaUrl,
              mediaType,
              isStreaming: true,
              transcodeStatus: slot.tempPath ? 'pending' : 'completed'
            });
          }

          if (slot.tempPath && mediaType === 'video') {
            await enqueuePromoTranscode({ hostApp, savedPromo, slot, mediaUrl });
          }
        } else if (existingPromo) {
          existingPromo.title = title || '';
          await existingPromo.save();
        }
      }

      if (typeof global.notifyDevicesReloadAds === 'function') {
        global.notifyDevicesReloadAds(hostApp._id);
      }

      return res.status(200).send({
        success: true,
        message: 'Venue promos updated and streaming on devices!',
        data: {
          dailyVideoChangesRemaining: hostApp.dailyVideoChangesRemaining,
          dailyImageChangesRemaining: hostApp.dailyImageChangesRemaining,
          dailyScreenVideoChangesRemaining: hostApp.dailyScreenVideoChangesRemaining,
          dailyScreenImageChangesRemaining: hostApp.dailyScreenImageChangesRemaining,
          dailyScreenChangesRemaining: hostApp.dailyScreenChangesRemaining
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'streamHostPromos Error');
      if (error.isCapacityError) {
        res.header('Retry-After', '300');
        return res.status(429).send({ success: false, message: error.message });
      }
      return res.status(500).send({ success: false, message: 'Failed to stream venue promos' });
    }
  }

  /**
   * Delete a specific promo slot
   */
  async deleteHostPromoSlot(req, res) {
    const { hostApplicationId, slotType, slotIndex } = req.body || {};
    try {
      const hostApp = await HostApplication.findById(hostApplicationId);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      await VenuePromo.deleteOne({ hostApplicationId: hostApp._id, slotType, slotIndex });
      return res.status(200).send({ success: true, message: 'Promo slot cleared and file unlinked' });
    } catch (error) {
      req.log.error({ err: error }, 'deleteHostPromoSlot Error');
      return res.status(500).send({ success: false, message: 'Failed to delete promo slot' });
    }
  }

  /**
   * Merchant requests a mode transition (Open <-> Closed)
   */
  async requestModeChange(req, res) {
    const { hostApplicationId, requestedMode, merchantNotes } = req.body || {};
    if (!hostApplicationId || !requestedMode || !['open', 'closed'].includes(requestedMode)) {
      return res.status(400).send({ success: false, message: 'hostApplicationId and valid requestedMode (open/closed) are required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Venue application not found or access denied' });

      const currentMode = app.adMode || (app.allowOpenAds === false ? 'closed' : 'open');
      if (currentMode === requestedMode) {
        return res.status(400).send({ success: false, message: `Venue is already in ${requestedMode.toUpperCase()} mode.` });
      }

      const activePromosCount = await VenuePromo.countDocuments({ hostApplicationId, isStreaming: true });
      if (activePromosCount > 0) {
        return res.status(400).send({
          success: false,
          message: 'Please clear all active in-house venue promo slots before applying for a mode change.'
        });
      }

      const existingPending = await ModeChangeRequest.findOne({ hostApplicationId, status: 'pending' });
      if (existingPending) {
        return res.status(400).send({
          success: false,
          message: 'A mode change request is already pending Platform Admin approval.'
        });
      }

      const requestId = generateCustomId('REQ_MODE_');
      const modeReq = new ModeChangeRequest({
        requestId,
        hostApplicationId: app._id,
        userId: req.user.uid,
        requestedMode,
        currentMode,
        merchantNotes: merchantNotes || '',
        status: 'pending'
      });

      await modeReq.save();

      return res.status(201).send({
        success: true,
        message: 'Mode change request submitted successfully! Pending Platform Admin approval.',
        data: modeReq
      });
    } catch (error) {
      req.log.error({ err: error }, 'requestModeChange Error');
      return res.status(500).send({ success: false, message: 'Failed to submit mode change request: ' + error.message });
    }
  }

  /**
   * Fetch current mode change request status for a venue
   */
  async getModeChangeStatus(req, res) {
    const { hostApplicationId } = req.query || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId parameter is required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Venue application not found or access denied' });

      const latestReq = await ModeChangeRequest.findOne({ hostApplicationId }).sort({ createdAt: -1 });

      return res.status(200).send({
        success: true,
        data: latestReq || null
      });
    } catch (error) {
      req.log.error({ err: error }, 'getModeChangeStatus Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch mode change status' });
    }
  }
}

module.exports = new VenuePromoController();
