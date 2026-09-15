import axios from 'axios';
import { API_BASE, config } from '../../config';

export const createBookingsSlice = (set, get) => ({
  bookings: [],
  expandedCampaigns: {},
  cancellingBookingId: null,
  retryingBookingId: null,
  activeUploadBookingDismissed: false,

  setBookings: (bookings) => set({ bookings }),
  dismissActiveUploadBooking: () => set({ activeUploadBooking: null, activeUploadBookingDismissed: true }),
  toggleExpandCampaign: (bookingId) => {
    set(state => ({
      expandedCampaigns: {
        ...state.expandedCampaigns,
        [bookingId]: !state.expandedCampaigns[bookingId]
      }
    }));
  },

  fetchBookings: async (authToken) => {
    const t = authToken || get().token;
    if (!t) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/bookings`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const list = res.data.data || [];
      set({ bookings: list });

      // Automatically sync active upload booking if there's a paid booking pending creative
      const pendingUpload = list.find(b => b.paymentStatus === 'completed' && b.approvalStatus === 'pending' && (!b.mediaUrl || b.mediaUrl.trim() === ''));
      if (pendingUpload) {
        if (!get().activeUploadBookingDismissed) {
          set({ activeUploadBooking: pendingUpload });
        }
      } else if (!get().activeUploadBooking?.mediaUrl) {
        set({ activeUploadBooking: null });
      }
    } catch (err) {
      console.error('fetchBookings Error:', err);
    }
  },

  handleVerifyPayment: async (bookingId, explicitToken = null, isAutoVerify = false) => {
    const activeToken = explicitToken || get().token;
    if (!activeToken) return;
    try {
      const res = await axios.post(`${API_BASE}/ads/verify-payment/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const paymentStatus = res.data.data?.paymentStatus;

      if (paymentStatus === 'completed') {
        get().showToast('success', 'Payment verified successfully! Please upload your campaign ad creative below.');
        get().fetchBookings(activeToken);
        if (res.data.data) {
          set({ activeUploadBooking: res.data.data, activeUploadBookingDismissed: false, activeTab: 'new-booking' });
          localStorage.setItem('advertiserActiveTab', 'new-booking');
        }
      } else if (paymentStatus === 'failed') {
        get().showToast('error', 'Payment failed or was declined. Please try booking again.');
        if (isAutoVerify) {
          set({ activeTab: 'new-booking' });
          localStorage.setItem('advertiserActiveTab', 'new-booking');
        }
      } else {
        get().showToast('info', res.data.message || 'Payment is still being verified. Check back shortly.');
        get().fetchBookings(activeToken);
        if (isAutoVerify) {
          set({ activeTab: 'bookings' });
          localStorage.setItem('advertiserActiveTab', 'bookings');
        }
      }
    } catch (err) {
      get().showToast('error', err.response?.data?.message || 'Failed to verify payment status.');
    }
  },

  handleRetryPayment: async (bookingId) => {
    set({ retryingBookingId: bookingId });
    try {
      const redirectUrl = `${config.userPortalUrl}/advertiser`;
      const res = await axios.post(`${API_BASE}/ads/retry-payment/${bookingId}`, { redirectUrl }, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      if (res.data.success && res.data.data?.paymentUrl) {
        get().showToast('info', 'Redirecting to payment gateway...');
        window.location.href = res.data.data.paymentUrl;
      } else {
        get().showToast('error', 'Failed to retrieve payment link.');
        set({ retryingBookingId: null });
      }
    } catch (err) {
      get().showToast('error', err.response?.data?.message || 'Failed to initiate payment retry.');
      set({ retryingBookingId: null });
    }
  },

  handleCancelBooking: async (bookingId) => {
    if (!confirm('Are you sure you want to cancel and remove this pending booking?')) return;
    set({ cancellingBookingId: bookingId });
    try {
      const res = await axios.post(`${API_BASE}/ads/cancel-booking/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      if (res.data.success) {
        get().showToast('success', 'Pending campaign cancelled.');
        get().fetchBookings(get().token);
        if (get().activeUploadBooking?.bookingId === bookingId) {
          set({ activeUploadBooking: null });
        }
      }
    } catch (err) {
      get().showToast('error', err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      set({ cancellingBookingId: null });
    }
  }
});
