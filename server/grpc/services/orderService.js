const grpc = require('@grpc/grpc-js');
const { v4: uuidv4 } = require('uuid');
const Order = require('../../models/Order');
const Device = require('../../models/Device');
const Menu = require('../../models/Menu');
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

      const device = await Device.findOne({ deviceId }).populate('hostApplicationId');
      if (!device || !device.hostApplicationId) {
        return callback({ code: grpc.status.FAILED_PRECONDITION, message: 'Device is not linked to an application' });
      }
      const merchantId = device.hostApplicationId.userId;

      // Recalculate item prices server-side against active menu database & check availability
      const requestedItemIds = (items || []).map(i => i.itemId).filter(Boolean);
      const menuDoc = await Menu.findOne({ hostApplicationId });
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
          const app = device.hostApplicationId || {};
          const billConfig = order.billConfigSnapshot || app.billConfig || {};
          const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
          const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
          const serviceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;
          const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

          const subtotalPaise = order.items.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 1)), 0);

          const cgstPaise = order.isGstExempt ? 0 : Math.round(subtotalPaise * (cgstPct / 100));
          const sgstPaise = order.isGstExempt ? 0 : Math.round(subtotalPaise * (sgstPct / 100));
          const serviceTaxPaise = order.isServiceTaxExempt ? 0 : Math.round(subtotalPaise * (serviceTaxPct / 100));
          const rawTotalPaise = subtotalPaise + cgstPaise + sgstPaise + serviceTaxPaise;

          let finalAmountPaise = rawTotalPaise;
          let roundOffPaise = 0;
          if (enableAutoRoundOff) {
            finalAmountPaise = Math.ceil(rawTotalPaise / 100) * 100;
            roundOffPaise = finalAmountPaise - rawTotalPaise;
          }

          order.subtotalAmount = subtotalPaise;
          order.cgstAmount = cgstPaise;
          order.sgstAmount = sgstPaise;
          order.serviceTaxAmount = serviceTaxPaise;
          order.roundOffAmount = roundOffPaise;
          order.cgstPercent = order.isGstExempt ? 0 : cgstPct;
          order.sgstPercent = order.isGstExempt ? 0 : sgstPct;
          order.serviceTaxPercent = order.isServiceTaxExempt ? 0 : serviceTaxPct;
          order.enableAutoRoundOff = enableAutoRoundOff;
          order.totalAmount = finalAmountPaise;

          // Reset orderStatus to 'placed' so the kitchen knows new items are added to prepare
          order.orderStatus = 'placed';

          await order.save();
        } else {
          // Create a new order if no active session exists
          const orderId = `ORD_${uuidv4().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

          const app = device.hostApplicationId || {};
          const billConfig = app.billConfig || {};
          const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
          const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
          const serviceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;
          const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

          const subtotalPaise = serverCalculatedTotal;
          const cgstPaise = Math.round(subtotalPaise * (cgstPct / 100));
          const sgstPaise = Math.round(subtotalPaise * (sgstPct / 100));
          const serviceTaxPaise = Math.round(subtotalPaise * (serviceTaxPct / 100));
          const rawTotalPaise = subtotalPaise + cgstPaise + sgstPaise + serviceTaxPaise;

          let finalAmountPaise = rawTotalPaise;
          let roundOffPaise = 0;
          if (enableAutoRoundOff) {
            finalAmountPaise = Math.ceil(rawTotalPaise / 100) * 100;
            roundOffPaise = finalAmountPaise - rawTotalPaise;
          }

          order = new Order({
            orderId,
            merchantId,
            hostApplicationId,
            deviceId,
            tableNumber,
            items: validatedItems,
            subtotalAmount: subtotalPaise,
            cgstAmount: cgstPaise,
            sgstAmount: sgstPaise,
            serviceTaxAmount: serviceTaxPaise,
            roundOffAmount: roundOffPaise,
            cgstPercent: cgstPct,
            sgstPercent: sgstPct,
            serviceTaxPercent: serviceTaxPct,
            isGstExempt: false,
            isServiceTaxExempt: false,
            enableAutoRoundOff,
            billConfigSnapshot: billConfig,
            totalAmount: finalAmountPaise,
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
