const mongoose = require('mongoose');

const SMSRequestLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto TTL index to delete entries 1 hour after creation
  }
});

SMSRequestLogSchema.index({ phone: 1, requestedAt: -1 });
SMSRequestLogSchema.index({ ip: 1, requestedAt: -1 });

module.exports = mongoose.model('SMSRequestLog', SMSRequestLogSchema);
