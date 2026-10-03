const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pipeline } = require('stream/promises');
const MediaLog = require('../../models/MediaLog');
const videoQueueService = require('../../services/videoQueueService');
const { validateTargetBooking, checkVideoDuration } = require('./adMediaHelper');
const {
  generateMediaFilename,
  streamAndOptimizeImage
} = require('../../utils/uploadHandler');
const { UPLOAD_LIMITS } = require('../../config/constants');

class AdMediaController {
  /**
   * Upload video binary payload, probe duration, stage file, and enqueue for background transcode
   */
  async uploadVideo(req, res) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > UPLOAD_LIMITS.DEFAULT_BODY_LIMIT_BYTES) {
      return res.status(400).send({ success: false, message: 'Video file size exceeds maximum platform limit of 50MB' });
    }

    const bookingId = req.query.bookingId;
    let targetBookingObj = null;
    if (bookingId) {
      const validation = await validateTargetBooking(bookingId, req.user, 'video');
      if (validation.error) {
        return res.status(validation.statusCode).send({ success: false, message: validation.error });
      }
      targetBookingObj = validation.booking;
    }

    const filenameHeader = req.headers['x-filename'] || 'video.mp4';
    const ext = path.extname(filenameHeader).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only MP4 and WEBM are allowed.' });
    }

    const deviceType = req.query.deviceType;
    if (!deviceType || !['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({
        success: false,
        message: 'deviceType query parameter is required and must be "tablet" or "screen"'
      });
    }

    const resolutionMap = { tablet: '800x1280', screen: '1920x1080' };
    const resolution = resolutionMap[deviceType];
    const uniqueFilename = `vid_${uuidv4().replace(/-/g, '').slice(0, 16)}.mp4`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'ads', 'videos', deviceType);
    const stagingDir = path.join(__dirname, '..', '..', 'uploads', 'ads', 'staging');

    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueFilename);
    const tempPath = path.join(stagingDir, `staging_${uuidv4().replace(/-/g, '').slice(0, 12)}${ext}`);
    let mediaLog = null;

    const canAccept = await videoQueueService.canAcceptJob();
    if (!canAccept) {
      res.header('Retry-After', '300');
      return res.status(429).send({
        success: false,
        message: 'Video transcoding queue is currently at maximum capacity. Please retry in a few minutes.'
      });
    }

    try {
      await pipeline(req.body || req.raw, fs.createWriteStream(tempPath));

      const allowedMaxDuration = targetBookingObj?.maxVideoLengthSeconds || 30;
      const durationCheck = await checkVideoDuration(tempPath, allowedMaxDuration);
      if (!durationCheck.isValid) {
        return res.status(400).send({ success: false, message: durationCheck.error });
      }

      mediaLog = new MediaLog({ originalFilename: filenameHeader, status: 'processing' });
      await mediaLog.save();

      await videoQueueService.enqueueJob({
        tempPath,
        filePath,
        targetSubdir: deviceType,
        uniqueFilename,
        resolution,
        mediaLogId: mediaLog._id,
        bookingId: targetBookingObj ? targetBookingObj._id : bookingId
      });

      const fileUrl = `/uploads/ads/videos/${deviceType}/${uniqueFilename}`;
      if (targetBookingObj) {
        targetBookingObj.mediaUrl = fileUrl;
        if (durationCheck.durationSeconds > 0) {
          targetBookingObj.mediaDuration = Math.round(durationCheck.durationSeconds);
        }
        const incomingCategory = req.query.adCategory || req.headers['x-ad-category'];
        if (incomingCategory) {
          targetBookingObj.adCategory = decodeURIComponent(incomingCategory).trim();
        }
        await targetBookingObj.save();
        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('new_campaign', { bookingId: targetBookingObj.bookingId });
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Media uploaded successfully! Your campaign video is being optimized and scheduled. It will go live across venue displays within 15 minutes.',
        data: { filename: uniqueFilename, url: fileUrl, status: 'queued' }
      });
    } catch (error) {
      req.log.error({ err: error }, 'uploadVideo Staging Error');
      try { await fs.promises.unlink(tempPath); } catch (_) {}
      if (mediaLog) {
        try {
          mediaLog.status = 'failed';
          mediaLog.errorMessage = error.message;
          await mediaLog.save();
        } catch (_) {}
      }
      if (error.isCapacityError) {
        res.header('Retry-After', '300');
        return res.status(429).send({ success: false, message: error.message });
      }
      return res.status(500).send({ success: false, message: 'Failed to stage video upload: ' + error.message });
    }
  }

  /**
   * Upload image raw binary payload, optimize via sharp and save to disk
   */
  async uploadImage(req, res) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES * 2) {
      return res.status(400).send({ success: false, message: 'Image file size exceeds maximum allowed limit of 10MB' });
    }

    const bookingId = req.query.bookingId;
    let targetBookingObj = null;
    if (bookingId) {
      const validation = await validateTargetBooking(bookingId, req.user, 'image');
      if (validation.error) {
        return res.status(validation.statusCode).send({ success: false, message: validation.error });
      }
      targetBookingObj = validation.booking;
    }

    const filenameHeader = req.headers['x-filename'] || req.headers['X-Filename'] || 'image.png';
    const ext = path.extname(filenameHeader).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.' });
    }

    const deviceType = req.query.deviceType;
    if (!deviceType || !['tablet', 'screen'].includes(deviceType)) {
      return res.status(400).send({
        success: false,
        message: 'deviceType query parameter is required and must be "tablet" or "screen"'
      });
    }

    const dimensionsMap = {
      tablet: { width: 800, height: 1280 },
      screen: { width: 1920, height: 1080 }
    };
    const targetDim = dimensionsMap[deviceType];

    let mediaLog;
    try {
      mediaLog = new MediaLog({ originalFilename: filenameHeader, status: 'processing' });
      await mediaLog.save();
    } catch (dbErr) {
      req.log.error({ err: dbErr }, 'Failed to create MediaLog');
      return res.status(500).send({ success: false, message: 'Failed to initialize upload tracking' });
    }

    const uniqueFilename = generateMediaFilename('img', '.webp');
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'ads', 'images', deviceType);
    const filePath = path.join(uploadsDir, uniqueFilename);

    try {
      await streamAndOptimizeImage(req.body || req.raw, filePath, {
        width: targetDim.width,
        height: targetDim.height,
        withoutEnlargement: false,
        quality: 85
      });

      mediaLog.status = 'completed';
      mediaLog.finalizedFilename = uniqueFilename;
      mediaLog.outputPath = filePath;
      await mediaLog.save();

      const fileUrl = `/uploads/ads/images/${deviceType}/${uniqueFilename}`;
      if (targetBookingObj) {
        try {
          const isFirstInBatch = req.query.isFirst === 'true' || req.query.slotIndex === '0';
          let existingUrls = [];
          if (!isFirstInBatch && targetBookingObj.mediaUrl) {
            existingUrls = targetBookingObj.mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
          }
          if (existingUrls.length >= 2) {
            existingUrls = existingUrls.slice(0, 1);
          }
          existingUrls.push(fileUrl);
          targetBookingObj.mediaUrl = existingUrls.slice(0, 2).join(', ');
          const incomingCategory = req.query.adCategory || req.headers['x-ad-category'];
          if (incomingCategory) {
            targetBookingObj.adCategory = decodeURIComponent(incomingCategory).trim();
          }
          await targetBookingObj.save();

          if (global.broadcastToAdmins) {
            global.broadcastToAdmins('new_campaign', { bookingId: targetBookingObj.bookingId });
          }
        } catch (updateErr) {
          req.log.error({ err: updateErr }, 'Failed to update booking mediaUrl in uploadImage');
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: { filename: uniqueFilename, url: fileUrl }
      });
    } catch (error) {
      req.log.error({ err: error }, 'uploadImage Sharp Error');
      if (mediaLog) {
        mediaLog.status = 'failed';
        mediaLog.errorMessage = error.message;
        await mediaLog.save().catch(() => {});
      }
      return res.status(500).send({ success: false, message: `Image optimization failed: ${error.message}` });
    }
  }
}

module.exports = new AdMediaController();
