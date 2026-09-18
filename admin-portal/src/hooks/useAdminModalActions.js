'use client';

import { adminService } from '@/services/adminService';

export default function useAdminModalActions({
  token,
  fetchDashboardData,
  showNotification,
  // State variables & setters
  selectedHostApp,
  setSelectedHostApp,
  setShowVenueModal,
  watermarkForm,
  setShowWatermarkModal,
  setWatermarkSaving,
  quotaForm,
  setIsQuotaModalOpen,
  selectedCampaign,
  setSelectedCampaign,
  setShowDetailsModal,
  setShowDenyModal,
  setDenyReasonText,
  revokePassword,
  setRevokePassword,
  revokeReason,
  setRevokeReason,
  setShowRevokeModal,
  setRevokeLoading,
  setSelectedDeviceReq,
  setShowDeviceReqModal,
  deviceForm,
  setDeviceForm,
  setShowDeployForm,
  releaseForm,
  setReleaseForm,
  setShowReleaseModal,
  setUploadingRelease,
  createPlatformAdForm,
  setCreatePlatformAdForm,
  setShowCreatePlatformAdModal,
  setUploadingPlatformAd,
  setUploadProgress,
  editingUser,
  setEditingUser,
  userForm,
  deletingUser,
  setDeletingUser,
  adminDeletePassword,
  setAdminDeletePassword,
  promoDurations,
  setIsPromoDurationsModalOpen,
  setIsSavingPromoDurations,
  commercialImageDuration,
  setIsCommercialImageDurationModalOpen,
  setIsSavingCommercialDuration,
  setAnalyticsLoading,
  setAnalyticsBookingId,
  setShowAnalyticsModal,
  setActiveAnalyticsData,
  setCooldownRemaining
}) {
  const handleResetQuotaNow = async (hostAppToReset) => {
    const target = hostAppToReset || selectedHostApp;
    if (!target) return;
    try {
      const res = await adminService.resetQuotaNow(token, target._id);
      if (res.data.success) {
        showNotification(res.data.message || `Quotas for ${target.outletName} reset to full capacity!`, 'success');
        setSelectedHostApp(res.data.data);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reset daily quotas.', 'error');
    }
  };

  const handleSaveQuotas = async () => {
    if (!selectedHostApp) return;
    try {
      const submitPayload = {
        ...quotaForm,
        customMaxScreenSlots: quotaForm.customMaxScreenImageSlots || quotaForm.customMaxScreenVideoSlots,
        customDailyScreenQuota: quotaForm.customDailyScreenVideoQuota
      };
      const res = await adminService.updateHostStatus(token, selectedHostApp._id, submitPayload);
      if (res.data.success) {
        showNotification('Host quota overrides updated successfully!', 'success');
        setSelectedHostApp(res.data.data);
        fetchDashboardData(token);
        setIsQuotaModalOpen(false);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update quotas.', 'error');
    }
  };

  const handleSaveWatermark = async () => {
    if (!selectedHostApp || !token) return;
    setWatermarkSaving(true);
    try {
      const res = await adminService.saveWatermark(token, selectedHostApp._id, watermarkForm);
      if (res.data?.success) {
        showNotification('Venue watermark updated successfully!', 'success');
        setShowWatermarkModal(false);
        if (res.data.data) setSelectedHostApp(res.data.data);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update watermark', 'error');
    } finally {
      setWatermarkSaving(false);
    }
  };

  const handleReviewHost = async (hostId, status) => {
    try {
      const res = await adminService.reviewHost(token, hostId, status);
      if (res.data.success) {
        showNotification(`Venue application ${status} successfully!`, 'success');
        setShowVenueModal(false);
        setSelectedHostApp(null);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleReviewCampaign = async (bookingId, status, rejectionReason = '') => {
    try {
      const action = status === 'approved' || status === 'approve' ? 'approve' : (status === 'denied' || status === 'reject' || status === 'rejected' ? 'reject' : status);
      const res = await adminService.reviewCampaign(token, bookingId, action, rejectionReason);
      if (res.data.success) {
        showNotification(`Campaign ${bookingId} updated to ${action}!`, 'success');
        setSelectedCampaign(null);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleUpdateBookingCategory = async (bookingId, adCategory) => {
    try {
      const res = await adminService.updateBookingCategory(token, bookingId, adCategory);
      if (res.data.success) {
        showNotification(`Campaign ${bookingId} category updated to ${adCategory}!`, 'success');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update ad category', 'error');
    }
  };

  const handleRevokeCampaign = async (e) => {
    e.preventDefault();
    if (!selectedCampaign || !revokePassword || !revokeReason) {
      showNotification('Please fill in both admin password and reason for revocation.', 'error');
      return;
    }
    setRevokeLoading(true);
    try {
      const res = await adminService.revokeCampaign(token, selectedCampaign.bookingId, revokeReason, revokePassword);
      if (res.data.success) {
        showNotification(`Campaign ${selectedCampaign.bookingId} revoked cleanly.`, 'success');
        setShowRevokeModal(false);
        setSelectedCampaign(null);
        setRevokePassword('');
        setRevokeReason('');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to revoke campaign. Verify admin password.', 'error');
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleReviewDeviceRequest = async (requestId, status) => {
    try {
      const res = await adminService.reviewDeviceRequest(token, requestId, status);
      if (res.data.success) {
        showNotification(`Device request ${status} successfully!`, 'success');
        setShowDeviceReqModal(false);
        setSelectedDeviceReq(null);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleDeployDevice = async (e) => {
    e.preventDefault();
    if (!deviceForm.hostApplicationId) {
      showNotification('Please select a target approved venue outlet.', 'error');
      return;
    }
    try {
      const res = await adminService.deployDevice(token, deviceForm);
      if (res.data.success) {
        showNotification(`New ${deviceForm.deviceType} terminal deployed cleanly!`, 'success');
        setShowDeployForm(false);
        setDeviceForm({ deviceType: 'tablet', hostApplicationId: '' });
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to deploy device.', 'error');
    }
  };

  const handleUploadRelease = async (e) => {
    e.preventDefault();
    if (!releaseForm.file) {
      showNotification('Please select an APK file to upload.', 'error');
      return;
    }
    setUploadingRelease(true);
    try {
      const res = await adminService.uploadRelease(token, releaseForm);
      if (res.data.success) {
        showNotification(`Release v${releaseForm.versionName} uploaded & published!`, 'success');
        setShowReleaseModal(false);
        setReleaseForm({ appType: 'TABLET_APP', versionName: '1.0.1', versionCode: '2', releaseNotes: '', isMandatory: false, file: null });
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to upload release APK.', 'error');
    } finally {
      setUploadingRelease(false);
    }
  };

  const handleToggleReleaseStatus = async (releaseId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'revoked' : 'active';
    if (!confirm(nextStatus === 'revoked' ? 'Revoke this release?' : 'Activate this release?')) return;
    try {
      const res = await adminService.toggleReleaseStatus(token, releaseId, nextStatus);
      if (res.data.success) {
        showNotification(`Release status updated to ${nextStatus}!`, 'success');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to update release status.', 'error');
    }
  };

  const handleCreatePlatformAd = async (e) => {
    e.preventDefault();
    if (!createPlatformAdForm.title.trim() || !createPlatformAdForm.file) {
      showNotification('Please enter title and select media file.', 'error');
      return;
    }
    setUploadingPlatformAd(true);
    setUploadProgress(0);
    try {
      const uploadRes = await adminService.uploadPlatformAdMedia(
        token,
        createPlatformAdForm.file,
        createPlatformAdForm.type,
        (pct) => setUploadProgress(pct)
      );
      if (!uploadRes.data.success) throw new Error(uploadRes.data.message || 'Media upload failed');
      const uploadedData = uploadRes.data.data;
      const createRes = await adminService.createPlatformAd(token, {
        type: createPlatformAdForm.type,
        title: createPlatformAdForm.title.trim(),
        mediaType: uploadedData.mediaType,
        mediaUrl: uploadedData.mediaUrl,
        mediaUrls: [uploadedData.mediaUrl],
        targetDeviceType: createPlatformAdForm.targetDeviceType,
        targetVenueIds: createPlatformAdForm.type === 'platform' ? createPlatformAdForm.targetVenueIds : [],
        durationSeconds: uploadedData.mediaType === 'video' ? (uploadedData.durationSeconds || 30) : (Number(createPlatformAdForm.durationSeconds) || 10),
        frequency: 'continuous',
        isActive: createPlatformAdForm.isActive
      });
      if (createRes.data.success) {
        showNotification('Platform ad created successfully!', 'success');
        setShowCreatePlatformAdModal(false);
        setCreatePlatformAdForm({ type: 'fallback', title: '', mediaType: null, targetDeviceType: 'all', targetVenueIds: [], durationSeconds: 10, frequency: 'continuous', isActive: true, file: null });
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Failed to create platform ad', 'error');
    } finally {
      setUploadingPlatformAd(false);
      setUploadProgress(0);
    }
  };

  const handleTogglePlatformAdActive = async (ad) => {
    try {
      const newStatus = !ad.isActive;
      const res = await adminService.togglePlatformAdStatus(token, ad._id, newStatus);
      if (res.data.success) {
        showNotification(`Ad status updated to ${newStatus ? 'Active' : 'Inactive'}`, 'success');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update ad status', 'error');
    }
  };

  const handleDeletePlatformAd = async (adId) => {
    if (!confirm('Are you sure you want to delete this ad? Media will be wiped.')) return;
    try {
      const res = await adminService.deletePlatformAd(token, adId);
      if (res.data.success) {
        showNotification('Ad deleted successfully!', 'success');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete ad', 'error');
    }
  };

  const handleUserSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await adminService.updateUser(token, editingUser._id, userForm);
      if (res.data.success) {
        showNotification('User properties updated successfully!', 'success');
        setEditingUser(null);
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update user.', 'error');
    }
  };

  const handleUserDelete = async (e) => {
    e.preventDefault();
    if (!deletingUser || !adminDeletePassword) {
      showNotification('Administrator password required for deletion.', 'error');
      return;
    }
    try {
      const res = await adminService.deleteUser(token, deletingUser._id, adminDeletePassword);
      if (res.data.success) {
        showNotification('User account deleted permanently.', 'success');
        setDeletingUser(null);
        setAdminDeletePassword('');
        fetchDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete user. Check password.', 'error');
    }
  };

  const handleSavePromoDurations = async () => {
    setIsSavingPromoDurations(true);
    try {
      const payload = {
        openDurationSeconds: Math.max(10, Math.min(30, Number(promoDurations.openDurationSeconds) || 10)),
        closedDurationSeconds: Math.max(10, Math.min(30, Number(promoDurations.closedDurationSeconds) || 15))
      };
      const res = await adminService.savePromoDurations(token, payload);
      if (res.data?.success) {
        showNotification('Promo durations updated successfully!', 'success');
        setIsPromoDurationsModalOpen(false);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save promo durations.', 'error');
    } finally {
      setIsSavingPromoDurations(false);
    }
  };

  const handleSaveCommercialImageDuration = async () => {
    setIsSavingCommercialDuration(true);
    try {
      const durationSec = Math.max(5, Math.min(30, Number(commercialImageDuration) || 8));
      const res = await adminService.saveCommercialImageDuration(token, durationSec);
      if (res.data?.success) {
        showNotification('Commercial image duration updated successfully!', 'success');
        setIsCommercialImageDurationModalOpen(false);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save commercial duration.', 'error');
    } finally {
      setIsSavingCommercialDuration(false);
    }
  };

  const fetchCampaignAnalytics = async (bookingId) => {
    if (!bookingId) return;
    setAnalyticsLoading(true);
    setAnalyticsBookingId(bookingId);
    setShowAnalyticsModal(true);
    try {
      const res = await adminService.fetchCampaignAnalytics(token, bookingId);
      if (res.data.success) {
        setActiveAnalyticsData(res.data.data);
        setCooldownRemaining(30);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load campaign analytics.', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return {
    handleResetQuotaNow,
    handleSaveQuotas,
    handleSaveWatermark,
    handleReviewHost,
    handleReviewCampaign,
    handleUpdateBookingCategory,
    handleRevokeCampaign,
    handleReviewDeviceRequest,
    handleDeployDevice,
    handleUploadRelease,
    handleToggleReleaseStatus,
    handleCreatePlatformAd,
    handleTogglePlatformAdActive,
    handleDeletePlatformAd,
    handleUserSave,
    handleUserDelete,
    handleSavePromoDurations,
    handleSaveCommercialImageDuration,
    fetchCampaignAnalytics
  };
}
