/**
 * Backward-compatible delegating facade for Advertiser operations.
 * Underlying logic decomposed into specialized domain controllers under ./ad/
 */

const adDiscoveryController = require('./ad/adDiscoveryController');
const adBookingController = require('./ad/adBookingController');
const adMediaController = require('./ad/adMediaController');
const adAnalyticsController = require('./ad/adAnalyticsController');
const {
  reconcilePendingTransactions,
  stopTransactionPolling
} = require('./ad/adBookingHelper');

class AdController {
  // Discovery
  getStates(...args) { return adDiscoveryController.getStates(...args); }
  getCities(...args) { return adDiscoveryController.getCities(...args); }
  getOutlets(...args) { return adDiscoveryController.getOutlets(...args); }
  getRates(...args) { return adDiscoveryController.getRates(...args); }

  // Bookings & Payments
  bookAd(...args) { return adBookingController.bookAd(...args); }
  paymentCallback(...args) { return adBookingController.paymentCallback(...args); }
  getMyBookings(...args) { return adBookingController.getMyBookings(...args); }
  verifyPayment(...args) { return adBookingController.verifyPayment(...args); }
  cancelBooking(...args) { return adBookingController.cancelBooking(...args); }
  retryPayment(...args) { return adBookingController.retryPayment(...args); }

  // Media
  uploadVideo(...args) { return adMediaController.uploadVideo(...args); }
  uploadImage(...args) { return adMediaController.uploadImage(...args); }

  // Analytics
  getCampaignAnalytics(...args) { return adAnalyticsController.getCampaignAnalytics(...args); }

  // Maintenance & Lifecycle
  reconcilePendingTransactions(...args) { return reconcilePendingTransactions(...args); }
  stopTransactionPolling(...args) { return stopTransactionPolling(...args); }
}

const adControllerInstance = new AdController();
module.exports = adControllerInstance;
