import axios from 'axios';
import { API_BASE } from '../../config';
import { inspectVideoMetadata, checkVideoResolutionMismatch } from '@/components/advertiser/utils/mediaValidationUtils';

export const createMediaUploadSlice = (set, get) => ({
  activeUploadBooking: null,
  uploading: false,
  uploadProgress: 0,
  mediaTypeTab: 'videos', // 'videos' | 'images'
  uploadSuccessMsg: '',
  uploadAdCategory: '',
  customAdCategory: '',
  selectedVideoFile: null,
  localVideoPreviewUrl: '',
  selectedImageFiles: [],
  localImagePreviewUrls: [],
  uploadedImages: [],
  videoResolutionWarning: null,

  // Preview modals
  previewVideoUrl: '',
  showMediaModal: false,
  activeMediaUrl: '',

  setActiveUploadBooking: (booking) => set({ activeUploadBooking: booking }),
  setMediaTypeTab: (tab) => set({ mediaTypeTab: tab }),
  setUploadAdCategory: (cat) => set({ uploadAdCategory: cat }),
  setCustomAdCategory: (cat) => set({ customAdCategory: cat }),
  setUploadSuccessMsg: (msg) => set({ uploadSuccessMsg: msg }),
  setVideoResolutionWarning: (warn) => set({ videoResolutionWarning: warn }),
  setPreviewVideoUrl: (url) => set({ previewVideoUrl: url }),
  setShowMediaModal: (show) => set({ showMediaModal: show }),
  setActiveMediaUrl: (url) => set({ activeMediaUrl: url }),

  clearSelectedVideoFile: () => {
    const { localVideoPreviewUrl } = get();
    if (localVideoPreviewUrl) {
      URL.revokeObjectURL(localVideoPreviewUrl);
    }
    set({ selectedVideoFile: null, localVideoPreviewUrl: '' });
  },

  handleVideoFileSelect: async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { activeUploadBooking, selectedDeviceType, maxVideoLengthSeconds, localVideoPreviewUrl, showToast } = get();
    const targetDeviceType = activeUploadBooking ? activeUploadBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) first.');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      showToast('error', 'Unsupported file type. Only MP4 and WEBM are allowed.');
      return;
    }

    const maxDuration = activeUploadBooking?.maxVideoLengthSeconds || maxVideoLengthSeconds || 60;
    let videoMeta = { duration: 0, width: 0, height: 0 };

    try {
      videoMeta = await inspectVideoMetadata(file);
      if (videoMeta.duration > maxDuration + 0.5) {
        const errMsg = maxDuration === 30
          ? `Video duration (${Math.round(videoMeta.duration)}s) exceeds your paid 30-second plan limit. Please upload a video under 30s or select the 60s plan.`
          : `Video duration (${Math.round(videoMeta.duration)}s) exceeds maximum platform limit of 60 seconds.`;
        showToast('error', errMsg);
        if (e.target) e.target.value = '';
        return;
      }
    } catch (err) {
      console.warn('Could not inspect video metadata locally:', err);
    }

    if (localVideoPreviewUrl) {
      URL.revokeObjectURL(localVideoPreviewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    set({ selectedVideoFile: file, localVideoPreviewUrl: blobUrl });

    const warning = checkVideoResolutionMismatch(videoMeta, targetDeviceType);
    if (warning) {
      set({ videoResolutionWarning: warning });
    } else {
      showToast('info', 'Video selected! Preview your video below and click "Upload Ad" to proceed.');
    }
  },

  handleFileUpload: async () => {
    const {
      selectedVideoFile,
      activeUploadBooking,
      selectedDeviceType,
      uploadAdCategory,
      customAdCategory,
      token,
      showToast,
      fetchBookings
    } = get();

    if (!selectedVideoFile) {
      showToast('error', 'Please select a video file first.');
      return;
    }
    const targetDeviceType = activeUploadBooking ? activeUploadBooking.deviceType : selectedDeviceType;
    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    const isCategoryValid = Boolean(uploadAdCategory && (uploadAdCategory !== 'Other' || customAdCategory.trim().length > 0));
    if (!isCategoryValid) {
      showToast('error', 'Please select and define your Ad Category before uploading.');
      return;
    }

    const resolvedCategory = uploadAdCategory === 'Other' ? customAdCategory.trim() : uploadAdCategory;
    set({ uploading: true, uploadProgress: 0 });

    try {
      let uploadUrl = `${API_BASE}/ads/upload?deviceType=${targetDeviceType}&adCategory=${encodeURIComponent(resolvedCategory)}`;
      if (activeUploadBooking) {
        uploadUrl += `&bookingId=${activeUploadBooking._id}`;
      }

      const response = await axios.post(uploadUrl, selectedVideoFile, {
        headers: {
          'Content-Type': selectedVideoFile.type || 'application/octet-stream',
          'X-Filename': selectedVideoFile.name,
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ uploadProgress: percentCompleted });
        }
      });

      if (response.data.success) {
        const uploadedUrl = response.data.data?.url || '';
        showToast('success', 'Campaign ad creative uploaded and submitted for admin review!');

        if (activeUploadBooking) {
          set(state => ({
            bookings: state.bookings.map(b => {
              if (b._id === activeUploadBooking._id || b.bookingId === activeUploadBooking.bookingId) {
                return { ...b, mediaUrl: uploadedUrl };
              }
              return b;
            })
          }));
        }

        set({
          activeUploadBooking: null,
          selectedVideoFile: null,
          localVideoPreviewUrl: '',
          mediaUrl: '',
          activeTab: 'bookings'
        });
        localStorage.setItem('advertiserActiveTab', 'bookings');
        fetchBookings(token);
      } else {
        showToast('error', response.data.message || 'Upload failed.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload video file.');
    } finally {
      set({ uploading: false, uploadProgress: 0 });
    }
  },

  handleImageFileSelect: (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const { activeUploadBooking, selectedDeviceType, selectedImageFiles, localImagePreviewUrls, showToast } = get();
    const targetDeviceType = activeUploadBooking ? activeUploadBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) first.');
      return;
    }

    const availableSlots = 2 - selectedImageFiles.length;
    if (availableSlots <= 0) {
      showToast('error', 'You can select a maximum of 2 images per campaign.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    const validFiles = [];
    const validPreviews = [];

    filesToProcess.forEach(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      } else {
        showToast('error', `Skipped ${file.name}: Only JPG, JPEG, PNG, and WEBP are allowed.`);
      }
    });

    if (validFiles.length > 0) {
      set({
        selectedImageFiles: [...selectedImageFiles, ...validFiles],
        localImagePreviewUrls: [...localImagePreviewUrls, ...validPreviews]
      });
      showToast('info', `${selectedImageFiles.length + validFiles.length}/2 Images selected! Preview below and click "Upload Ad" to proceed.`);
    }

    if (e.target) e.target.value = '';
  },

  removeSelectedImageFile: (idx) => {
    const { selectedImageFiles, localImagePreviewUrls } = get();
    if (localImagePreviewUrls[idx]) {
      URL.revokeObjectURL(localImagePreviewUrls[idx]);
    }
    set({
      selectedImageFiles: selectedImageFiles.filter((_, i) => i !== idx),
      localImagePreviewUrls: localImagePreviewUrls.filter((_, i) => i !== idx)
    });
  },

  handleImageUpload: async () => {
    const {
      selectedImageFiles,
      activeUploadBooking,
      selectedDeviceType,
      uploadAdCategory,
      customAdCategory,
      token,
      showToast,
      fetchBookings
    } = get();

    if (selectedImageFiles.length === 0) {
      showToast('error', 'Please select at least 1 image file first.');
      return;
    }
    const targetDeviceType = activeUploadBooking ? activeUploadBooking.deviceType : selectedDeviceType;
    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    const isCategoryValid = Boolean(uploadAdCategory && (uploadAdCategory !== 'Other' || customAdCategory.trim().length > 0));
    if (!isCategoryValid) {
      showToast('error', 'Please select and define your Ad Category before uploading.');
      return;
    }

    const resolvedCategory = uploadAdCategory === 'Other' ? customAdCategory.trim() : uploadAdCategory;
    set({ uploading: true, uploadProgress: 0 });

    try {
      const serverUrls = [];
      for (let i = 0; i < selectedImageFiles.length; i++) {
        const imgFile = selectedImageFiles[i];
        let uploadUrl = `${API_BASE}/ads/upload-image?deviceType=${targetDeviceType}&slotIndex=${i}${i === 0 ? '&isFirst=true' : ''}&adCategory=${encodeURIComponent(resolvedCategory)}`;
        if (activeUploadBooking) {
          uploadUrl += `&bookingId=${activeUploadBooking._id}`;
        }

        const response = await axios.post(uploadUrl, imgFile, {
          headers: {
            'Content-Type': imgFile.type || 'application/octet-stream',
            'X-Filename': imgFile.name,
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(((i + (progressEvent.loaded / progressEvent.total)) * 100) / selectedImageFiles.length);
            set({ uploadProgress: percentCompleted });
          }
        });

        if (response.data.success && response.data.data.url) {
          serverUrls.push(response.data.data.url);
        }
      }

      set({ uploadedImages: serverUrls });
      const combinedUrlStr = serverUrls.join(', ');
      showToast('success', 'Campaign ad creative uploaded and submitted for admin review!');

      if (activeUploadBooking) {
        set(state => ({
          bookings: state.bookings.map(b => {
            if (b._id === activeUploadBooking._id || b.bookingId === activeUploadBooking.bookingId) {
              return { ...b, mediaUrl: combinedUrlStr };
            }
            return b;
          })
        }));
      }

      set({
        activeUploadBooking: null,
        selectedImageFiles: [],
        localImagePreviewUrls: [],
        mediaUrl: '',
        activeTab: 'bookings'
      });
      localStorage.setItem('advertiserActiveTab', 'bookings');
      fetchBookings(token);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload image creative.');
    } finally {
      set({ uploading: false, uploadProgress: 0 });
    }
  }
});
