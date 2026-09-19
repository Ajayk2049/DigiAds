const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const MediaLog = require('../models/MediaLog');
const AdBooking = require('../models/AdBooking');
const VenuePromo = require('../models/VenuePromo');
const PlatformAd = require('../models/PlatformAd');
const config = require('../config/config');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure Redis Client with reconnect strategy
const redisConnection = new IORedis({
  host: config.redisHost || 'localhost',
  port: parseInt(config.redisPort, 10) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  lazyConnect: false,
  retryStrategy: (times) => (times > 20 ? null : Math.min(times * 200, 3000))
});

class VideoQueueService {
  constructor() {
    this.queueName = 'video-transcode-queue';
    this.queue = null;
    this.worker = null;
    this.fallbackQueue = [];
    this.maxFallbackQueueSize = 50;
    this.isFallbackProcessing = false;
    this.isRedisAvailable = false;
    this.lastEvictedKeys = null;

    this.init();
  }

  init() {
    redisConnection.on('connect', () => {
      this.isRedisAvailable = true;
      console.log('\x1b[32m[BullMQ Redis]\x1b[0m Successfully connected to Redis server. Persistent queue active.');
      this.drainFallbackQueueToRedis();
    });

    redisConnection.on('error', (err) => {
      if (this.isRedisAvailable) {
        console.warn(`\x1b[33m[BullMQ Redis Warning]\x1b[0m Connection lost (${err.message}). Queue fallback active.`);
      }
      this.isRedisAvailable = false;
    });

    try {
      this.queue = new Queue(this.queueName, {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: { count: 100, age: 3600 }, // Keep max 100 jobs or 1 hour
          removeOnFail: { count: 50, age: 86400 }       // Keep max 50 failed jobs for 24 hours
        }
      });

      this.queue.on('error', (err) => {
        if (this.isRedisAvailable) {
          console.warn(`\x1b[33m[BullMQ Queue Warning]\x1b[0m ${err.message}`);
        }
      });

      // Worker strictly locked to concurrency: 1 (ONLY 1 FFmpeg instance runs at a time)
      this.worker = new Worker(
        this.queueName,
        async (job) => {
          await this.processTranscodeJob(job.data);
        },
        {
          connection: redisConnection,
          concurrency: 1 // STRICT SINGLE-CONCURRENCY LOCK TO PROTECT VPS CPU & RAM
        }
      );

      this.worker.on('error', (err) => {
        if (this.isRedisAvailable) {
          console.warn(`\x1b[33m[BullMQ Worker Warning]\x1b[0m ${err.message}`);
        }
      });

      this.worker.on('completed', (job) => {
        console.log(`\x1b[32m[BullMQ Worker]\x1b[0m Transcode job #${job.id} completed successfully.`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`\x1b[31m[BullMQ Worker Error]\x1b[0m Job #${job?.id || 'unknown'} failed:`, err.message);
      });
    } catch (err) {
      console.warn('[VideoQueueService] BullMQ init notice:', err.message);
      this.isRedisAvailable = false;
    }

    this.startRedisMemoryMonitor();
  }

  /**
   * Monitor Redis memory utilization and evicted_keys counter to alert before/during fail-open evictions
   */
  async checkRedisMemory() {
    if (!this.isRedisAvailable) return;
    try {
      const memoryRaw = await redisConnection.info('memory');
      const statsRaw = await redisConnection.info('stats');

      const parseInfo = (str) => {
        const out = {};
        if (!str) return out;
        for (const line of str.split('\r\n')) {
          if (!line || line.startsWith('#')) continue;
          const idx = line.indexOf(':');
          if (idx !== -1) {
            out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
        return out;
      };

      const mem = parseInfo(memoryRaw);
      const stats = parseInfo(statsRaw);

      const usedBytes = parseInt(mem.used_memory || '0', 10);
      const maxBytes = parseInt(mem.maxmemory || '0', 10);
      const evictedKeys = parseInt(stats.evicted_keys || '0', 10);

      // Warning 1: Approaching maxmemory limit (warn at >= 85% capacity before evictions begin)
      if (maxBytes > 0) {
        const ratio = usedBytes / maxBytes;
        if (ratio >= 0.85) {
          const pct = Math.round(ratio * 100);
          console.warn(`\x1b[33m[Redis Memory Alert]\x1b[0m Memory threshold warning: ${pct}% used (${mem.used_memory_human || usedBytes} / ${mem.maxmemory_human || maxBytes}). Approaching volatile-lru eviction limit.`);
        }
      }

      // Warning 2: Active eviction notification (alert when volatile-lru is dropping keys)
      if (this.lastEvictedKeys !== null && evictedKeys > this.lastEvictedKeys) {
        const delta = evictedKeys - this.lastEvictedKeys;
        console.warn(`\x1b[31m[Redis Eviction Alert]\x1b[0m Eviction detected! Total evicted keys: ${evictedKeys} (+${delta} in window). Shared volatile-lru is actively evicting keys with TTL.`);
      }
      this.lastEvictedKeys = evictedKeys;
    } catch (_) {
      // Non-intrusive: never throw or disrupt queue execution
    }
  }

  startRedisMemoryMonitor() {
    // Check 5s after startup
    setTimeout(() => this.checkRedisMemory(), 5000);

    // Periodic check every 2 minutes (unref'd so it never keeps process alive)
    const monitorTimer = setInterval(() => this.checkRedisMemory(), 2 * 60 * 1000);
    if (typeof monitorTimer.unref === 'function') {
      monitorTimer.unref();
    }
  }

  /**
   * Pre-flight capacity check before streaming uploads to disk
   * @returns {Promise<boolean>}
   */
  async canAcceptJob() {
    if (this.queue && this.isRedisAvailable) {
      try {
        const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed');
        const totalBacklog = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
        if (totalBacklog >= 100) return false;
        return true;
      } catch (_) {}
    }
    return this.fallbackQueue.length < this.maxFallbackQueueSize;
  }

  /**
   * Add a transcode job to the processing queue (backward compatible alias)
   */
  enqueueJob(jobData) {
    return this.addTranscodeJob(jobData);
  }

  /**
   * Add a transcode job to the processing queue
   */
  async addTranscodeJob(jobData) {
    // 1. Gate TOCTOU protection: verify queue capacity immediately before enqueueing
    const canAccept = await this.canAcceptJob();
    if (!canAccept) {
      console.error(`\x1b[31m[VideoQueue Error]\x1b[0m Queue backlog reached capacity limit. Rejecting transcode.`);
      const capacityError = new Error('Video transcoding queue is currently at maximum capacity. Please retry shortly.');
      capacityError.statusCode = 429;
      capacityError.isCapacityError = true;
      throw capacityError;
    }

    // 2. Refresh mtime on scratch temp file to reset TTL sweeper timer
    if (jobData.tempPath) {
      try {
        const now = new Date();
        await fs.promises.utimes(jobData.tempPath, now, now);
      } catch (_) {}
    }

    const jobPayload = {
      ...jobData,
      enqueuedAt: Date.now()
    };

    if (this.queue && this.isRedisAvailable) {
      try {
        const job = await this.queue.add('transcode', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100, age: 3600 },
          removeOnFail: { count: 50, age: 86400 }
        });
        console.log(`\x1b[35m[BullMQ Queue]\x1b[0m Enqueued persistent transcode job #${job.id} for ${jobData.modelType || 'AdBooking'} (${jobData.recordId || jobData.bookingId}).`);
        return job;
      } catch (err) {
        console.warn(`[BullMQ Queue Warning] Failed adding job to Redis. Falling back to local queue: ${err.message}`);
      }
    }

    // Direct single-instance in-memory fallback if Redis is offline
    if (this.fallbackQueue.length >= this.maxFallbackQueueSize) {
      console.error(`\x1b[31m[VideoQueue Error]\x1b[0m In-memory fallback queue limit reached (${this.maxFallbackQueueSize}). Rejecting transcode to prevent heap exhaustion.`);
      const capacityError = new Error('Video transcoding queue is currently at maximum capacity. Please retry shortly.');
      capacityError.isCapacityError = true;
      throw capacityError;
    }

    console.log(`\x1b[35m[VideoQueue]\x1b[0m Enqueued transcode job for ${jobData.modelType || 'AdBooking'} (${jobData.recordId || jobData.bookingId}). Queue length: ${this.fallbackQueue.length + 1}`);
    this.fallbackQueue.push(jobPayload);
    setImmediate(() => this.processNextFallback());
  }

  /**
   * Migrate any pending in-memory fallback jobs into BullMQ when Redis connects
   */
  async drainFallbackQueueToRedis() {
    if (!this.queue || !this.isRedisAvailable || this.fallbackQueue.length === 0) return;
    console.log(`\x1b[35m[BullMQ Redis]\x1b[0m Migrating ${this.fallbackQueue.length} pending fallback jobs into Redis persistent queue...`);
    while (this.fallbackQueue.length > 0) {
      const jobPayload = this.fallbackQueue.shift();
      try {
        await this.queue.add('transcode', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100, age: 3600 },
          removeOnFail: { count: 50, age: 86400 }
        });
      } catch (err) {
        this.fallbackQueue.unshift(jobPayload);
        break;
      }
    }
  }

  /**
   * Execute the actual single-instance FFmpeg video transcode process
   */
  async processTranscodeJob(job) {
    const modelType = job.modelType || 'AdBooking';
    const rawRecordId = job.recordId || job.bookingId;
    const recordIdStr = rawRecordId ? String(rawRecordId) : '';
    const tempPath = job.tempPath;
    const filePath = job.filePath || (job.targetDir && job.finalFilename ? path.join(job.targetDir, job.finalFilename) : null);
    const targetSubdir = job.targetSubdir || job.relativeSubdir || 'tablet';
    const uniqueFilename = job.uniqueFilename || job.finalFilename;
    const resolution = job.resolution;
    const mediaLogId = job.mediaLogId;

    console.log(`\x1b[35m[FFmpeg Worker]\x1b[0m Single worker starting transcode for ${modelType} (${recordIdStr})...`);

    // 1. Enforce 7.5s ingestion hold delay for streaming file handles to settle completely
    const elapsed = Date.now() - (job.enqueuedAt || Date.now());
    const waitTime = Math.max(0, 7500 - elapsed);
    if (waitTime > 0) {
      console.log(`\x1b[35m[FFmpeg Worker]\x1b[0m Holding temp file handle (${Math.round(waitTime / 1000)}s settling delay)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update database status to processing
    const isMongoId = Boolean(recordIdStr.match(/^[0-9a-fA-F]{24}$/));
    if (modelType === 'VenuePromo') {
      await VenuePromo.findByIdAndUpdate(rawRecordId, { transcodeStatus: 'processing' });
    } else if (modelType === 'PlatformAd') {
      await PlatformAd.findOneAndUpdate(
        isMongoId ? { _id: rawRecordId } : { adId: recordIdStr },
        { transcodeStatus: 'processing' }
      );
    } else if (modelType === 'AdBooking') {
      await AdBooking.findOneAndUpdate(
        isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
        { transcodeStatus: 'processing' }
      );
    }

    if (job.targetDir) {
      await fs.promises.mkdir(job.targetDir, { recursive: true }).catch(() => {});
    }

    let transcodeSuccess = false;

    // Check temp file validity asynchronously to prevent event-loop stalls
    let isTempValid = false;
    if (tempPath && filePath) {
      try {
        const stats = await fs.promises.stat(tempPath);
        if (stats.size > 0) isTempValid = true;
      } catch (_) {
        isTempValid = false;
      }
    }

    if (!isTempValid) {
      console.error(`\x1b[31m[FFmpeg Worker Error]\x1b[0m Input scratch file is missing or empty (0 bytes): "${tempPath}" for ${modelType} (${recordIdStr}). Marking transcode as failed.`);
      if (modelType === 'VenuePromo') {
        await VenuePromo.findByIdAndUpdate(rawRecordId, {
          transcodeStatus: 'failed'
        });
      } else if (modelType === 'PlatformAd') {
        await PlatformAd.updateMany(
          isMongoId ? { _id: rawRecordId } : { adId: recordIdStr },
          { transcodeStatus: 'failed' }
        );
      } else if (modelType === 'AdBooking') {
        await AdBooking.findOneAndUpdate(
          isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
          { transcodeStatus: 'failed' }
        );
      }
      if (mediaLogId) {
        await MediaLog.findByIdAndUpdate(mediaLogId, {
          status: 'failed',
          errorMessage: 'Input scratch file was missing or empty before transcode execution.'
        });
      }
      if (tempPath) {
        try { await fs.promises.unlink(tempPath); } catch (_) {}
      }
      return; // CRITICAL: Stop here. NEVER mark completed or broadcast reload on missing input!
    }

    // 2. Run single-thread FFmpeg H.264 Baseline 3.1 transcode into an isolated temp file first
    const transcodeTempPath = `${filePath}_tmp_${Date.now()}.mp4`;
    try {
      await new Promise((resolve, reject) => {
        let ffmpegCommand = ffmpeg(tempPath).videoCodec('libx264').format('mp4');

        if (resolution) {
          ffmpegCommand = ffmpegCommand.size(resolution).fps(30);
        }

        ffmpegCommand
          .noAudio()                 // Strip audio stream for silent kiosk video playback
          .renice(19)                // Maximum low-priority OS scheduling: yields CPU immediately to Node.js & WebSockets
          .videoFilters([
            'scale=w=\'if(gt(iw,ih),min(1280,iw),min(720,iw))\':h=\'if(gt(iw,ih),min(720,ih),min(1280,ih))\':force_original_aspect_ratio=decrease',
            'scale=trunc(iw/16)*16:trunc(ih/16)*16'
          ]) // Normalizes landscape screens to max 1280x720 (720p) and tablets to 720x1280 with 16px macroblock alignment
          .outputOptions([
            '-threads 1',            // STRICT 1-THREAD LIMIT to keep CPU usage low
            '-profile:v baseline',   // Android Baseline 3.1 compatibility (max 720p)
            '-level 3.1',
            '-pix_fmt yuv420p',
            '-crf 26',               // Optimal compression quality and minimal file size
            '-movflags +faststart',
            '-an'
          ])
          .on('start', (cmdLine) => {
            if (process.platform === 'linux' && ffmpegCommand.ffmpegProc?.pid) {
              const { exec } = require('child_process');
              const pid = ffmpegCommand.ffmpegProc.pid;
              exec(`cpulimit -l 40 -p ${pid} -b`, (err) => {
                if (err) console.warn(`\x1b[33m[cpulimit Warning]\x1b[0m Failed to attach cpulimit: ${err.message}`);
                else console.log(`\x1b[35m[cpulimit]\x1b[0m Hard CPU cap of 40% attached to FFmpeg PID ${pid}`);
              });
              exec(`ionice -c 3 -p ${pid}`, () => {}); // Idle I/O class: prevents disk contention
            }
          })
          .on('end', () => resolve(true))
          .on('error', (err) => reject(err))
          .save(transcodeTempPath);
      });

      let transcodeStat = null;
      try {
        transcodeStat = await fs.promises.stat(transcodeTempPath);
      } catch (e) {}

      if (transcodeStat && transcodeStat.size > 0) {
        try {
          // Atomic file replacement to prevent truncating live HTTP playback stream
          await fs.promises.rename(transcodeTempPath, filePath);
        } catch (renameErr) {
          await fs.promises.copyFile(transcodeTempPath, filePath);
          try { await fs.promises.unlink(transcodeTempPath); } catch (e) {}
        }
        transcodeSuccess = true;
      }
    } catch (ffErr) {
      console.warn(`\x1b[33m[FFmpeg Warning]\x1b[0m Transcode warning (${ffErr.message}). Using raw file fallback.`);
      try { await fs.promises.unlink(transcodeTempPath); } catch (e) {}
    }

    // Fallback to direct raw file copy if FFmpeg fails or is missing
    if (!transcodeSuccess) {
      try {
        const fallbackPath = filePath || path.join(job.targetDir || '', `raw_${uniqueFilename}`);
        await fs.promises.copyFile(tempPath, fallbackPath);
        transcodeSuccess = true;
      } catch (copyErr) {}
    }

    if (!transcodeSuccess) {
      console.error(`\x1b[31m[FFmpeg Worker Error]\x1b[0m Both FFmpeg transcode and raw copy failed for ${modelType} (${recordIdStr}).`);
      if (modelType === 'VenuePromo') {
        await VenuePromo.findByIdAndUpdate(rawRecordId, { transcodeStatus: 'failed' });
      } else if (modelType === 'PlatformAd') {
        await PlatformAd.updateMany(
          isMongoId ? { _id: rawRecordId } : { adId: recordIdStr },
          { transcodeStatus: 'failed' }
        );
      } else if (modelType === 'AdBooking') {
        await AdBooking.findOneAndUpdate(
          isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
          { transcodeStatus: 'failed' }
        );
      }
      if (mediaLogId) {
        await MediaLog.findByIdAndUpdate(mediaLogId, {
          status: 'failed',
          errorMessage: 'Both FFmpeg transcode and raw copy fallback failed.'
        });
      }
      if (tempPath) {
        try { await fs.promises.unlink(tempPath); } catch (_) {}
      }
      return;
    }

    // 3. Update database status and URLs upon completion
    const isFullSubdir = targetSubdir.startsWith('ads/') || 
                         targetSubdir.startsWith('platform-ads/') || 
                         targetSubdir.startsWith('host_promos/') || 
                         targetSubdir.startsWith('outlets/');
    const resolvedSubdir = isFullSubdir ? targetSubdir : `ads/videos/${targetSubdir}`;
    const relativeUrl = `/uploads/${resolvedSubdir}/${uniqueFilename}`.replace(/\/+/g, '/');

    try {
      if (modelType === 'VenuePromo') {
        const finalUrl = job.relativeSubdir ? `/uploads/${job.relativeSubdir}/${uniqueFilename}`.replace(/\/+/g, '/') : relativeUrl;
        await VenuePromo.findByIdAndUpdate(rawRecordId, {
          mediaUrl: finalUrl,
          transcodedMediaUrl: finalUrl,
          transcodeStatus: 'completed'
        });
      } else if (modelType === 'PlatformAd') {
        const finalUrl = job.relativeSubdir ? `/uploads/${job.relativeSubdir}/${uniqueFilename}`.replace(/\/+/g, '/') : relativeUrl;
        const regexEscaped = uniqueFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await PlatformAd.updateMany(
          isMongoId 
            ? { _id: rawRecordId } 
            : { $or: [{ adId: recordIdStr }, { mediaUrl: { $regex: new RegExp(regexEscaped) } }, { mediaUrls: { $regex: new RegExp(regexEscaped) } }] },
          {
            mediaUrl: finalUrl,
            transcodeStatus: 'completed'
          }
        );
      } else if (modelType === 'AdBooking') {
        await AdBooking.findOneAndUpdate(
          isMongoId ? { _id: rawRecordId } : { bookingId: recordIdStr },
          {
            mediaUrl: relativeUrl,
            transcodedMediaUrl: relativeUrl,
            transcodeStatus: 'completed'
          }
        );
        if (global.broadcastToAdmins) {
          global.broadcastToAdmins('new_campaign', { bookingId: recordIdStr });
        }
      }

      if (mediaLogId) {
        await MediaLog.findByIdAndUpdate(mediaLogId, {
          status: 'completed',
          finalizedFilename: uniqueFilename,
          outputPath: filePath
        });
      }
    } catch (dbErr) {
      console.error(`\x1b[31m[FFmpeg Worker DB Error]\x1b[0m Failed to update completion status for ${modelType} (${recordIdStr}):`, dbErr.message);
    }

    console.log(`\x1b[32m[FFmpeg Worker]\x1b[0m Transcode completed successfully for ${modelType} (${recordIdStr}) -> ${relativeUrl}`);

    // Broadcast reload signals to both WebSocket kiosks and gRPC screen displays
    try {
      if (typeof global.notifyDevicesReloadAds === 'function') {
        if (modelType === 'PlatformAd' || modelType === 'AdBooking') {
          global.notifyDevicesReloadAds(null);
        } else if (job.hostApplicationId) {
          global.notifyDevicesReloadAds(job.hostApplicationId);
        }
      } else {
        if (global.deviceSockets) {
          if (modelType === 'PlatformAd' || modelType === 'AdBooking') {
            const payload = JSON.stringify({ event: 'reload_ads', reason: 'platform_ad_updated' });
            for (const [deviceId, socket] of global.deviceSockets.entries()) {
              try { socket.send(payload); } catch (e) {}
            }
          } else if (job.hostApplicationId) {
            const payload = JSON.stringify({ event: 'reload_promos', hostApplicationId: job.hostApplicationId.toString() });
            for (const [deviceId, socket] of global.deviceSockets.entries()) {
              try { socket.send(payload); } catch (e) {}
            }
          }
        }
      }
    } catch (notifyErr) {
      console.error('[VideoQueue Notify Error]:', notifyErr.message);
    }

    // Safely delete temp staging file
    if (tempPath) {
      try { await fs.promises.unlink(tempPath); } catch (e) {}
    }
  }

  /**
   * Fallback queue processor if Redis is offline (STRICT SINGLE CONCURRENCY LOCK)
   */
  async processNextFallback() {
    if (this.isFallbackProcessing || this.fallbackQueue.length === 0) return;
    this.isFallbackProcessing = true;
    const job = this.fallbackQueue.shift();
    try {
      await this.processTranscodeJob(job);
    } catch (err) {
      console.error('[Fallback Queue Error]:', err.message);
    } finally {
      this.isFallbackProcessing = false;
      setImmediate(() => this.processNextFallback());
    }
  }

  /**
   * Returns a Set of resolved file paths currently pending or active in BullMQ or fallbackQueue
   * @returns {Promise<Set<string>>}
   */
  async getActiveOrQueuedTempPaths() {
    const paths = new Set();
    for (const job of this.fallbackQueue) {
      if (job?.tempPath) paths.add(path.resolve(job.tempPath));
    }
    if (this.queue && this.isRedisAvailable) {
      try {
        const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
        for (const j of jobs) {
          if (j?.data?.tempPath) paths.add(path.resolve(j.data.tempPath));
        }
      } catch (_) {}
    }
    return paths;
  }
}

const videoQueueService = new VideoQueueService();
module.exports = videoQueueService;
