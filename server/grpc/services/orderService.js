const grpc = require('@grpc/grpc-js');
const { v4: uuidv4 } = require('uuid');
const Order = require('../../models/Order');
const Device = require('../../models/Device');
const Menu = require('../../models/Menu');
const HostApplication = require('../../models/HostApplication');
const { calculateOrderTotals } = require('../../controllers/host/orderHelper');
const { verifyGrpcToken } = require('../grpcAuth');

// Mutex lock to serialize concurrent order creation and item additions per table device
const deviceOrderLocks = new Map();

async function withDeviceOrderLock(deviceId, fn) {
  while (deviceOrderLocks.has(deviceId)) {
    try { await deviceOrderLocks.get(deviceId); } catch (_) { }
  }
  let resolveLock;
  const lockPromise = new Promise(resolve => { resolveLock = resolve; });
  deviceOrderLocks.set(deviceId, lockPromise);
  try {
    return await fn();
  } finally {
    deviceOrderLocks.delete(deviceId);
    resolveLock();
  }
}

// Implement Order gRPC Service Handlers
const orderServiceHandlers = {
  CreateOrder: async (call, callback) => {
    const { tableNumber, items, totalAmount } = call.request;
    try {
      const claims = await verifyGrpcToken(call);
      const { deviceId, hostApplicationId } = claims;

      const device = await Device.findOne({ deviceId })
        .populate({ path: 'hostApplicationId', select: 'userId status billConfig' })
        .lean();
      if (!device || !device.hostApplicationId) {
        return callback({ code: grpc.status.FAILED_PRECONDITION, message: 'Device is not linked to an application' });
      }
      const merchantId = device.hostApplicationId.userId;

      // Ensure billConfig is resolved from device or direct venue host application
      let venueBillConfig = device.hostApplicationId.billConfig;
      if (!venueBillConfig || Object.keys(venueBillConfig).length === 0) {
        const appDoc = await HostApplication.findById(hostApplicationId).select('billConfig').lean();
        if (appDoc?.billConfig) {
          venueBillConfig = appDoc.billConfig;
        }
      }
      venueBillConfig = venueBillConfig || {};

      // Recalculate item prices server-side against active menu database & check availability
      const requestedItemIds = (items || []).map(i => i.itemId).filter(Boolean);
      const menuDoc = await Menu.findOne({ hostApplicationId }).lean();
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

      let order;
      await withDeviceOrderLock(deviceId, async () => {
        // Check if there is already an active order session on this table device
        order = await Order.findOne({
          deviceId,
          tableStatus: 'active'
        }).sort({ createdAt: -1 });

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
          const billConfig = (order.billConfigSnapshot && Object.keys(order.billConfigSnapshot).length > 0)
            ? order.billConfigSnapshot
            : venueBillConfig;

          const subtotalPaise = order.items.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);
          const calc = calculateOrderTotals({
            subtotalPaise,
            billConfig,
            isGstExempt: order.isGstExempt,
            isServiceTaxExempt: order.isServiceTaxExempt
          });

          order.subtotalAmount = subtotalPaise;
          order.cgstAmount = calc.cgstPaise;
          order.sgstAmount = calc.sgstPaise;
          order.serviceTaxAmount = calc.serviceTaxPaise;
          order.roundOffAmount = calc.roundOffPaise;
          order.cgstPercent = calc.cgstPct;
          order.sgstPercent = calc.sgstPct;
          order.serviceTaxPercent = calc.serviceTaxPct;
          order.enableAutoRoundOff = calc.enableAutoRoundOff;
          order.billConfigSnapshot = billConfig;
          order.totalAmount = calc.finalTotalPaise;

          // Reset orderStatus to 'placed' so the kitchen knows new items are added to prepare
          order.orderStatus = 'placed';

          await order.save();
        } else {
          // Create a new order if no active session exists
          const orderId = `ORD_${uuidv4().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

          const subtotalPaise = serverCalculatedTotal;
          const calc = calculateOrderTotals({
            subtotalPaise,
            billConfig: venueBillConfig,
            isGstExempt: false,
            isServiceTaxExempt: false
          });

          order = new Order({
            orderId,
            merchantId,
            hostApplicationId,
            deviceId,
            tableNumber,
            items: validatedItems,
            subtotalAmount: subtotalPaise,
            cgstAmount: calc.cgstPaise,
            sgstAmount: calc.sgstPaise,
            serviceTaxAmount: calc.serviceTaxPaise,
            roundOffAmount: calc.roundOffPaise,
            cgstPercent: calc.rawCgstPct,
            sgstPercent: calc.rawSgstPct,
            serviceTaxPercent: calc.rawServiceTaxPct,
            isGstExempt: false,
            isServiceTaxExempt: false,
            enableAutoRoundOff: calc.enableAutoRoundOff,
            billConfigSnapshot: venueBillConfig,
            totalAmount: calc.finalTotalPaise,
            paymentStatus: 'pending',
            orderStatus: 'placed',
            tableStatus: 'active'
          });
          await order.save();
        }
      });

      // Notify kiosk tablet & merchant dashboard via WebSocket
      const { notifyDeviceSessionUpdate } = require('../../controllers/hostController');
      notifyDeviceSessionUpdate(order);

      if (global.sendToMerchant) {
        global.sendToMerchant(merchantId, {
          event: 'new_order',
          data: order
        });
      }

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
      await verifyGrpcToken(call);

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

module.exports = {
  orderServiceHandlers,
  withDeviceOrderLock
};
