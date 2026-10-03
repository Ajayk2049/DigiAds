const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const HostApplication = require('../../models/HostApplication');
const AdsRates = require('../../models/AdsRates');
const AdBooking = require('../../models/AdBooking');
const PhonePeTransaction = require('../../models/PhonePeTransaction');
const phonePeService = require('../../services/phonePeService');
const config = require('../../config/config');
const {
  resolveMediaUrl,
  deleteMediaFile,
  stopTransactionPolling,
  pollTransactionStatus,
  settleTransactionSuccess,
  settleTransactionFailure,
  generateBookingId,
  generateUniqueCustomId,
  validateBookingRequestAndRate,
  initiateCheckoutSession
} = require('./adBookingHelper');

class AdBookingController {
  /**
   * Initiate an Ad Booking and get PhonePe Checkout URL
   */
  async bookAd(req, res) {
    const {
      outletId,
      deviceType,
      mediaType,
      maxVideoLengthSeconds,
      quantity,
      adDurationDays,
      frequency,
      mediaUrl,
      adCategory,
      redirectUrl
    } = req.body || {};

    if (!outletId || !deviceType || !quantity || !adDurationDays || !frequency || !redirectUrl) {
      return res.status(400).send({ success: false, message: 'All required booking fields and redirectUrl must be provided' });
    }

    try {
      const validated = await validateBookingRequestAndRate({
        outletId,
        deviceType,
        mediaType,
        maxVideoLengthSeconds,
        quantity,
        adDurationDays,
        frequency
      });

      if (validated.error) {
        return res.status(400).send({ success: false, message: validated.error });
      }

      const { rate, totalAmount, bookingQty, resolvedMediaType, resolvedMaxVideoLength } = validated;
      const transactionId = await generateUniqueCustomId(PhonePeTransaction, 'transactionId', 'AD_PAY_');
      const orderId = `ORD_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const bookingId = await generateBookingId();

      if (!redirectUrl || typeof redirectUrl !== 'string' || (!redirectUrl.startsWith('/') && !redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://'))) {
        return res.status(400).send({ success: false, message: 'Invalid redirectUrl scheme.' });
      }

      const finalRedirectUrl = redirectUrl.includes('?')
        ? `${redirectUrl}&verifyBookingId=${bookingId}`
        : `${redirectUrl}?verifyBookingId=${bookingId}`;

      const booking = new AdBooking({
        bookingId,
        advertiserId: req.user.uid,
        outletId,
        deviceType,
        mediaType: resolvedMediaType,
        maxVideoLengthSeconds: resolvedMaxVideoLength,
        quantity: bookingQty,
        adDurationDays: parseInt(adDurationDays, 10),
        frequency,
        mediaUrl: mediaUrl || '',
        adCategory: adCategory || '',
        rateId: rate._id,
        amount: totalAmount,
        transactionId,
        orderId,
        paymentStatus: 'pending',
        approvalStatus: 'pending'
      });
      await booking.save();

      let initiateResult;
      try {
        initiateResult = await initiateCheckoutSession({
          transactionId,
          orderId,
          userId: req.user.uid,
          amount: totalAmount,
          phone: req.user.phone,
          redirectUrl: finalRedirectUrl,
          rawPayload: { bookingId }
        });
      } catch (gatewayErr) {
        await AdBooking.deleteOne({ _id: booking._id });
        throw gatewayErr;
      }

      pollTransactionStatus(booking.bookingId, transactionId);

      return res.status(200).send({
        success: true,
        message: 'Ad booking initiated successfully',
        data: {
          bookingId: booking.bookingId,
          transactionId,
          orderId,
          amount: totalAmount,
          paymentUrl: initiateResult.paymentUrl
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'bookAd Error');
      return res.status(500).send({ success: false, message: error.message || 'Failed to initiate ad booking' });
    }
  }

  /**
   * PhonePe Webhook callback
   */
  async paymentCallback(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).send({ success: false, message: 'Authorization header missing' });
    }

    try {
      const isAuthentic = phonePeService.verifyWebhook(authHeader);
      if (!isAuthentic) {
        return res.status(401).send({ success: false, message: 'Webhook Basic Auth verification failed' });
      }

      const decodedPayload = req.body;
      if (!decodedPayload || (!decodedPayload.data && !decodedPayload.payload)) {
        return res.status(400).send({ success: false, message: 'Invalid callback payload structure' });
      }

      let success = decodedPayload.success;
      let code = decodedPayload.code;
      let data = decodedPayload.data || decodedPayload.payload;

      if (data === 'WEBHOOK_VALIDATION_SUCCESS') {
        return res.status(200).send({ success: true, message: 'Webhook registered successfully' });
      }

      if (decodedPayload.payload) {
        const state = decodedPayload.payload.state;
        const responseCode = decodedPayload.payload.responseCode;
        success = (state === 'COMPLETED' && responseCode === 'SUCCESS');
        code = state === 'COMPLETED' ? 'PAYMENT_SUCCESS' : (state === 'FAILED' ? 'PAYMENT_ERROR' : 'PAYMENT_PENDING');
      }

      const merchantTransactionId = data.merchantTransactionId || data.merchantOrderId;
      const amount = data.amount;

      const txn = await PhonePeTransaction.findOne({ transactionId: merchantTransactionId });
      if (!txn) {
        return res.status(404).send({ success: false, message: 'Transaction record not found' });
      }
      if (txn.status !== 'pending') {
        return res.status(200).send({ success: true, message: 'Already processed' });
      }

      if (txn.amount !== amount) {
        req.log.warn({ expected: txn.amount, received: amount }, 'Webhook amount mismatch');
        await settleTransactionFailure({
          transactionId: merchantTransactionId,
          reason: 'AMOUNT_MISMATCH',
          rawPayload: decodedPayload
        });
        return res.status(200).send({ success: true, message: 'Amount mismatch handled' });
      }

      const stateVal = data.state;
      const responseCodeVal = data.responseCode;
      const isCompleted = (success && code === 'PAYMENT_SUCCESS') || (stateVal === 'COMPLETED' && responseCodeVal === 'SUCCESS');
      const isPending = ['PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_INITIATED', 'SUBMITTED'].includes(code) ||
        ['PENDING', 'SUBMITTED'].includes(stateVal);

      if (isCompleted) {
        const paymentId = data.transactionId || data.providerReferenceId || null;
        await settleTransactionSuccess({
          transactionId: merchantTransactionId,
          paymentId,
          rawPayload: decodedPayload,
          responseCode: code || responseCodeVal || 'PAYMENT_SUCCESS'
        });
      } else if (isPending) {
        txn.status = 'pending';
        txn.responseCode = code || responseCodeVal || 'PAYMENT_PENDING';
        txn.rawCallbackPayload = decodedPayload;
        await txn.save();
      } else {
        await settleTransactionFailure({
          transactionId: merchantTransactionId,
          reason: code || responseCodeVal || 'PAYMENT_ERROR',
          rawPayload: decodedPayload
        });
      }

      return res.status(200).send({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      req.log.error({ err: error }, 'paymentCallback Error');
      return res.status(500).send({ success: false, message: 'Internal server error processing callback' });
    }
  }

  /**
   * Get list of ad campaigns booked by advertiser
   */
  async getMyBookings(req, res) {
    try {
      const bookings = await AdBooking.find({ advertiserId: req.user.uid })
        .populate('outletId', 'outletName state city')
        .sort({ createdAt: -1 });

      const resolved = bookings.map(b => {
        const doc = b.toObject();
        if (doc.mediaUrl) doc.mediaUrl = resolveMediaUrl(doc.mediaUrl, req.headers.host);
        return doc;
      });
      return res.status(200).send({ success: true, data: resolved });
    } catch (error) {
      req.log.error({ err: error }, 'getMyBookings Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch bookings' });
    }
  }

  /**
   * Verify PhonePe payment status on return from gateway
   */
  async verifyPayment(req, res) {
    const { bookingId } = req.params || {};
    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'bookingId parameter is required' });
    }

    try {
      const isMongoId = mongoose.isValidObjectId(bookingId);
      const query = isMongoId ? { $or: [{ _id: bookingId }, { bookingId }] } : { bookingId };
      const booking = await AdBooking.findOne(query);
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found' });
      }

      if (req.user && req.user.role !== 'admin') {
        const bookingOwnerId = booking.userId || booking.advertiserId;
        if (bookingOwnerId && String(bookingOwnerId) !== String(req.user.uid)) {
          return res.status(403).send({ success: false, message: 'Unauthorized' });
        }
      }

      if (booking.paymentStatus === 'completed') {
        return res.status(200).send({ success: true, message: 'Payment already completed', data: booking });
      }

      let checkResult;
      try {
        checkResult = await phonePeService.checkTransactionStatus(booking.transactionId);
      } catch (err) {
        return res.status(500).send({ success: false, message: 'Failed to verify payment with gateway: ' + err.message });
      }

      if (checkResult.status === 'COMPLETED') {
        const paymentId = checkResult.raw?.payload?.transactionId || checkResult.raw?.payload?.providerReferenceId;
        const updated = await settleTransactionSuccess({
          transactionId: booking.transactionId,
          paymentId,
          rawPayload: checkResult.raw || { manualVerify: true }
        });
        return res.status(200).send({ success: true, message: 'Payment verified successfully and marked as completed.', data: updated || booking });
      }
      if (checkResult.status === 'FAILED') {
        await settleTransactionFailure({ transactionId: booking.transactionId, reason: 'GATEWAY_FAILED', rawPayload: checkResult.raw });
        return res.status(200).send({ success: true, message: 'Payment verification failed.', data: { paymentStatus: 'failed', approvalStatus: booking.approvalStatus } });
      }
      return res.status(200).send({ success: true, message: 'Payment is still pending verification.', data: { paymentStatus: 'pending', approvalStatus: booking.approvalStatus } });
    } catch (error) {
      req.log.error({ err: error }, 'verifyPayment Error');
      return res.status(500).send({ success: false, message: 'Internal server error during verification' });
    }
  }

  /**
   * Cancel an unpaid pending ad booking
   */
  async cancelBooking(req, res) {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'Booking ID is required' });
    }

    try {
      const isMongoId = bookingId.match(/^[0-9a-fA-F]{24}$/);
      const query = isMongoId ? { _id: bookingId } : { bookingId };
      query.advertiserId = req.user.uid;

      const booking = await AdBooking.findOne(query);
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found or unauthorized' });
      }
      if (booking.paymentStatus === 'completed') {
        return res.status(400).send({ success: false, message: 'Cannot cancel a paid booking.' });
      }

      stopTransactionPolling(booking.bookingId);
      if (booking.mediaUrl) {
        await deleteMediaFile(booking.mediaUrl);
      }

      await AdBooking.deleteOne({ _id: booking._id });
      if (booking.transactionId) {
        await PhonePeTransaction.deleteOne({ transactionId: booking.transactionId });
      }

      return res.status(200).send({ success: true, message: 'Pending booking cancelled successfully' });
    } catch (error) {
      req.log.error({ err: error }, 'cancelBooking Error');
      return res.status(500).send({ success: false, message: 'Failed to cancel booking' });
    }
  }

  /**
   * Retry payment checkout for an unpaid pending ad booking
   */
  async retryPayment(req, res) {
    const { bookingId } = req.params;
    const { redirectUrl } = req.body || {};
    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'Booking ID is required' });
    }

    try {
      const isMongoId = bookingId.match(/^[0-9a-fA-F]{24}$/);
      const query = isMongoId ? { _id: bookingId } : { bookingId };
      query.advertiserId = req.user.uid;

      const booking = await AdBooking.findOne(query);
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Booking not found or unauthorized' });
      }
      if (booking.paymentStatus === 'completed') {
        return res.status(400).send({ success: false, message: 'This booking has already been paid.' });
      }

      stopTransactionPolling(booking.bookingId);

      const newTransactionId = await generateUniqueCustomId(PhonePeTransaction, 'transactionId', 'AD_PAY_');
      const resolvedOrderId = booking.orderId || `ORD_AD_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      booking.transactionId = newTransactionId;
      booking.orderId = resolvedOrderId;
      await booking.save();

      const userRedirectUrl = redirectUrl || `${config.merchantRedirectUrl.replace('/merchant/orders', '/advertiser')}`;
      const finalRedirectUrl = userRedirectUrl.includes('?')
        ? `${userRedirectUrl}&verifyBookingId=${booking.bookingId}`
        : `${userRedirectUrl}?verifyBookingId=${booking.bookingId}`;

      const initiateResult = await initiateCheckoutSession({
        transactionId: newTransactionId,
        orderId: resolvedOrderId,
        userId: req.user.uid,
        amount: booking.amount,
        phone: req.user.phone,
        redirectUrl: finalRedirectUrl,
        rawPayload: { bookingId: booking.bookingId, retry: true }
      });

      pollTransactionStatus(booking.bookingId, newTransactionId);

      return res.status(200).send({
        success: true,
        message: 'Payment session re-initiated',
        data: {
          bookingId: booking.bookingId,
          transactionId: newTransactionId,
          paymentUrl: initiateResult.paymentUrl
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'retryPayment Error');
      return res.status(500).send({ success: false, message: error.message || 'Failed to retry payment' });
    }
  }
}

module.exports = new AdBookingController();
