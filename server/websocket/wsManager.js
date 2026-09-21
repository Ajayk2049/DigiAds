/**
 * WebSocket Connection & Fleet Manager
 * Handles socket pools, capacity guards, rate limits, and cross-channel event broadcasting.
 */

// WebSocket client sockets map (merchantId -> Set<WebSocket>)
const merchantSockets = new Map();
const deviceSockets = new Map();
const adminSockets = new Map();
const pendingDeviceCommands = new Map();

// Expose on global for legacy and cross-controller access
global.merchantSockets = merchantSockets;
global.deviceSockets = deviceSockets;
global.adminSockets = adminSockets;
global.pendingDeviceCommands = pendingDeviceCommands;

// WebSocket connection capacity guards (protects Node process from socket descriptor exhaustion)
const MAX_TOTAL_WS_CONNS = 2000;
const MAX_WS_PER_IP = 30;
const ipWsConnectionCounts = new Map();

function canAcceptWebSocket(ip) {
  let totalConns = (global.deviceSockets ? global.deviceSockets.size : 0) + (global.adminSockets ? global.adminSockets.size : 0);
  if (global.merchantSockets) {
    for (const set of global.merchantSockets.values()) {
      totalConns += set instanceof Set ? set.size : 1;
    }
  }
  if (totalConns >= MAX_TOTAL_WS_CONNS) return false;

  // Allow high concurrency on local loopback during swarm load testing or in dev
  const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  const maxForThisIp = isLoopback ? 1000 : MAX_WS_PER_IP;

  const ipCount = ipWsConnectionCounts.get(ip) || 0;
  if (ipCount >= maxForThisIp) return false;
  return true;
}

function registerWsConnection(ip) {
  ipWsConnectionCounts.set(ip, (ipWsConnectionCounts.get(ip) || 0) + 1);
}

function unregisterWsConnection(ip) {
  const current = ipWsConnectionCounts.get(ip) || 0;
  if (current <= 1) {
    ipWsConnectionCounts.delete(ip);
  } else {
    ipWsConnectionCounts.set(ip, current - 1);
  }
}

// Global message flood limiter across all device websockets (max 500 msgs/second)
let globalWsMessageCount = 0;
let globalWsWindowStart = Date.now();
function checkGlobalWsFlood() {
  const now = Date.now();
  if (now - globalWsWindowStart > 1000) {
    globalWsWindowStart = now;
    globalWsMessageCount = 0;
  }
  globalWsMessageCount++;
  return globalWsMessageCount <= 500;
}

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
      const Device = require('../models/Device');
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
 * Helper to broadcast event to all active admin websocket clients
 */
global.broadcastToAdmins = (event, data = {}) => {
  if (!global.adminSockets || global.adminSockets.size === 0) return;
  const payload = JSON.stringify({ event, data });
  console.log(`[WS] Broadcasting ${event} to ${global.adminSockets.size} admin(s)`);
  for (const [adminId, socket] of global.adminSockets.entries()) {
    try {
      if (socket && socket.readyState === 1) {
        socket.send(payload);
      }
    } catch (err) {
      console.error(`[WS] Failed to send broadcast to admin ${adminId}:`, err.message);
      global.adminSockets.delete(adminId);
    }
  }
};

module.exports = {
  merchantSockets,
  deviceSockets,
  adminSockets,
  pendingDeviceCommands,
  canAcceptWebSocket,
  registerWsConnection,
  unregisterWsConnection,
  checkGlobalWsFlood,
  deviceLastDbTouch,
  throttleDeviceDbTouch,
  getSocketMeta,
  setSocketAlive,
  clearSocketMeta
};
