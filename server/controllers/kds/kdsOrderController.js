const Order = require('../../models/Order');
const { notifyDeviceSessionUpdate } = require('../host/orderHelper');

/**
 * KDS Order Controller
 * Manages active kitchen prep tickets, FIFO aging queues, and status progression.
 * Line cap: < 250 lines (Universal Modular Architecture §13).
 */
class KdsOrderController {
  /**
   * Fetch active kitchen tickets for the authorized venue
   * GET /api/v1/kds/orders
   */
  async getKitchenOrders(req, res) {
    const venueId = req.user?.hostApplicationId;
    if (!venueId) {
      return res.status(403).send({ success: false, message: 'Missing venue authorization' });
    }

    try {
      // Fetch active food tickets (omits empty waiter-only calls via items.0 check)
      const orders = await Order.find({
        hostApplicationId: venueId,
        orderStatus: { $in: ['placed', 'confirmed', 'cooking'] },
        'items.0': { $exists: true }
      })
        .select('orderId tableNumber orderType orderStatus items createdAt confirmedAt specialInstructions')
        .sort({ createdAt: 1 }) // FIFO: Oldest orders at the top/front
        .lean();

      return res.status(200).send({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (err) {
      req.log.error({ err }, 'getKitchenOrders error');
      return res.status(500).send({ success: false, message: 'Failed to fetch kitchen orders' });
    }
  }

  /**
   * Kitchen staff transitions order status ('cooking' or 'served')
   * PATCH /api/v1/kds/orders/:orderId/status
   */
  async updateKitchenOrderStatus(req, res) {
    const venueId = req.user?.hostApplicationId;
    const { orderId } = req.params;
    const { orderStatus } = req.body || {};

    if (!['cooking', 'served', 'cancelled'].includes(orderStatus)) {
      return res.status(400).send({
        success: false,
        message: 'Invalid status. Kitchen can only transition to "cooking", "served", or "cancelled"'
      });
    }

    try {
      const order = await Order.findOne({ orderId, hostApplicationId: venueId });
      if (!order) {
        return res.status(404).send({ success: false, message: 'Order not found for this venue' });
      }

      if (orderStatus === 'cancelled') {
        if (order.orderStatus === 'cooking' || order.orderStatus === 'served') {
          return res.status(400).send({
            success: false,
            message: 'Orders in preparation or served cannot be rejected or cancelled'
          });
        }

        order.orderStatus = 'cancelled';
        order.tableStatus = 'completed';
        order.paymentStatus = 'cancelled';

        // Synchronize across customer tablet kiosk & merchant POS
        notifyDeviceSessionUpdate(order);
        await Order.deleteOne({ _id: order._id });

        // Broadcast cancellation to all other kitchen displays
        if (global.sendToKitchen) {
          global.sendToKitchen(venueId.toString(), {
            event: 'order_update',
            data: { orderId, orderStatus: 'cancelled' }
          });
        }

        return res.status(200).send({
          success: true,
          message: 'Order rejected and cancelled',
          data: { orderId, orderStatus: 'cancelled' }
        });
      }

      order.orderStatus = orderStatus;
      if (orderStatus === 'cooking' && !order.cookingAt) {
        order.cookingAt = new Date();
      }
      if (orderStatus === 'served') {
        order.servedAt = new Date();
      }

      await order.save();

      // Synchronize across customer tablet kiosk & merchant POS
      notifyDeviceSessionUpdate(order);

      // Broadcast update to all other connected kitchen screens for this venue
      if (global.sendToKitchen) {
        global.sendToKitchen(venueId.toString(), {
          event: 'order_update',
          data: order
        });
      }

      return res.status(200).send({
        success: true,
        message: `Order status updated to ${orderStatus}`,
        data: {
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          tableNumber: order.tableNumber
        }
      });
    } catch (err) {
      req.log.error({ err }, 'updateKitchenOrderStatus error');
      return res.status(500).send({ success: false, message: 'Failed to update order status' });
    }
  }

  /**
   * Fetch completed/served order history for KDS recall view (zero financial data)
   * Strictly secured & scoped to a single 24-hour day to prevent DB exhaustion.
   * GET /api/v1/kds/orders/recall
   */
  async getRecalledOrders(req, res) {
    const venueId = req.user?.hostApplicationId;
    if (!venueId) {
      return res.status(403).send({ success: false, message: 'Missing venue authorization' });
    }

    try {
      const { search, date } = req.query || {};

      // Secure date boundary: Default to today's local 24-hour window to protect DB performance (§13.1, §22)
      const targetDate = date ? new Date(date) : new Date();
      if (isNaN(targetDate.getTime())) {
        return res.status(400).send({ success: false, message: 'Invalid date parameter' });
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const filter = {
        hostApplicationId: venueId,
        $or: [
          { orderStatus: 'served' },
          { tableStatus: 'completed' }
        ],
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        'items.0': { $exists: true }
      };

      if (search && search.trim()) {
        const term = search.trim().slice(0, 50);
        const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$and = [
          {
            $or: [
              { orderId: { $regex: safeTerm, $options: 'i' } },
              { tableNumber: { $regex: safeTerm, $options: 'i' } },
              { 'items.name': { $regex: safeTerm, $options: 'i' } }
            ]
          }
        ];
      }

      // Strict projection omitting all monetary fields (§22), capped to 100 tickets to prevent DB exhaustion
      const orders = await Order.find(filter)
        .select('orderId tableNumber orderType orderStatus items createdAt servedAt updatedAt specialInstructions')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).send({
        success: true,
        count: orders.length,
        date: startOfDay.toISOString().split('T')[0],
        data: orders
      });
    } catch (err) {
      req.log.error({ err }, 'getRecalledOrders error');
      return res.status(500).send({ success: false, message: 'Failed to fetch recalled orders' });
    }
  }
}

module.exports = new KdsOrderController();
