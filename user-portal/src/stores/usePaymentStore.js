import { create } from 'zustand';
import axios from 'axios';
import { config, API_BASE } from '../config';
import { useUIStore } from './useUIStore';
import { useAuthStore } from './useAuthStore';
import { useOutletStore } from './useOutletStore';

const getLocalDateString = (d = new Date()) => {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const usePaymentStore = create((set, get) => ({
  paymentConfig: { hasUpiId: false, upiId: '' },
  savedUpiList: [],
  paymentUpiInput: '',
  tempUpiInput: '',
  tempPayeeName: '',
  isUpiVerified: false,
  isVerifyingUpi: false,
  isUploadingQr: false,
  settingDefaultUpiId: null,
  modalError: '',
  modalInfo: '',

  paymentSearchInput: '',
  debouncedSearchQuery: '',
  isSearchingPayments: false,
  paymentCustomDate: getLocalDateString(),

  // Password Modal
  showPasswordModal: false,
  confirmPasswordInput: '',
  passwordVerifyError: '',
  isVerifyingPassword: false,

  // UPI Config Modal
  showUpiModal: false,

  // Bill Config Modal
  showConfigureBillModal: false,
  billConfigLoading: false,
  billConfigSaving: false,
  billConfigError: '',
  billUploadingImage: false,
  billDeletingImage: false,
  billForm: {
    logoUrl: '',
    restaurantName: '',
    addressLine1: '',
    addressLine2: '',
    cityZip: '',
    gstin: '',
    fssaiNo: '',
    phone: '',
    billPrefix: 'INV',
    showKOTNumbers: true,
    showCovers: true,
    showCustomerDetail: true,
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    serviceTaxPercent: 0,
    enableAutoRoundOff: true,
    thankYouMessage: 'Thank You & Visit Again !',
    showThankYouMessage: true,
    crmContactName: '',
    crmContactPhone: '',
    deliveryPhone: '',
    showPoweredBy: true,
    customWatermark: 'POWERED BY - DIGIADS',
    billWidthFormat: '80mm',
    qrImageUrl: '',
    qrCaption: ''
  },

  // Export Modal
  showExportModal: false,
  exportPreset: 'today',
  exportStartDate: getLocalDateString(),
  exportEndDate: getLocalDateString(),
  isExportingExcel: false,

  // Setters
  setPaymentCustomDate: (date) => set({ paymentCustomDate: date }),
  setPaymentSearchInput: (val) => set({ paymentSearchInput: val }),
  setDebouncedSearchQuery: (val) => set({ debouncedSearchQuery: val }),
  setIsSearchingPayments: (val) => set({ isSearchingPayments: val }),

  setShowPasswordModal: (show) => set({
    showPasswordModal: show,
    confirmPasswordInput: '',
    passwordVerifyError: ''
  }),
  setConfirmPasswordInput: (val) => set({ confirmPasswordInput: val }),
  setPasswordVerifyError: (err) => set({ passwordVerifyError: err }),

  setShowUpiModal: (show) => set({
    showUpiModal: show,
    tempUpiInput: '',
    tempPayeeName: '',
    isUpiVerified: false,
    modalError: '',
    modalInfo: ''
  }),
  setTempUpiInput: (val) => set({ tempUpiInput: val }),
  setTempPayeeName: (val) => set({ tempPayeeName: val }),
  setIsUpiVerified: (val) => set({ isUpiVerified: val }),
  setModalError: (val) => set({ modalError: val }),
  setModalInfo: (val) => set({ modalInfo: val }),

  originalBillConfigSnapshot: null,
  setOriginalBillConfigSnapshot: (snapshot) => set({ originalBillConfigSnapshot: snapshot }),
  hasBillConfigChanges: () => {
    const { billForm, originalBillConfigSnapshot } = get();
    if (!originalBillConfigSnapshot) return false;
    try {
      return JSON.stringify(billForm) !== originalBillConfigSnapshot;
    } catch {
      return false;
    }
  },

  setShowConfigureBillModal: (show) => set(state => {
    if (!show && state.originalBillConfigSnapshot) {
      try {
        return {
          showConfigureBillModal: false,
          billConfigError: '',
          billForm: JSON.parse(state.originalBillConfigSnapshot)
        };
      } catch {
        return { showConfigureBillModal: false, billConfigError: '' };
      }
    }
    return {
      showConfigureBillModal: show,
      billConfigError: '',
      originalBillConfigSnapshot: show && !state.originalBillConfigSnapshot ? JSON.stringify(state.billForm) : state.originalBillConfigSnapshot
    };
  }),
  setBillForm: (updater) => set(state => ({
    billForm: typeof updater === 'function' ? updater(state.billForm) : updater
  })),

  setShowExportModal: (show) => set({ showExportModal: show }),
  setExportPreset: (preset) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let start = todayStr;
    const end = todayStr;

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === '15d') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    }

    set({ exportPreset: preset, exportStartDate: start, exportEndDate: end });
  },

  // Actions
  fetchPaymentConfig: async (token, outletId) => {
    if (!outletId || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/host/payment-config`, {
        params: { hostApplicationId: outletId },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.data || { hasUpiId: false, upiId: '' };
      set({ paymentConfig: data, paymentUpiInput: data.upiId || '' });

      const stored = localStorage.getItem(`merchant_upi_list_${outletId}`);
      if (stored) {
        set({ savedUpiList: JSON.parse(stored) });
      } else if (data.upiId) {
        const initialList = [{ upiId: data.upiId, payeeName: data.payeeName || '', verified: true }];
        set({ savedUpiList: initialList });
        localStorage.setItem(`merchant_upi_list_${outletId}`, JSON.stringify(initialList));
      } else {
        set({ savedUpiList: [] });
      }
    } catch (err) {
      console.error('fetchPaymentConfig error:', err);
    }
  },

  fetchBillConfig: async (token, outletId, applications = []) => {
    if (!token || !outletId) return;
    set({ billConfigLoading: true });
    try {
      const res = await axios.get(`${API_BASE}/host/bill-config/${outletId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.data) {
        const configData = res.data.data;
        const currentApp = applications.find(a => a._id === outletId);
        const mergedConfig = {
          ...get().billForm,
          logoUrl: configData.logoUrl || '',
          restaurantName: configData.restaurantName || (currentApp ? currentApp.outletName : ''),
          addressLine1: configData.addressLine1 || (currentApp ? `${currentApp.doorNo}, ${currentApp.street}` : ''),
          addressLine2: configData.addressLine2 || (currentApp ? `${currentApp.city}, ${currentApp.state}` : ''),
          cityZip: configData.cityZip || (currentApp ? currentApp.zipCode : ''),
          gstin: configData.gstin || '',
          fssaiNo: configData.fssaiNo || '',
          phone: configData.phone || (currentApp ? currentApp.phone : ''),
          billPrefix: configData.billPrefix || 'INV',
          showKOTNumbers: configData.showKOTNumbers !== undefined ? configData.showKOTNumbers : true,
          showCovers: configData.showCovers !== undefined ? configData.showCovers : true,
          showCustomerDetail: configData.showCustomerDetail !== undefined ? configData.showCustomerDetail : true,
          cgstPercent: configData.cgstPercent !== undefined ? configData.cgstPercent : 2.5,
          sgstPercent: configData.sgstPercent !== undefined ? configData.sgstPercent : 2.5,
          serviceTaxPercent: configData.serviceTaxPercent !== undefined ? configData.serviceTaxPercent : 0,
          enableAutoRoundOff: configData.enableAutoRoundOff !== undefined ? configData.enableAutoRoundOff : true,
          thankYouMessage: configData.thankYouMessage || 'Thank You & Visit Again !',
          showThankYouMessage: configData.showThankYouMessage !== undefined ? configData.showThankYouMessage : true,
          crmContactName: configData.crmContactName || '',
          crmContactPhone: configData.crmContactPhone || '',
          deliveryPhone: configData.deliveryPhone || '',
          showPoweredBy: configData.showPoweredBy !== undefined ? configData.showPoweredBy : true,
          customWatermark: configData.customWatermark !== undefined ? configData.customWatermark : 'POWERED BY - DIGIADS',
          billWidthFormat: configData.billWidthFormat || '80mm',
          qrImageUrl: configData.qrImageUrl || '',
          qrCaption: configData.qrCaption !== undefined ? configData.qrCaption : ''
        };
        set({
          billForm: mergedConfig,
          originalBillConfigSnapshot: JSON.stringify(mergedConfig)
        });
      }
    } catch (err) {
      console.error('fetchBillConfig error:', err);
    } finally {
      set({ billConfigLoading: false });
    }
  },

  handleSaveBillConfig: async (token, outletId) => {
    const { billForm } = get();
    const { showToast } = useUIStore.getState();
    if (!outletId) return;
    set({ billConfigSaving: true, billConfigError: '' });
    try {
      await axios.put(`${API_BASE}/host/bill-config/${outletId}`, billForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        originalBillConfigSnapshot: JSON.stringify(billForm),
        showConfigureBillModal: false
      });
      showToast('Bill configuration saved successfully!', 'success');
    } catch (err) {
      console.error('handleSaveBillConfig error:', err);
      set({ billConfigError: err.response?.data?.message || 'Failed to save configuration' });
    } finally {
      set({ billConfigSaving: false });
    }
  },


  handleUploadBillImageFile: async (token, outletId, file, fieldName) => {
    const { showToast } = useUIStore.getState();
    if (!file || !outletId || !token) return;
    set({ billUploadingImage: true, billConfigError: '' });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await axios.post(`${API_BASE}/host/bill-config/upload-image`, arrayBuffer, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'image/png',
          'X-Filename': file.name || 'image.png',
          'X-Host-Application-Id': outletId
        }
      });
      if (res.data?.url) {
        set(state => ({ billForm: { ...state.billForm, [fieldName]: res.data.url } }));
        showToast('Image uploaded successfully!', 'success');
      }
    } catch (err) {
      set({ billConfigError: err.response?.data?.message || 'Failed to upload image' });
    } finally {
      set({ billUploadingImage: false });
    }
  },

  handleDeleteBillImage: async (token, outletId, fieldName) => {
    const { showToast } = useUIStore.getState();
    if (!fieldName || !outletId || !token) return;
    const label = fieldName === 'logoUrl' ? 'Header Logo' : 'Footer QR Image';
    if (!confirm(`Are you sure you want to delete the ${label}?`)) return;

    set({ billDeletingImage: true, billConfigError: '' });
    try {
      const res = await axios.post(`${API_BASE}/host/bill-config/delete-image`, {
        imageType: fieldName,
        hostApplicationId: outletId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        set(state => ({ billForm: { ...state.billForm, [fieldName]: '' } }));
        showToast(`${label} deleted from server!`, 'success');
      }
    } catch (err) {
      set({ billConfigError: err.response?.data?.message || `Failed to delete ${label}` });
    } finally {
      set({ billDeletingImage: false });
    }
  },

  handleVerifyPasswordSubmit: async (passwordVal, token) => {
    const pwd = typeof passwordVal === 'string' ? passwordVal : get().confirmPasswordInput;
    if (!pwd || !pwd.trim()) {
      set({ passwordVerifyError: 'Account password is required' });
      return;
    }
    set({ passwordVerifyError: '', isVerifyingPassword: true });
    try {
      await axios.post(`${API_BASE}/host/verify-password`, { password: pwd }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ showPasswordModal: false, confirmPasswordInput: '', showUpiModal: true });
    } catch (err) {
      set({ passwordVerifyError: err.response?.data?.message || 'Incorrect account password' });
    } finally {
      set({ isVerifyingPassword: false });
    }
  },

  handleVerifyUpi: async (upiVal) => {
    const { savedUpiList, tempUpiInput } = get();
    const upiToCheck = (typeof upiVal === 'string' ? upiVal : tempUpiInput).trim().toLowerCase();
    if (!upiToCheck.includes('@')) return;
    if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === upiToCheck)) {
      set({ modalError: 'This UPI ID is already added.', isUpiVerified: false });
      return;
    }
    set({ isVerifyingUpi: true, modalError: '', modalInfo: '' });
    await new Promise(r => setTimeout(r, 600));
    set({ isVerifyingUpi: false, isUpiVerified: true, modalInfo: 'UPI ID format verified successfully.' });
    return { upiId: upiToCheck };
  },

  handleQrCodeUpload: async (fileOrEvent, token, callback) => {
    let file = null;
    let target = null;
    if (fileOrEvent?.target?.files?.[0]) {
      file = fileOrEvent.target.files[0];
      target = fileOrEvent.target;
    } else if (fileOrEvent?.files?.[0]) {
      file = fileOrEvent.files[0];
    } else if (fileOrEvent instanceof File || fileOrEvent instanceof Blob || fileOrEvent?.arrayBuffer) {
      file = fileOrEvent;
    }

    if (!file) {
      set({ modalError: 'No file selected. Please choose a UPI QR image.' });
      return;
    }
    if (!token) {
      set({ modalError: 'Authentication session expired. Please refresh the page.' });
      return;
    }

    set({ isUploadingQr: true, modalError: '', modalInfo: '', isUpiVerified: false });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await axios.post(`${API_BASE}/host/payment-config/upload-qr`, arrayBuffer, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'X-Filename': encodeURIComponent(file.name || 'qr.png')
        }
      });
      if (res.data?.success) {
        const decodedUpi = (res.data.data?.upiId || '').trim();
        const decodedName = (res.data.data?.payeeName || '').trim();

        const { savedUpiList } = get();
        if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === decodedUpi.toLowerCase())) {
          set({
            modalError: `UPI ID "${decodedUpi}" is already in your saved list.`,
            tempUpiInput: decodedUpi,
            tempPayeeName: decodedName,
            isUpiVerified: true
          });
          if (typeof callback === 'function') callback(decodedUpi, decodedName);
          return;
        }

        set({
          tempUpiInput: decodedUpi,
          tempPayeeName: decodedName,
          isUpiVerified: true,
          modalInfo: `Decoded QR Code successfully: ${decodedUpi}${decodedName ? ' (' + decodedName + ')' : ''}`
        });

        if (typeof callback === 'function') {
          callback(decodedUpi, decodedName);
        }
      }
    } catch (err) {
      console.error('handleQrCodeUpload Error:', err);
      set({
        modalError: err.response?.data?.message || 'Failed to decode QR code. Please upload a clear UPI QR screenshot or photo.',
        isUpiVerified: false
      });
    } finally {
      set({ isUploadingQr: false });
      if (target) target.value = '';
    }
  },

  handleSaveNewUpi: (outletId, upiIdVal, payeeNameVal) => {
    const { tempUpiInput, tempPayeeName, savedUpiList } = get();
    const upiToAdd = (typeof upiIdVal === 'string' ? upiIdVal : tempUpiInput).trim();
    const payeeToAdd = (typeof payeeNameVal === 'string' ? payeeNameVal : tempPayeeName).trim();
    if (!upiToAdd) return;
    if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === upiToAdd.toLowerCase())) {
      set({ modalError: 'This UPI ID is already added.' });
      return;
    }
    const newList = [...savedUpiList, { upiId: upiToAdd, payeeName: payeeToAdd, verified: true }];
    set({
      savedUpiList: newList,
      tempUpiInput: '',
      tempPayeeName: '',
      isUpiVerified: false,
      modalError: '',
      modalInfo: ''
    });
    if (outletId) {
      localStorage.setItem(`merchant_upi_list_${outletId}`, JSON.stringify(newList));
    }
  },

  handleSelectActiveUpi: async (tokenArg, outletIdArg, upiItemOrId, maybePayeeName) => {
    const { showToast } = useUIStore.getState();
    const token = tokenArg || useAuthStore.getState().token;
    const outletId = outletIdArg || useOutletStore.getState().selectedOutletId;

    let upiId = '';
    let payeeName = '';

    if (typeof upiItemOrId === 'string') {
      upiId = upiItemOrId;
      payeeName = typeof maybePayeeName === 'string' ? maybePayeeName : '';
    } else if (upiItemOrId && typeof upiItemOrId === 'object') {
      upiId = upiItemOrId.upiId || '';
      payeeName = upiItemOrId.payeeName || maybePayeeName || '';
    }

    if (!outletId || !token || !upiId) {
      console.warn('handleSelectActiveUpi: missing required parameter', { outletId, hasToken: !!token, upiId });
      showToast('Cannot set active UPI: Missing venue or UPI ID', 'error');
      return;
    }

    set({ settingDefaultUpiId: upiId, modalError: '', modalInfo: '' });
    try {
      const res = await axios.put(`${API_BASE}/host/payment-config`, {
        hostApplicationId: outletId,
        upiId: upiId.trim(),
        payeeName: payeeName ? payeeName.trim() : ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUpiId = res.data?.data?.upiId ?? upiId.trim();
      const updatedPayeeName = res.data?.data?.payeeName ?? (payeeName ? payeeName.trim() : '');

      set({
        paymentConfig: { hasUpiId: true, upiId: updatedUpiId, payeeName: updatedPayeeName },
        paymentUpiInput: updatedUpiId,
        modalInfo: `Active receiving UPI updated to ${updatedUpiId}!`
      });
      showToast(`Active receiving UPI updated to ${updatedUpiId}!`, 'success');
    } catch (err) {
      console.error('handleSelectActiveUpi Error:', err);
      const errMsg = err.response?.data?.message || 'Failed to set active UPI';
      set({ modalError: errMsg });
      showToast(errMsg, 'error');
    } finally {
      set({ settingDefaultUpiId: null });
    }
  },

  handleDeleteUpi: async (token, outletId, upiIdOrIndex) => {
    const { savedUpiList, paymentConfig } = get();
    const { showToast } = useUIStore.getState();

    let upiToDelete = null;
    let newList = [];
    if (typeof upiIdOrIndex === 'number') {
      upiToDelete = savedUpiList[upiIdOrIndex]?.upiId;
      newList = savedUpiList.filter((_, i) => i !== upiIdOrIndex);
    } else {
      upiToDelete = upiIdOrIndex;
      newList = savedUpiList.filter(item => item?.upiId !== upiIdOrIndex);
    }

    if (!upiToDelete) return;

    const isActive = paymentConfig?.upiId && paymentConfig.upiId === upiToDelete;
    const isLast = savedUpiList.length <= 1;

    let confirmMsg = `Are you sure you want to delete UPI ID "${upiToDelete}"?`;
    if (isActive && isLast) {
      confirmMsg = `Warning: "${upiToDelete}" is your only configured UPI ID and is currently active for this venue. Deleting it will disable receiving UPI payments until a new ID is added. Are you sure you want to proceed?`;
    } else if (isActive) {
      confirmMsg = `Warning: "${upiToDelete}" is currently the active receiving UPI for this venue. Deleting it will remove it as the default payment receiver. Are you sure you want to proceed?`;
    }

    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
      return;
    }

    set({ savedUpiList: newList });
    if (outletId) {
      localStorage.setItem(`merchant_upi_list_${outletId}`, JSON.stringify(newList));
    }

    // If deleting the active receiving UPI (even if it's the only one configured)
    if (isActive) {
      set({
        paymentConfig: { hasUpiId: false, upiId: '', payeeName: '' },
        paymentUpiInput: ''
      });
      if (token && outletId) {
        try {
          await axios.put(`${API_BASE}/host/payment-config`, {
            hostApplicationId: outletId,
            upiId: '',
            payeeName: ''
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.error('Failed to clear active UPI config on server', e);
        }
      }
    }

    showToast(`UPI ID "${upiToDelete}" deleted successfully`, 'info');
  }
}));
