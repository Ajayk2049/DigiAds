const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceType: {
    type: String,
    enum: ['tablet', 'screen'],
    required: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
    index: true
  },
  hardwareId: {
    type: String,
    default: null,
    index: true
  },
  kioskPasswordHash: {
    type: String,
    default: null
  },
  isActivated: {
    type: Boolean,
    default: false,
    index: true
  },
  lastHeartbeat: {
    type: Date,
    default: null
  },
  sessionStart: {
    type: Date,
    default: null
  },
  lastKnownAppVersion: {
    type: String,
    default: null
  },
  lastKnownVersionCode: {
    type: Number,
    default: null
  },
  updateStatus: {
    type: String,
    enum: ['none', 'downloading', 'pending_11pm', 'installed', 'failed'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// High-performance compound indexes for device fleet management & live status checks
DeviceSchema.index({ hostApplicationId: 1, status: 1 });
DeviceSchema.index({ hostApplicationId: 1, isActivated: 1 });
DeviceSchema.index({ status: 1, lastHeartbeat: 1 });
DeviceSchema.index({ isActivated: 1, status: 1, lastHeartbeat: 1 });

module.exports = mongoose.model('Device', DeviceSchema);


