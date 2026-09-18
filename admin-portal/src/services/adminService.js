import axios from 'axios';
import { config } from '@/config';

const API_BASE = config.apiUrl;

const getHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export const adminService = {
  // Hosts / Venues
  reviewHost: async (token, hostId, action) => {
    return axios.post(`${API_BASE}/admin/hosts/review`, {
      applicationId: hostId,
      action
    }, getHeaders(token));
  },

  updateHostStatus: async (token, hostId, payload) => {
    return axios.put(`${API_BASE}/admin/hosts/${hostId}/status`, payload, getHeaders(token));
  },

  resetQuotaNow: async (token, hostId) => {
    return axios.post(`${API_BASE}/admin/hosts/${hostId}/reset-quota`, {}, getHeaders(token));
  },

  saveWatermark: async (token, hostId, watermarkForm) => {
    return axios.put(`${API_BASE}/admin/hosts/${hostId}/watermark`, watermarkForm, getHeaders(token));
  },

  // Campaigns / Bookings
  reviewCampaign: async (token, bookingId, action, rejectionReason = '', adCategory = null) => {
    const payload = { bookingId, action, denialReason: rejectionReason };
    if (adCategory) payload.adCategory = adCategory;
    return axios.post(`${API_BASE}/admin/bookings/review`, payload, getHeaders(token));
  },

  updateBookingCategory: async (token, bookingId, adCategory) => {
    return axios.put(`${API_BASE}/admin/bookings/${bookingId}/category`, { adCategory }, getHeaders(token));
  },

  revokeCampaign: async (token, bookingId, reason, adminPassword) => {
    return axios.put(`${API_BASE}/admin/bookings/revoke/${bookingId}`, {
      reason,
      adminPassword
    }, getHeaders(token));
  },

  fetchCampaignAnalytics: async (token, bookingId) => {
    return axios.get(`${API_BASE}/ads/analytics/${bookingId}`, getHeaders(token));
  },

  // Hardware Devices
  deployDevice: async (token, deviceForm) => {
    return axios.post(`${API_BASE}/admin/devices/deploy`, deviceForm, getHeaders(token));
  },

  reviewDeviceRequest: async (token, requestId, action) => {
    return axios.post(`${API_BASE}/admin/device-requests/review`, {
      requestId,
      action
    }, getHeaders(token));
  },

  reviewModeChangeRequest: async (token, requestId, action) => {
    return axios.put(`${API_BASE}/admin/mode-change-requests/${requestId}/review`, {
      action
    }, getHeaders(token));
  },

  // OTA Releases
  uploadRelease: async (token, releaseForm) => {
    return axios.post(`${API_BASE}/admin/releases/upload`, releaseForm.file, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'X-App-Type': releaseForm.appType,
        'X-Version-Name': releaseForm.versionName,
        'X-Version-Code': releaseForm.versionCode,
        'X-Release-Notes': encodeURIComponent(releaseForm.releaseNotes || ''),
        'X-Is-Mandatory': releaseForm.isMandatory ? 'true' : 'false'
      }
    });
  },

  toggleReleaseStatus: async (token, releaseId, nextStatus) => {
    return axios.put(`${API_BASE}/admin/releases/${releaseId}/status`, { status: nextStatus }, getHeaders(token));
  },

  // Platform & Fallback Ads
  uploadPlatformAdMedia: async (token, file, adType, onProgress) => {
    return axios.post(`${API_BASE}/admin/platform-ads/upload?adType=${encodeURIComponent(adType)}&filename=${encodeURIComponent(file.name)}`, file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-filename': encodeURIComponent(file.name),
        'x-ad-type': adType,
        Authorization: `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  createPlatformAd: async (token, adPayload) => {
    return axios.post(`${API_BASE}/admin/platform-ads`, adPayload, getHeaders(token));
  },

  updatePlatformAd: async (token, adId, payload) => {
    return axios.patch(`${API_BASE}/admin/platform-ads/${adId}`, payload, getHeaders(token));
  },

  togglePlatformAdStatus: async (token, adId, isActive) => {
    return axios.patch(`${API_BASE}/admin/platform-ads/${adId}`, { isActive }, getHeaders(token));
  },

  deletePlatformAd: async (token, adId) => {
    return axios.delete(`${API_BASE}/admin/platform-ads/${adId}`, getHeaders(token));
  },

  // Settings
  savePromoDurations: async (token, payload) => {
    return axios.post(`${API_BASE}/admin/settings/promo-durations`, payload, getHeaders(token));
  },

  saveCommercialImageDuration: async (token, durationSeconds) => {
    return axios.post(`${API_BASE}/admin/settings/advertiser-image-duration`, { durationSeconds }, getHeaders(token));
  },

  // Users
  updateUser: async (token, userId, userForm) => {
    return axios.put(`${API_BASE}/admin/users/${userId}`, userForm, getHeaders(token));
  },

  deleteUser: async (token, userId, adminPassword) => {
    return axios.delete(`${API_BASE}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { adminPassword }
    });
  },

  // Rates
  saveRate: async (token, rateId, payload) => {
    if (rateId) {
      return axios.put(`${API_BASE}/admin/rates/${rateId}`, payload, getHeaders(token));
    }
    return axios.post(`${API_BASE}/admin/rates`, payload, getHeaders(token));
  },

  deleteRate: async (token, rateId) => {
    return axios.delete(`${API_BASE}/admin/rates/${rateId}`, getHeaders(token));
  }
};
