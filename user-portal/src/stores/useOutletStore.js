import { create } from 'zustand';
import axios from 'axios';
import { config, API_BASE } from '../config';
import { useUIStore } from './useUIStore';
import { normalizeAndMatchState, normalizeCity } from '../components/merchant/common/constants';

export const useOutletStore = create((set, get) => ({
  applications: [],
  selectedOutletId: typeof window !== 'undefined' ? localStorage.getItem('selectedOutletId') || '' : '',
  isFetchingApps: false,
  devices: [],
  
  deviceFilterType: typeof window !== 'undefined' ? localStorage.getItem('deviceFilterType') || 'tablet' : 'tablet',
  deviceFilterVenue: typeof window !== 'undefined' ? localStorage.getItem('deviceFilterVenue') || '' : '',
  deviceFilterStatus: typeof window !== 'undefined' ? localStorage.getItem('deviceFilterStatus') || 'all' : 'all',

  // Apply Form
  form: {
    outletName: '',
    outletDescription: '',
    doorNo: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    requestTablet: false,
    tabletQuantity: '1',
    requestScreen: false,
    screenQuantity: '1',
    adMode: 'open',
    allowOpenAds: true
  },
  detectingGps: false,
  zipError: '',
  applyLoading: false,
  applyError: '',
  applyInfo: '',

  // Request More Devices Modal
  showGetMoreDevicesModal: false,
  reqRequestTablet: false,
  reqTabletQuantity: '1',
  reqRequestScreen: false,
  reqScreenQuantity: '1',
  reqDeviceLoading: false,
  reqDeviceError: '',

  // Edit Application Modal
  showEditApplicationModal: false,
  editingApplicationId: '',
  editAppForm: {
    outletName: '',
    outletDescription: '',
    doorNo: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    adMode: 'open',
    allowOpenAds: true
  },
  editDetectingGps: false,
  editAppZipError: '',
  editAppLoading: false,
  editAppError: '',

  // Analytics Dashboard
  analyticsDays: 0,
  analyticsSlotFilter: 'all',
  analyticsData: null,
  analyticsLoading: false,


  // Getters / Selectors
  getApprovedOutlets: () => {
    return get().applications.filter(app => app.status === 'approved' && app.requestTablet);
  },
  getHasApprovedVenue: () => {
    return get().applications.some(app => app.status === 'approved');
  },

  // Setters
  setSelectedOutletId: (id) => {
    set({ selectedOutletId: id });
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', id);
    }
  },
  setDeviceFilterType: (val) => {
    set({ deviceFilterType: val });
    if (typeof window !== 'undefined') localStorage.setItem('deviceFilterType', val);
  },
  setDeviceFilterVenue: (val) => {
    set({ deviceFilterVenue: val });
    if (typeof window !== 'undefined') localStorage.setItem('deviceFilterVenue', val);
  },
  setDeviceFilterStatus: (val) => {
    set({ deviceFilterStatus: val });
    if (typeof window !== 'undefined') localStorage.setItem('deviceFilterStatus', val);
  },
  setForm: (updater) => {
    set(state => ({
      form: typeof updater === 'function' ? updater(state.form) : updater
    }));
  },
  setShowGetMoreDevicesModal: (show) => set({ showGetMoreDevicesModal: show }),
  setReqRequestTablet: (val) => set({ reqRequestTablet: val }),
  setReqTabletQuantity: (val) => set({ reqTabletQuantity: val }),
  setReqRequestScreen: (val) => set({ reqRequestScreen: val }),
  setReqScreenQuantity: (val) => set({ reqScreenQuantity: val }),
  setReqDeviceError: (val) => set({ reqDeviceError: val }),

  setShowEditApplicationModal: (show) => set({ showEditApplicationModal: show }),
  setEditAppForm: (updater) => {
    set(state => ({
      editAppForm: typeof updater === 'function' ? updater(state.editAppForm) : updater
    }));
  },

  setAnalyticsDays: (days) => set({ analyticsDays: days }),
  setAnalyticsSlotFilter: (filter) => set({ analyticsSlotFilter: filter }),

  fetchVenueAnalytics: async (token, days = 0, targetOutletId = null) => {
    if (!token) return;
    const outletId = targetOutletId || get().selectedOutletId;
    set({ analyticsLoading: true, analyticsDays: days });
    try {
      const url = outletId
        ? `${API_BASE}/host/analytics?days=${days}&hostApplicationId=${outletId}`
        : `${API_BASE}/host/analytics?days=${days}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        set({ analyticsData: res.data.data });
      }
    } catch (err) {
      console.error('fetchVenueAnalytics Error:', err.message);
    } finally {
      set({ analyticsLoading: false });
    }
  },


  // Actions
  fetchApplications: async (token, onTabSelect) => {
    if (!token || get().isFetchingApps) return;
    set({ isFetchingApps: true });
    try {
      const res = await axios.get(`${API_BASE}/host/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const apps = res.data.data || [];
      set({ applications: apps });

      const approvedApps = apps.filter(app => app.status === 'approved' && app.requestTablet);
      if (approvedApps.length > 0 && !get().selectedOutletId) {
        get().setSelectedOutletId(approvedApps[0]._id);
      }

      if (onTabSelect) {
        const hasApproved = apps.some(app => app.status === 'approved');
        const approvedTabletApp = apps.find(app => app.status === 'approved' && app.requestTablet);
        const savedTab = typeof window !== 'undefined' ? localStorage.getItem('merchantActiveTab') : null;
        if (hasApproved) {
          if (approvedTabletApp) {
            if (!savedTab || savedTab === 'applications' || savedTab === 'my-applications') {
              onTabSelect('orders');
            } else {
              onTabSelect(savedTab);
            }
          } else {
            onTabSelect('devices');
          }
        } else {
          if (apps.length > 0) {
            onTabSelect('my-applications');
          } else {
            onTabSelect('applications');
          }
        }
      }
    } catch (err) {
      console.error('fetchApplications error:', err);
    } finally {
      set({ isFetchingApps: false });
    }
  },

  fetchDevices: async (token) => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/host/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ devices: res.data.data || [] });
    } catch (err) {
      console.error('fetchDevices error:', err);
    }
  },

  handlePhoneChange: (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 10) return;
    if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
    set(state => ({ form: { ...state.form, phone: cleaned } }));
  },

  handleQuantityChange: (field, val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '0') return;
    set(state => ({ form: { ...state.form, [field]: cleaned } }));
  },

  handleZipCodeChange: async (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 6) return;
    set(state => ({ form: { ...state.form, zipCode: cleaned } }));

    if (cleaned.length < 6) {
      set({ zipError: '' });
      return;
    }

    try {
      const response = await axios.get(`https://api.postalpincode.in/pincode/${cleaned}`);
      if (response && response.data && response.data[0]) {
        const status = response.data[0].Status;
        if (status === 'Success') {
          const postOffices = response.data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const { State, District } = postOffices[0];
            const matchedState = normalizeAndMatchState(State);
            const normalizedCity = normalizeCity(District || '');
            set(state => ({
              form: {
                ...state.form,
                state: matchedState,
                city: normalizedCity || state.form.city
              },
              zipError: ''
            }));
          } else {
            set({ zipError: 'Wrong pincode' });
          }
        } else {
          set({ zipError: 'Wrong pincode' });
        }
      } else {
        set({ zipError: 'Wrong pincode' });
      }
    } catch (err) {
      console.error('Pincode fetch failed:', err);
      set({ zipError: 'Wrong pincode' });
    }
  },

  handleDetectGps: () => {
    const { showToast } = useUIStore.getState();
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    set({ detectingGps: true });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        set(state => ({
          form: { ...state.form, latitude: lat, longitude: lng },
          detectingGps: false
        }));
        showToast(`📍 Exact Store GPS Detected: ${lat}, ${lng}`, 'success');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        set({ detectingGps: false });
        showToast('Unable to detect location. Please check browser location permissions.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  },

  handleHostApply: async (e, token) => {
    if (e?.preventDefault) e.preventDefault();
    const { form, zipError } = get();
    const { showToast } = useUIStore.getState();
    set({ applyError: '', applyInfo: '' });

    if (!form.requestTablet && !form.requestScreen) {
      set({ applyError: 'Please select at least one type of device to request' });
      return;
    }
    if (form.phone.length !== 10) {
      set({ applyError: 'Mobile number must be exactly 10 digits' });
      return;
    }
    if (form.zipCode.length !== 6) {
      set({ applyError: 'ZIP code must be exactly 6 digits' });
      return;
    }
    if (zipError) {
      set({ applyError: 'Please resolve the wrong pincode error before submitting' });
      return;
    }

    set({ applyLoading: true });
    try {
      const payload = {
        outletName: form.outletName,
        outletDescription: form.outletDescription,
        doorNo: form.doorNo,
        street: form.street,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        requestTablet: !!form.requestTablet,
        tabletQuantity: form.requestTablet ? parseInt(form.tabletQuantity, 10) : 0,
        requestScreen: !!form.requestScreen,
        screenQuantity: form.requestScreen ? parseInt(form.screenQuantity, 10) : 0,
        adMode: form.adMode || 'open',
        allowOpenAds: form.allowOpenAds !== undefined ? !!form.allowOpenAds : true
      };

      await axios.post(`${API_BASE}/host/apply`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        applyInfo: 'Host application submitted successfully! Pending admin approval.',
        form: {
          outletName: '',
          outletDescription: '',
          doorNo: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          contactPerson: '',
          phone: '',
          email: '',
          latitude: null,
          longitude: null,
          requestTablet: false,
          tabletQuantity: '1',
          requestScreen: false,
          screenQuantity: '1',
          adMode: 'open',
          allowOpenAds: true
        }
      });
      showToast('Host application submitted successfully!', 'success');
      get().fetchApplications(token);
      get().fetchDevices(token);
    } catch (err) {
      set({ applyError: err.response?.data?.message || 'Failed to submit host application.' });
    } finally {
      set({ applyLoading: false });
    }
  },

  openEditApplicationModal: (targetApp) => {
    const appToEdit = targetApp || get().applications[0];
    if (!appToEdit) return;
    set({
      editingApplicationId: appToEdit._id,
      editAppForm: {
        outletName: appToEdit.outletName || '',
        outletDescription: appToEdit.outletDescription || '',
        doorNo: appToEdit.doorNo || '',
        street: appToEdit.street || '',
        city: appToEdit.city || '',
        state: appToEdit.state || '',
        zipCode: appToEdit.zipCode || '',
        contactPerson: appToEdit.contactPerson || '',
        phone: appToEdit.phone || '',
        email: appToEdit.email || '',
        latitude: appToEdit.latitude || null,
        longitude: appToEdit.longitude || null,
        adMode: appToEdit.adMode || 'open',
        allowOpenAds: appToEdit.allowOpenAds !== undefined ? appToEdit.allowOpenAds : true
      },
      editAppZipError: '',
      editAppError: '',
      showEditApplicationModal: true
    });
  },

  handleEditDetectGps: () => {
    const { showToast } = useUIStore.getState();
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    set({ editDetectingGps: true });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        set(state => ({
          editAppForm: { ...state.editAppForm, latitude: lat, longitude: lng },
          editDetectingGps: false
        }));
        showToast(`📍 Exact Store GPS Detected: ${lat}, ${lng}`, 'success');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        set({ editDetectingGps: false });
        showToast('Unable to detect location. Please check browser location permissions.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  },

  saveEditedApplication: async (token, targetAppId = null) => {
    const { editAppForm, editingApplicationId, applications, editAppZipError } = get();
    const effectiveAppId = targetAppId || editingApplicationId;
    const { showToast } = useUIStore.getState();
    set({ editAppError: '' });

    if (!effectiveAppId) {
      set({ editAppError: 'No application selected for editing.' });
      return;
    }

    if (editAppForm.phone.length !== 10) {
      set({ editAppError: 'Mobile number must be exactly 10 digits' });
      return;
    }
    if (editAppForm.zipCode.length !== 6) {
      set({ editAppError: 'ZIP code must be exactly 6 digits' });
      return;
    }
    if (editAppZipError) {
      set({ editAppError: 'Please resolve the wrong pincode error before saving' });
      return;
    }

    set({ editAppLoading: true });
    try {
      const currentApp = applications.find(a => a._id === effectiveAppId);
      const currentMode = currentApp?.adMode || (currentApp?.allowOpenAds === false ? 'closed' : 'open');
      const requestedMode = editAppForm.adMode || (editAppForm.allowOpenAds === false ? 'closed' : 'open');

      if (currentApp && requestedMode !== currentMode) {
        // Submit mode change request
        await axios.post(`${API_BASE}/host/applications/request-mode-change`, {
          hostApplicationId: effectiveAppId,
          requestedMode,
          merchantNotes: 'Requested via Edit Venue Details'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Mode change request submitted for Admin approval.', 'success');
      }

      const { adMode, allowOpenAds, ...outletDetails } = editAppForm;
      await axios.put(`${API_BASE}/host/applications/${effectiveAppId}`, outletDetails, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Venue details saved successfully!', 'success');
      set({ showEditApplicationModal: false });
      get().fetchApplications(token);
    } catch (err) {
      console.error(err);
      set({ editAppError: err.response?.data?.message || 'Failed to update application details.' });
    } finally {
      set({ editAppLoading: false });
    }
  },

  submitRequestMoreDevices: async (token, deviceData) => {
    const { selectedOutletId, reqRequestTablet, reqRequestScreen, reqTabletQuantity, reqScreenQuantity } = get();
    const { showToast } = useUIStore.getState();
    if (!selectedOutletId) {
      set({ reqDeviceError: 'Please select a venue/outlet first.' });
      return;
    }

    const payload = deviceData || {
      hostApplicationId: selectedOutletId,
      requestTablet: reqRequestTablet,
      tabletQuantity: reqRequestTablet ? parseInt(reqTabletQuantity, 10) : 0,
      requestScreen: reqRequestScreen,
      screenQuantity: reqRequestScreen ? parseInt(reqScreenQuantity, 10) : 0
    };

    set({ reqDeviceError: '', reqDeviceLoading: true });
    try {
      await axios.post(`${API_BASE}/host/request-more-devices`, {
        hostApplicationId: selectedOutletId,
        ...payload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Device request submitted successfully!', 'success');
      set({ showGetMoreDevicesModal: false });
    } catch (err) {
      set({ reqDeviceError: err.response?.data?.message || 'Failed to submit device request.' });
    } finally {
      set({ reqDeviceLoading: false });
    }
  }
}));
