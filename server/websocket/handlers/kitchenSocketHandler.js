const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const {
  kdsSockets,
  kdsStationSockets,
  pendingKdsSockets,
  canAcceptWebSocket,
  registerWsConnection,
  unregisterWsConnection,
  setSocketAlive,
  clearSocketMeta
} = require('../wsManager');

/**
 * Handle Kitchen Display WebSocket connection (/ws/kitchen)
 * Handles both approved stations (?token=...) and pending authorization displays (?requestId=...)
 */
function handleKitchenSocket(connection, req) {
  const clientIp = req.ip || req.raw?.socket?.remoteAddress || 'unknown';
  const socket = connection.socket || connection;

  if (!canAcceptWebSocket(clientIp)) {
    try { socket.close(1008, 'Connection limit exceeded'); } catch (_) {}
    return;
  }
  registerWsConnection(clientIp);

  const { token, requestId } = req.query || {};

  // Case 1: Station is waiting for Admin PIN approval
  if (requestId && !token) {
    pendingKdsSockets.set(requestId, socket);
    setSocketAlive(socket, true);
    socket.send(JSON.stringify({ event: 'waiting_approval', requestId }));

    socket.on('close', () => {
      unregisterWsConnection(clientIp);
      pendingKdsSockets.delete(requestId);
      clearSocketMeta(socket);
    });
    return;
  }

  // Case 2: Station is authenticated with scoped KDS JWT
  if (!token) {
    unregisterWsConnection(clientIp);
    socket.send(JSON.stringify({ error: 'Authentication token or requestId is required' }));
    socket.close();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.role !== 'kds' || !decoded.hostApplicationId) {
      unregisterWsConnection(clientIp);
      socket.send(JSON.stringify({ error: 'Access denied: Valid KDS credentials required' }));
      socket.close();
      return;
    }

    const venueId = decoded.hostApplicationId.toString();
    const stationId = decoded.stationId;

    if (!kdsSockets.has(venueId)) {
      kdsSockets.set(venueId, new Set());
    }
    kdsSockets.get(venueId).add(socket);

    if (stationId) {
      kdsStationSockets.set(stationId, socket);
    }

    setSocketAlive(socket, true);
    if (typeof socket.on === 'function') {
      socket.on('pong', () => { setSocketAlive(socket, true); });
      socket.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.event === 'ping' || parsed.type === 'ping') {
            setSocketAlive(socket, true);
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({ event: 'pong' }));
            }
          }
        } catch (_) {}
      });
    }

    socket.send(JSON.stringify({
      event: 'connected',
      message: 'Connected to live kitchen order feed',
      venueId,
      stationId
    }));

    socket.on('close', () => {
      unregisterWsConnection(clientIp);
      const set = kdsSockets.get(venueId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) kdsSockets.delete(venueId);
      }
      if (stationId) kdsStationSockets.delete(stationId);
      clearSocketMeta(socket);
    });

  } catch (err) {
    unregisterWsConnection(clientIp);
    try {
      socket.send(JSON.stringify({ error: 'Invalid or expired KDS token' }));
      socket.close();
    } catch (_) {}
    clearSocketMeta(socket);
  }
}

module.exports = { handleKitchenSocket };
