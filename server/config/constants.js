/**
 * DigiAds Platform Centralized Constants
 * Eliminates magic numbers across the backend architecture.
 */

const UPLOAD_LIMITS = {
  // Fastify default JSON/form payload limit (50 MB)
  DEFAULT_BODY_LIMIT_BYTES: 52428800,
  // Fastify raw media stream parser limit (100 MB)
  RAW_MEDIA_BODY_LIMIT_BYTES: 104857600,
  // Standard image upload limit (10 MB)
  IMAGE_MAX_SIZE_BYTES: 10485760,
  // Standard video ad upload limit (100 MB)
  VIDEO_MAX_SIZE_BYTES: 104857600,
  // APK / Release binary upload limit (150 MB)
  APK_MAX_SIZE_BYTES: 157286400
};

const RATE_LIMITS = {
  // Global API rate limits
  GLOBAL_MAX_DEV: 2000,
  GLOBAL_MAX_PROD: 500,
  GLOBAL_WINDOW: '1 minute',

  // Route-specific burst rate limits
  AUTH_OTP_MAX: 5,            // 5 req/min on OTP & password reset
  DEVICE_ACTIVATE_MAX: 10,    // 10 req/min on kiosk activation
  MEDIA_UPLOAD_MAX: 20,       // 20 req/min on file uploads
  PAYMENT_CALLBACK_MAX: 30,   // 30 req/min on payment callbacks
  RELEASE_DOWNLOAD_MAX: 20    // 20 req/min on OTA binary downloads
};

const TIMEOUTS = {
  // WebSocket and telemetry intervals
  HEARTBEAT_INTERVAL_MS: 15000,        // 15 seconds
  DEVICE_OFFLINE_THRESHOLD_MS: 35000,  // 35 seconds without ping = offline
  WS_THROTTLE_TOUCH_MS: 20000,         // DB touch throttle for pings (20s)
  WS_MAX_CONNECTIONS: 1000,            // Total socket ceiling
  WS_PER_IP_LIMIT: 30,                 // External per-IP socket ceiling
  WS_LOOPBACK_LIMIT: 1000,             // Simulator / loopback socket ceiling
  WS_FRAME_MAX_PAYLOAD_BYTES: 65536,   // 64 KB per WS frame

  // Background queue & HTTP timeouts
  VIDEO_QUEUE_STALL_INTERVAL_MS: 7500, // 7.5 seconds stall check
  HTTP_REQUEST_TIMEOUT_MS: 15000       // 15 seconds outbound API timeout
};

const FINANCIAL = {
  CGST_RATE: 0.025,           // 2.5%
  SGST_RATE: 0.025,           // 2.5%
  TOTAL_GST_RATE: 0.05,       // 5.0%
  PAISE_MULTIPLIER: 100       // 1 INR = 100 Paise
};

const TIME = {
  // Indian Standard Time offset (UTC + 5:30) in milliseconds
  IST_OFFSET_MS: 5.5 * 60 * 60 * 1000
};

module.exports = {
  UPLOAD_LIMITS,
  RATE_LIMITS,
  TIMEOUTS,
  FINANCIAL,
  TIME
};
