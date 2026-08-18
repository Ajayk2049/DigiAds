const mongoose = require('mongoose');

const PlatformAdSchema = new mongoose.Schema({
  adId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['fallback', 'platform'],
    required: true,
    default: 'fallback',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  mediaType: {
    type: String,
    enum: ['video', 'image'],
    required: true,
    default: 'video'
  },
  mediaUrl: {
    type: String,
    required: true,
    trim: true
  },
  mediaUrls: {
    type: [String],
    default: []
  },
  targetDeviceType: {
    type: String,
    enum: ['all', 'tablet', 'screen'],
    default: 'all',
    index: true
  },
  targetVenueIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    index: true
  }],
  durationSeconds: {
    type: Number,
    default: 30
  },
  frequency: {
    type: String,
    default: 'continuous'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  transcodeStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlatformAd', PlatformAdSchema);
