import { create } from 'zustand';
import axios from 'axios';
import { config, API_BASE } from '../config';
import { useUIStore } from './useUIStore';

export const usePromoStore = create((set, get) => ({
  promosList: [],
  promoDraftSlots: {},
  isStreamingPromos: false,
  activePromoSubTab: 'tablet', // 'tablet' | 'screen'
  promoQuotaStats: {
    dailyVideoChangesRemaining: 4,
    dailyVideoQuota: 4,
    dailyImageChangesRemaining: 10,
    dailyImageQuota: 10,
    dailyScreenVideoChangesRemaining: 4,
    dailyScreenVideoQuota: 4,
    dailyScreenImageChangesRemaining: 10,
    dailyScreenImageQuota: 10
  },

  // Mode Change Request states
  showModeChangeModal: false,
  pendingModeReq: null,
  modeReqNotes: '',
  submittingModeReq: false,

  // Setters
  setActivePromoSubTab: (tab) => set({ activePromoSubTab: tab }),
  setShowModeChangeModal: (show) => set({ showModeChangeModal: show }),
  setModeReqNotes: (notes) => set({ modeReqNotes: notes }),
  setPromoDraftSlots: (updater) => set(state => ({
    promoDraftSlots: typeof updater === 'function' ? updater(state.promoDraftSlots) : updater
  })),

  // Derived Quota Calculations
  getEffectiveRemaining: () => {
    const { promoDraftSlots, promoQuotaStats } = get();
    const stagedVideo = Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return k.startsWith('video_') && item?.fileObj && !item?.isDeleted;
    }).length;

    const stagedImage = Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return k.startsWith('image_') && item?.fileObj && !item?.isDeleted;
    }).length;

    const stagedScreenVideo = Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return (k.startsWith('screen_video_') || k.startsWith('screen_')) && item?.fileObj && item?.mediaType === 'video' && !item?.isDeleted;
    }).length;

    const stagedScreenImage = Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return (k.startsWith('screen_image_') || k.startsWith('screen_')) && item?.fileObj && item?.mediaType === 'image' && !item?.isDeleted;
    }).length;

    return {
      tabletVideoRemaining: Math.max(0, (promoQuotaStats.dailyVideoChangesRemaining ?? promoQuotaStats.dailyVideoQuota ?? 4) - stagedVideo),
      tabletImageRemaining: Math.max(0, (promoQuotaStats.dailyImageChangesRemaining ?? promoQuotaStats.dailyImageQuota ?? 10) - stagedImage),
      screenVideoRemaining: Math.max(0, (promoQuotaStats.dailyScreenVideoChangesRemaining ?? promoQuotaStats.dailyScreenVideoQuota ?? 4) - stagedScreenVideo),
      screenImageRemaining: Math.max(0, (promoQuotaStats.dailyScreenImageChangesRemaining ?? promoQuotaStats.dailyScreenImageQuota ?? 10) - stagedScreenImage)
    };
  },

  // Actions
  fetchHostPromos: async (token, outletId) => {
    if (!outletId || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/host/promos?hostApplicationId=${outletId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        set({ promosList: res.data.data.promos || [] });
        if (res.data.data.quotaStats) {
          set({ promoQuotaStats: res.data.data.quotaStats });
        }
        const draftMap = {};
        (res.data.data.promos || []).forEach(p => {
          draftMap[`${p.slotType}_${p.slotIndex}`] = {
            title: p.title || '',
            mediaUrl: p.mediaUrl || '',
            mediaType: p.mediaType || p.slotType,
            previewUrl: p.mediaUrl ? (p.mediaUrl.startsWith('http') ? p.mediaUrl : `${API_BASE.replace('/api/v1', '')}${p.mediaUrl}`) : '',
            fileObj: null,
            isModified: false,
            isDeleted: false
          };
        });
        set({ promoDraftSlots: draftMap });
      }
      get().fetchModeChangeStatus(token, outletId);
    } catch (err) {
      console.error('Failed to fetch host promos:', err);
    }
  },

  fetchModeChangeStatus: async (token, outletId) => {
    if (!outletId || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/host/applications/mode-change-status?hostApplicationId=${outletId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        set({ pendingModeReq: res.data.data });
      }
    } catch (err) {
      console.error('Failed to fetch mode change status:', err);
    }
  },

  handleSelectPromoFile: (slotType, slotIndex, file, isClosedMode) => {
    const { showToast } = useUIStore.getState();
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isVid = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
    const isImg = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

    if ((slotType === 'image' || slotType === 'screen_image') && !isImg) {
      showToast('Unsupported image format. Allowed: JPG, JPEG, PNG, WEBP.', 'error');
      return;
    }
    if ((slotType === 'video' || slotType === 'screen_video') && !isVid) {
      showToast('Unsupported video format. Allowed: MP4, WEBM, MOV.', 'error');
      return;
    }
    if (slotType === 'screen' && !isVid && !isImg) {
      showToast('Unsupported media format. Allowed: MP4, WEBM, JPG, PNG, WEBP.', 'error');
      return;
    }

    if (isVid && file.size > 104857600) {
      showToast('Video size exceeds 100MB limit.', 'error');
      return;
    }
    if (isImg && file.size > 10485760) {
      showToast('Image size exceeds 10MB limit.', 'error');
      return;
    }

    const maxAllowedSecs = isClosedMode ? 60 : 30;

    if (isVid) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration || 0;
        const w = videoElement.videoWidth || 0;
        const h = videoElement.videoHeight || 0;

        if (duration > maxAllowedSecs + 0.5) {
          showToast(`Video duration (${Math.round(duration)}s) exceeds the ${maxAllowedSecs}-second limit for ${isClosedMode ? 'Closed' : 'Open'} Ads Mode venues.`, 'error');
          return;
        }

        if (w > 0 && h > 0) {
          const isScreen = slotType.startsWith('screen');
          if (isScreen && (w < 1280 || h < 720)) {
            showToast(`⚠️ Low Resolution (${w}x${h}): Recommended 1920x1080 Full HD for Wall Screens.`, 'warning');
          } else if (!isScreen && (w < 720 || h < 1280)) {
            showToast(`⚠️ Low Resolution (${w}x${h}): Recommended 1080x1920 Portrait for Tabletop Tablets.`, 'warning');
          }
        }

        const localPreviewUrl = URL.createObjectURL(file);
        const key = `${slotType}_${slotIndex}`;

        set(state => {
          const newTitle = (state.promoDraftSlots[key]?.title && !state.promoDraftSlots[key]?.isDeleted) ? state.promoDraftSlots[key].title : file.name.replace(/\.[^/.]+$/, '');
          return {
            promoDraftSlots: {
              ...state.promoDraftSlots,
              [key]: {
                title: newTitle,
                mediaUrl: state.promoDraftSlots[key]?.mediaUrl || '',
                mediaType: 'video',
                previewUrl: localPreviewUrl,
                fileObj: file,
                isModified: true,
                isDeleted: false
              }
            }
          };
        });
      };
      videoElement.onerror = () => {
        showToast('Failed to parse video duration metadata.', 'error');
      };
      videoElement.src = URL.createObjectURL(file);
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const key = `${slotType}_${slotIndex}`;

    set(state => {
      const newTitle = (state.promoDraftSlots[key]?.title && !state.promoDraftSlots[key]?.isDeleted) ? state.promoDraftSlots[key].title : file.name.replace(/\.[^/.]+$/, '');
      return {
        promoDraftSlots: {
          ...state.promoDraftSlots,
          [key]: {
            title: newTitle,
            mediaUrl: state.promoDraftSlots[key]?.mediaUrl || '',
            mediaType: isVid ? 'video' : 'image',
            previewUrl: localPreviewUrl,
            fileObj: file,
            isModified: true,
            isDeleted: false
          }
        }
      };
    });
  },

  handleClearPromoSlot: (slotType, slotIndex) => {
    const { promoDraftSlots } = get();
    const { showToast } = useUIStore.getState();
    const key = `${slotType}_${slotIndex}`;
    const currentSlot = promoDraftSlots[key];
    const mediaName = currentSlot?.title || `${slotType.replace('_', ' ').toUpperCase()} Slot ${slotIndex + 1}`;

    if (window.confirm(`Are you sure you want to delete this venue promo ("${mediaName}")?`)) {
      set(state => ({
        promoDraftSlots: {
          ...state.promoDraftSlots,
          [key]: {
            title: '',
            mediaUrl: '',
            mediaType: slotType,
            previewUrl: '',
            fileObj: null,
            isModified: true,
            isDeleted: true
          }
        }
      }));
      showToast('Promo slot marked for deletion. Click "Stream ADS" to finalize.', 'info');
    }
  },

  handleDeletePromoSlot: async (token, outletId, slotType, slotIndex) => {
    const { showToast } = useUIStore.getState();
    if (!outletId || !token) return;
    try {
      const res = await axios.post(`${API_BASE}/host/promos/delete-slot`, {
        hostApplicationId: outletId,
        slotType,
        slotIndex
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        showToast('Promo slot deleted successfully!', 'success');
        get().fetchHostPromos(token, outletId);
      }
    } catch (err) {
      console.error('handleDeletePromoSlot error:', err);
      showToast(err.response?.data?.message || 'Failed to delete promo slot.', 'error');
    }
  },

  handleStreamAds: async (token, outletId) => {
    const { promoDraftSlots } = get();
    const { showToast } = useUIStore.getState();
    if (!outletId) {
      showToast('Please select an outlet first.', 'error');
      return;
    }

    const modifiedKeys = Object.keys(promoDraftSlots).filter(k => promoDraftSlots[k]?.isModified);
    if (modifiedKeys.length === 0) {
      showToast('No unsaved promo changes to stream.', 'info');
      return;
    }

    const imageKeys = modifiedKeys.filter(k => {
      const item = promoDraftSlots[k];
      return item.fileObj && (item.mediaType === 'image' || k.includes('image'));
    });
    const videoKeys = modifiedKeys.filter(k => {
      const item = promoDraftSlots[k];
      return item.fileObj && (item.mediaType === 'video' || k.includes('video'));
    });
    const remainingKeys = modifiedKeys.filter(k => !imageKeys.includes(k) && !videoKeys.includes(k));

    const sortedKeys = [...imageKeys, ...videoKeys, ...remainingKeys];

    set({ isStreamingPromos: true });
    try {
      const slotsPayload = [];
      const totalFilesToUpload = sortedKeys.filter(k => promoDraftSlots[k]?.fileObj).length;
      let filesUploadedSoFar = 0;

      for (const key of sortedKeys) {
        const item = promoDraftSlots[key];
        const lastUnderscore = key.lastIndexOf('_');
        const slotType = key.substring(0, lastUnderscore);
        const slotIndex = parseInt(key.substring(lastUnderscore + 1), 10);

        if (item.isDeleted) {
          slotsPayload.push({
            slotType,
            slotIndex,
            isDeleted: true
          });
          continue;
        }

        let finalMediaUrl = item.mediaUrl;
        let tempPath = null;
        if (item.fileObj) {
          filesUploadedSoFar++;
          showToast(`Uploading file ${filesUploadedSoFar} of ${totalFilesToUpload} (${item.mediaType.toUpperCase()})...`, 'info');
          const arrayBuffer = await item.fileObj.arrayBuffer();
          const uploadRes = await axios.post(`${API_BASE}/host/promos/upload-media`, arrayBuffer, {
            headers: {
              'Content-Type': item.fileObj.type || 'application/octet-stream',
              'X-Filename': item.fileObj.name,
              'X-Host-Application-Id': outletId,
              'Authorization': `Bearer ${token}`
            }
          });

          if (uploadRes.data?.success && uploadRes.data.data.mediaUrl) {
            finalMediaUrl = uploadRes.data.data.mediaUrl;
            tempPath = uploadRes.data.data.tempPath || null;
          } else {
            throw new Error(uploadRes.data?.message || 'File upload failed');
          }
        }

        const resolvedTitle = (item.title && item.title.trim())
          ? item.title.trim()
          : (item.fileObj ? item.fileObj.name.replace(/\.[^/.]+$/, '') : `${slotType.replace('_', ' ').toUpperCase()} Slot ${slotIndex + 1}`);

        slotsPayload.push({
          slotType,
          slotIndex,
          title: resolvedTitle,
          mediaUrl: finalMediaUrl,
          mediaType: item.mediaType,
          tempPath,
          isDeleted: false
        });
      }

      const streamRes = await axios.post(`${API_BASE}/host/promos/stream`, {
        hostApplicationId: outletId,
        slots: slotsPayload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (streamRes.data?.success) {
        showToast('Venue promos updated & streaming live on devices!', 'success');
        get().fetchHostPromos(token, outletId);
      } else {
        showToast(streamRes.data?.message || 'Failed to stream promos.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to stream promos.', 'error');
    } finally {
      set({ isStreamingPromos: false });
    }
  },

  handleRequestModeChange: async (token, outletId, targetMode) => {
    const { showToast } = useUIStore.getState();
    const { promosList, modeReqNotes } = get();
    if (!outletId) return;

    const hasActivePromos = (promosList || []).some(p => p.isStreaming);
    if (hasActivePromos) {
      showToast('Please clear all active in-house promo slots before applying for a mode change.', 'error');
      return;
    }

    set({ submittingModeReq: true });
    try {
      const res = await axios.post(`${API_BASE}/host/applications/request-mode-change`, {
        hostApplicationId: outletId,
        requestedMode: targetMode,
        merchantNotes: modeReqNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        showToast('Mode change request submitted! Pending Platform Admin approval.', 'success');
        set({ showModeChangeModal: false, modeReqNotes: '' });
        get().fetchModeChangeStatus(token, outletId);
      } else {
        showToast(res.data?.message || 'Failed to submit request.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit mode change request.', 'error');
    } finally {
      set({ submittingModeReq: false });
    }
  }
}));
