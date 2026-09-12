const mongoose = require('mongoose');

const AdImpressionSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    index: true
  },
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  deviceId: {
    type: String,
    default: null
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    default: null
  },
  durationSeconds: {
    type: Number,
    default: 15
  },
  interactiveClicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// High-performance compound indexes for ad impressions, advertiser analytics, and host payout reporting
AdImpressionSchema.index({ bookingId: 1, createdAt: -1 });
AdImpressionSchema.index({ advertiserId: 1, createdAt: -1 });
AdImpressionSchema.index({ hostApplicationId: 1, createdAt: -1 });

module.exports = mongoose.model('AdImpression', AdImpressionSchema);

