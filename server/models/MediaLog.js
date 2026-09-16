const mongoose = require('mongoose');

const MediaLogSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true
  },
  finalizedFilename: {
    type: String,
    default: null
  },
  outputPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto TTL index: automatically deletes media log entries after 30 days
MediaLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('MediaLog', MediaLogSchema);
