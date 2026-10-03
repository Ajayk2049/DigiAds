const HostApplication = require('../../models/HostApplication');

/**
 * Calculates billing totals including CGST, SGST, Service Tax, and Auto Round-Off.
 */
function calculateOrderTotals({ subtotalPaise, billConfig = {}, isGstExempt = false, isServiceTaxExempt = false }) {
  const cgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
  const sgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
  const serviceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;
  const enableAutoRoundOff = billConfig.enableAutoRoundOff !== false;

  const cgstPaise = isGstExempt ? 0 : Math.round(subtotalPaise * (cgstPct / 100));
  const sgstPaise = isGstExempt ? 0 : Math.round(subtotalPaise * (sgstPct / 100));
  const serviceTaxPaise = isServiceTaxExempt ? 0 : Math.round(subtotalPaise * (serviceTaxPct / 100));
  const rawTotal = subtotalPaise + cgstPaise + sgstPaise + serviceTaxPaise;
  let finalTotal = rawTotal;
  let roundOffPaise = 0;
  if (enableAutoRoundOff) {
    finalTotal = Math.ceil(rawTotal / 100) * 100;
    roundOffPaise = finalTotal - rawTotal;
  }

  return {
    cgstPct: isGstExempt ? 0 : cgstPct,
    sgstPct: isGstExempt ? 0 : sgstPct,
    serviceTaxPct: isServiceTaxExempt ? 0 : serviceTaxPct,
    rawCgstPct: cgstPct,
    rawSgstPct: sgstPct,
    rawServiceTaxPct: serviceTaxPct,
    cgstPaise,
    sgstPaise,
    gstPaise: cgstPaise + sgstPaise,
    serviceTaxPaise,
    roundOffPaise,
    finalTotalPaise: finalTotal,
    enableAutoRoundOff
  };
}

/**
 * Recalculates order amounts and tax exemptions in-place
 */
function applyTaxExemption(order, { isGstExempt, isServiceTaxExempt }) {
  if (isGstExempt !== undefined) order.isGstExempt = isGstExempt;
  if (isServiceTaxExempt !== undefined) order.isServiceTaxExempt = isServiceTaxExempt;

  let subtotalPaise = 0;
  for (const item of order.items || []) {
    subtotalPaise += (item.price || 0) * (item.quantity || 1);
  }
  order.subtotalAmount = subtotalPaise;

  const calc = calculateOrderTotals({
    subtotalPaise,
    billConfig: order.billConfigSnapshot,
    isGstExempt: order.isGstExempt,
    isServiceTaxExempt: order.isServiceTaxExempt
  });

  order.cgstAmount = calc.cgstPaise;
  order.sgstAmount = calc.sgstPaise;
  order.serviceTaxAmount = calc.serviceTaxPaise;
  order.roundOffAmount = calc.roundOffPaise;
  order.cgstPercent = calc.cgstPct;
  order.sgstPercent = calc.sgstPct;
  order.serviceTaxPercent = calc.serviceTaxPct;
  order.totalAmount = calc.finalTotalPaise;
}

/**
 * Builds MongoDB Aggregation pipeline for order multi-field search
 */
function buildOrderSearchPipeline(matchStage, search, queryLimit) {
  const sRaw = search.trim();
  const sClean = sRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const numericVal = parseFloat(sRaw);
  const paiseVal = !isNaN(numericVal) ? Math.round(numericVal * 100) : null;

  const pipeline = [
    { $match: matchStage },
    {
      $addFields: {
        amountRupeesStr: { $toString: { $divide: ['$totalAmount', 100] } },
        amountPaiseStr: { $toString: '$totalAmount' },
        dateFormattedStr: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dateFormattedIndian: { $dateToString: { format: '%d/%m/%Y', date: '$createdAt' } }
      }
    }
  ];

  const orConditions = [
    { orderId: { $regex: sClean, $options: 'i' } },
    { tableNumber: { $regex: sClean, $options: 'i' } },
    { paymentType: { $regex: sClean, $options: 'i' } },
    { orderType: { $regex: sClean, $options: 'i' } },
    { 'items.name': { $regex: sClean, $options: 'i' } },
    { amountRupeesStr: { $regex: sClean, $options: 'i' } },
    { amountPaiseStr: { $regex: sClean, $options: 'i' } },
    { dateFormattedStr: { $regex: sClean, $options: 'i' } },
    { dateFormattedIndian: { $regex: sClean, $options: 'i' } }
  ];

  if (paiseVal !== null) {
    orConditions.push({ totalAmount: paiseVal });
  }

  pipeline.push({ $match: { $or: orConditions } });
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $limit: queryLimit });
  return pipeline;
}

/**
 * Push session update to device via WebSocket and notify merchant dashboard
 */
async function notifyDeviceSessionUpdate(order) {
  if (!order || !order.deviceId) return;

  try {
    const app = await HostApplication.findById(order.hostApplicationId);
    const billConfig = app?.billConfig || {};
    const defaultCgstPct = typeof billConfig.cgstPercent === 'number' ? billConfig.cgstPercent : 2.5;
    const defaultSgstPct = typeof billConfig.sgstPercent === 'number' ? billConfig.sgstPercent : 2.5;
    const defaultServiceTaxPct = typeof billConfig.serviceTaxPercent === 'number' ? billConfig.serviceTaxPercent : 0;

    let subtotalCalc = 0;
    const itemsBreakdown = [];
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const lineTotal = (item.price || 0) * (item.quantity || 1);
        subtotalCalc += lineTotal;
        itemsBreakdown.push({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          isPacked: Boolean(item.isPacked)
        });
      }
    }

    let subtotalPaise = order.subtotalAmount || subtotalCalc;
    let cgstPaise = order.cgstAmount || 0;
    let sgstPaise = order.sgstAmount || 0;
    let serviceTaxPaise = order.serviceTaxAmount || 0;
    let roundOffPaise = order.roundOffAmount || 0;

    if (!order.subtotalAmount && subtotalCalc > 0) {
      const calc = calculateOrderTotals({
        subtotalPaise: subtotalCalc,
        billConfig,
        isGstExempt: order.isGstExempt,
        isServiceTaxExempt: order.isServiceTaxExempt
      });
      cgstPaise = calc.cgstPaise;
      sgstPaise = calc.sgstPaise;
      serviceTaxPaise = calc.serviceTaxPaise;
      roundOffPaise = calc.roundOffPaise;
      subtotalPaise = subtotalCalc;
    }

    const gstPaise = cgstPaise + sgstPaise;
    const finalAmountPaise = order.totalAmount || (subtotalPaise + gstPaise + serviceTaxPaise + roundOffPaise);

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

    const payload = {
      event: 'table_session',
      status: order.tableStatus,
      orderId: order.orderId,
      amount: finalAmountPaise,
      subtotal: subtotalPaise,
      cgst: cgstPaise,
      sgst: sgstPaise,
      gst: gstPaise,
      serviceTax: serviceTaxPaise,
      roundOff: roundOffPaise,
      cgstPercent: typeof order.cgstPercent === 'number' ? order.cgstPercent : defaultCgstPct,
      sgstPercent: typeof order.sgstPercent === 'number' ? order.sgstPercent : defaultSgstPct,
      serviceTaxPercent: typeof order.serviceTaxPercent === 'number' ? order.serviceTaxPercent : defaultServiceTaxPct,
      otherCharges: 0,
      upiUrl,
      orderStatus: order.orderStatus,
      tableNumber: order.tableNumber,
      waiterCallStatus: order.waiterCallStatus || 'none',
      waiterCallCount: order.waiterCallCount || 0,
      waiterCallOption: order.waiterCallOption || '',
      items: itemsBreakdown
    };

    const socket = global.deviceSockets ? global.deviceSockets.get(order.deviceId) : null;
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(payload));
      reqLog('info', `[WS] Push session update to Device ${order.deviceId}: status=${order.tableStatus}, orderStatus=${order.orderStatus}, amount=${finalAmountPaise}`);
    }

    if (order.merchantId && global.sendToMerchant) {
      global.sendToMerchant(order.merchantId, {
        event: 'order_update',
        data: order
      });
      reqLog('info', `[WS] Push order update to Merchant ${order.merchantId}: orderId=${order.orderId}, orderStatus=${order.orderStatus}`);
    }

    if (order.tableStatus === 'completed') {
      setTimeout(async () => {
        try {
          order.tableStatus = 'completed_acked';
          await order.save();
          reqLog('info', `[WS] Auto-acked completed table session for table ${order.tableNumber}`);
        } catch (e) {
          reqLog('error', `[WS] Failed to auto-ack completed order: ${e.message}`);
        }
      }, 5000);
    }
  } catch (err) {
    reqLog('error', `[WS] notifyDeviceSessionUpdate Error: ${err.message}`);
  }
}

function reqLog(level, msg) {
  if (global.pinoLogger && typeof global.pinoLogger[level] === 'function') {
    global.pinoLogger[level](msg);
  } else {
    console[level === 'error' ? 'error' : 'log'](msg);
  }
}

module.exports = {
  calculateOrderTotals,
  applyTaxExemption,
  buildOrderSearchPipeline,
  notifyDeviceSessionUpdate
};
