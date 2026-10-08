const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true }, // Rate in Rupees
  amount: { type: Number, required: true } // Amount in Rupees
}, { _id: false });

const VenueInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  outletName: {
    type: String,
    required: true
  },

  // Billing Period
  cycleStartDate: {
    type: Date,
    required: true
  },
  cycleEndDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },

  // Plan Configuration
  billingModel: {
    type: String,
    enum: ['device_based', 'order_flat', 'order_percentage'],
    required: true
  },
  adMode: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },

  // Rate parameters applied
  rateConfig: {
    tabletRate: { type: Number, default: 0 },
    screenRate: { type: Number, default: 0 },
    flatPerOrderRate: { type: Number, default: 0 },
    orderPercentageRate: { type: Number, default: 0 }
  },

  // Measured counts from database
  metrics: {
    tabletCount: { type: Number, default: 0 },
    screenCount: { type: Number, default: 0 },
    totalOrdersCount: { type: Number, default: 0 },
    totalOrdersValuePaise: { type: Number, default: 0 }
  },

  items: [InvoiceItemSchema],

  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // UPI Payment Details
  upiDetails: {
    upiId: { type: String, required: true },
    payeeName: { type: String, required: true },
    qrString: { type: String, required: true }
  },

  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'cancelled'],
    default: 'sent',
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('VenueInvoice', VenueInvoiceSchema);
