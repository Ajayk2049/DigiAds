const { handleMerchantSocket } = require('./handlers/merchantSocketHandler');
const { handleDeviceSocket } = require('./handlers/deviceSocketHandler');
const { handleAdminSocket } = require('./handlers/adminSocketHandler');
const { handleKitchenSocket } = require('./handlers/kitchenSocketHandler');

/**
 * Fastify WebSocket Routes Plugin
 * Mounts /ws/orders, /ws/device, /ws/admin, and /ws/kitchen
 */
async function wsRoutes(fastifyInstance) {
  // Merchant live order feed
  fastifyInstance.get('/ws/orders', { websocket: true }, handleMerchantSocket);

  // Tablet & Kiosk stream
  fastifyInstance.get('/ws/device', { websocket: true }, handleDeviceSocket);

  // Admin live feed
  fastifyInstance.get('/ws/admin', { websocket: true }, handleAdminSocket);

  // Kitchen Display System (KDS) live feed & approval socket
  fastifyInstance.get('/ws/kitchen', { websocket: true }, handleKitchenSocket);
}

module.exports = wsRoutes;
