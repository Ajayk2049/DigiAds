import axios from 'axios';
import { API_BASE, config } from '../../config';

export const createWizardSlice = (set, get) => ({
  states: [],
  cities: [],
  outlets: [],
  rates: [],
  selectedState: '',
  selectedCity: '',
  selectedOutletName: '',
  availableDeviceTypes: [],
  selectedDeviceType: '',
  selectedOutlet: null,
  selectedMediaType: '', // 'image' or 'video'
  maxVideoLengthSeconds: 30, // 30 or 60
  selectedRateId: '',
  mediaUrl: '',
  quantity: '1',
  adDurationDays: 7,
  frequency: 'hourly',
  computedAmount: 0,
  submittingBooking: false,

  setSelectedState: (s) => set({ selectedState: s }),
  setSelectedCity: (c) => set({ selectedCity: c }),
  setSelectedOutletName: (o) => set({ selectedOutletName: o }),
  setAvailableDeviceTypes: (d) => set({ availableDeviceTypes: d }),
  setSelectedDeviceType: (d) => set({ selectedDeviceType: d }),
  setSelectedOutlet: (o) => set({ selectedOutlet: o }),
  setSelectedMediaType: (m) => set({ selectedMediaType: m }),
  setMaxVideoLengthSeconds: (s) => set({ maxVideoLengthSeconds: s }),
  setSelectedRateId: (id) => set({ selectedRateId: id }),
  setQuantity: (q) => set({ quantity: q }),
  setAdDurationDays: (d) => set({ adDurationDays: d }),
  setFrequency: (f) => set({ frequency: f }),
  setComputedAmount: (a) => set({ computedAmount: a }),
  setMediaUrl: (url) => set({ mediaUrl: url }),

  handleQuantityChange: (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '0') return;
    set({ quantity: cleaned });
  },

  fetchStates: async (authToken) => {
    const t = authToken || get().token;
    if (!t) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/states`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      set({ states: res.data.data || [] });
    } catch (err) {
      console.error(err);
    }
  },

  fetchCities: async (stateVal) => {
    if (!stateVal) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/cities?state=${stateVal}`, {
        headers: { Authorization: `Bearer ${get().token}` }
      });
      set({
        cities: res.data.data || [],
        outlets: [],
        selectedCity: '',
        selectedOutletName: '',
        availableDeviceTypes: [],
        selectedDeviceType: '',
        selectedOutlet: null
      });
    } catch (err) {
      console.error(err);
    }
  },

  fetchOutlets: async (cityVal) => {
    const { selectedState, token } = get();
    if (!cityVal || !selectedState) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/outlets?state=${selectedState}&city=${cityVal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        outlets: res.data.data || [],
        selectedOutletName: '',
        availableDeviceTypes: [],
        selectedDeviceType: '',
        selectedOutlet: null
      });
    } catch (err) {
      console.error(err);
    }
  },

  fetchRates: async (authToken) => {
    const t = authToken || get().token;
    if (!t) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/rates`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      set({ rates: res.data.data || [] });
    } catch (err) {
      console.error(err);
    }
  },

  handleInitiateBooking: async (e) => {
    if (e) e.preventDefault();
    const {
      submittingBooking,
      selectedOutlet,
      selectedMediaType,
      maxVideoLengthSeconds,
      quantity,
      adDurationDays,
      frequency,
      token,
      showToast
    } = get();

    if (submittingBooking) return;
    if (!selectedOutlet) {
      showToast('error', 'Please select a target venue and display type.');
      return;
    }
    if (!selectedMediaType) {
      showToast('error', 'Please choose what you want to advertise (Static Image or Dynamic Video) first.');
      return;
    }
    const bookingQty = parseInt(quantity, 10);
    if (isNaN(bookingQty) || bookingQty < 1) {
      showToast('error', 'Quantity must be a number of 1 or more.');
      return;
    }
    if (bookingQty > selectedOutlet.quantity) {
      showToast('error', `Requested quantity exceeds outlet availability (${selectedOutlet.quantity}).`);
      return;
    }

    set({ submittingBooking: true });
    try {
      const redirectUrl = `${config.userPortalUrl}/advertiser`;
      const response = await axios.post(
        `${API_BASE}/ads/book`,
        {
          outletId: selectedOutlet._id,
          deviceType: selectedOutlet.deviceType,
          mediaType: selectedMediaType,
          maxVideoLengthSeconds: selectedMediaType === 'video' ? maxVideoLengthSeconds : 30,
          quantity: bookingQty,
          adDurationDays: parseInt(adDurationDays, 10),
          frequency,
          mediaUrl: '',
          adCategory: '',
          redirectUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showToast('success', 'Ad campaign created! Redirecting to payment gateway...');
      if (response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      } else {
        set({ submittingBooking: false });
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to initiate campaign booking.');
      set({ submittingBooking: false });
    }
  }
});
