const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const {
  merchantSockets,
  canAcceptWebSocket,
  registerWsConnection,
  unregisterWsConnection,
  setSocketAlive,
  clearSocketMeta
} = require('../wsManager');

/**
 * Handle Merchant Live Feed WebSocket connection (/ws/orders)
 */
function handleMerchantSocket(connection, req) {
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
    if (decoded.role !== 'merchant') {
      unregisterWsConnection(clientIp);
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
      unregisterWsConnection(clientIp);
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
    unregisterWsConnection(clientIp);
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
}

module.exports = { handleMerchantSocket };
