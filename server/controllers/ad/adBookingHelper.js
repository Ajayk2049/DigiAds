const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AdBooking = require('../../models/AdBooking');
const PhonePeTransaction = require('../../models/PhonePeTransaction');
const Order = require('../../models/Order');
const phonePeService = require('../../services/phonePeService');

const resolveMediaUrl = (mediaUrl, host) => {
  if (!mediaUrl) return '';
  const urls = mediaUrl.split(',').map(s => s.trim()).filter(Boolean);
  const resolvedList = urls.map(urlStr => {
    if (urlStr.includes('/uploads/')) {
      const parts = urlStr.split('/uploads/');
      return `http://${host}/uploads/${parts[1]}`;
    }
    if (urlStr.startsWith('http')) return urlStr;
    const cleanUrl = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
    return `http://${host}${cleanUrl}`;
  });
  return resolvedList.join(', ');
};

const deleteMediaFile = async (mediaUrl) => {
  if (!mediaUrl) return;
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  const urlList = mediaUrl.split(',').map(s => s.trim()).filter(Boolean);

  for (const singleUrl of urlList) {
    const urlParts = singleUrl.split('/uploads/');
    if (urlParts.length > 1) {
      const relativePath = urlParts[1];
      const localFilePath = path.resolve(uploadsDir, relativePath);

      if (localFilePath.startsWith(uploadsDir)) {
        await fs.promises.unlink(localFilePath).catch(() => {});
      } else {
        console.warn(`[Security Warning] Blocked attempt to delete path outside uploads directory: ${localFilePath}`);
      }
    }
  }
};

const activePollTimers = new Map();

const stopTransactionPolling = (bookingId) => {
  if (activePollTimers.has(bookingId)) {
    const timer = activePollTimers.get(bookingId);
    clearTimeout(timer);
    activePollTimers.delete(bookingId);
  }
};

const pollTransactionStatus = (bookingId, transactionId, initialAttempt = 0) => {
  if (!bookingId || !transactionId) return;

  if (activePollTimers.has(bookingId) && initialAttempt === 0) {
    return;
  }
  if (activePollTimers.size >= 50 && !activePollTimers.has(bookingId)) {
    console.warn(`[Auto-Polling] Max capacity reached (50). Booking ${bookingId} will be settled via webhook.`);
    return;
  }

  const maxAttempts = 32;
  const pollIntervalMs = 15000;
  let attempts = initialAttempt;

  const runPollStep = async () => {
    attempts++;
    try {
      const booking = await AdBooking.findOne({ bookingId });
      if (!booking || booking.paymentStatus !== 'pending') {
        activePollTimers.delete(bookingId);
        return;
      }

      const checkResult = await phonePeService.checkTransactionStatus(transactionId);
      const mappedStatus = checkResult.status;

      if (mappedStatus === 'COMPLETED') {
        await settleTransactionSuccess({
          transactionId,
          paymentId: checkResult.raw?.payload?.transactionId || checkResult.raw?.payload?.providerReferenceId,
          rawPayload: checkResult.raw || { autoPolled: true }
        });
        activePollTimers.delete(bookingId);
        return;
      } else if (mappedStatus === 'FAILED') {
        await settleTransactionFailure({
          transactionId,
          reason: 'GATEWAY_FAILED',
          rawPayload: checkResult.raw
        });
        activePollTimers.delete(bookingId);
        return;
      } else {
        if (attempts >= maxAttempts) {
          await settleTransactionFailure({
            transactionId,
            reason: 'POLLING_TIMEOUT',
            rawPayload: { timeout: true }
          });
          activePollTimers.delete(bookingId);
          return;
        }

        const timer = setTimeout(runPollStep, pollIntervalMs);
        if (typeof timer.unref === 'function') timer.unref();
        activePollTimers.set(bookingId, timer);
      }
    } catch (err) {
      console.error(`[Auto-Polling] Error for ${bookingId}:`, err.message);
      if (attempts < maxAttempts) {
        const timer = setTimeout(runPollStep, pollIntervalMs);
        if (typeof timer.unref === 'function') timer.unref();
        activePollTimers.set(bookingId, timer);
      } else {
        activePollTimers.delete(bookingId);
      }
    }
  };

  const timer = setTimeout(runPollStep, pollIntervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  activePollTimers.set(bookingId, timer);
};

async function settleTransactionSuccess({ transactionId, paymentId, rawPayload, responseCode = 'PAYMENT_SUCCESS' }) {
  await PhonePeTransaction.updateOne(
    { transactionId },
    {
      status: 'completed',
      responseCode,
      rawCallbackPayload: rawPayload
    }
  );

  const resolvedPaymentId = paymentId || 'PAY_' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
  const booking = await AdBooking.findOneAndUpdate(
    { transactionId },
    { paymentStatus: 'completed', approvalStatus: 'pending', paymentId: resolvedPaymentId },
    { new: true }
  );

  if (booking) {
    stopTransactionPolling(booking.bookingId);
    if (global.broadcastToAdmins) {
      global.broadcastToAdmins('new_campaign', { bookingId: booking.bookingId });
    }
  }

  await Order.updateOne({ transactionId }, { paymentStatus: 'completed' });
  return booking;
}

async function settleTransactionFailure({ transactionId, reason = 'PAYMENT_ERROR', rawPayload }) {
  await PhonePeTransaction.updateOne(
    { transactionId },
    {
      status: 'failed',
      responseCode: reason,
      rawCallbackPayload: rawPayload
    }
  );

  const booking = await AdBooking.findOne({ transactionId });
  if (booking) {
    stopTransactionPolling(booking.bookingId);
    if (booking.mediaUrl) {
      await deleteMediaFile(booking.mediaUrl);
    }
    booking.paymentStatus = 'failed';
    await booking.save();
  }

  await Order.updateOne({ transactionId }, { paymentStatus: 'failed' });
  return booking;
}

async function generateBookingId() {
  let bookingId;
  let exists = true;
  let retries = 0;
  while (exists && retries < 10) {
    bookingId = `BK_${uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const count = await AdBooking.countDocuments({ bookingId });
    if (count === 0) exists = false;
    retries++;
  }
  return bookingId;
}

async function generateUniqueCustomId(Model, fieldName, prefix = 'AD_PAY_') {
  let uniqueId;
  let exists = true;
  let retries = 0;
  while (exists && retries < 10) {
    uniqueId = `${prefix}${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const count = await Model.countDocuments({ [fieldName]: uniqueId });
    if (count === 0) exists = false;
    retries++;
  }
  return uniqueId;
}

async function validateBookingRequestAndRate({
  outletId,
  deviceType,
  mediaType,
  maxVideoLengthSeconds,
  quantity,
  adDurationDays,
  frequency
}) {
  const HostApplication = require('../../models/HostApplication');
  const AdsRates = require('../../models/AdsRates');

  const resolvedMediaType = (mediaType || 'video').toLowerCase();
  const resolvedMaxVideoLength = parseInt(maxVideoLengthSeconds, 10) === 60 ? 60 : 30;

  const outlet = await HostApplication.findById(outletId);
  if (!outlet || outlet.status !== 'approved') {
    return { error: 'Selected outlet is not approved or not found' };
  }

  const bookingQty = parseInt(quantity, 10);
  if (deviceType === 'tablet') {
    if (!outlet.requestTablet) {
      return { error: 'Selected outlet does not support Tablet display' };
    }
    if (bookingQty > outlet.tabletQuantity) {
      return { error: `Requested quantity exceeds tablet availability (${outlet.tabletQuantity})` };
    }
  } else if (deviceType === 'screen') {
    if (!outlet.requestScreen) {
      return { error: 'Selected outlet does not support Screen display' };
    }
    if (bookingQty > outlet.screenQuantity) {
      return { error: `Requested quantity exceeds screen availability (${outlet.screenQuantity})` };
    }
  } else {
    return { error: 'Invalid deviceType requested' };
  }

  const rateQuery = {
    deviceType,
    mediaType: resolvedMediaType,
    durationDays: parseInt(adDurationDays, 10),
    frequency
  };
  if (resolvedMediaType === 'video') {
    rateQuery.maxVideoLengthSeconds = resolvedMaxVideoLength;
  }

  const rate = await AdsRates.findOne(rateQuery);
  if (!rate) {
    return { error: 'No active pricing rate plan configured by admin for this selection.' };
  }

  const totalAmount = rate.pricingType === 'whole_venue' ? rate.amount : (rate.amount * bookingQty);
  return {
    outlet,
    rate,
    totalAmount,
    bookingQty,
    resolvedMediaType,
    resolvedMaxVideoLength
  };
}

async function initiateCheckoutSession({ transactionId, orderId, userId, amount, phone, redirectUrl, rawPayload }) {
  const phonePeTxn = new PhonePeTransaction({
    transactionId,
    orderId,
    userId,
    amount,
    transactionType: 'payment',
    status: 'pending',
    rawCallbackPayload: rawPayload
  });
  await phonePeTxn.save();

  try {
    const res = await phonePeService.initiatePayment({
      transactionId,
      userId,
      amount,
      redirectUrl,
      phone
    });
    return res;
  } catch (err) {
    await PhonePeTransaction.deleteOne({ transactionId });
    throw err;
  }
}

let isReconciling = false;
async function reconcilePendingTransactions() {
  if (isReconciling) return;
  isReconciling = true;
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const filter = {
      paymentStatus: 'pending',
      transactionId: { $exists: true, $ne: null },
      createdAt: { $gte: twoHoursAgo }
    };

    const totalPending = await AdBooking.countDocuments(filter);
    if (totalPending > 50) {
      console.warn(`[Reconciler] Total pending bookings (${totalPending}) exceeds batch limit 50.`);
    }

    const pendingBookings = await AdBooking.find(filter)
      .select('bookingId transactionId')
      .sort({ createdAt: -1 })
      .limit(50);

    if (pendingBookings.length > 0) {
      console.log(`[Reconciler] Reconciling ${pendingBookings.length} pending booking(s)...`);
      for (const b of pendingBookings) {
        if (!activePollTimers.has(b.bookingId)) {
          pollTransactionStatus(b.bookingId, b.transactionId);
        }
      }
    }
  } catch (err) {
    console.warn('[Reconciler] Error reconciling pending transactions:', err.message);
  } finally {
    isReconciling = false;
  }
}

module.exports = {
  resolveMediaUrl,
  deleteMediaFile,
  activePollTimers,
  stopTransactionPolling,
  pollTransactionStatus,
  settleTransactionSuccess,
  settleTransactionFailure,
  generateBookingId,
  generateUniqueCustomId,
  validateBookingRequestAndRate,
  initiateCheckoutSession,
  reconcilePendingTransactions
};
