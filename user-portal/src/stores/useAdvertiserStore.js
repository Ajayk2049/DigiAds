import { create } from 'zustand';
import { createAuthSlice } from './advertiser/authSlice';
import { createBookingsSlice } from './advertiser/bookingsSlice';
import { createWizardSlice } from './advertiser/wizardSlice';
import { createMediaUploadSlice } from './advertiser/mediaUploadSlice';
import { createAnalyticsSlice } from './advertiser/analyticsSlice';

export const useAdvertiserStore = create((...a) => ({
  ...createAuthSlice(...a),
  ...createBookingsSlice(...a),
  ...createWizardSlice(...a),
  ...createMediaUploadSlice(...a),
  ...createAnalyticsSlice(...a),
}));
