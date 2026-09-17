const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const Device = require('../../models/Device');
const Order = require('../../models/Order');
const HostApplication = require('../../models/HostApplication');
const {
  deviceSockets,
  canAcceptWebSocket,
  registerWsConnection,
  unregisterWsConnection,
  checkGlobalWsFlood,
  throttleDeviceDbTouch,
  setSocketAlive,
  clearSocketMeta
} = require('../wsManager');
const { handleDeviceWaiterCall } = require('../waiterCallHandler');

/**
 * Handle Kiosk & Tablet Stream WebSocket connection (/ws/device)
 */
async function handleDeviceSocket(connection, req) {
  const clientIp = req.ip || req.raw?.socket?.remoteAddress || 'unknown';
  const socket = connection.socket || connection;
  if (!canAcceptWebSocket(clientIp)) {
    try { socket.close(1008, 'Connection limit exceeded'); } catch (_) {}
    return;
  }
  registerWsConnection(clientIp);

  const token = req.query.token;
  if (!token) {
    unregisterWsConnection(clientIp);
    socket.send(JSON.stringify({ error: 'Authentication token is required' }));
    socket.close();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { deviceId } = decoded;
    if (!deviceId) {
      unregisterWsConnection(clientIp);
      socket.send(JSON.stringify({ error: 'Invalid token: deviceId required' }));
      socket.close();
      return;
    }

    // Check if device exists in MongoDB (fast lean projection)
    const existingDoc = await Device.findOne({ deviceId }).select('_id status lastHeartbeat hostApplicationId').lean();
    if (!existingDoc) {
      unregisterWsConnection(clientIp);
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
    const existingSocket = deviceSockets.get(deviceId);
    if (existingSocket && existingSocket !== socket) {
      try {
        existingSocket.close(4000, 'Replaced by new connection');
        if (typeof existingSocket.terminate === 'function') {
          existingSocket.terminate();
        }
      } catch (closeErr) {
        console.error(`[WS] Error closing old socket for ${deviceId}:`, closeErr.message);
      }
      clearSocketMeta(existingSocket);
      if (typeof existingSocket.removeAllListeners === 'function') {
        existingSocket.removeAllListeners();
      }
    }

    setSocketAlive(socket, true);
    if (typeof socket.on === 'function') {
      socket.on('pong', () => { setSocketAlive(socket, true); });
    }
    deviceSockets.set(deviceId, socket);
    console.log(`[WS] Device connected: ${deviceId} (Total active devices: ${deviceSockets.size})`);

    // Send connection confirmation & push initial status
    socket.send(JSON.stringify({
      event: 'connected',
      deviceId,
      serverTime: Date.now(),
      message: 'Connected to DigiAds Real-time Stream'
    }));

    // Execute non-blocking background initialization on connect
    setImmediate(async () => {
      try {
        // Update device status in MongoDB with lean touch
        const updated = await Device.findOneAndUpdate(
          { deviceId },
          { $set: { status: 'online', lastHeartbeat: new Date() } },
          { new: true }
        ).select('hostApplicationId').lean();

        if (updated && updated.hostApplicationId) {
          const app = await HostApplication.findById(updated.hostApplicationId).select('userId').lean();
          if (app && app.userId && global.sendToMerchant) {
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
          const { notifyDeviceSessionUpdate } = require('../../controllers/hostController');
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

        // Global flood cap across all connected devices
        if (!checkGlobalWsFlood()) {
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
      unregisterWsConnection(clientIp);
      deviceSockets.delete(deviceId);
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
        ).select('hostApplicationId').lean();
        if (updatedDevice && updatedDevice.hostApplicationId) {
          const app = await HostApplication.findById(updatedDevice.hostApplicationId).select('userId').lean();
          if (app && app.userId && global.sendToMerchant) {
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
    unregisterWsConnection(clientIp);
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
}

module.exports = { handleDeviceSocket };
