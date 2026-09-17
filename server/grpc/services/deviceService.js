const grpc = require('@grpc/grpc-js');
const Device = require('../../models/Device');
const Order = require('../../models/Order');
const HostApplication = require('../../models/HostApplication');
const { verifyGrpcToken } = require('../grpcAuth');
const { deviceLastDbTouch } = require('../../websocket/wsManager');
const { handleDeviceWaiterCall } = require('../../websocket/waiterCallHandler');
const { recordSingleImpression, recordBatchImpressions } = require('../utils/impressionTracker');

// Implement Device gRPC Service Handlers
const deviceServiceHandlers = {
  RegisterDevice: async (call, callback) => {
    try {
      const claims = await verifyGrpcToken(call);
      const { deviceId } = claims;

      await Device.updateOne(
        { deviceId },
        { $set: { status: 'online', lastHeartbeat: new Date() } }
      );
      deviceLastDbTouch.set(deviceId, Date.now());

      callback(null, {
        success: true,
        message: `Device ${deviceId} registered and marked online`,
        status: 'online'
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  SendHeartbeat: async (call, callback) => {
    try {
      const claims = await verifyGrpcToken(call);
      const { deviceId } = claims;
      const { callWaiter, waiterOption, tableNumber } = call.request;

      // Heartbeat DB touch is already verified & throttled by verifyGrpcToken above

      // Handle waiter call request
      if (callWaiter) {
        await handleDeviceWaiterCall(deviceId, waiterOption, tableNumber);
      }

      // Check for active table session state
      let tableSessionJson = '';
      const activeOrder = await Order.findOne({
        deviceId,
        tableStatus: { $in: ['active', 'close_table'] }
      }).sort({ createdAt: -1 }).lean();

      if (activeOrder) {
        const app = await HostApplication.findById(activeOrder.hostApplicationId);
        const billConfig = app?.billConfig || {};
        const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
        const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
        const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

        let subtotalCalc = 0;
        const itemsBreakdown = [];
        if (activeOrder.items && activeOrder.items.length > 0) {
          for (const item of activeOrder.items) {
            const lineTotal = (item.price || 0) * (item.quantity || 1);
            subtotalCalc += lineTotal;
            itemsBreakdown.push({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            });
          }
        }

        let subtotalPaise = activeOrder.subtotalAmount || subtotalCalc;
        let cgstPaise = activeOrder.cgstAmount || 0;
        let sgstPaise = activeOrder.sgstAmount || 0;
        let roundOffPaise = activeOrder.roundOffAmount || 0;

        if (!activeOrder.subtotalAmount && subtotalCalc > 0) {
          cgstPaise = Math.round(subtotalCalc * (cgstPct / 100));
          sgstPaise = Math.round(subtotalCalc * (sgstPct / 100));
          const rawTotal = subtotalCalc + cgstPaise + sgstPaise;
          let finalTotal = rawTotal;
          if (enableAutoRoundOff) {
            finalTotal = Math.ceil(rawTotal / 100) * 100;
            roundOffPaise = finalTotal - rawTotal;
          }
          subtotalPaise = subtotalCalc;
        }

        const gstPaise = cgstPaise + sgstPaise;
        const finalAmountPaise = activeOrder.totalAmount || (subtotalPaise + gstPaise + roundOffPaise);

        const upiId = app?.upiId || '';
        const payeeName = app?.payeeName || '';
        const amountRs = (finalAmountPaise / 100).toFixed(2);
        let upiUrl = '';
        if (upiId) {
          upiUrl = `upi://pay?pa=${upiId}`;
          if (payeeName) {
            upiUrl += `&pn=${encodeURIComponent(payeeName)}`;
          }
          upiUrl += `&am=${amountRs}&cu=INR`;
        }

        const sessionPayload = {
          status: activeOrder.tableStatus,
          orderId: activeOrder.orderId,
          amount: finalAmountPaise,
          subtotal: subtotalPaise,
          cgst: cgstPaise,
          sgst: sgstPaise,
          gst: gstPaise,
          roundOff: roundOffPaise,
          otherCharges: 0,
          upiUrl,
          orderStatus: activeOrder.orderStatus,
          tableNumber: activeOrder.tableNumber,
          waiterCallStatus: activeOrder.waiterCallStatus || 'none',
          waiterCallCount: activeOrder.waiterCallCount || 0,
          waiterCallOption: activeOrder.waiterCallOption || '',
          items: itemsBreakdown
        };

        tableSessionJson = JSON.stringify(sessionPayload);
      } else {
        // Check if order was completed (payment received) and atomically claim it
        const completedOrder = await Order.findOneAndUpdate(
          {
            deviceId,
            tableStatus: 'completed',
            updatedAt: { $gt: new Date(Date.now() - 30000) } // within last 30s
          },
          { $set: { tableStatus: 'completed_acked' } },
          { sort: { updatedAt: -1 } }
        );
        if (completedOrder) {
          tableSessionJson = JSON.stringify({
            status: 'completed',
            orderId: completedOrder.orderId
          });
        }
      }

      let command = 'normal';
      if (global.pendingDeviceCommands && global.pendingDeviceCommands.has(deviceId)) {
        command = global.pendingDeviceCommands.get(deviceId);
        global.pendingDeviceCommands.delete(deviceId);
        console.log(`\x1b[35m[gRPC Heartbeat]\x1b[0m Dispatched command "${command}" to device ${deviceId}`);
      }

      callback(null, {
        success: true,
        command,
        tableSessionJson
      });
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  },

  TrackAdImpression: async (call, callback) => {
    const { bookingId, durationSeconds, interactiveClicks } = call.request;
    try {
      const claims = await verifyGrpcToken(call);
      const { deviceId } = claims;

      const result = await recordSingleImpression(deviceId, bookingId, durationSeconds, interactiveClicks);
      if (result.skipped) {
        return callback(null, {
          success: true,
          message: 'Non-billable creative impression skipped'
        });
      }

      callback(null, {
        success: true,
        message: 'Telemetry logged successfully'
      });
    } catch (err) {
      console.error('TrackAdImpression Error:', err.message);
      callback(null, { success: false, message: err.message });
    }
  },

  BatchTrackAdImpressions: async (call, callback) => {
    const { impressions } = call.request || {};
    try {
      const claims = await verifyGrpcToken(call);
      const { deviceId } = claims;

      await recordBatchImpressions(deviceId, impressions);

      callback(null, {
        success: true,
        message: 'Batched telemetry logged successfully'
      });
    } catch (err) {
      console.error('BatchTrackAdImpressions Error:', err.message);
      callback(null, { success: false, message: err.message });
    }
  }
};

module.exports = {
  deviceServiceHandlers
};
