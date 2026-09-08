const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true, // in paise
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  gst: {
    type: Number,
    default: null
  },
  otherCharges: {
    type: Number,
    default: null
  },
  otherChargesType: {
    type: String,
    enum: ['percentage', 'rupees'],
    default: 'percentage'
  },
  shifts: {
    type: [String],
    default: []
  },
  isAllShifts: {
    type: Boolean,
    default: false
  },
  customizations: {
    type: [{
      title: { type: String, required: true },
      pricingType: { type: String, enum: ['addon', 'direct'], default: 'addon' },
      isMultiple: { type: Boolean, default: false },
      isRequired: { type: Boolean, default: false },
      options: [{
        name: { type: String, required: true },
        extraPrice: { type: Number, default: 0 }, // in paise
        isDefault: { type: Boolean, default: false }
      }]
    }],
    default: []
  }
});

const MenuSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hostApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostApplication',
    required: true,
    unique: true,
    index: true
  },
  activeShift: {
    type: String,
    default: 'Breakfast'
  },
  shifts: {
    type: [String],
    default: ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
  },
  items: [MenuItemSchema],
  categories: {
    type: [mongoose.Schema.Types.Mixed],
    default: [
      { name: 'Starters', icon: 'fastfood' },
      { name: 'Main Course', icon: 'dinner' },
      { name: 'Dessert', icon: 'cookie' },
      { name: 'Beverages', icon: 'coffee' }
    ]
  },
  defaultGst: {
    type: Number,
    default: 0
  },
  defaultOtherCharges: {
    type: Number,
    default: 0
  },
  defaultOtherChargesType: {
    type: String,
    enum: ['percentage', 'rupees'],
    default: 'percentage'
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

MenuSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Menu', MenuSchema);
