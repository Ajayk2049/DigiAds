const Device = require('../models/Device');
const logger = require('../utils/logger');
const {
  merchantSockets,
  deviceSockets,
  adminSockets,
  getSocketMeta,
  setSocketAlive,
  clearSocketMeta
} = require('../websocket/wsManager');

/**
 * Start background heartbeat monitor:
 *  1. Prune dead / zombie WebSockets (devices, merchants, admins)
 *  2. Transition stale online devices to offline (35s no ping)
 */
function startHeartbeatMonitor() {
  console.log('[Heartbeat Monitor] Started background device check interval (15s)...');
  let isHeartbeatRunning = false;
  const heartbeatTimer = setInterval(async () => {
    if (isHeartbeatRunning) return;
    isHeartbeatRunning = true;
    try {
      const offlineThreshold = new Date(Date.now() - 35000); // 35s — mark offline

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
            try { sock.terminate(); } catch (_) { }
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
            try { sock.terminate(); } catch (_) { }
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
                try { sock.terminate(); } catch (_) { }
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
                try { sock.terminate(); } catch (_) { }
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
            try { sock.terminate(); } catch (_) { }
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
            try { sock.terminate(); } catch (_) { }
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

    } catch (err) {
      logger.error(`[Heartbeat Monitor] Error running device check: ${err.message}`);
    } finally {
      isHeartbeatRunning = false;
    }
  }, 15000); // Check every 15 seconds

  if (typeof heartbeatTimer.unref === 'function') {
    heartbeatTimer.unref();
  }
}

module.exports = { startHeartbeatMonitor };
