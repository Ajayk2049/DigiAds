const mongoose = require('mongoose');

const VenuePromoSchema = new mongoose.Schema({
  promoId: {
    type: String,
    unique: true,
    sparse: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    index: true
  },
  slotType: {
    type: String,
    enum: ['video', 'image', 'screen', 'screen_video', 'screen_image'],
    required: true
  },
  slotIndex: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  displayDurationSeconds: {
    type: Number,
    default: 15
  },
  isStreaming: {
    type: Boolean,
    default: true
  },
  transcodeStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed',
    index: true
  },
  transcodedMediaUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

VenuePromoSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// High-performance compound indexes for device promo loading and live streaming
VenuePromoSchema.index({ hostApplicationId: 1, slotType: 1, slotIndex: 1 });
VenuePromoSchema.index({ hostApplicationId: 1, isStreaming: 1 });
// Auto TTL index: automatically purges abandoned pending promos after 24 hours
VenuePromoSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { transcodeStatus: 'pending' } });

module.exports = mongoose.model('VenuePromo', VenuePromoSchema);
