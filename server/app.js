const Fastify = require('fastify');
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
const rateLimit = require('@fastify/rate-limit');
const config = require('./config/config');
const { UPLOAD_LIMITS, RATE_LIMITS } = require('./config/constants');
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
    bodyLimit: UPLOAD_LIMITS.DEFAULT_BODY_LIMIT_BYTES
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
      logger.info({ method: request.method, url }, `[API] ${request.method} ${url}`);
    }
    done();
  });

  // Global IP rate limiting (500 requests per minute per IP, increased to 2000 in dev/demo mode)
  // Connect dedicated Redis client for distributed rate limiting store across clusters
  let rateLimitRedis = null;
  try {
    const { createRedisClient } = require('./config/redis');
    const client = createRedisClient('ratelimit');
    await client.connect();
    rateLimitRedis = client;
  } catch (err) {
    logger.warn({ err: (err && err.message) || err }, 'Failed to initialize Redis rate-limiter store; falling back to memory store');
    rateLimitRedis = null;
  }

  const rateLimitOptions = {
    global: true,
    max: isDev ? RATE_LIMITS.GLOBAL_MAX_DEV : RATE_LIMITS.GLOBAL_MAX_PROD,
    timeWindow: RATE_LIMITS.GLOBAL_WINDOW,
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
      try {
        await rateLimitRedis.quit();
      } catch (err) {
        logger.debug({ err: (err && err.message) || err }, 'Non-fatal error while closing rateLimit Redis client');
      }
    }
  });

  // Register raw buffer parser for videos and images (up to 100MB)
  fastify.addContentTypeParser(
    ['application/octet-stream', 'video/mp4', 'video/webm', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    { bodyLimit: UPLOAD_LIMITS.RAW_MEDIA_BODY_LIMIT_BYTES },
    function (req, payload, done) {
      done(null, payload); // Pass the raw payload stream through to req.body
    }
  );

  // Centralized Global Error Handler
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      logger.error({
        err: error,
        method: request.method,
        url: request.raw.url,
        params: request.params,
        query: request.query
      }, 'Unhandled Server Exception');

      const isProduction = config.env === 'production';
      const message = (isProduction && !error.expose)
        ? 'An unexpected internal error occurred'
        : (error.message || 'Internal Server Error');

      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message
        }
      });
    }

    // 4xx Client Errors (Validation, Rate Limiting, Bad Requests)
    logger.warn({
      err: error.message,
      statusCode,
      method: request.method,
      url: request.raw.url
    }, 'Client Request Error');

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'BAD_REQUEST',
        message: error.message,
        ...(error.validation ? { validation: error.validation } : {})
      }
    });
  });

  // Centralized 404 Not Found Handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.raw.url} not found`
      }
    });
  });

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
