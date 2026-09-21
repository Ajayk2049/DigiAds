const Fastify = require('fastify');
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
const rateLimit = require('@fastify/rate-limit');
const config = require('./config/config');
const isDev = config.env === 'development' || config.demoMode;
const logger = require('./utils/logger');
const wsRoutes = require('./websocket/wsRoutes');
const staticRoutes = require('./routes/staticRoutes');
const apiRoutes = require('./routes/api');

/**
 * Fastify Application Factory
 */
async function createFastifyApp() {
  const fastify = Fastify({
    loggerInstance: logger,
    bodyLimit: 52428800 // 50MB default body limit (hardened against event-loop & memory exhaustion)
  });

  const allowedOrigins = Array.isArray(config.clientOrigins) ? config.clientOrigins : [];

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile applications, Flutter apps, curl, backend gRPC)
      if (!origin) return cb(null, true);
      // In development or demo mode, allow all origins
      if (config.env === 'development' || config.demoMode) {
        return cb(null, true);
      }
      // In production, strictly validate against allowed origins
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key',
      'X-Filename', 'x-filename', 'x-ad-category', 'X-Ad-Category',
      'x-ad-type', 'X-Ad-Type', 'x-media-type', 'X-Media-Type',
      'x-host-application-id', 'X-Host-Application-Id', 'x-device-id', 'X-Device-Id',
      'x-app-type', 'X-App-Type', 'x-version-name', 'X-Version-Name',
      'x-version-code', 'X-Version-Code', 'x-release-notes', 'X-Release-Notes',
      'x-is-mandatory', 'X-Is-Mandatory', 'x-requested-with', 'Accept',
      'Origin', 'Range', 'range', 'Cache-Control'
    ],
    exposedHeaders: ['Retry-After', 'retry-after', 'Content-Range', 'content-range', 'ETag', 'Idempotency-Key'],
    credentials: true
  });

  await fastify.register(websocket);

  // Clean API route logger (skips OPTIONS and device sync polls)
  fastify.addHook('onRequest', (request, reply, done) => {
    const url = request.raw.url || '';
    if (
      request.method !== 'OPTIONS' &&
      !url.includes('/auth/device/ads') &&
      !url.includes('/ws')
    ) {
      console.log(`\x1b[36m[API]\x1b[0m ${request.method} ${url}`);
    }
    done();
  });

  // Global IP rate limiting (500 requests per minute per IP, increased to 2000 in dev/demo mode)
  // Connect dedicated Redis client for distributed rate limiting store across clusters
  let rateLimitRedis = null;
  try {
    const IORedis = require('ioredis');
    const client = new IORedis({
      host: config.redisHost || 'localhost',
      port: parseInt(config.redisPort, 10) || 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000))
    });
    let lastWarnTime = 0;
    client.on('error', (err) => {
      const now = Date.now();
      if (now - lastWarnTime > 30000) {
        lastWarnTime = now;
        console.warn('[RateLimit Redis Warning]:', (err && err.message) || 'Connection unavailable, falling back to memory store');
      }
    });
    await client.connect();
    rateLimitRedis = client;
  } catch (_) {
    rateLimitRedis = null;
  }

  const rateLimitOptions = {
    global: true,
    max: isDev ? 2000 : 500,
    timeWindow: '1 minute',
    skipOnError: true,
    exclusionRules: (req) => {
      // Exclude websockets and static uploads from rate limiting to prevent playback/sync cuts
      return req.url.startsWith('/ws') || req.url.startsWith('/uploads');
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later.'
    })
  };
  if (rateLimitRedis) {
    rateLimitOptions.redis = rateLimitRedis;
  }
  await fastify.register(rateLimit, rateLimitOptions);

  // Gracefully quit rateLimit Redis client on Fastify server shutdown
  fastify.addHook('onClose', async () => {
    if (rateLimitRedis) {
      try { await rateLimitRedis.quit(); } catch (_) { }
    }
  });

  // Register raw buffer parser for videos and images (up to 100MB)
  fastify.addContentTypeParser(
    ['application/octet-stream', 'video/mp4', 'video/webm', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    { bodyLimit: 104857600 },
    function (req, payload, done) {
      done(null, payload); // Pass the raw payload stream through to req.body
    }
  );

  // Register root health check for monitoring, load balancers, and tablet discovery
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register WebSocket routes
  await fastify.register(wsRoutes);

  // Register static uploads & redirect routes
  await fastify.register(staticRoutes);

  // Register REST API routes
  await fastify.register(apiRoutes, { prefix: '/api/v1' });

  return fastify;
}

module.exports = { createFastifyApp };
