/**
 * Backward-compatible delegating facade for Host/Merchant operations.
 * Underlying logic decomposed into specialized domain controllers under ./host/
 */

const venueController = require('./host/venueController');
const menuController = require('./host/menuController');
const orderController = require('./host/orderController');
const billingController = require('./host/billingController');
const venuePromoController = require('./host/venuePromoController');
const venueAnalyticsController = require('./host/venueAnalyticsController');
const { notifyDeviceSessionUpdate } = require('./host/orderHelper');

class HostController {
  // Venue & Onboarding
  applyForHost(...args) { return venueController.applyForHost(...args); }
  getMyApplications(...args) { return venueController.getMyApplications(...args); }
  updateApplication(...args) { return venueController.updateApplication(...args); }
  getMyDevices(...args) { return venueController.getMyDevices(...args); }
  requestMoreDevices(...args) { return venueController.requestMoreDevices(...args); }
  verifyPassword(...args) { return venueController.verifyPassword(...args); }

  // Menu Management
  getMenu(...args) { return menuController.getMenu(...args); }
  updateMenu(...args) { return menuController.updateMenu(...args); }
  switchShift(...args) { return menuController.switchShift(...args); }
  uploadImage(...args) { return menuController.uploadImage(...args); }

  // Orders & POS
  getMyOrders(...args) { return orderController.getMyOrders(...args); }
  updateOrderStatus(...args) { return orderController.updateOrderStatus(...args); }
  confirmOrder(...args) { return orderController.confirmOrder(...args); }
  closeTable(...args) { return orderController.closeTable(...args); }
  markPaymentReceived(...args) { return orderController.markPaymentReceived(...args); }
  createTakeoutOrder(...args) { return orderController.createTakeoutOrder(...args); }
  toggleGstExemption(...args) { return orderController.toggleGstExemption(...args); }
  toggleServiceTaxExemption(...args) { return orderController.toggleServiceTaxExemption(...args); }
  serviceWaiter(...args) { return orderController.serviceWaiter(...args); }

  // Billing & QR
  savePaymentConfig(...args) { return billingController.savePaymentConfig(...args); }
  getPaymentConfig(...args) { return billingController.getPaymentConfig(...args); }
  uploadQrCode(...args) { return billingController.uploadQrCode(...args); }
  getBillConfig(...args) { return billingController.getBillConfig(...args); }
  updateBillConfig(...args) { return billingController.updateBillConfig(...args); }
  uploadBillImage(...args) { return billingController.uploadBillImage(...args); }
  deleteBillImage(...args) { return billingController.deleteBillImage(...args); }

  // Promos & Mode Changes
  check2AMQuotaReset(...args) { return venuePromoController.check2AMQuotaReset(...args); }
  getHostPromos(...args) { return venuePromoController.getHostPromos(...args); }
  uploadHostPromoMedia(...args) { return venuePromoController.uploadHostPromoMedia(...args); }
  streamHostPromos(...args) { return venuePromoController.streamHostPromos(...args); }
  deleteHostPromoSlot(...args) { return venuePromoController.deleteHostPromoSlot(...args); }
  requestModeChange(...args) { return venuePromoController.requestModeChange(...args); }
  getModeChangeStatus(...args) { return venuePromoController.getModeChangeStatus(...args); }

  // Analytics
  getVenueAnalytics(...args) { return venueAnalyticsController.getVenueAnalytics(...args); }
}

const hostControllerInstance = new HostController();
hostControllerInstance.notifyDeviceSessionUpdate = notifyDeviceSessionUpdate;

module.exports = hostControllerInstance;
module.exports.notifyDeviceSessionUpdate = notifyDeviceSessionUpdate;
