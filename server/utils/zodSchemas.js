const { z } = require('zod');

const deviceActivationSchema = z.object({
  deviceId: z.string({
    required_error: 'Device ID is required'
  }).min(1, 'Device ID cannot be empty'),
  hardwareId: z.string({
    required_error: 'Hardware ID is required'
  }).min(1, 'Hardware ID cannot be empty'),
  deviceType: z.enum(['tablet', 'screen'], {
    errorMap: () => ({ message: 'Device type must be tablet or screen' })
  }),
  kioskPassword: z.string().optional().refine((val) => {
    // If it's a tablet, password is required and must be 4-12 characters
    // We validate this in custom logic based on deviceType or refine
    return true;
  })
}).refine((data) => {
  if (data.deviceType === 'tablet') {
    return typeof data.kioskPassword === 'string' && data.kioskPassword.length >= 4 && data.kioskPassword.length <= 12;
  }
  return true;
}, {
  message: 'Bypass password is required for tablets and must be 4-12 characters long',
  path: ['kioskPassword']
});

const registerSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
  password: z.string({ required_error: 'Password is required' })
    .min(8, 'Password must be 8-12 characters')
    .max(12, 'Password must be 8-12 characters')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'Password must contain both letters and numbers'
    }),
  role: z.enum(['merchant', 'advertiser'], {
    errorMap: () => ({ message: 'Role must be merchant or advertiser' })
  })
});

const loginSchema = z.object({
  phone: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  selectedRole: z.enum(['merchant', 'advertiser', 'admin']).optional()
}).refine((data) => data.phone || data.identifier, {
  message: 'Identifier (email or phone) is required',
  path: ['identifier']
});

const verifyOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits')
});

const sendOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  type: z.enum(['register', 'reset']).optional()
});

const checkAvailabilitySchema = z.object({
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal(''))
}).refine((data) => (data.phone && data.phone.trim().length > 0) || (data.email && data.email.trim().length > 0), {
  message: 'Either phone or email must be provided to check availability',
  path: ['phone']
});

const resetPasswordSchema = z.object({
  phone: z.string({ required_error: 'Phone is required' }).min(1, 'Phone is required'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
  password: z.string({ required_error: 'Password is required' })
    .min(8, 'Password must be 8-12 characters')
    .max(12, 'Password must be 8-12 characters')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'Password must contain both letters and numbers'
    })
});

const hostApplySchema = z.object({
  outletName: z.string({ required_error: 'Outlet name is required' }).trim().min(2, 'Outlet name must be at least 2 characters'),
  outletDescription: z.string({ required_error: 'Outlet description is required' }).trim().min(2, 'Outlet description is required'),
  doorNo: z.string({ required_error: 'Door/Shop number is required' }).trim().min(1, 'Door number is required'),
  street: z.string({ required_error: 'Street is required' }).trim().min(1, 'Street is required'),
  city: z.string({ required_error: 'City is required' }).trim().min(1, 'City is required'),
  state: z.string({ required_error: 'State is required' }).trim().min(1, 'State is required'),
  zipCode: z.string({ required_error: 'PIN/Zip code is required' }).trim().regex(/^\d{6}$/, 'PIN Code must be a 6-digit number'),
  contactPerson: z.string({ required_error: 'Contact person is required' }).trim().min(2, 'Contact person must be at least 2 characters'),
  phone: z.string({ required_error: 'Phone number is required' }).trim().min(10, 'Valid phone number is required'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
  requestTablet: z.boolean().optional().default(false),
  tabletQuantity: z.union([z.number(), z.string()]).optional().default('1'),
  requestScreen: z.boolean().optional().default(false),
  screenQuantity: z.union([z.number(), z.string()]).optional().default('1'),
  adMode: z.enum(['open', 'closed']).optional().default('open'),
  allowOpenAds: z.boolean().optional().default(true),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional()
}).refine(data => data.requestTablet || data.requestScreen, {
  message: 'You must select at least one device type (Tablet or Screen)',
  path: ['requestTablet']
});

const menuItemSchema = z.object({
  itemId: z.string({ required_error: 'itemId is required' }).min(1, 'itemId cannot be empty'),
  name: z.string({ required_error: 'Item name is required' }).trim().min(1, 'Item name cannot be empty'),
  price: z.number({ required_error: 'Price is required' }).min(0, 'Price must be a positive number in paise'),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty'),
  description: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  isAvailable: z.boolean().optional().default(true),
  shifts: z.array(z.string()).optional()
});

const menuUpdateSchema = z.object({
  hostApplicationId: z.string({ required_error: 'hostApplicationId is required' }).min(1, 'hostApplicationId is required'),
  items: z.array(menuItemSchema, { required_error: 'Items must be an array' }),
  categories: z.array(z.any()).optional(),
  shifts: z.array(z.string()).optional(),
  activeShift: z.string().optional(),
  shift: z.string().optional(),
  defaultGst: z.number().min(0).max(100).optional(),
  defaultOtherCharges: z.number().min(0).optional(),
  defaultOtherChargesType: z.enum(['percentage', 'fixed']).optional(),
  popularCategory: z.any().optional()
});

const paymentConfigSchema = z.object({
  hostApplicationId: z.string({ required_error: 'hostApplicationId is required' }).min(1, 'hostApplicationId is required'),
  upiId: z.string().nullable().optional(),
  payeeName: z.string().nullable().optional()
}).refine(data => {
  if (data.upiId && data.upiId.trim().length > 0) {
    return data.upiId.includes('@');
  }
  return true;
}, {
  message: 'A valid UPI ID is required (e.g. merchant@okhdfcbank)',
  path: ['upiId']
});

const modeChangeRequestSchema = z.object({
  hostApplicationId: z.string({ required_error: 'hostApplicationId is required' }).min(1, 'hostApplicationId is required'),
  requestedMode: z.enum(['open', 'closed'], {
    errorMap: () => ({ message: 'requestedMode must be either "open" or "closed"' })
  }),
  merchantNotes: z.string().optional().default('')
});

const adBookingSchema = z.object({
  outletId: z.string({ required_error: 'outletId is required' }).min(1, 'outletId is required'),
  deviceType: z.enum(['tablet', 'screen'], {
    errorMap: () => ({ message: 'deviceType must be "tablet" or "screen"' })
  }),
  mediaType: z.enum(['video', 'image']).optional().default('video'),
  maxVideoLengthSeconds: z.union([z.number(), z.string()]).optional().default(30),
  quantity: z.union([z.number(), z.string()], { required_error: 'Quantity is required' }),
  adDurationDays: z.union([z.number(), z.string()], { required_error: 'Ad duration is required' }),
  frequency: z.union([z.number(), z.string()], { required_error: 'Frequency is required' }),
  mediaUrl: z.string().optional(),
  adCategory: z.string().optional(),
  redirectUrl: z.string({ required_error: 'redirectUrl is required' }).url('Valid redirect URL is required')
});

const switchRoleSchema = z.object({
  role: z.enum(['merchant', 'advertiser', 'admin'], {
    errorMap: () => ({ message: 'Role must be merchant, advertiser, or admin' })
  })
});

const requestMoreDevicesSchema = z.object({
  hostApplicationId: z.string({ required_error: 'hostApplicationId is required' }).min(1, 'hostApplicationId cannot be empty'),
  requestTablet: z.boolean().optional().default(false),
  tabletQuantity: z.union([z.number(), z.string()]).optional().default(0),
  requestScreen: z.boolean().optional().default(false),
  screenQuantity: z.union([z.number(), z.string()]).optional().default(0)
}).refine(data => data.requestTablet || data.requestScreen, {
  message: 'You must select at least one device type (Tablet or Screen)',
  path: ['requestTablet']
});

const verifyPasswordSchema = z.object({
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty')
});

const createDeviceSchema = z.object({
  deviceType: z.enum(['tablet', 'screen'], {
    errorMap: () => ({ message: 'Device type must be tablet or screen' })
  }),
  hostApplicationId: z.string({ required_error: 'hostApplicationId is required' }).min(1, 'hostApplicationId cannot be empty')
});

const reviewHostApplicationSchema = z.object({
  applicationId: z.string({ required_error: 'applicationId is required' }).min(1, 'applicationId cannot be empty'),
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' })
  })
});

const reviewDeviceRequestSchema = z.object({
  requestId: z.string({ required_error: 'requestId is required' }).min(1, 'requestId cannot be empty'),
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' })
  })
});

const reviewAdBookingSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId is required' }).min(1, 'bookingId cannot be empty'),
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' })
  }),
  denialReason: z.string().optional(),
  adCategory: z.string().optional()
}).refine(data => {
  if (data.action === 'reject') {
    return typeof data.denialReason === 'string' && data.denialReason.trim().length > 0;
  }
  return true;
}, {
  message: 'Reason for denial is required when rejecting a campaign',
  path: ['denialReason']
});

const reviewModeChangeRequestSchema = z.object({
  action: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Action must be approved or rejected' })
  }),
  adminNotes: z.string().optional().default('')
});

const adminResetPasswordSchema = z.object({
  newPassword: z.string({ required_error: 'New password is required' })
    .min(8, 'New password must be 8-12 characters')
    .max(12, 'New password must be 8-12 characters')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'New password must contain both letters and numbers'
    })
});

module.exports = {
  deviceActivationSchema,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  sendOtpSchema,
  checkAvailabilitySchema,
  resetPasswordSchema,
  hostApplySchema,
  menuItemSchema,
  menuUpdateSchema,
  paymentConfigSchema,
  modeChangeRequestSchema,
  adBookingSchema,
  switchRoleSchema,
  requestMoreDevicesSchema,
  verifyPasswordSchema,
  createDeviceSchema,
  reviewHostApplicationSchema,
  reviewDeviceRequestSchema,
  reviewAdBookingSchema,
  reviewModeChangeRequestSchema,
  adminResetPasswordSchema
};

