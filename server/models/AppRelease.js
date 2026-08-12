const mongoose = require('mongoose');

const AppReleaseSchema = new mongoose.Schema({
  appType: {
    type: String,
    enum: ['TABLET_APP', 'SCREEN_APP'],
    required: true,
  },
  versionName: {
    type: String,
    required: true,
  },
  versionCode: {
    type: Number,
    required: true,
  },
  sha256: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  downloadPath: {
    type: String,
    required: true,
  },
  targetHostApplicationIds: [String], // Empty array means targets all venues
  isMandatory: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  releaseNotes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: String,
    default: 'admin',
  },
}, { timestamps: true });

AppReleaseSchema.index({ appType: 1, statusCode: 1, versionCode: -1 });

module.exports = mongoose.model('AppRelease', AppReleaseSchema);
