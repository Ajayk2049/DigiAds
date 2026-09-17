const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const {
  adminSockets,
  canAcceptWebSocket,
  registerWsConnection,
  unregisterWsConnection,
  setSocketAlive,
  clearSocketMeta
} = require('../wsManager');

/**
 * Handle Admin Live Feed WebSocket connection (/ws/admin)
 */
function handleAdminSocket(connection, req) {
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
    if (decoded.role !== 'admin') {
      unregisterWsConnection(clientIp);
      socket.send(JSON.stringify({ error: 'Access denied: Admin role required' }));
      socket.close();
      return;
    }

    const adminId = decoded.uid || 'admin_session_' + Math.random().toString(36).substring(2, 7);
    const existingSocket = adminSockets.get(adminId);
    if (existingSocket && existingSocket !== socket) {
      try {
        existingSocket.close(4000, 'Replaced by new connection');
        if (typeof existingSocket.terminate === 'function') existingSocket.terminate();
      } catch (_) { }
      clearSocketMeta(existingSocket);
      if (typeof existingSocket.removeAllListeners === 'function') existingSocket.removeAllListeners();
    }

    setSocketAlive(socket, true);
    if (typeof socket.on === 'function') {
      socket.on('pong', () => { setSocketAlive(socket, true); });
    }
    adminSockets.set(adminId, socket);
    console.log(`[WS] Admin connected: ${adminId}`);

    socket.send(JSON.stringify({ event: 'connected', message: 'Connected to Admin Live Feed' }));

    socket.on('close', () => {
      unregisterWsConnection(clientIp);
      adminSockets.delete(adminId);
      clearSocketMeta(socket);
      if (typeof socket.removeAllListeners === 'function') {
        socket.removeAllListeners();
      }
      console.log(`[WS] Admin disconnected: ${adminId}`);
    });

  } catch (err) {
    unregisterWsConnection(clientIp);
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
}

module.exports = { handleAdminSocket };
