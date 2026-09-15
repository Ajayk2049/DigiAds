import axios from 'axios';
import { API_BASE } from '../../config';

export const createAnalyticsSlice = (set, get) => ({
  showAnalyticsModal: false,
  analyticsBookingId: '',
  analyticsData: null,
  analyticsLoading: false,
  lastRefreshedAt: 0,
  cooldownRemaining: 0,

  setShowAnalyticsModal: (show) => set({ showAnalyticsModal: show }),
  setAnalyticsBookingId: (id) => set({ analyticsBookingId: id }),
  setAnalyticsData: (data) => set({ analyticsData: data }),
  setCooldownRemaining: (sec) => set({ cooldownRemaining: sec }),

  fetchCampaignAnalytics: async (bookingId, isSilent = false) => {
    if (!bookingId) return;
    if (!isSilent) set({ analyticsLoading: true });
    try {
      const res = await axios.get(`${API_BASE}/ads/analytics/${bookingId}`, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      if (res.data.success) {
        set({ analyticsData: res.data.data });
        if (!isSilent) {
          set({ lastRefreshedAt: Date.now() });
        }
      }
    } catch (err) {
      console.error('fetchCampaignAnalytics Error:', err);
      if (!isSilent) {
        get().showToast('error', err.response?.data?.message || 'Failed to load campaign analytics.');
      }
    } finally {
      if (!isSilent) set({ analyticsLoading: false });
    }
  },

  openAnalyticsModal: (bookingId) => {
    set({
      analyticsBookingId: bookingId,
      analyticsData: null,
      lastRefreshedAt: 0,
      cooldownRemaining: 0,
      showAnalyticsModal: true
    });
    get().fetchCampaignAnalytics(bookingId);
  },

  closeAnalyticsModal: () => {
    set({ showAnalyticsModal: false, analyticsBookingId: '', analyticsData: null });
  }
});
