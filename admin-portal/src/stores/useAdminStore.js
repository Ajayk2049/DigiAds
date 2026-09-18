import { create } from 'zustand';
import axios from 'axios';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export const useAdminStore = create((set, get) => ({
  // Authentication
  token: null,
  isAuthenticated: false,
  mounted: false,
  loginForm: { phone: '', password: '', rememberMe: true },
  loginLoading: false,
  loginError: '',

  // System Entities
  stats: null,
  hosts: [],
  campaigns: [],
  rates: [],
  devices: [],
  users: [],
  deviceRequests: [],
  modeChangeRequests: [],
  releases: [],
  platformAds: [],
  promoDurations: { TABLET_APP: 10, SCREEN_APP: 10 },
  advertiserImageDuration: 10,

  // Navigation & Filtering
  activeTab: 'stats',
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  searchQuery: '',
  theme: 'dark',
  venueStatusFilter: 'all',
  hostFilter: 'all',
  campaignFilter: 'all',
  deviceFilter: 'all',
  otaSubTab: 'telemetry',
  userSubTab: 'merchant',
  analyticsRange: '7d',

  // Modals & Forms
  showVenueModal: false,
  selectedHostApp: null,
  showWatermarkModal: false,
  watermarkForm: { file: null, preview: '', position: 'bottom-right', opacity: 0.8 },
  isQuotaModalOpen: false,
  customQuotaForm: { tablet: 5, screen: 3, enableCustom: false },
  activeQuotaTab: 'tablet',

  showDeployForm: false,
  deviceForm: { hostApplicationId: '', deviceType: 'tablet', deviceName: '', locationDetails: '' },

  selectedBooking: null,
  showMediaModal: false,
  activeAnalyticsCampaign: null,
  activeAnalyticsData: null,
  analyticsLoading: false,

  refundBookingTarget: null,
  refundReason: '',

  showReleaseModal: false,
  releaseForm: { appType: 'TABLET_APP', versionName: '1.0.1', versionCode: 2, file: null, releaseNotes: '' },
  releaseUploading: false,

  showCreatePlatformAdModal: false,
  newPlatformAdForm: { title: '', targetDeviceType: 'all', targetOutletIds: [], durationSeconds: 15, file: null },
  previewPlatformAd: null,
  deletingPlatformAdId: '',
  platformAdResolutionWarning: null,

  selectedUser: null,
  editingUser: null,
  userForm: { name: '', phone: '', email: '', roles: ['merchant'] },
  deletingUser: null,
  adminDeletePassword: '',

  isPromoDurationsModalOpen: false,
  promoDurationsForm: { tabletDuration: 10, screenDuration: 10 },
  savingPromoDurations: false,

  isCommercialImageDurationModalOpen: false,
  commercialImageDurationForm: { durationSeconds: 10 },
  savingCommercialImageDuration: false,

  rateModalOpen: false,
  editingRate: null,
  rateForm: { mediaType: 'image', pricingModel: 'slot_based', durationDays: 30, frequencyPerHour: 60, price: 1000 },

  // Toast Notifications
  notifications: [],

  // Setters
  setMounted: (mounted) => set({ mounted }),
  setActiveTab: (activeTab) => {
    localStorage.setItem('adminActiveTab', activeTab);
    set({ activeTab });
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    localStorage.setItem('adminSidebarCollapsed', String(sidebarCollapsed));
    set({ sidebarCollapsed });
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    localStorage.setItem('adminSidebarCollapsed', String(next));
    set({ sidebarCollapsed: next });
  },
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTheme: (theme) => {
    localStorage.setItem('adminTheme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
  setVenueStatusFilter: (venueStatusFilter) => set({ venueStatusFilter }),
  setHostFilter: (hostFilter) => set({ hostFilter }),
  setCampaignFilter: (campaignFilter) => set({ campaignFilter }),
  setDeviceFilter: (deviceFilter) => set({ deviceFilter }),
  setOtaSubTab: (otaSubTab) => set({ otaSubTab }),
  setUserSubTab: (userSubTab) => {
    localStorage.setItem('adminUserSubTab', userSubTab);
    set({ userSubTab });
  },
  setAnalyticsRange: (analyticsRange) => set({ analyticsRange }),

  // Modal Setters
  setShowVenueModal: (showVenueModal) => set({ showVenueModal }),
  setSelectedHostApp: (selectedHostApp) => set({ selectedHostApp }),
  setShowWatermarkModal: (showWatermarkModal) => set({ showWatermarkModal }),
  setWatermarkForm: (watermarkForm) => set({ watermarkForm }),
  setIsQuotaModalOpen: (isQuotaModalOpen) => set({ isQuotaModalOpen }),
  setCustomQuotaForm: (customQuotaForm) => set({ customQuotaForm }),
  setActiveQuotaTab: (activeQuotaTab) => set({ activeQuotaTab }),
  setShowDeployForm: (showDeployForm) => set({ showDeployForm }),
  setDeviceForm: (deviceForm) => set({ deviceForm }),
  setSelectedBooking: (selectedBooking) => set({ selectedBooking }),
  setShowMediaModal: (showMediaModal) => set({ showMediaModal }),
  setActiveAnalyticsCampaign: (activeAnalyticsCampaign) => set({ activeAnalyticsCampaign }),
  setActiveAnalyticsData: (activeAnalyticsData) => set({ activeAnalyticsData }),
  setRefundBookingTarget: (refundBookingTarget) => set({ refundBookingTarget }),
  setRefundReason: (refundReason) => set({ refundReason }),
  setShowReleaseModal: (showReleaseModal) => set({ showReleaseModal }),
  setReleaseForm: (releaseForm) => set({ releaseForm }),
  setShowCreatePlatformAdModal: (showCreatePlatformAdModal) => set({ showCreatePlatformAdModal }),
  setNewPlatformAdForm: (newPlatformAdForm) => set({ newPlatformAdForm }),
  setPreviewPlatformAd: (previewPlatformAd) => set({ previewPlatformAd }),
  setDeletingPlatformAdId: (deletingPlatformAdId) => set({ deletingPlatformAdId }),
  setPlatformAdResolutionWarning: (platformAdResolutionWarning) => set({ platformAdResolutionWarning }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setEditingUser: (editingUser) => set({ editingUser }),
  setUserForm: (userForm) => set({ userForm }),
  setDeletingUser: (deletingUser) => set({ deletingUser }),
  setAdminDeletePassword: (adminDeletePassword) => set({ adminDeletePassword }),
  setIsPromoDurationsModalOpen: (isPromoDurationsModalOpen) => set({ isPromoDurationsModalOpen }),
  setPromoDurationsForm: (promoDurationsForm) => set({ promoDurationsForm }),
  setIsCommercialImageDurationModalOpen: (isCommercialImageDurationModalOpen) => set({ isCommercialImageDurationModalOpen }),
  setCommercialImageDurationForm: (commercialImageDurationForm) => set({ commercialImageDurationForm }),
  setRateModalOpen: (rateModalOpen) => set({ rateModalOpen }),
  setEditingRate: (editingRate) => set({ editingRate }),
  setRateForm: (rateForm) => set({ rateForm }),

  // Notification helper
  showNotification: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({ notifications: [...state.notifications, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
    }, 4000);
  },

  // Auth Actions
  hydrateAuth: () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const role = localStorage.getItem('adminRole') || localStorage.getItem('role');
    const savedTheme = localStorage.getItem('adminTheme') || 'dark';
    const savedTab = localStorage.getItem('adminActiveTab');
    const savedCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
    const savedUserSub = localStorage.getItem('adminUserSubTab');

    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    set({
      theme: savedTheme,
      sidebarCollapsed: savedCollapsed,
      mounted: true,
      activeTab: savedTab || 'stats',
      userSubTab: savedUserSub || 'merchant'
    });

    if (token && role === 'admin') {
      set({ token, isAuthenticated: true });
      get().fetchDashboardData(token);
    }
  },

  handleLogin: async (e) => {
    e?.preventDefault?.();
    const { loginForm } = get();
    set({ loginLoading: true, loginError: '' });
    try {
      const raw = (loginForm.phone || loginForm.identifier || '').trim();
      if (!raw) {
        set({ loginLoading: false, loginError: 'Please enter your email or 10-digit mobile number.' });
        return;
      }

      let finalIdentifier = raw;
      if (finalIdentifier.includes('@')) {
        finalIdentifier = finalIdentifier.toLowerCase();
      } else {
        const cleaned = finalIdentifier.replace(/\D/g, '');
        if (cleaned.length === 10) {
          finalIdentifier = `+91${cleaned}`;
        }
      }

      const res = await axios.post(`${API_BASE}/auth/login`, {
        identifier: finalIdentifier,
        phone: finalIdentifier,
        password: loginForm.password
      });

      const data = res.data.data;
      const user = data?.user || data;
      const role = user?.role || data?.role;
      const roles = user?.roles || data?.roles || [];
      const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));

      if (!isAdmin) {
        set({ loginLoading: false, loginError: 'Access Denied: Enterprise Admin credentials required.' });
        return;
      }

      const authToken = data.token || user.token;
      localStorage.setItem('adminToken', authToken);
      localStorage.setItem('adminRole', 'admin');
      localStorage.setItem('token', authToken);
      localStorage.setItem('role', 'admin');

      set({ token: authToken, isAuthenticated: true, loginLoading: false, loginError: '' });
      get().showNotification('Logged in successfully!', 'success');
      get().fetchDashboardData(authToken);
    } catch (err) {
      set({ loginLoading: false, loginError: err.response?.data?.message || 'Authentication failed. Please check credentials.' });
    }
  },

  handleLogout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    set({
      token: null,
      isAuthenticated: false,
      loginForm: { phone: '', identifier: '', password: '', rememberMe: true },
      loginError: ''
    });
    get().showNotification('Logged out securely.', 'info');
  },

  // Data Fetchers
  fetchDashboardData: async (authToken = get().token) => {
    if (!authToken) return;
    const headers = { Authorization: `Bearer ${authToken}` };
    const check401 = (err) => {
      if (err?.response?.status === 401) get().handleLogout();
    };

    try {
      const [
        statsRes,
        hostsRes,
        campaignsRes,
        ratesRes,
        devicesRes,
        usersRes,
        deviceReqsRes,
        modeReqsRes,
        releasesRes,
        platformAdsRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, { headers }).catch((err) => { check401(err); return { data: { data: null } }; }),
        axios.get(`${API_BASE}/admin/hosts`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/bookings`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/rates`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/devices`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/users`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/device-requests`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/mode-change-requests`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; }),
        axios.get(`${API_BASE}/admin/releases`, { headers }).catch((err) => { check401(err); return { data: { releases: [] } }; }),
        axios.get(`${API_BASE}/admin/platform-ads`, { headers }).catch((err) => { check401(err); return { data: { data: [] } }; })
      ]);

      set({
        stats: statsRes.data.data,
        hosts: hostsRes.data.data || [],
        campaigns: campaignsRes.data.data || [],
        rates: ratesRes.data.data || [],
        devices: devicesRes.data.data || [],
        users: usersRes.data.data || [],
        deviceRequests: deviceReqsRes.data.data || [],
        modeChangeRequests: modeReqsRes.data.data || [],
        releases: releasesRes.data.releases || [],
        platformAds: platformAdsRes.data.data || []
      });

      get().fetchPromoDurations(authToken);
      get().fetchAdvertiserImageDuration(authToken);
    } catch (err) {
      if (err?.response?.status === 401) get().handleLogout();
    }
  },

  fetchPlatformAds: async (authToken = get().token) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/platform-ads`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      set({ platformAds: res.data.data || [] });
    } catch (err) {
      console.error('fetchPlatformAds Error:', err);
    }
  },

  fetchPromoDurations: async (authToken = get().token) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/settings/promo-durations`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data?.success && res.data?.data) {
        set({
          promoDurations: res.data.data,
          promoDurationsForm: {
            tabletDuration: res.data.data.TABLET_APP ?? 10,
            screenDuration: res.data.data.SCREEN_APP ?? 10
          }
        });
      }
    } catch (err) {
      console.error('fetchPromoDurations Error:', err);
    }
  },

  fetchAdvertiserImageDuration: async (authToken = get().token) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/settings/advertiser-image-duration`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data?.success && res.data?.data) {
        const sec = res.data.data.durationSeconds ?? 10;
        set({
          advertiserImageDuration: sec,
          commercialImageDurationForm: { durationSeconds: sec }
        });
      }
    } catch (err) {
      console.error('fetchAdvertiserImageDuration Error:', err);
    }
  },

  fetchCampaignAnalytics: async (campaignId, range = '7d') => {
    const { token } = get();
    set({ analyticsLoading: true });
    try {
      const res = await axios.get(`${API_BASE}/analytics/campaigns/${campaignId}?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ activeAnalyticsData: res.data.data, analyticsLoading: false });
    } catch (err) {
      set({ analyticsLoading: false });
      get().showNotification('Failed to fetch analytics.', 'error');
    }
  }
}));
