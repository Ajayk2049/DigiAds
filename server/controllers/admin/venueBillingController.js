const mongoose = require('mongoose');
const HostApplication = require('../../models/HostApplication');
const Order = require('../../models/Order');
const VenueInvoice = require('../../models/VenueInvoice');

class VenueBillingController {
  /**
   * Helper: Calculate line items, metrics, and totals
   */
  async _calculateBillingData(venue, { cycleStartDate, cycleEndDate, billingModel, rateConfig }) {
    const start = new Date(cycleStartDate);
    const end = new Date(cycleEndDate);
    end.setHours(23, 59, 59, 999);

    // Aggregate orders for the venue during the billing period
    const orderStats = await Order.aggregate([
      {
        $match: {
          hostApplicationId: venue._id,
          createdAt: { $gte: start, $lte: end },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalValuePaise: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrdersCount = orderStats[0]?.count || 0;
    const totalOrdersValuePaise = orderStats[0]?.totalValuePaise || 0;
    const totalOrdersValueRupees = Math.round(totalOrdersValuePaise / 100);

    const tabletCount = venue.tabletQuantity || 0;
    const screenCount = venue.screenQuantity || 0;

    const items = [];
    let subtotal = 0;

    const tabletRate = Number(rateConfig?.tabletRate) || 0;
    const screenRate = Number(rateConfig?.screenRate) || 0;
    const flatPerOrderRate = Number(rateConfig?.flatPerOrderRate) || 0;
    const orderPercentageRate = Number(rateConfig?.orderPercentageRate) || 0;

    const ordersBreakdown = [];
    if (billingModel === 'device_based') {
      if (tabletCount > 0 && tabletRate > 0) {
        const amount = tabletCount * tabletRate;
        items.push({
          description: `Tabletop Ordering Tablets Rental (${tabletCount} devices)`,
          quantity: tabletCount,
          rate: tabletRate,
          amount
        });
        subtotal += amount;
      }
      if (screenCount > 0 && screenRate > 0) {
        const amount = screenCount * screenRate;
        items.push({
          description: `Landscape Ad Billboard Screens Rental (${screenCount} screens)`,
          quantity: screenCount,
          rate: screenRate,
          amount
        });
        subtotal += amount;
      }
    } else if (billingModel === 'order_flat') {
      const orders = await Order.find({
        hostApplicationId: venue._id,
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: 'cancelled' }
      }).sort({ createdAt: -1 }).lean();

      for (const ord of orders) {
        const valRupees = Math.round((ord.totalAmount || 0) / 100);
        ordersBreakdown.push({
          orderId: ord.orderId,
          tableNumber: ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? 'Takeout' : `Table ${ord.tableNumber}`,
          orderDate: ord.createdAt,
          orderValueRupees: valRupees,
          commissionAmount: flatPerOrderRate
        });
      }

      const amount = Math.round(totalOrdersCount * flatPerOrderRate);
      items.push({
        description: `Service Subscription — ${totalOrdersCount} completed orders @ ₹${flatPerOrderRate.toFixed(2)}/order`,
        quantity: totalOrdersCount,
        rate: flatPerOrderRate,
        amount
      });
      subtotal += amount;
    } else if (billingModel === 'order_percentage') {
      const orders = await Order.find({
        hostApplicationId: venue._id,
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: 'cancelled' }
      }).sort({ createdAt: -1 }).lean();

      let calculatedCommSum = 0;
      for (const ord of orders) {
        const valRupees = Math.round((ord.totalAmount || 0) / 100);
        const comm = Math.round((valRupees * orderPercentageRate) / 100 * 100) / 100;
        calculatedCommSum += comm;
        ordersBreakdown.push({
          orderId: ord.orderId,
          tableNumber: ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? 'Takeout' : `Table ${ord.tableNumber}`,
          orderDate: ord.createdAt,
          orderValueRupees: valRupees,
          commissionAmount: comm
        });
      }

      const amount = Math.round(calculatedCommSum) || Math.round((totalOrdersValueRupees * orderPercentageRate) / 100);
      items.push({
        description: `Service Subscription — ${orderPercentageRate}% on ₹${totalOrdersValueRupees.toLocaleString('en-IN')} gross orders volume (${totalOrdersCount} orders)`,
        quantity: 1,
        rate: orderPercentageRate,
        amount
      });
      subtotal += amount;
    }

    const taxAmount = 0; // Configurable GST if needed
    const totalAmount = subtotal + taxAmount;

    return {
      metrics: {
        tabletCount,
        screenCount,
        totalOrdersCount,
        totalOrdersValuePaise
      },
      ordersBreakdown,
      items,
      subtotal,
      taxAmount,
      totalAmount
    };
  }

  /**
   * POST /api/v1/admin/venues/:id/invoices/preview
   */
  async previewInvoice(req, res) {
    try {
      const venue = await HostApplication.findById(req.params.id);
      if (!venue) {
        return res.status(404).send({ error: 'Venue not found' });
      }

      const { cycleStartDate, cycleEndDate, billingModel, rateConfig } = req.body;
      if (!cycleStartDate || !cycleEndDate || !billingModel) {
        return res.status(400).send({ error: 'Missing required billing cycle parameters' });
      }

      const calculation = await this._calculateBillingData(venue, {
        cycleStartDate,
        cycleEndDate,
        billingModel,
        rateConfig
      });

      return res.send({
        success: true,
        venue: {
          id: venue._id,
          outletName: venue.outletName,
          category: venue.category,
          adMode: venue.adMode,
          city: venue.city
        },
        ...calculation
      });
    } catch (err) {
      req.log.error(err, 'Failed to preview invoice');
      return res.status(500).send({ error: err.message });
    }
  }

  /**
   * POST /api/v1/admin/venues/:id/invoices
   */
  async createInvoice(req, res) {
    try {
      const venue = await HostApplication.findById(req.params.id);
      if (!venue) {
        return res.status(404).send({ error: 'Venue not found' });
      }

      const {
        cycleStartDate,
        cycleEndDate,
        dueDate,
        billingModel,
        rateConfig,
        upiId,
        payeeName,
        notes
      } = req.body;

      if (!cycleStartDate || !cycleEndDate || !billingModel || !upiId) {
        return res.status(400).send({ error: 'Missing cycle dates, plan model, or UPI ID' });
      }

      const calculation = await this._calculateBillingData(venue, {
        cycleStartDate,
        cycleEndDate,
        billingModel,
        rateConfig
      });

      // Generate distinctive venue invoice number: DA-SUB-<VENUE_CODE>-YYYYMM-<ALPHA>
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      const cleanName = (venue.outletName || 'VENUE').replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const words = cleanName.split(/\s+/).filter(Boolean);
      let venueCode = '';
      if (words.length >= 2) {
        venueCode = words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
        if (venueCode.length < 3) {
          venueCode = cleanName.replace(/\s+/g, '').toUpperCase().slice(0, 5);
        }
      } else {
        venueCode = cleanName.toUpperCase().slice(0, 5);
      }
      if (!venueCode) venueCode = 'VEN';

      const uniqueAlpha = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `DA-SUB-${venueCode}-${yearMonth}-${uniqueAlpha}`;

      const finalDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const cleanUpiId = String(upiId).trim();
      const cleanPayeeName = String(payeeName || 'AIBotInk Private Limited').trim();
      const qrString = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanPayeeName)}&am=${calculation.totalAmount.toFixed(2)}&tn=${encodeURIComponent('Bill ' + invoiceNumber)}&cu=INR`;

      const invoice = new VenueInvoice({
        invoiceNumber,
        hostApplicationId: venue._id,
        merchantId: venue.userId,
        outletName: venue.outletName,
        cycleStartDate: new Date(cycleStartDate),
        cycleEndDate: new Date(cycleEndDate),
        dueDate: finalDueDate,
        billingModel,
        adMode: venue.adMode,
        rateConfig: {
          tabletRate: Number(rateConfig?.tabletRate) || 0,
          screenRate: Number(rateConfig?.screenRate) || 0,
          flatPerOrderRate: Number(rateConfig?.flatPerOrderRate) || 0,
          orderPercentageRate: Number(rateConfig?.orderPercentageRate) || 0
        },
        metrics: calculation.metrics,
        ordersBreakdown: calculation.ordersBreakdown || [],
        items: calculation.items,
        subtotal: calculation.subtotal,
        taxAmount: calculation.taxAmount,
        totalAmount: calculation.totalAmount,
        upiDetails: {
          upiId: cleanUpiId,
          payeeName: cleanPayeeName,
          qrString
        },
        status: 'issued',
        notes: notes || ''
      });

      await invoice.save();

      return res.status(201).send({
        success: true,
        invoice
      });
    } catch (err) {
      req.log.error(err, 'Failed to create venue invoice');
      return res.status(500).send({ error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/venues/:id/invoices
   */
  async getVenueInvoices(req, res) {
    try {
      const invoices = await VenueInvoice.find({ hostApplicationId: req.params.id })
        .sort({ createdAt: -1 })
        .lean();

      return res.send({
        success: true,
        invoices
      });
    } catch (err) {
      req.log.error(err, 'Failed to fetch venue invoices');
      return res.status(500).send({ error: err.message });
    }
  }

  /**
   * GET /api/v1/merchant/venues/:id/invoices
   */
  async getMerchantVenueInvoices(req, res) {
    try {
      const venue = await HostApplication.findById(req.params.id);
      if (!venue) {
        return res.status(404).send({ error: 'Venue not found' });
      }

      const uid = String(req.user?.uid || req.user?.id || req.user?._id || '');
      if (String(venue.userId) !== uid && req.user?.role !== 'admin') {
        return res.status(403).send({ error: 'Unauthorized to view invoices for this venue' });
      }

      const invoices = await VenueInvoice.find({ hostApplicationId: req.params.id })
        .sort({ createdAt: -1 })
        .lean();

      return res.send({
        success: true,
        invoices
      });
    } catch (err) {
      req.log.error(err, 'Failed to fetch merchant venue invoices');
      return res.status(500).send({ error: err.message });
    }
  }

  /**
   * PUT /api/v1/admin/invoices/:id/status
   */
  async updateInvoiceStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['draft', 'issued', 'sent', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).send({ error: 'Invalid invoice status' });
      }

      const updateData = { status };
      if (status === 'paid') {
        updateData.paidAt = new Date();
      } else {
        updateData.paidAt = null;
      }

      const invoice = await VenueInvoice.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      );

      if (!invoice) {
        return res.status(404).send({ error: 'Invoice not found' });
      }

      return res.send({
        success: true,
        invoice
      });
    } catch (err) {
      req.log.error(err, 'Failed to update invoice status');
      return res.status(500).send({ error: err.message });
    }
  }
}

module.exports = new VenueBillingController();
