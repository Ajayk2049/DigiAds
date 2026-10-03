const { v4: uuidv4 } = require('uuid');
const Order = require('../../models/Order');
const HostApplication = require('../../models/HostApplication');
const {
  calculateOrderTotals,
  applyTaxExemption,
  buildOrderSearchPipeline,
  notifyDeviceSessionUpdate
} = require('./orderHelper');

class OrderController {
  /**
   * Get all orders for merchant's venues (with multi-field search aggregation & date filter)
   */
  async getMyOrders(req, res) {
    try {
      const { hostApplicationId, startDate, endDate, search, limit, page, offset: reqOffset, paymentStatus, tableStatus } = req.query || {};
      let appIds = [];

      if (hostApplicationId) {
        const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid, status: 'approved' }).select('_id').lean();
        if (app) appIds = [app._id];
      } else {
        const apps = await HostApplication.find({ userId: req.user.uid, status: 'approved' }).select('_id').lean();
        appIds = apps.map(app => app._id);
      }

      const matchStage = { hostApplicationId: { $in: appIds } };
      if (paymentStatus) {
        matchStage.paymentStatus = paymentStatus;
      }
      if (tableStatus) {
        matchStage.tableStatus = tableStatus;
      }
      const parsedLimit = parseInt(limit, 10);
      const queryLimit = !isNaN(parsedLimit) ? Math.min(200, Math.max(1, parsedLimit)) : 40;
      const pageNum = parseInt(page, 10) || 1;
      const skipOffset = reqOffset !== undefined
        ? Math.max(0, parseInt(reqOffset, 10))
        : Math.max(0, (pageNum - 1) * queryLimit);

      if (search && search.trim()) {
        const pipeline = buildOrderSearchPipeline(matchStage, search, queryLimit + skipOffset);
        const allMatching = await Order.aggregate(pipeline);
        const totalCount = allMatching.length;
        const pagedOrders = allMatching.slice(skipOffset, skipOffset + queryLimit);

        res.header('X-Total-Count', totalCount);
        return res.status(200).send({
          success: true,
          data: pagedOrders,
          pagination: {
            page: pageNum,
            limit: queryLimit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / queryLimit)
          }
        });
      }

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchStage.createdAt.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchStage.createdAt.$lte = end;
        }
      }

      const totalCount = await Order.countDocuments(matchStage);
      const orders = await Order.find(matchStage)
        .sort({ createdAt: -1 })
        .skip(skipOffset)
        .limit(queryLimit)
        .lean();

      res.header('X-Total-Count', totalCount);
      return res.status(200).send({
        success: true,
        data: orders,
        pagination: {
          page: pageNum,
          limit: queryLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / queryLimit)
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'getMyOrders Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch orders: ' + error.message });
    }
  }

  /**
   * Admin updates order status
   */
  async updateOrderStatus(req, res) {
    const { orderId, orderStatus } = req.body || {};
    if (!orderId || !orderStatus) {
      return res.status(400).send({ success: false, message: 'orderId and orderStatus are required' });
    }

    const validStatuses = ['placed', 'confirmed', 'cooking', 'served', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).send({ success: false, message: 'Invalid orderStatus' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      if (order.orderStatus === 'served' && orderStatus !== 'served') {
        return res.status(400).send({ success: false, message: 'Delivered orders cannot revert to a previous status' });
      }
      if (order.orderStatus === 'cooking' && (orderStatus === 'placed' || orderStatus === 'cancelled')) {
        return res.status(400).send({ success: false, message: 'Preparing orders cannot revert to placed or be cancelled' });
      }

      order.orderStatus = orderStatus;
      if (orderStatus === 'confirmed') {
        order.confirmedAt = new Date();
      }
      if (orderStatus === 'cancelled') {
        order.tableStatus = 'completed';
        const isEmpty = (!order.items || order.items.length === 0) && (order.totalAmount || 0) === 0;
        if (isEmpty) {
          order.paymentStatus = 'cancelled';
          notifyDeviceSessionUpdate(order);
          await Order.deleteOne({ _id: order._id });
          return res.status(200).send({ success: true, message: 'Empty order cancelled and session purged', data: { orderId, tableStatus: 'completed', orderStatus: 'cancelled' } });
        }
      } else if (order.tableStatus === 'close_table' || order.tableStatus === 'completed') {
        order.tableStatus = 'active';
      }

      await order.save();
      notifyDeviceSessionUpdate(order);
      return res.status(200).send({ success: true, message: `Order status updated to ${orderStatus}`, data: order });
    } catch (error) {
      req.log.error({ err: error }, 'updateOrderStatus Error');
      return res.status(500).send({ success: false, message: 'Failed to update order status' });
    }
  }

  /**
   * Admin confirms an order
   */
  async confirmOrder(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      order.orderStatus = 'confirmed';
      order.confirmedAt = new Date();
      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: 'Order confirmed', data: order });
    } catch (error) {
      req.log.error({ err: error }, 'confirmOrder Error');
      return res.status(500).send({ success: false, message: 'Failed to confirm order' });
    }
  }

  /**
   * Admin initiates close table — tablet will show QR code, ads will stop
   */
  async closeTable(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const app = await HostApplication.findById(order.hostApplicationId);
      if (!app) return res.status(404).send({ success: false, message: 'Order not found' });

      const isEmpty = (!order.items || order.items.length === 0) && (order.totalAmount || 0) === 0;
      if (isEmpty) {
        order.tableStatus = 'completed';
        order.orderStatus = 'cancelled';
        order.paymentStatus = 'cancelled';
        order.completedAt = new Date();

        notifyDeviceSessionUpdate(order);
        await Order.deleteOne({ _id: order._id });

        return res.status(200).send({ success: true, message: 'Table cleared and empty session dismissed', data: { orderId, tableStatus: 'completed', orderStatus: 'cancelled' } });
      }

      if (!app.upiId) {
        return res.status(400).send({ success: false, message: 'No UPI ID configured. Set up payment config first.' });
      }

      let subtotalPaise = 0;
      for (const item of order.items || []) {
        subtotalPaise += (item.price || 0) * (item.quantity || 1);
      }
      order.subtotalAmount = subtotalPaise;

      const calc = calculateOrderTotals({
        subtotalPaise,
        billConfig: app.billConfig,
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
      order.enableAutoRoundOff = calc.enableAutoRoundOff;
      order.billConfigSnapshot = app.billConfig || {};
      order.totalAmount = calc.finalTotalPaise;
      order.tableStatus = 'close_table';

      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: 'Table closed — showing payment QR to customer', data: order });
    } catch (error) {
      req.log.error({ err: error }, 'closeTable Error');
      return res.status(500).send({ success: false, message: 'Failed to close table' });
    }
  }

  /**
   * Admin marks payment as received — resets tablet to ad mode
   */
  async markPaymentReceived(req, res) {
    const { orderId, paymentType } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      order.tableStatus = 'completed';
      order.paymentStatus = 'completed';
      if (paymentType && ['CASH', 'UPI'].includes(String(paymentType).toUpperCase())) {
        order.paymentType = String(paymentType).toUpperCase();
      }
      order.paidAt = new Date();
      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({ success: true, message: 'Payment received — session completed', data: order });
    } catch (error) {
      req.log.error({ err: error }, 'markPaymentReceived Error');
      return res.status(500).send({ success: false, message: 'Failed to mark payment received' });
    }
  }

  /**
   * Admin creates a Takeout / Pickup Order
   */
  async createTakeoutOrder(req, res) {
    const { hostApplicationId, items } = req.body || {};
    if (!hostApplicationId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({ success: false, message: 'hostApplicationId and items array are required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      let orderId;
      let exists = true;
      let retryCount = 0;
      while (exists && retryCount < 10) {
        orderId = `ORD_${uuidv4().replace(/-/g, '').slice(0, 7).toUpperCase()}`;
        const count = await Order.countDocuments({ orderId });
        if (count === 0) exists = false;
        retryCount++;
      }

      const subtotalPaise = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      const calc = calculateOrderTotals({ subtotalPaise, billConfig: app.billConfig });

      const order = new Order({
        orderId,
        merchantId: req.user.uid,
        hostApplicationId,
        deviceId: `COUNTER_POS_${hostApplicationId}`,
        tableNumber: 'TAKEOUT',
        items: items.map(item => ({
          itemId: String(item.itemId || item._id || uuidv4().slice(0, 8)),
          name: item.name,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          isPacked: Boolean(item.isPacked || true)
        })),
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
        billConfigSnapshot: app.billConfig || {},
        totalAmount: calc.finalTotalPaise,
        orderType: 'TAKEOUT',
        paymentType: 'PENDING',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        tableStatus: 'active'
      });

      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(201).send({
        success: true,
        message: 'Pickup order created successfully',
        data: order
      });
    } catch (error) {
      req.log.error({ err: error }, 'createTakeoutOrder Error');
      return res.status(500).send({ success: false, message: 'Failed to create pickup order: ' + error.message });
    }
  }

  /**
   * Admin toggles GST exemption on an active order
   */
  async toggleGstExemption(req, res) {
    const { orderId, removeGst, isGstExempt } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const isExempt = isGstExempt !== undefined ? Boolean(isGstExempt) : Boolean(removeGst);
      applyTaxExemption(order, { isGstExempt: isExempt });

      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({
        success: true,
        message: isExempt ? 'GST removed from order' : 'GST restored on order',
        data: order
      });
    } catch (error) {
      req.log.error({ err: error }, 'toggleGstExemption Error');
      return res.status(500).send({ success: false, message: 'Failed to update order GST: ' + error.message });
    }
  }

  /**
   * Admin toggles Service Tax exemption on an active order
   */
  async toggleServiceTaxExemption(req, res) {
    const { orderId, removeServiceTax, isServiceTaxExempt } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Order not found' });

      const isExempt = isServiceTaxExempt !== undefined ? Boolean(isServiceTaxExempt) : Boolean(removeServiceTax);
      applyTaxExemption(order, { isServiceTaxExempt: isExempt });

      await order.save();
      notifyDeviceSessionUpdate(order);

      return res.status(200).send({
        success: true,
        message: isExempt ? 'Service Tax removed from order' : 'Service Tax restored on order',
        data: order
      });
    } catch (error) {
      req.log.error({ err: error }, 'toggleServiceTaxExemption Error');
      return res.status(500).send({ success: false, message: 'Failed to update Service Tax: ' + error.message });
    }
  }

  /**
   * Service waiter call - transitions waiterCallStatus to serviced
   */
  async serviceWaiter(req, res) {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).send({ success: false, message: 'orderId is required' });
    }

    try {
      const order = await Order.findOne({ orderId, merchantId: req.user.uid });
      if (!order) return res.status(404).send({ success: false, message: 'Session/Order not found' });

      order.waiterCallStatus = 'serviced';
      await order.save();
      notifyDeviceSessionUpdate(order);

      if (global.sendToMerchant) {
        global.sendToMerchant(req.user.uid, {
          event: 'waiter_serviced',
          data: {
            orderId: order.orderId,
            waiterCallStatus: order.waiterCallStatus
          }
        });
      }

      return res.status(200).send({ success: true, message: 'Waiter call marked as serviced', data: order });
    } catch (error) {
      req.log.error({ err: error }, 'serviceWaiter Error');
      return res.status(500).send({ success: false, message: 'Failed to service waiter request' });
    }
  }
}

module.exports = new OrderController();
