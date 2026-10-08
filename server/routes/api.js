const authController = require('../controllers/authController');
const deviceAuthController = require('../controllers/deviceAuthController');
const adminController = require('../controllers/adminController');
const releaseController = require('../controllers/releaseController');
const publicController = require('../controllers/publicController');
const venueBillingController = require('../controllers/admin/venueBillingController');

// Host Domain Controllers
const venueController = require('../controllers/host/venueController');
const menuController = require('../controllers/host/menuController');
const orderController = require('../controllers/host/orderController');
const billingController = require('../controllers/host/billingController');
const venuePromoController = require('../controllers/host/venuePromoController');
const venueAnalyticsController = require('../controllers/host/venueAnalyticsController');

// Advertiser Domain Controllers
const adDiscoveryController = require('../controllers/ad/adDiscoveryController');
const adBookingController = require('../controllers/ad/adBookingController');
const adMediaController = require('../controllers/ad/adMediaController');
const adAnalyticsController = require('../controllers/ad/adAnalyticsController');
const { authenticate, authorize } = require('../utils/authMiddleware');
const { validate } = require('../utils/validate');
const {
  hostApplySchema,
  menuUpdateSchema,
  paymentConfigSchema,
  modeChangeRequestSchema,
  adBookingSchema,
  deviceActivationSchema,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  sendOtpSchema,
  checkAvailabilitySchema,
  resetPasswordSchema,
  switchRoleSchema,
  requestMoreDevicesSchema,
  verifyPasswordSchema,
  createDeviceSchema,
  reviewHostApplicationSchema,
  reviewDeviceRequestSchema,
  reviewAdBookingSchema,
  reviewModeChangeRequestSchema,
  adminResetPasswordSchema
} = require('../utils/zodSchemas');
const { UPLOAD_LIMITS } = require('../config/constants');

function registerRoutes(fastify, options, done) {
  // Webhook and Ping verification support
  fastify.get('/', async (request, reply) => ({ status: 'ok', message: 'DigiAds Backend Service is online' }));
  fastify.post('/', async (request, reply) => ({ status: 'ok', message: 'DigiAds Backend Service is online' }));

  // Health check route
  fastify.get('/health', async (request, reply) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: dbStates[dbState] || 'unknown'
    };
  });

  // Granular rate limit configurations for sensitive endpoints
  const isDevEnv = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';

  // 1. Strict OTP/SMS Rate Limit: 5 req/min in prod (protects SMS gateway budget & wallet)
  const otpRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 30 : 5,
        timeWindow: '1 minute'
      }
    }
  };

  // 2. Device Activation Rate Limit: 10 req/min in prod (prevents ID enumeration/brute-force)
  const activateRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 60 : 10,
        timeWindow: '1 minute'
      }
    }
  };

  // 3. Dedicated Login Rate Limit: 5 req/min in prod (protects CPU from password hash brute-force)
  const loginRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 30 : 5,
        timeWindow: '1 minute'
      }
    }
  };

  // 4. General Auth Rate Limit (register, check-availability): 30 req/min in prod
  const authRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 100 : 30,
        timeWindow: '1 minute'
      }
    }
  };

  // 4. Upload Endpoints Rate Limit: 20 req/min in prod (protects disk I/O, Sharp resizing, transcode queue)
  const uploadRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 60 : 20,
        timeWindow: '1 minute'
      }
    }
  };

  // 5. Payment Webhook Callback Rate Limit: 30 req/min in prod
  const callbackRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 120 : 30,
        timeWindow: '1 minute'
      }
    }
  };

  // 6. OTA Release Download Rate Limit: 20 req/min in prod
  const releaseDownloadRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 60 : 20,
        timeWindow: '1 minute'
      }
    }
  };

  // 7. Device Ads Playlist Rate Limit: 120 req/min in prod
  const deviceAdsRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 300 : 120,
        timeWindow: '1 minute'
      }
    }
  };

  // 8. Public Venue Directory Rate Limit: 100 req/min in prod
  const venueRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 300 : 100,
        timeWindow: '1 minute'
      }
    }
  };

  // 9. OTA Latest Release Check Rate Limit: 60 req/min in prod
  const otaLatestRateLimitConfig = {
    config: {
      rateLimit: {
        max: isDevEnv ? 200 : 60,
        timeWindow: '1 minute'
      }
    }
  };

  // Public Auth Routes
  fastify.post('/auth/check-availability', { preHandler: validate({ body: checkAvailabilitySchema }), ...authRateLimitConfig }, authController.checkAvailability);
  fastify.post('/auth/send-otp', { preHandler: validate({ body: sendOtpSchema }), ...otpRateLimitConfig }, authController.sendOtp);
  fastify.post('/auth/verify-otp', { preHandler: validate({ body: verifyOtpSchema }), ...otpRateLimitConfig }, authController.verifyOtp);
  fastify.post('/auth/register', { preHandler: validate({ body: registerSchema }), ...authRateLimitConfig }, authController.register);
  fastify.post('/auth/login', { preHandler: validate({ body: loginSchema }), ...loginRateLimitConfig }, authController.login);
  fastify.post('/auth/reset-password', { preHandler: validate({ body: resetPasswordSchema }), ...otpRateLimitConfig }, authController.resetPassword);
  fastify.post('/auth/device/activate', { preHandler: validate({ body: deviceActivationSchema }), ...activateRateLimitConfig }, deviceAuthController.activateDevice);
  fastify.get('/auth/device/ads', { preHandler: authenticate, ...deviceAdsRateLimitConfig }, deviceAuthController.getDeviceAds);
  fastify.post('/auth/switch-role', { preHandler: [authenticate, validate({ body: switchRoleSchema })] }, authController.switchRole);

  // PhonePe Webhook callback (public)
  fastify.post('/payments/callback', callbackRateLimitConfig, adBookingController.paymentCallback.bind(adBookingController));
  fastify.get('/payments/callback', async (request, reply) => ({ status: 'ok', message: 'Callback endpoint is online' }));

  // Public Venue Directory & Map Discovery
  fastify.get('/public/venues', venueRateLimitConfig, publicController.getPublicVenues.bind(publicController));

  // Merchant Host Routes
  fastify.register((merchantRoutes, opts, next) => {
    merchantRoutes.addHook('preHandler', authenticate);
    merchantRoutes.addHook('preHandler', authorize(['merchant']));

    merchantRoutes.post('/host/apply', { preHandler: validate({ body: hostApplySchema }) }, venueController.applyForHost.bind(venueController));
    merchantRoutes.get('/host/applications', venueController.getMyApplications.bind(venueController));
    merchantRoutes.put('/host/applications/:applicationId', venueController.updateApplication.bind(venueController));
    merchantRoutes.get('/host/menu', menuController.getMenu.bind(menuController));
    merchantRoutes.post('/host/menu', { preHandler: validate({ body: menuUpdateSchema }) }, menuController.updateMenu.bind(menuController));
    merchantRoutes.post('/host/menu/switch-shift', menuController.switchShift.bind(menuController));
    merchantRoutes.post('/host/menu/upload-image', { bodyLimit: UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, ...uploadRateLimitConfig }, menuController.uploadImage.bind(menuController));
    merchantRoutes.get('/host/devices', venueController.getMyDevices.bind(venueController));
    merchantRoutes.put('/host/payment-config', { preHandler: validate({ body: paymentConfigSchema }) }, billingController.savePaymentConfig.bind(billingController));
    merchantRoutes.get('/host/payment-config', billingController.getPaymentConfig.bind(billingController));
    merchantRoutes.post('/host/payment-config/upload-qr', { bodyLimit: UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, ...uploadRateLimitConfig }, billingController.uploadQrCode.bind(billingController));
    merchantRoutes.get('/host/orders', orderController.getMyOrders.bind(orderController));
    merchantRoutes.post('/host/orders/update-status', orderController.updateOrderStatus.bind(orderController));
    merchantRoutes.post('/host/orders/confirm', orderController.confirmOrder.bind(orderController));
    merchantRoutes.post('/host/orders/close-table', orderController.closeTable.bind(orderController));
    merchantRoutes.post('/host/orders/payment-received', orderController.markPaymentReceived.bind(orderController));
    merchantRoutes.post('/host/orders/takeout', orderController.createTakeoutOrder.bind(orderController));
    merchantRoutes.post('/host/orders/toggle-gst', orderController.toggleGstExemption.bind(orderController));
    merchantRoutes.post('/host/orders/toggle-service-tax', orderController.toggleServiceTaxExemption.bind(orderController));
    merchantRoutes.post('/host/orders/service-waiter', orderController.serviceWaiter.bind(orderController));
    merchantRoutes.post('/host/request-more-devices', { preHandler: validate({ body: requestMoreDevicesSchema }) }, venueController.requestMoreDevices.bind(venueController));
    merchantRoutes.post('/host/verify-password', { preHandler: validate({ body: verifyPasswordSchema }) }, venueController.verifyPassword.bind(venueController));
    merchantRoutes.get('/host/promos', venuePromoController.getHostPromos.bind(venuePromoController));
    merchantRoutes.post('/host/promos/upload-media', { bodyLimit: UPLOAD_LIMITS.DEFAULT_BODY_LIMIT_BYTES, ...uploadRateLimitConfig }, venuePromoController.uploadHostPromoMedia.bind(venuePromoController));
    merchantRoutes.post('/host/promos/stream', venuePromoController.streamHostPromos.bind(venuePromoController));
    merchantRoutes.post('/host/promos/delete-slot', venuePromoController.deleteHostPromoSlot.bind(venuePromoController));
    merchantRoutes.get('/host/analytics', venueAnalyticsController.getVenueAnalytics.bind(venueAnalyticsController));
    merchantRoutes.get('/host/bill-config/:applicationId', billingController.getBillConfig.bind(billingController));
    merchantRoutes.put('/host/bill-config/:applicationId', billingController.updateBillConfig.bind(billingController));
    merchantRoutes.post('/host/bill-config/upload-image', { bodyLimit: UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, ...uploadRateLimitConfig }, billingController.uploadBillImage.bind(billingController));
    merchantRoutes.post('/host/bill-config/delete-image', billingController.deleteBillImage.bind(billingController));
    merchantRoutes.post('/host/applications/request-mode-change', { preHandler: validate({ body: modeChangeRequestSchema }) }, venuePromoController.requestModeChange.bind(venuePromoController));
    merchantRoutes.get('/host/applications/mode-change-status', venuePromoController.getModeChangeStatus.bind(venuePromoController));
    next();
  });

  // Advertiser Ad Routes
  fastify.register((advertiserRoutes, opts, next) => {
    advertiserRoutes.addHook('preHandler', authenticate);
    advertiserRoutes.addHook('preHandler', authorize(['advertiser']));

    advertiserRoutes.get('/ads/locations/states', adDiscoveryController.getStates.bind(adDiscoveryController));
    advertiserRoutes.get('/ads/locations/cities', adDiscoveryController.getCities.bind(adDiscoveryController));
    advertiserRoutes.get('/ads/locations/outlets', adDiscoveryController.getOutlets.bind(adDiscoveryController));
    advertiserRoutes.get('/ads/book', adBookingController.bookAd.bind(adBookingController));
    advertiserRoutes.post('/ads/book', { preHandler: validate({ body: adBookingSchema }) }, adBookingController.bookAd.bind(adBookingController));
    advertiserRoutes.get('/ads/bookings', adBookingController.getMyBookings.bind(adBookingController));
    advertiserRoutes.post('/ads/verify-payment/:bookingId', adBookingController.verifyPayment.bind(adBookingController));
    advertiserRoutes.post('/ads/retry-payment/:bookingId', adBookingController.retryPayment.bind(adBookingController));
    advertiserRoutes.post('/ads/cancel-booking/:bookingId', adBookingController.cancelBooking.bind(adBookingController));
    advertiserRoutes.post('/ads/upload', { bodyLimit: UPLOAD_LIMITS.DEFAULT_BODY_LIMIT_BYTES, ...uploadRateLimitConfig }, adMediaController.uploadVideo.bind(adMediaController));
    advertiserRoutes.post('/ads/upload-image', { bodyLimit: UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, ...uploadRateLimitConfig }, adMediaController.uploadImage.bind(adMediaController));
    next();
  });

  // Common Ad Routes (accessible by authenticated users)
  fastify.register((commonRoutes, opts, next) => {
    commonRoutes.addHook('preHandler', authenticate);
    commonRoutes.get('/ads/rates', adDiscoveryController.getRates.bind(adDiscoveryController));
    commonRoutes.get('/ads/analytics/:bookingId', adAnalyticsController.getCampaignAnalytics.bind(adAnalyticsController));
    next();
  });

  // Admin Routes
  fastify.register((adminRoutes, opts, next) => {
    adminRoutes.addHook('preHandler', authenticate);
    adminRoutes.addHook('preHandler', authorize(['admin']));

    adminRoutes.get('/admin/hosts', adminController.getHostApplications.bind(adminController));
    adminRoutes.post('/admin/hosts/review', { preHandler: validate({ body: reviewHostApplicationSchema }) }, adminController.reviewHostApplication.bind(adminController));
    adminRoutes.put('/admin/hosts/:hostApplicationId/status', adminController.updateHostStatusAndQuotas.bind(adminController));
    adminRoutes.post('/admin/hosts/:hostApplicationId/reset-quota', adminController.resetHostQuotaNow.bind(adminController));
    adminRoutes.put('/admin/hosts/:hostApplicationId/watermark', adminController.updateVenueWatermark.bind(adminController));
    
    // Venue Subscription Billing & Invoicing
    adminRoutes.post('/admin/venues/:id/invoices/preview', venueBillingController.previewInvoice.bind(venueBillingController));
    adminRoutes.post('/admin/venues/:id/invoices', venueBillingController.createInvoice.bind(venueBillingController));
    adminRoutes.get('/admin/venues/:id/invoices', venueBillingController.getVenueInvoices.bind(venueBillingController));
    adminRoutes.put('/admin/invoices/:id/status', venueBillingController.updateInvoiceStatus.bind(venueBillingController));

    adminRoutes.get('/admin/bookings', adminController.getAdBookings.bind(adminController));
    adminRoutes.post('/admin/bookings/review', { preHandler: validate({ body: reviewAdBookingSchema }) }, adminController.reviewAdBooking.bind(adminController));
    adminRoutes.put('/admin/bookings/:bookingId/category', adminController.updateBookingCategory.bind(adminController));
    adminRoutes.put('/admin/bookings/revoke/:bookingId', adminController.revokeBooking.bind(adminController));
    adminRoutes.post('/admin/bookings/:bookingId/refund', adminController.refundBooking.bind(adminController));
    adminRoutes.get('/admin/rates', adminController.getAdsRates.bind(adminController));
    adminRoutes.post('/admin/rates', adminController.manageAdsRates.bind(adminController));
    adminRoutes.put('/admin/rates/:rateId', adminController.manageAdsRates.bind(adminController));
    adminRoutes.delete('/admin/rates/:rateId', adminController.deleteAdsRate.bind(adminController));
    adminRoutes.get('/admin/stats', adminController.getStats.bind(adminController));
    adminRoutes.get('/admin/devices', adminController.getDevices.bind(adminController));
    adminRoutes.post('/admin/devices', { preHandler: validate({ body: createDeviceSchema }) }, adminController.createDevice.bind(adminController));
    adminRoutes.post('/admin/devices/deploy', { preHandler: validate({ body: createDeviceSchema }) }, adminController.createDevice.bind(adminController));
    adminRoutes.get('/admin/users', adminController.getUsers.bind(adminController));
    adminRoutes.put('/admin/users/:userId', adminController.updateUser.bind(adminController));
    adminRoutes.post('/admin/users/:userId/reset-password', { preHandler: validate({ body: adminResetPasswordSchema }) }, adminController.adminResetPassword.bind(adminController));
    adminRoutes.delete('/admin/users/:userId', adminController.deleteUser.bind(adminController));

    adminRoutes.get('/admin/device-requests', adminController.getDeviceRequests.bind(adminController));
    adminRoutes.post('/admin/device-requests/review', { preHandler: validate({ body: reviewDeviceRequestSchema }) }, adminController.reviewDeviceRequest.bind(adminController));
    adminRoutes.get('/admin/mode-change-requests', adminController.getModeChangeRequests.bind(adminController));
    adminRoutes.put('/admin/mode-change-requests/:requestId/review', { preHandler: validate({ body: reviewModeChangeRequestSchema }) }, adminController.reviewModeChangeRequest.bind(adminController));

    // Admin Platform Ads & Global Fallback Ads
    adminRoutes.get('/admin/platform-ads', adminController.getPlatformAds.bind(adminController));
    adminRoutes.post('/admin/platform-ads/upload', { bodyLimit: 52428800, ...uploadRateLimitConfig }, adminController.uploadPlatformAdMedia.bind(adminController));
    adminRoutes.post('/admin/platform-ads', adminController.createPlatformAd.bind(adminController));
    adminRoutes.patch('/admin/platform-ads/:id', adminController.updatePlatformAd.bind(adminController));
    adminRoutes.delete('/admin/platform-ads/:id', adminController.deletePlatformAd.bind(adminController));

    // Admin Universal In-Venue Promo Durations
    adminRoutes.get('/admin/settings/promo-durations', adminController.getPromoDurations.bind(adminController));
    adminRoutes.post('/admin/settings/promo-durations', adminController.updatePromoDurations.bind(adminController));

    // Admin Commercial Advertiser Image Ad Duration
    adminRoutes.get('/admin/settings/advertiser-image-duration', adminController.getAdvertiserImageDuration.bind(adminController));
    adminRoutes.post('/admin/settings/advertiser-image-duration', adminController.updateAdvertiserImageDuration.bind(adminController));

    // Admin Release Management
    adminRoutes.get('/admin/releases', releaseController.listReleases.bind(releaseController));
    adminRoutes.post('/admin/releases/upload', { bodyLimit: 104857600, ...uploadRateLimitConfig }, releaseController.uploadRelease.bind(releaseController));
    adminRoutes.put('/admin/releases/:releaseId/status', releaseController.toggleReleaseStatus.bind(releaseController));
    next();
  });

  // Public/Device OTA Release Endpoints
  fastify.get('/releases/latest', otaLatestRateLimitConfig, releaseController.getLatestRelease.bind(releaseController));
  fastify.get('/releases/download/:releaseId', releaseDownloadRateLimitConfig, releaseController.downloadRelease.bind(releaseController));

  done();
}

module.exports = registerRoutes;
