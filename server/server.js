const path = require('path');
const crypto = require('crypto');
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const websocket = require('@fastify/websocket');
const rateLimit = require('@fastify/rate-limit');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const fs = require('fs');
const config = require('./config/config');
const isDev = config.env === 'development' || config.demoMode;
const logger = require('./utils/logger');
const apiRoutes = require('./routes/api');
const phonePeService = require('./services/phonePeService');
const { ensureRedisRunning } = require('./utils/redisRunner');
const { v4: uuidv4 } = require('uuid');

// Ensure required upload and log directories exist on server boot (for fresh VPS deployments)
const requiredDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/outlets'),
  path.join(__dirname, 'uploads/ads'),
  path.join(__dirname, 'uploads/staging'),
  path.join(__dirname, 'logs')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Mongoose Models
const User = require('./models/User');
const Device = require('./models/Device');
const Menu = require('./models/Menu');
const Order = require('./models/Order');
const AdBooking = require('./models/AdBooking');
const PhonePeTransaction = require('./models/PhonePeTransaction');
const AdsRates = require('./models/AdsRates');
const HostApplication = require('./models/HostApplication');
const AdImpression = require('./models/AdImpression');

// WebSocket client sockets map (merchantId -> Set<WebSocket>)
const merchantSockets = new Map();
global.merchantSockets = merchantSockets;
global.deviceSockets = new Map();
global.adminSockets = new Map();
global.pendingDeviceCommands = new Map();

// In-memory throttling map to prevent hammering MongoDB with updateOne on every WebSocket ping / gRPC call
const deviceLastDbTouch = new Map();

function throttleDeviceDbTouch(deviceId) {
  const now = Date.now();
  const lastTouch = deviceLastDbTouch.get(deviceId) || 0;
  if (now - lastTouch < 20000) {
    return false; // Skip redundant DB write if touched within 20s
  }
  deviceLastDbTouch.set(deviceId, now);
  if (deviceLastDbTouch.size > 5000) {
    const oldestKey = deviceLastDbTouch.keys().next().value;
    deviceLastDbTouch.delete(oldestKey);
  }
  return true;
}

// Module-scoped WeakMap for WebSocket metadata to prevent memory leaks over long uptimes
const socketMetadata = new WeakMap();

function getSocketMeta(socket) {
  if (!socket) return {};
  let meta = socketMetadata.get(socket);
  if (!meta) {
    meta = { isAlive: true };
    socketMetadata.set(socket, meta);
  }
  return meta;
}

function setSocketAlive(socket, isAlive) {
  if (!socket) return;
  const meta = getSocketMeta(socket);
  meta.isAlive = isAlive;
}

function clearSocketMeta(socket) {
  if (!socket) return;
  socketMetadata.delete(socket);
}

/**
 * Robust helper to send real-time events to all active sockets of a merchant
 */
global.sendToMerchant = (merchantId, payload) => {
  if (!merchantId) return;
  const mId = merchantId.toString();
  const sockets = global.merchantSockets ? global.merchantSockets.get(mId) : null;
  if (sockets) {
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (sockets instanceof Set) {
      for (const s of sockets) {
        try {
          if (s.readyState === 1) s.send(msg);
        } catch (e) {
          console.error('[WS] Error sending to merchant socket:', e.message);
        }
      }
    } else if (typeof sockets.send === 'function' && sockets.readyState === 1) {
      try {
        sockets.send(msg);
      } catch (e) {
        console.error('[WS] Error sending to merchant socket:', e.message);
      }
    }
  }
};

/**
 * Universal broadcast to trigger ad refresh across both WebSocket tablets and gRPC wall screens
 */
global.notifyDevicesReloadAds = async (targetVenueId = null) => {
  try {
    // 1. WebSocket push broadcast (for interactive tablets)
    if (global.deviceSockets) {
      const payload = JSON.stringify({
        event: targetVenueId ? 'reload_promos' : 'reload_ads',
        reason: 'ads_updated',
        ...(targetVenueId ? { hostApplicationId: targetVenueId.toString() } : {})
      });
      for (const [devId, socket] of global.deviceSockets.entries()) {
        try {
          if (socket && socket.readyState === 1) {
            socket.send(payload);
          }
        } catch (e) { }
      }
    }

    // 2. gRPC Heartbeat command queue (for 24/7 wall screens)
    if (global.pendingDeviceCommands) {
      const Device = require('./models/Device');
      const query = {
        isActivated: true,
        ...(targetVenueId ? { hostApplicationId: targetVenueId } : {})
      };
      // Limit to active devices and cap query size to avoid unindexed table scan
      const devices = await Device.find(query).select('deviceId').lean().limit(1000);
      for (const dev of devices) {
        if (dev.deviceId) {
          // Cap pendingDeviceCommands map to prevent unbounded growth
          if (global.pendingDeviceCommands.size > 2000) {
            const firstKey = global.pendingDeviceCommands.keys().next().value;
            global.pendingDeviceCommands.delete(firstKey);
          }
          global.pendingDeviceCommands.set(dev.deviceId, 'reload_ads');
        }
      }
    }
  } catch (err) {
    console.error('[notifyDevicesReloadAds Error]:', err.message);
  }
};

/**
 * Thread-safe atomic waiter call handler with per-device mutex lock to prevent duplicate orders
 */
const pendingWaiterCalls = new Map();

async function handleDeviceWaiterCall(deviceId, rawWaiterOption, rawTableNumber) {
  if (pendingWaiterCalls.has(deviceId)) {
    return await pendingWaiterCalls.get(deviceId);
  }

  const promise = (async () => {
    try {
      const waiterOption = String(rawWaiterOption || 'Others').trim().slice(0, 30).replace(/[\r\n\t]/g, '');
      const tableNumber = String(rawTableNumber || 'T1').trim().slice(0, 30).replace(/[\r\n\t]/g, '');

      let activeOrder = await Order.findOne({
        deviceId,
        tableStatus: { $in: ['active', 'close_table'] }
      }).sort({ createdAt: -1 });

      if (!activeOrder) {
        const deviceDoc = await Device.findOne({ deviceId });
        if (deviceDoc && deviceDoc.hostApplicationId) {
          const HostApplication = require('./models/HostApplication');
          const app = await HostApplication.findById(deviceDoc.hostApplicationId);
          if (app) {
            activeOrder = new Order({
              orderId: 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
              merchantId: app.userId,
              hostApplicationId: deviceDoc.hostApplicationId,
              deviceId,
              tableNumber: tableNumber || 'T1',
              items: [],
              totalAmount: 0,
              paymentStatus: 'pending',
              orderStatus: 'placed',
              tableStatus: 'active',
              waiterCallStatus: 'pending',
              waiterCallCount: 1,
              waiterCallOption: waiterOption || 'Others'
            });
            await activeOrder.save();
          }
        }
      } else {
        activeOrder.waiterCallCount = (activeOrder.waiterCallCount || 0) + 1;
        activeOrder.waiterCallStatus = 'pending';
        activeOrder.waiterCallOption = waiterOption || 'Others';
        await activeOrder.save();
      }

      if (activeOrder) {
        const { notifyDeviceSessionUpdate } = require('./controllers/hostController');
        notifyDeviceSessionUpdate(activeOrder);

        if (activeOrder.merchantId && global.sendToMerchant) {
          global.sendToMerchant(activeOrder.merchantId, {
            event: 'waiter_call',
            data: activeOrder
          });
        }
      }
      return activeOrder;
    } catch (err) {
      console.error('[WaiterCall] Error handling waiter call for device:', deviceId, err.message);
    } finally {
      setTimeout(() => pendingWaiterCalls.delete(deviceId), 1000);
    }
  })();

  pendingWaiterCalls.set(deviceId, promise);
  return await promise;
}

// ----------------------------------------------------
// Fastify Setup (REST & WebSocket)
// ----------------------------------------------------
const fastify = Fastify({
  loggerInstance: logger,
  bodyLimit: 52428800 // 50MB default body limit (hardened against event-loop & memory exhaustion)
});

async function startFastify() {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Filename', 'x-filename', 'x-ad-category', 'X-Ad-Category', 'x-ad-type', 'X-Ad-Type', 'x-media-type', 'X-Media-Type', 'x-host-application-id', 'X-Host-Application-Id', 'x-device-id', 'X-Device-Id', 'x-app-type', 'X-App-Type', 'x-version-name', 'X-Version-Name', 'x-version-code', 'X-Version-Code', 'x-release-notes', 'X-Release-Notes', 'x-is-mandatory', 'X-Is-Mandatory', 'x-requested-with', 'Accept', 'Origin'],
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
    rateLimitRedis = new IORedis({
      host: config.redisHost || 'localhost',
      port: parseInt(config.redisPort, 10) || 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    rateLimitRedis.on('error', (err) => {
      // Catch OOM or transient connection errors without crashing or bubbling to requests
      console.warn('[RateLimit Redis Warning]:', err.message);
    });
    rateLimitRedis.connect().catch(() => {
      rateLimitRedis = null;
    });
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
      success: false,
      message: 'Too many requests, please try again later.'
    })
  };
  if (rateLimitRedis) {
    rateLimitOptions.redis = rateLimitRedis;
  }
  await fastify.register(rateLimit, rateLimitOptions);


  // WebSocket routes for Merchant & Device
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws/orders', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'merchant') {
          socket.send(JSON.stringify({ error: 'Access denied: Merchant role required' }));
          socket.close();
          return;
        }

        const merchantId = decoded.uid ? decoded.uid.toString() : null;
        if (merchantId) {
          if (!merchantSockets.has(merchantId)) {
            merchantSockets.set(merchantId, new Set());
          }
          merchantSockets.get(merchantId).add(socket);
          setSocketAlive(socket, true);
          if (typeof socket.on === 'function') {
            socket.on('pong', () => { setSocketAlive(socket, true); });
          }
          console.log(`[WS] Merchant connected: ${merchantId} (active connections: ${merchantSockets.get(merchantId).size})`);
        }

        socket.send(JSON.stringify({ event: 'connected', message: 'Connected to live order feed' }));

        socket.on('close', () => {
          if (merchantId) {
            const sockets = merchantSockets.get(merchantId);
            if (sockets) {
              sockets.delete(socket);
              if (sockets.size === 0) {
                merchantSockets.delete(merchantId);
              }
            }
          }
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
          console.log(`[WS] Merchant socket closed: ${merchantId}`);
        });

      } catch (err) {
        console.error('[WS] Error in connection handler:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to send error or close socket:', wsErr);
          }
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
        }
      }
    });

    fastifyInstance.get('/ws/device', { websocket: true }, async (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const { deviceId } = decoded;
        if (!deviceId) {
          socket.send(JSON.stringify({ error: 'Invalid token: deviceId required' }));
          socket.close();
          return;
        }

        // Check if device exists in MongoDB (fast lean projection)
        const existingDoc = await Device.findOne({ deviceId }).select('_id status lastHeartbeat hostApplicationId').lean();
        if (!existingDoc) {
          console.log(`[WS] Device connection rejected: ${deviceId} (Device not found in database / revoked)`);
          socket.send(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Device registration revoked or not found' }));
          socket.close(4001, 'Device Revoked');
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
          return;
        }

        // Close and terminate any lingering previous socket for this deviceId (prevents FD leaks during reconnects)
        const existingSocket = global.deviceSockets.get(deviceId);
        if (existingSocket && existingSocket !== socket) {
          try {
            existingSocket.close(4000, 'Replaced by new connection');
            if (typeof existingSocket.terminate === 'function') {
              existingSocket.terminate();
            }
          } catch (_) {}
          clearSocketMeta(existingSocket);
          if (typeof existingSocket.removeAllListeners === 'function') {
            existingSocket.removeAllListeners();
          }
        }

        setSocketAlive(socket, true);
        if (typeof socket.on === 'function') {
          socket.on('pong', () => { setSocketAlive(socket, true); });
        }

        global.deviceSockets.set(deviceId, socket);
        console.log(`[WS] Device connected: ${deviceId}`);

        // Send connected greeting immediately to minimize handshake latency
        socket.send(JSON.stringify({
          event: 'connected',
          message: 'Connected to device update feed',
          deviceId: deviceId,
          config: {
            fallbackPollingMinutes: 15,
            heartbeatIntervalSeconds: 30
          }
        }));

        // Run MongoDB status touch, merchant broadcast, and table session sync asynchronously
        setImmediate(async () => {
          try {
            const isFreshBoot = existingDoc.status === 'offline' || (Date.now() - new Date(existingDoc.lastHeartbeat || 0).getTime()) > 35000;
            const updateFields = { status: 'online', lastHeartbeat: new Date() };
            if (isFreshBoot) {
              updateFields.sessionStart = new Date();
            }

            const updatedDevice = await Device.findOneAndUpdate(
              { deviceId },
              { $set: updateFields },
              { new: true }
            );
            if (updatedDevice && updatedDevice.hostApplicationId) {
              const HostApplication = require('./models/HostApplication');
              const app = await HostApplication.findById(updatedDevice.hostApplicationId).select('userId').lean();
              if (app && app.userId) {
                global.sendToMerchant(app.userId, {
                  event: 'device_status_changed',
                  data: { deviceId, status: 'online' }
                });
              }
            }
          } catch (dbErr) {
            console.error(`[WS] Failed to update Device ${deviceId} status to online:`, dbErr.message);
          }

          // Push active table session snapshot on connect (handles offline status sync)
          try {
            const activeOrder = await Order.findOne({
              deviceId,
              tableStatus: { $in: ['active', 'close_table'] }
            }).sort({ createdAt: -1 }).lean();

            if (activeOrder) {
              const { notifyDeviceSessionUpdate } = require('./controllers/hostController');
              notifyDeviceSessionUpdate(activeOrder);
            }
          } catch (sessionSyncErr) {
            console.error(`[WS] Failed to push active session on connect for ${deviceId}:`, sessionSyncErr.message);
          }
        });

        let socketMessageCount = 0;
        let socketWindowStart = Date.now();

        socket.on('message', async (msg) => {
          try {
            // Guard: 64KB max payload check against memory exhaustion attacks
            if (!msg || msg.length > 65536) {
              console.warn(`[WS Warning] Dropped oversized frame (${msg ? msg.length : 0} bytes) from device ${deviceId}`);
              return;
            }

            // Per-socket message rate limit: max 15 messages per 5 seconds
            const now = Date.now();
            if (now - socketWindowStart > 5000) {
              socketWindowStart = now;
              socketMessageCount = 0;
            }
            socketMessageCount++;
            if (socketMessageCount > 15) {
              console.warn(`[WS Warning] Message flood throttled for device ${deviceId}`);
              return;
            }

            setSocketAlive(socket, true);
            const data = JSON.parse(msg.toString());
            if (!data) return;

            if (data.event === 'ping' || data.type === 'ping') {
              // Always send instant pong reply to keep connection alive
              socket.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));

              // Throttle database heartbeat touches to at most once per 20 seconds
              if (throttleDeviceDbTouch(deviceId)) {
                const updateDoc = { status: 'online', lastHeartbeat: new Date() };
                if (data.appVersion) updateDoc.lastKnownAppVersion = String(data.appVersion);
                if (data.versionCode) updateDoc.lastKnownVersionCode = parseInt(data.versionCode, 10);
                Device.updateOne(
                  { deviceId },
                  { $set: updateDoc }
                ).catch(() => { });
              }
            } else if (data.event === 'call_waiter') {
              await handleDeviceWaiterCall(deviceId, data.waiterOption || data.waiterCallOption, data.tableNumber);
            }
          } catch (e) {
            console.error('[WS] Device message parse error:', e.message);
          }
        });

        socket.on('close', async () => {
          global.deviceSockets.delete(deviceId);
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
          console.log(`[WS] Device disconnected: ${deviceId}`);
          try {
            const updatedDevice = await Device.findOneAndUpdate(
              { deviceId },
              { $set: { status: 'offline', lastHeartbeat: new Date() } },
              { new: true }
            );
            if (updatedDevice && updatedDevice.hostApplicationId) {
              const HostApplication = require('./models/HostApplication');
              const app = await HostApplication.findById(updatedDevice.hostApplicationId);
              if (app && app.userId) {
                global.sendToMerchant(app.userId, {
                  event: 'device_status_changed',
                  data: { deviceId, status: 'offline' }
                });
              }
            }
          } catch (dbErr) {
            console.error(`[WS] Failed to update Device ${deviceId} status to offline:`, dbErr.message);
          }
        });

      } catch (err) {
        console.error('[WS] Device connection error:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to close device socket:', wsErr);
          }
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
        }
      }
    });
    fastifyInstance.get('/ws/admin', { websocket: true }, (connection, req) => {
      const token = req.query.token;
      const socket = connection.socket || connection;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication token is required' }));
        socket.close();
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'admin') {
          socket.send(JSON.stringify({ error: 'Access denied: Admin role required' }));
          socket.close();
          return;
        }

        const adminId = decoded.uid || 'admin_session_' + Math.random().toString(36).substring(2, 7);
        const existingSocket = global.adminSockets.get(adminId);
        if (existingSocket && existingSocket !== socket) {
          try {
            existingSocket.close(4000, 'Replaced by new connection');
            if (typeof existingSocket.terminate === 'function') existingSocket.terminate();
          } catch (_) {}
          clearSocketMeta(existingSocket);
          if (typeof existingSocket.removeAllListeners === 'function') existingSocket.removeAllListeners();
        }

        setSocketAlive(socket, true);
        if (typeof socket.on === 'function') {
          socket.on('pong', () => { setSocketAlive(socket, true); });
        }
        global.adminSockets.set(adminId, socket);
        console.log(`[WS] Admin connected: ${adminId}`);

        socket.send(JSON.stringify({ event: 'connected', message: 'Connected to Admin Live Feed' }));

        socket.on('close', () => {
          global.adminSockets.delete(adminId);
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
          console.log(`[WS] Admin disconnected: ${adminId}`);
        });

      } catch (err) {
        console.error('[WS] Admin connection error:', err);
        if (socket) {
          try {
            socket.send(JSON.stringify({ error: 'Invalid authentication token' }));
            socket.close();
          } catch (wsErr) {
            console.error('[WS] Failed to close admin socket:', wsErr);
          }
          clearSocketMeta(socket);
          if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
          }
        }
      }
    });
  });

  // Helper to broadcast event to all active admin websocket clients
  global.broadcastToAdmins = (event, data = {}) => {
    if (!global.adminSockets || global.adminSockets.size === 0) return;
    const payload = JSON.stringify({ event, data });
    console.log(`[WS] Broadcasting ${event} to ${global.adminSockets.size} admin(s)`);
    for (const [adminId, socket] of global.adminSockets.entries()) {
      try {
        socket.send(payload);
      } catch (err) {
        console.error(`[WS] Failed to send broadcast to admin ${adminId}:`, err.message);
        global.adminSockets.delete(adminId);
      }
    }
  };

  // Register raw buffer parser for videos and images (up to 100MB)
  fastify.addContentTypeParser(
    ['application/octet-stream', 'video/mp4', 'video/webm', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    { bodyLimit: 104857600 },
    function (req, payload, done) {
      done(null, payload); // Pass the raw payload stream through to req.body
    }
  );

  // Serve uploaded files statically with CORS, Content-Length, and Range support
  fastify.route({
    method: ['GET', 'HEAD', 'OPTIONS'],
    url: '/uploads/*',
    handler: async (req, res) => {
      const incomingOrigin = req.headers.origin;
      const allowedOrigins = Array.isArray(config.clientOrigins) ? config.clientOrigins : [];
      if (!incomingOrigin || config.env === 'development' || config.demoMode || allowedOrigins.includes(incomingOrigin)) {
        res.header('Access-Control-Allow-Origin', incomingOrigin || '*');
      } else {
        res.header('Access-Control-Allow-Origin', allowedOrigins[0] || 'null');
      }
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

      if (req.method === 'OPTIONS') {
        return res.status(204).send();
      }

      const fs = require('fs');
      const path = require('path');
      const rawSubpath = req.params['*'] || '';

      // Alias 'creative/' or 'media/' to 'ads/' so ad-blocker extensions don't block preview requests containing '/ads/'
      let subpath = rawSubpath;
      if (rawSubpath.startsWith('creative/')) {
        subpath = rawSubpath.replace(/^creative\//, 'ads/');
      } else if (rawSubpath.startsWith('media/')) {
        subpath = rawSubpath.replace(/^media\//, 'ads/');
      }

      let filePath = path.join(__dirname, 'uploads', subpath);
      let stat;
      try {
        stat = await fs.promises.stat(filePath);
      } catch (e) {
        // Fallback to rawSubpath if aliased path was not found
        filePath = path.join(__dirname, 'uploads', rawSubpath);
        try {
          stat = await fs.promises.stat(filePath);
        } catch (err) {
          return res.status(404).send({ error: 'File not found' });
        }
      }
      const ext = path.extname(subpath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      res.header('Content-Type', contentType);
      res.header('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.status(206);
        res.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.header('Content-Length', chunksize);
        return res.send(fileStream);
      }

      res.header('Content-Length', stat.size);
      if (req.method === 'HEAD') {
        return res.status(200).send();
      }

      return res.send(fs.createReadStream(filePath));
    }
  });

  // REST API Routes
  await fastify.register(apiRoutes, { prefix: '/api/v1' });

  // DB Connection & Seeding Admin with tuned connection pool bounds (optimizes 1 vCPU RAM & Atlas limits)
  await mongoose.connect(config.mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000
  });
  console.log('[Database] Connected to MongoDB');

  // Startup Reconciliation: Resume polling for pending bookings created within the last 15 minutes
  try {
    const adController = require('./controllers/adController');
    adController.reconcilePendingTransactions();
  } catch (reconcileErr) {
    console.warn('[Startup] Transaction reconciler warning:', reconcileErr.message);
  }

  // Database migration for dual-device HostApplication schema
  try {
    const legacyApps = await HostApplication.find({
      $or: [
        { deviceType: { $exists: true } },
        { quantity: { $exists: true } }
      ]
    });
    if (legacyApps.length > 0) {
      console.log(`[Migration] Found ${legacyApps.length} legacy host application documents. Migrating...`);
      for (const app of legacyApps) {
        const type = app.get('deviceType');
        const qty = app.get('quantity') || 0;

        if (type === 'tablet') {
          app.requestTablet = true;
          app.tabletQuantity = qty;
          app.requestScreen = false;
          app.screenQuantity = 0;
        } else if (type === 'screen') {
          app.requestScreen = true;
          app.screenQuantity = qty;
          app.requestTablet = false;
          app.tabletQuantity = 0;
        }

        // Remove legacy fields
        app.set('deviceType', undefined);
        app.set('quantity', undefined);

        await app.save();
      }
      console.log('[Migration] HostApplication database migration completed successfully.');
    }
  } catch (migError) {
    console.error('[Migration] Failed to run HostApplication migration:', migError.message);
  }

  // Run media logs retention cleanup on boot
  const { cleanupOldMediaLogs } = require('./utils/mediaCleanup');
  cleanupOldMediaLogs().catch(err => console.error('[CLEANUP] Boot cleanup failed:', err.message));

  // Run boot-time cleanup of orphaned temporary upload files
  (() => {
    try {
      const fs = require('fs');
      const os = require('os');
      const tempDir = os.tmpdir();
      const files = fs.readdirSync(tempDir);
      let count = 0;
      for (const file of files) {
        if (file.startsWith('tmp-ad-upload-')) {
          fs.unlinkSync(path.join(tempDir, file));
          count++;
        }
      }
      if (count > 0) {
        console.log(`[CLEANUP] Removed ${count} orphaned temporary upload files.`);
      }
    } catch (err) {
      console.error('[CLEANUP] Failed to clear temp files:', err.message);
    }
  })();



  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[REST/WS Server] Listening on port ${config.port}`);
}

// ----------------------------------------------------
// gRPC Setup (Device, Menu, Order)
const grpcServer = new grpc.Server({
  'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB message ceiling (prevents memory exhaustion)
  'grpc.max_send_message_length': 10 * 1024 * 1024,
  'grpc.keepalive_time_ms': 30000,                      // 30s keepalive ping
  'grpc.keepalive_timeout_ms': 10000,                   // 10s ping timeout
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.http2.min_time_between_pings_ms': 10000,        // Protects against HTTP/2 ping floods
  'grpc.http2.max_pings_without_data': 0
});

// Load Proto Files
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const orderDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'order.proto'), loaderOptions);
const deviceDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'device.proto'), loaderOptions);
const menuDef = protoLoader.loadSync(path.join(__dirname, 'protos', 'menu.proto'), loaderOptions);

const orderProto = grpc.loadPackageDefinition(orderDef).order;
const deviceProto = grpc.loadPackageDefinition(deviceDef).device;
const menuProto = grpc.loadPackageDefinition(menuDef).menu;

// Helper to verify gRPC metadata JWT token for devices
function verifyGrpcToken(call) {
  const metadata = call.metadata;
  if (!metadata) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'No metadata provided' };
  }
  const authHeaders = metadata.get('authorization');
  if (!authHeaders || authHeaders.length === 0) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Authorization token is missing' };
  }
  const authHeader = authHeaders[0];
  if (!authHeader.startsWith('Bearer ')) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid authorization header format' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded && decoded.deviceId) {
      // Touch lastHeartbeat & online status in MongoDB on valid gRPC calls (throttled to at most once every 20s)
      if (throttleDeviceDbTouch(decoded.deviceId)) {
        Device.updateOne(
          { deviceId: decoded.deviceId },
          { $set: { status: 'online', lastHeartbeat: new Date() } }
        ).catch(err => {
          console.error(`[gRPC Touch] Failed to update heartbeat for ${decoded.deviceId}:`, err.message);
        });
      }
    }
    return decoded; // { deviceId, deviceType, hostApplicationId }
  } catch (err) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid or expired device token' };
  }
}

// Telemetry duration resolution helper:
// - Image Ads: Platform decided duration (1 image = 8s, 2 images = 16s)
// - Video Ads: Actual video runtime (from gRPC telemetry or probed booking.mediaDuration)
const resolveAdDuration = (booking, durationSeconds) => {
  let resolvedDuration = Number(durationSeconds) > 0 ? Number(durationSeconds) : 0;
  if (booking) {
    const rawUrls = (booking.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
    const isImageCampaign = booking.mediaType === 'image' || rawUrls.some(u => u.endsWith('.webp') || u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg'));

    if (isImageCampaign) {
      resolvedDuration = rawUrls.length >= 2 ? 16 : 8;
    } else {
      resolvedDuration = (resolvedDuration > 0 && resolvedDuration !== 15)
        ? resolvedDuration
        : (booking.mediaDuration || 15);
    }
  } else if (resolvedDuration === 0) {
    resolvedDuration = 8;
  }
  return resolvedDuration;
};

// Compute dynamic TTL expiration date for AdImpression telemetry (Plan duration + 1 day buffer)
const computeImpressionExpiresAt = (booking) => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (booking) {
    const durationDays = Number(booking.adDurationDays) || 7;
    const createdAtMs = booking.createdAt ? new Date(booking.createdAt).getTime() : now;
    const planPlusOneMs = createdAtMs + ((durationDays + 1) * ONE_DAY_MS);
    // Guarantee minimum 24-hour retention from receipt for offline-synced or late impressions
    return new Date(Math.max(planPlusOneMs, now + ONE_DAY_MS));
  }
  return new Date(now + (8 * ONE_DAY_MS)); // Fallback: 8 days (7-day plan + 1-day grace)
};

// Implement Device gRPC Service
const deviceServiceHandlers = {
  RegisterDevice: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;

      await Device.updateOne(
        { deviceId },
        { $set: { status: 'online', lastHeartbeat: new Date() } }
      );
      deviceLastDbTouch.set(deviceId, Date.now());

      callback(null, {
        success: true,
        message: `Device ${deviceId} registered and marked online`,
        status: 'online'
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  SendHeartbeat: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;
      const { callWaiter, waiterOption, tableNumber } = call.request;

      // Heartbeat DB touch is already verified & throttled by verifyGrpcToken above

      // Handle waiter call request
      if (callWaiter) {
        await handleDeviceWaiterCall(deviceId, waiterOption, tableNumber);
      }

      // Check for active table session state
      let tableSessionJson = '';
      const activeOrder = await Order.findOne({
        deviceId,
        tableStatus: { $in: ['active', 'close_table'] }
      }).sort({ createdAt: -1 }).lean();
      if (activeOrder) {
        const app = await HostApplication.findById(activeOrder.hostApplicationId);
        const billConfig = app?.billConfig || {};
        const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
        const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
        const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

        let subtotalCalc = 0;
        const itemsBreakdown = [];
        if (activeOrder.items && activeOrder.items.length > 0) {
          for (const item of activeOrder.items) {
            const lineTotal = (item.price || 0) * (item.quantity || 1);
            subtotalCalc += lineTotal;
            itemsBreakdown.push({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            });
          }
        }

        let subtotalPaise = activeOrder.subtotalAmount || subtotalCalc;
        let cgstPaise = activeOrder.cgstAmount || 0;
        let sgstPaise = activeOrder.sgstAmount || 0;
        let roundOffPaise = activeOrder.roundOffAmount || 0;


        if (!activeOrder.subtotalAmount && subtotalCalc > 0) {
          cgstPaise = Math.round(subtotalCalc * (cgstPct / 100));
          sgstPaise = Math.round(subtotalCalc * (sgstPct / 100));
          const rawTotal = subtotalCalc + cgstPaise + sgstPaise;
          let finalTotal = rawTotal;
          if (enableAutoRoundOff) {
            finalTotal = Math.ceil(rawTotal / 100) * 100;
            roundOffPaise = finalTotal - rawTotal;
          }
          subtotalPaise = subtotalCalc;
        }

        const gstPaise = cgstPaise + sgstPaise;
        const finalAmountPaise = activeOrder.totalAmount || (subtotalPaise + gstPaise + roundOffPaise);

        const upiId = app?.upiId || '';
        const payeeName = app?.payeeName || '';
        const amountRs = (finalAmountPaise / 100).toFixed(2);
        let upiUrl = '';
        if (upiId) {
          upiUrl = `upi://pay?pa=${upiId}`;
          if (payeeName) {
            upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
          }
          upiUrl += `&am=${amountRs}&cu=INR`;
        }

        const sessionPayload = {
          status: activeOrder.tableStatus,
          orderId: activeOrder.orderId,
          amount: finalAmountPaise,
          subtotal: subtotalPaise,
          cgst: cgstPaise,
          sgst: sgstPaise,
          gst: gstPaise,
          roundOff: roundOffPaise,

          otherCharges: 0,
          upiUrl,
          orderStatus: activeOrder.orderStatus,
          tableNumber: activeOrder.tableNumber,
          waiterCallStatus: activeOrder.waiterCallStatus || 'none',
          waiterCallCount: activeOrder.waiterCallCount || 0,
          waiterCallOption: activeOrder.waiterCallOption || '',
          items: itemsBreakdown
        };

        tableSessionJson = JSON.stringify(sessionPayload);
      } else {
        // Check if order was completed (payment received)
        const completedOrder = await Order.findOne({
          deviceId,
          tableStatus: 'completed',
          updatedAt: { $gt: new Date(Date.now() - 30000) } // within last 30s
        }).sort({ updatedAt: -1 });
        if (completedOrder) {
          tableSessionJson = JSON.stringify({
            status: 'completed',
            orderId: completedOrder.orderId
          });
          // Mark as handled so it doesn't repeat
          completedOrder.tableStatus = 'completed_acked';
          await completedOrder.save();
        }
      }

      let command = 'normal';
      if (global.pendingDeviceCommands && global.pendingDeviceCommands.has(deviceId)) {
        command = global.pendingDeviceCommands.get(deviceId);
        global.pendingDeviceCommands.delete(deviceId);
        console.log(`\x1b[35m[gRPC Heartbeat]\x1b[0m Dispatched command "${command}" to device ${deviceId}`);
      }

      callback(null, {
        success: true,
        command,
        tableSessionJson
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  TrackAdImpression: async (call, callback) => {
    const { bookingId, durationSeconds, interactiveClicks } = call.request;
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;

      // Skip telemetry logging and DB writes for free fallback ads, platform promos, and venue specials
      const isNonBillable = !bookingId ||
        bookingId === 'unknown' ||
        bookingId.startsWith('FALLBACK') ||
        bookingId.startsWith('PAD') ||
        bookingId.startsWith('VENUE_AD') ||
        bookingId === 'FALLBACK' ||
        bookingId === 'PAD' ||
        bookingId === 'VENUE_AD';

      if (isNonBillable) {
        return callback(null, {
          success: true,
          message: 'Non-billable creative impression skipped'
        });
      }

      console.log(`[gRPC telemetry] Device ${deviceId} tracked impression for Booking ${bookingId}: ${durationSeconds}s, Clicks: ${interactiveClicks}`);

      if (bookingId && bookingId !== 'unknown') {
        const booking = await AdBooking.findOne({ bookingId }).lean();
        const deviceDoc = await Device.findOne({ deviceId }).select('hostApplicationId').lean();

        const resolvedDuration = resolveAdDuration(booking, durationSeconds);
        const clicks = Number(interactiveClicks) || 0;
        const expiresAt = computeImpressionExpiresAt(booking);

        await AdImpression.create({
          bookingId,
          advertiserId: booking ? (booking.advertiserId || booking.userId) : null,
          deviceId: deviceId || null,
          hostApplicationId: booking ? booking.hostApplicationId : (deviceDoc ? deviceDoc.hostApplicationId : null),
          durationSeconds: resolvedDuration,
          interactiveClicks: clicks,
          createdAt: new Date(),
          expiresAt
        });

        // Atomically increment cumulative lifetime stats on AdBooking document (verified against device venue)
        if (booking) {
          const bookingOutletId = booking.outletId ? booking.outletId.toString() : null;
          const deviceHostAppId = (deviceDoc && deviceDoc.hostApplicationId) ? deviceDoc.hostApplicationId.toString() : null;

          if (bookingOutletId && deviceHostAppId && bookingOutletId !== deviceHostAppId) {
            console.warn(`[Security Warning] Impression attribution skipped: Device ${deviceId} (Venue: ${deviceHostAppId}) reported for Booking ${bookingId} (Target Venue: ${bookingOutletId})`);
          } else {
            await AdBooking.updateOne(
              { bookingId },
              {
                $inc: {
                  totalPlays: 1,
                  totalDurationSeconds: resolvedDuration,
                  totalClicks: clicks
                }
              }
            );
          }
        }
      }

      callback(null, {
        success: true,
        message: 'Telemetry logged successfully'
      });
    } catch (err) {
      console.error('TrackAdImpression Error:', err.message);
      callback(null, { success: false, message: err.message });
    }
  },

  BatchTrackAdImpressions: async (call, callback) => {
    const { impressions } = call.request || {};
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId } = claims;
      const deviceDoc = await Device.findOne({ deviceId }).select('hostApplicationId').lean();

      if (Array.isArray(impressions) && impressions.length > 0) {
        console.log(`[gRPC telemetry] Device ${deviceId} syncing ${impressions.length} batched offline ad impressions`);

        // 1. Filter out non-billable and invalid items
        const validImpressions = impressions.filter(item => {
          const bId = item && item.bookingId;
          return bId &&
            bId !== 'unknown' &&
            !bId.startsWith('FALLBACK') &&
            !bId.startsWith('PAD') &&
            !bId.startsWith('VENUE_AD') &&
            bId !== 'FALLBACK' &&
            bId !== 'PAD' &&
            bId !== 'VENUE_AD';
        });

        if (validImpressions.length > 0) {
          // 2. Batch-fetch all referenced bookings in a single query
          const uniqueBookingIds = [...new Set(validImpressions.map(i => i.bookingId))];
          const bookings = await AdBooking.find({ bookingId: { $in: uniqueBookingIds } }).lean();
          const bookingMap = new Map();
          bookings.forEach(b => bookingMap.set(b.bookingId, b));

          const docsToInsert = [];
          const bookingIncrements = new Map(); // bookingId -> { totalPlays, totalDurationSeconds, totalClicks }
          const deviceHostAppId = (deviceDoc && deviceDoc.hostApplicationId) ? deviceDoc.hostApplicationId.toString() : null;

          for (const item of validImpressions) {
            const { bookingId, durationSeconds, interactiveClicks } = item;
            const booking = bookingMap.get(bookingId);
            const resolvedDuration = resolveAdDuration(booking, durationSeconds);
            const clicks = Number(interactiveClicks) || 0;
            const expiresAt = computeImpressionExpiresAt(booking);

            docsToInsert.push({
              bookingId,
              advertiserId: booking ? (booking.advertiserId || booking.userId) : null,
              deviceId: deviceId || null,
              hostApplicationId: booking ? booking.hostApplicationId : (deviceDoc ? deviceDoc.hostApplicationId : null),
              durationSeconds: resolvedDuration,
              interactiveClicks: clicks,
              createdAt: new Date(),
              expiresAt
            });

            // Accumulate cumulative counters with venue verification
            if (booking) {
              const bookingOutletId = booking.outletId ? booking.outletId.toString() : null;
              if (bookingOutletId && deviceHostAppId && bookingOutletId !== deviceHostAppId) {
                console.warn(`[Security Warning] Batch impression attribution skipped: Device ${deviceId} (Venue: ${deviceHostAppId}) reported for Booking ${bookingId} (Target Venue: ${bookingOutletId})`);
              } else {
                const current = bookingIncrements.get(bookingId) || { totalPlays: 0, totalDurationSeconds: 0, totalClicks: 0 };
                current.totalPlays += 1;
                current.totalDurationSeconds += resolvedDuration;
                current.totalClicks += clicks;
                bookingIncrements.set(bookingId, current);
              }
            }
          }

          // 3. Batch insert all impressions in a single operation
          if (docsToInsert.length > 0) {
            await AdImpression.insertMany(docsToInsert, { ordered: false });
          }

          // 4. Batch update booking totals using bulkWrite
          if (bookingIncrements.size > 0) {
            const bulkOps = [];
            for (const [bId, inc] of bookingIncrements.entries()) {
              bulkOps.push({
                updateOne: {
                  filter: { bookingId: bId },
                  update: {
                    $inc: {
                      totalPlays: inc.totalPlays,
                      totalDurationSeconds: inc.totalDurationSeconds,
                      totalClicks: inc.totalClicks
                    }
                  }
                }
              });
            }
            if (bulkOps.length > 0) {
              await AdBooking.bulkWrite(bulkOps, { ordered: false });
            }
          }
        }
      }

      callback(null, {
        success: true,
        message: 'Batched telemetry logged successfully'
      });
    } catch (err) {
      console.error('BatchTrackAdImpressions Error:', err.message);
      callback(null, { success: false, message: err.message });
    }
  }
};

// Implement Menu gRPC Service
const menuServiceHandlers = {
  GetMenu: async (call, callback) => {
    try {
      const claims = verifyGrpcToken(call);
      const { hostApplicationId } = claims;

      const app = await HostApplication.findById(hostApplicationId);
      const outletName = app ? app.outletName : 'Aster & Ice';

      const menu = await Menu.findOne({ hostApplicationId });
      const activeShift = menu?.activeShift || 'Breakfast';

      const items = menu ? menu.items
        .filter(item => {
          // 1. Exclude unavailable items (Drop completely from tablet food menu)
          if (item.isAvailable === false) return false;

          // 2. Filter by active shift / all shifts
          if (item.isAllShifts === true) return true;
          if (Array.isArray(item.shifts) && item.shifts.length > 0) {
            return item.shifts.some(s => s.toLowerCase() === activeShift.toLowerCase());
          }
          // Backward compatibility fallback: if item has no shifts array, include by default
          return true;
        })
        .map(item => ({
          itemId: item.itemId,
          name: item.name,
          description: item.description || '',
          price: parseInt(item.price, 10),
          category: item.category,
          isAvailable: item.isAvailable !== false,
          imageUrl: item.imageUrl || '',
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          isPopular: Boolean(item.isPopular),
          customizations: Array.isArray(item.customizations) && item.customizations.length > 0
            ? JSON.stringify(item.customizations)
            : ''
        })) : [];

      const rawCategories = menu?.categories;
      const categories = (Array.isArray(rawCategories) && rawCategories.length > 0)
        ? rawCategories.map(cat => {
            if (typeof cat === 'string') return { name: cat.trim(), icon: '' };
            if (cat && typeof cat === 'object') {
              return { name: (cat.name || '').trim(), icon: (cat.icon || '').trim() };
            }
            return { name: String(cat).trim(), icon: '' };
          }).filter(c => c.name.length > 0)
        : [];

      callback(null, {
        success: true,
        message: outletName,
        items,
        categories,
        popularCategory: {
          name: (menu?.popularCategory?.name || 'Popular').trim(),
          icon: (menu?.popularCategory?.icon || 'star').trim()
        }
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

// Implement Order gRPC Service
const orderServiceHandlers = {
  CreateOrder: async (call, callback) => {
    const { tableNumber, items, totalAmount } = call.request;
    try {
      const claims = verifyGrpcToken(call);
      const { deviceId, hostApplicationId } = claims;

      const device = await Device.findOne({ deviceId }).populate('hostApplicationId');
      if (!device || !device.hostApplicationId) {
        return callback({ code: grpc.status.FAILED_PRECONDITION, message: 'Device is not linked to an application' });
      }
      const merchantId = device.hostApplicationId.userId;

      // Recalculate item prices server-side against active menu database & check availability
      const requestedItemIds = (items || []).map(i => i.itemId).filter(Boolean);
      const menuDoc = await Menu.findOne({ hostApplicationId });
      const menuItems = menuDoc?.items || [];
      const menuItemMap = new Map();
      const unavailableItems = [];

      menuItems.forEach(m => {
        if (requestedItemIds.includes(m.itemId)) {
          menuItemMap.set(m.itemId, m);
          if (m.isAvailable === false) {
            unavailableItems.push(m.name);
          }
        }
      });

      if (unavailableItems.length > 0) {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: `${unavailableItems.join(', ')} is out of stock. Please remove or replace it to proceed.`
        });
      }

      // Validated items with server-verified prices
      const validatedItems = (items || []).map(item => {
        const menuItem = menuItemMap.get(item.itemId);
        const basePrice = menuItem ? Number(menuItem.price || 0) : Number(item.price || 0);
        const serverName = menuItem ? menuItem.name : item.name;
        const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const requestedPrice = Number(item.price || 0);

        let itemPrice = basePrice;
        if (menuItem && Array.isArray(menuItem.customizations) && menuItem.customizations.length > 0) {
          const directGroups = menuItem.customizations.filter(g => g.pricingType === 'direct');
          if (directGroups.length > 0) {
            const validDirectPrices = [];
            directGroups.forEach(g => {
              (g.options || []).forEach(opt => {
                validDirectPrices.push(Number(opt.extraPrice || 0));
              });
            });
            // If requested price matches one of the valid direct variant prices (or direct variant + addons), accept it
            if (validDirectPrices.includes(requestedPrice) || (validDirectPrices.length > 0 && requestedPrice >= Math.min(...validDirectPrices))) {
              itemPrice = requestedPrice;
            }
          } else {
            // Addon pricing: price must be at least basePrice
            itemPrice = (requestedPrice >= basePrice) ? requestedPrice : basePrice;
          }
        } else {
          itemPrice = (requestedPrice >= basePrice) ? requestedPrice : basePrice;
        }

        return {
          itemId: item.itemId,
          name: serverName,
          quantity: qty,
          price: itemPrice,
          isPacked: Boolean(item.isPacked),
          customization: typeof item.customization === 'string' ? item.customization : ''
        };
      });

      const serverCalculatedTotal = validatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

      // Check if there is already an active order session on this table device
      let order = await Order.findOne({
        deviceId,
        tableStatus: 'active'
      });

      if (order) {
        // Merge items into existing active order (matching itemId, isPacked, and customization)
        validatedItems.forEach(newItem => {
          const existingItem = order.items.find(i =>
            i.itemId === newItem.itemId &&
            Boolean(i.isPacked) === Boolean(newItem.isPacked) &&
            (i.customization || '') === (newItem.customization || '')
          );
          if (existingItem) {
            existingItem.quantity += newItem.quantity;
          } else {
            order.items.push({
              itemId: newItem.itemId,
              name: newItem.name,
              quantity: newItem.quantity,
              price: newItem.price,
              isPacked: newItem.isPacked,
              customization: newItem.customization
            });
          }
        });

        // Recalculate subtotal, taxes, and total across all combined items in order
        const app = device.hostApplicationId || {};
        const billConfig = order.billConfigSnapshot || app.billConfig || {};
        const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
        const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
        const serviceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;
        const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

        const subtotalPaise = order.items.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);

        const cgstPaise = order.isGstExempt ? 0 : Math.round(subtotalPaise * (cgstPct / 100));
        const sgstPaise = order.isGstExempt ? 0 : Math.round(subtotalPaise * (sgstPct / 100));
        const serviceTaxPaise = order.isServiceTaxExempt ? 0 : Math.round(subtotalPaise * (serviceTaxPct / 100));
        const rawTotalPaise = subtotalPaise + cgstPaise + sgstPaise + serviceTaxPaise;

        let finalAmountPaise = rawTotalPaise;
        let roundOffPaise = 0;
        if (enableAutoRoundOff) {
          finalAmountPaise = Math.ceil(rawTotalPaise / 100) * 100;
          roundOffPaise = finalAmountPaise - rawTotalPaise;
        }

        order.subtotalAmount = subtotalPaise;
        order.cgstAmount = cgstPaise;
        order.sgstAmount = sgstPaise;
        order.serviceTaxAmount = serviceTaxPaise;
        order.roundOffAmount = roundOffPaise;
        order.cgstPercent = order.isGstExempt ? 0 : cgstPct;
        order.sgstPercent = order.isGstExempt ? 0 : sgstPct;
        order.serviceTaxPercent = order.isServiceTaxExempt ? 0 : serviceTaxPct;
        order.enableAutoRoundOff = enableAutoRoundOff;
        order.totalAmount = finalAmountPaise;

        // Reset orderStatus to 'placed' so the kitchen knows new items are added to prepare
        order.orderStatus = 'placed';

        await order.save();
      } else {
        // Create a new order if no active session exists
        const orderId = `ORD_${uuidv4().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

        const app = device.hostApplicationId || {};
        const billConfig = app.billConfig || {};
        const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
        const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
        const serviceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;
        const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

        const subtotalPaise = serverCalculatedTotal;
        const cgstPaise = Math.round(subtotalPaise * (cgstPct / 100));
        const sgstPaise = Math.round(subtotalPaise * (sgstPct / 100));
        const serviceTaxPaise = Math.round(subtotalPaise * (serviceTaxPct / 100));
        const rawTotalPaise = subtotalPaise + cgstPaise + sgstPaise + serviceTaxPaise;

        let finalAmountPaise = rawTotalPaise;
        let roundOffPaise = 0;
        if (enableAutoRoundOff) {
          finalAmountPaise = Math.ceil(rawTotalPaise / 100) * 100;
          roundOffPaise = finalAmountPaise - rawTotalPaise;
        }

        order = new Order({
          orderId,
          merchantId,
          hostApplicationId,
          deviceId,
          tableNumber,
          items: validatedItems,
          subtotalAmount: subtotalPaise,
          cgstAmount: cgstPaise,
          sgstAmount: sgstPaise,
          serviceTaxAmount: serviceTaxPaise,
          roundOffAmount: roundOffPaise,
          cgstPercent: cgstPct,
          sgstPercent: sgstPct,
          serviceTaxPercent: serviceTaxPct,
          isGstExempt: false,
          isServiceTaxExempt: false,
          enableAutoRoundOff,
          billConfigSnapshot: billConfig,
          totalAmount: finalAmountPaise,
          paymentStatus: 'pending',
          orderStatus: 'placed',
          tableStatus: 'active'
        });
        await order.save();
      }

      // Notify kiosk tablet & merchant dashboard via WebSocket
      const { notifyDeviceSessionUpdate } = require('./controllers/hostController');
      notifyDeviceSessionUpdate(order);

      global.sendToMerchant(merchantId, {
        event: 'new_order',
        data: order
      });

      callback(null, {
        success: true,
        message: 'Order placed',
        orderId: order.orderId,
        paymentUrl: ''
      });
    } catch (err) {
      console.error('gRPC CreateOrder Error:', err.message);
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  GetOrderStatus: async (call, callback) => {
    const { orderId } = call.request;
    try {
      verifyGrpcToken(call);

      const order = await Order.findOne({ orderId });
      if (!order) {
        return callback({ code: grpc.status.NOT_FOUND, message: `Order ${orderId} not found` });
      }

      callback(null, {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

function startGrpc() {
  grpcServer.addService(deviceProto.DeviceService.service, deviceServiceHandlers);
  grpcServer.addService(menuProto.MenuService.service, menuServiceHandlers);
  grpcServer.addService(orderProto.OrderService.service, orderServiceHandlers);

  const grpcBindHost = process.env.GRPC_BIND_HOST || (isDev ? '0.0.0.0' : '127.0.0.1');

  grpcServer.bindAsync(
    `${grpcBindHost}:${config.grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC Server] Binding failed:', err.message);
        return;
      }
      grpcServer.start();
      console.log(`[gRPC Server] Listening on ${grpcBindHost}:${port}`);
    }
  );
}

// Start background heartbeat monitor:
//  1. Transition stale online devices to offline (35s no ping)
//  2. Detach devices that have been offline for too long (2 min no ping)
//     so their deviceId is free for re-activation on another physical machine.
function startHeartbeatMonitor() {
  console.log('[Heartbeat Monitor] Started background device check interval (15s)...');
  setInterval(async () => {
    try {
      const offlineThreshold = new Date(Date.now() - 35000); // 35s — mark offline
      const detachThreshold = new Date(Date.now() - 120000); // 2 min — auto-detach

      // 0a) Prune dead / zombie device WebSockets
      if (global.deviceSockets) {
        for (const [devId, sock] of global.deviceSockets.entries()) {
          if (!sock || sock.readyState !== 1) {
            global.deviceSockets.delete(devId);
            clearSocketMeta(sock);
            if (sock && typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
            continue;
          }
          const isAlive = getSocketMeta(sock).isAlive;
          if (isAlive === false) {
            console.log(`[WS] Terminating unresponsive zombie socket for Device: ${devId}`);
            try { sock.terminate(); } catch (_) {}
            global.deviceSockets.delete(devId);
            clearSocketMeta(sock);
            if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
            continue;
          }
          setSocketAlive(sock, false);
          try {
            if (typeof sock.ping === 'function') sock.ping();
            else if (typeof sock.send === 'function') sock.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
          } catch (_) {
            try { sock.terminate(); } catch (_) {}
            global.deviceSockets.delete(devId);
            clearSocketMeta(sock);
            if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
          }
        }
      }

      // 0b) Prune dead / zombie merchant WebSockets
      if (merchantSockets) {
        for (const [merchantId, sockSet] of merchantSockets.entries()) {
          if (sockSet instanceof Set) {
            for (const sock of sockSet) {
              if (!sock || sock.readyState !== 1) {
                sockSet.delete(sock);
                clearSocketMeta(sock);
                if (sock && typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
                continue;
              }
              const isAlive = getSocketMeta(sock).isAlive;
              if (isAlive === false) {
                try { sock.terminate(); } catch (_) {}
                sockSet.delete(sock);
                clearSocketMeta(sock);
                if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
                continue;
              }
              setSocketAlive(sock, false);
              try {
                if (typeof sock.ping === 'function') sock.ping();
                else if (typeof sock.send === 'function') sock.send(JSON.stringify({ event: 'ping' }));
              } catch (_) {
                try { sock.terminate(); } catch (_) {}
                sockSet.delete(sock);
                clearSocketMeta(sock);
                if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
              }
            }
            if (sockSet.size === 0) {
              merchantSockets.delete(merchantId);
            }
          }
        }
      }

      // 0c) Prune dead / zombie admin WebSockets
      if (global.adminSockets) {
        for (const [adminId, sock] of global.adminSockets.entries()) {
          if (!sock || sock.readyState !== 1) {
            global.adminSockets.delete(adminId);
            clearSocketMeta(sock);
            if (sock && typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
            continue;
          }
          const isAlive = getSocketMeta(sock).isAlive;
          if (isAlive === false) {
            try { sock.terminate(); } catch (_) {}
            global.adminSockets.delete(adminId);
            clearSocketMeta(sock);
            if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
            continue;
          }
          setSocketAlive(sock, false);
          try {
            if (typeof sock.ping === 'function') sock.ping();
            else if (typeof sock.send === 'function') sock.send(JSON.stringify({ event: 'ping' }));
          } catch (_) {
            try { sock.terminate(); } catch (_) {}
            global.adminSockets.delete(adminId);
            clearSocketMeta(sock);
            if (typeof sock.removeAllListeners === 'function') sock.removeAllListeners();
          }
        }
      }

      // 1) Mark stale online devices as offline (Atomic bulk update)
      const staleResult = await Device.updateMany(
        { status: 'online', lastHeartbeat: { $lt: offlineThreshold } },
        { $set: { status: 'offline' } }
      );
      if (staleResult.modifiedCount > 0) {
        logger.info(`[Heartbeat Monitor] Marked ${staleResult.modifiedCount} stale devices OFFLINE.`);
      }

      // 2) Auto-detach devices that have been offline for the full grace period (2 min)
      // Exclude devices that currently have an active, responsive WebSocket
      const activeWsDeviceIds = [];
      if (global.deviceSockets) {
        for (const [devId, sock] of global.deviceSockets.entries()) {
          if (sock && sock.readyState === 1 && getSocketMeta(sock).isAlive !== false) {
            activeWsDeviceIds.push(devId);
          }
        }
      }

      const detachQuery = {
        isActivated: true,
        status: 'offline',
        lastHeartbeat: { $lt: detachThreshold }
      };
      if (activeWsDeviceIds.length > 0) {
        detachQuery.deviceId = { $nin: activeWsDeviceIds };
      }

      const detachResult = await Device.updateMany(
        detachQuery,
        {
          $set: {
            isActivated: false,
            hardwareId: null,
            kioskPasswordHash: null
          }
        }
      );
      if (detachResult.modifiedCount > 0) {
        logger.info(`[Heartbeat Monitor] Auto-detached ${detachResult.modifiedCount} devices after extended offline period.`);
      }
    } catch (err) {
      logger.error(`[Heartbeat Monitor] Error running device check: ${err.message}`);
    }
  }, 15000); // Check every 15 seconds
}

// Start background OTA revoked releases disk cleanup task (runs on boot & every 24 hours)
function startOtaDiskCleanupTask() {
  const releaseController = require('./controllers/releaseController');
  console.log('[OTA Disk Cleanup] Initializing background revoked releases cleanup task (24h)...');
  releaseController.cleanupOldRevokedReleases().catch(() => { });
  setInterval(() => {
    releaseController.cleanupOldRevokedReleases().catch(() => { });
  }, 24 * 60 * 60 * 1000);
}

// Start both servers
async function main() {
  try {
    await ensureRedisRunning(config.redisPort || 6379, config.redisHost || '127.0.0.1');
    await startFastify();
    startGrpc();
    startHeartbeatMonitor();
    startOtaDiskCleanupTask();

    // Signal PM2 that the application is fully booted and ready to serve traffic
    if (typeof process.send === 'function') {
      process.send('ready');
      console.log('\x1b[32m[PM2]\x1b[0m Sent ready signal for zero-downtime rolling reload.');
    }
  } catch (err) {
    logger.error(`Server Startup Failed: ${err.message}`);
    process.exit(1);
  }
}

main();



