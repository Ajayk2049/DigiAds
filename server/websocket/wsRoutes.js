const { handleMerchantSocket } = require('./handlers/merchantSocketHandler');
const { handleDeviceSocket } = require('./handlers/deviceSocketHandler');
const { handleAdminSocket } = require('./handlers/adminSocketHandler');

/**
 * Fastify WebSocket Routes Plugin
 * Mounts /ws/orders, /ws/device, and /ws/admin
 */
async function wsRoutes(fastifyInstance) {
  // Merchant live order feed
  fastifyInstance.get('/ws/orders', { websocket: true }, handleMerchantSocket);

  // Tablet & Kiosk stream
  fastifyInstance.get('/ws/device', { websocket: true }, handleDeviceSocket);

  // Admin live feed
  fastifyInstance.get('/ws/admin', { websocket: true }, handleAdminSocket);
}

module.exports = wsRoutes;
