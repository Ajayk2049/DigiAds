const Order = require('../models/Order');
const Device = require('../models/Device');

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
          const HostApplication = require('../models/HostApplication');
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
        const { notifyDeviceSessionUpdate } = require('../controllers/hostController');
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

module.exports = { handleDeviceWaiterCall };
