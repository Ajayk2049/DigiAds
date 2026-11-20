const mongoose = require('mongoose');

/**
 * KdsPendingAuth Schema
 * Holds temporary login authorization requests from kitchen displays.
 * Automatically pruned after 10 minutes via MongoDB TTL index (§13.1).
 */
const KdsPendingAuthSchema = new mongoose.Schema({
  requestId: {
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
  venueName: {
    type: String,
    default: ''
  },
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  stationName: {
    type: String,
    default: 'Kitchen Display'
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  token: {
    type: String,
    default: null
  },
  stationId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-expire after 600 seconds (10 minutes)
  }
});

module.exports = mongoose.model('KdsPendingAuth', KdsPendingAuthSchema);
