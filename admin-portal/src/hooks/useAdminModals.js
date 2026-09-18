'use client';

import { useState, useEffect } from 'react';
import useModalDismiss from './useModalDismiss';
import useAdminModalActions from './useAdminModalActions';

export default function useAdminModals(token, fetchDashboardData, showNotification) {
  // Venue Modal States
  const [selectedHostApp, setSelectedHostApp] = useState(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkForm, setWatermarkForm] = useState({ showPoweredBy: true, customWatermark: 'POWERED BY - DIGIADS' });
  const [watermarkSaving, setWatermarkSaving] = useState(false);

  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [activeQuotaTab, setActiveQuotaTab] = useState('tablet');
  const [quotaForm, setQuotaForm] = useState({
    customMaxVideoSlots: '',
    customDailyVideoQuota: '',
    customMaxImageSlots: '',
    customDailyImageQuota: '',
    customMaxScreenVideoSlots: '',
    customDailyScreenVideoQuota: '',
    customMaxScreenImageSlots: '',
    customDailyScreenImageQuota: ''
  });

  // Device Requests & Deploy
  const [selectedDeviceReq, setSelectedDeviceReq] = useState(null);
  const [showDeviceReqModal, setShowDeviceReqModal] = useState(false);
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ deviceType: 'tablet', hostApplicationId: '' });

  // Creative & Campaigns
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [watchedVideos, setWatchedVideos] = useState(new Set());

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReasonText, setDenyReasonText] = useState('');

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokePassword, setRevokePassword] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [showRevenueModal, setShowRevenueModal] = useState(false);

  // Analytics
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsBookingId, setAnalyticsBookingId] = useState('');
  const [activeAnalyticsData, setActiveAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Users
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', phone: '', email: '', roles: [] });
  const [deletingUser, setDeletingUser] = useState(null);
  const [adminDeletePassword, setAdminDeletePassword] = useState('');

  // Settings
  const [isPromoDurationsModalOpen, setIsPromoDurationsModalOpen] = useState(false);
  const [promoDurations, setPromoDurations] = useState({ openDurationSeconds: 10, closedDurationSeconds: 15 });
  const [isSavingPromoDurations, setIsSavingPromoDurations] = useState(false);

  const [isCommercialImageDurationModalOpen, setIsCommercialImageDurationModalOpen] = useState(false);
  const [commercialImageDuration, setCommercialImageDuration] = useState(8);
  const [isSavingCommercialDuration, setIsSavingCommercialDuration] = useState(false);

  // Releases
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    appType: 'TABLET_APP',
    versionName: '1.0.1',
    versionCode: '2',
    releaseNotes: '',
    isMandatory: false,
    file: null
  });
  const [uploadingRelease, setUploadingRelease] = useState(false);

  // Platform Ads
  const [showCreatePlatformAdModal, setShowCreatePlatformAdModal] = useState(false);
  const [createPlatformAdForm, setCreatePlatformAdForm] = useState({
    type: 'fallback',
    title: '',
    mediaType: null,
    targetDeviceType: 'all',
    targetVenueIds: [],
    durationSeconds: 10,
    frequency: 'continuous',
    isActive: true,
    file: null
  });
  const [uploadingPlatformAd, setUploadingPlatformAd] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewPlatformAd, setPreviewPlatformAd] = useState(null);
  const [platformAdResolutionWarning, setPlatformAdResolutionWarning] = useState(null);

  // Advertiser Ads
  const [selectedAdvertiserUser, setSelectedAdvertiserUser] = useState(null);
  const [showAdvertiserAdsModal, setShowAdvertiserAdsModal] = useState(false);

  // Cooldown timer for analytics
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => setCooldownRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Modal dismiss registrations
  useModalDismiss(showVenueModal, () => setShowVenueModal(false), 'venue-details-modal');
  useModalDismiss(showWatermarkModal, () => setShowWatermarkModal(false), 'venue-watermark-modal');
  useModalDismiss(isQuotaModalOpen, () => setIsQuotaModalOpen(false), 'venue-quota-modal');
  useModalDismiss(showDeviceReqModal, () => setShowDeviceReqModal(false), 'device-req-modal');
  useModalDismiss(showVideoModal, () => setShowVideoModal(false), 'video-preview-modal');
  useModalDismiss(showDetailsModal, () => setShowDetailsModal(false), 'campaign-details-modal');
  useModalDismiss(showDenyModal, () => setShowDenyModal(false), 'campaign-deny-modal');
  useModalDismiss(showRevokeModal, () => setShowRevokeModal(false), 'campaign-revoke-modal');
  useModalDismiss(showRevenueModal, () => setShowRevenueModal(false), 'revenue-details-modal');
  useModalDismiss(showAnalyticsModal, () => setShowAnalyticsModal(false), 'campaign-analytics-modal');
  useModalDismiss(Boolean(selectedUser), () => setSelectedUser(null), 'user-details-modal');
  useModalDismiss(Boolean(editingUser), () => setEditingUser(null), 'user-edit-modal');
  useModalDismiss(Boolean(deletingUser), () => setDeletingUser(null), 'user-delete-modal');
  useModalDismiss(isPromoDurationsModalOpen, () => setIsPromoDurationsModalOpen(false), 'promo-durations-modal');
  useModalDismiss(isCommercialImageDurationModalOpen, () => setIsCommercialImageDurationModalOpen(false), 'commercial-duration-modal');
  useModalDismiss(showDeployForm, () => setShowDeployForm(false), 'deploy-device-modal');
  useModalDismiss(showReleaseModal, () => setShowReleaseModal(false), 'release-upload-modal');
  useModalDismiss(showCreatePlatformAdModal, () => setShowCreatePlatformAdModal(false), 'create-platform-ad-modal');
  useModalDismiss(Boolean(previewPlatformAd), () => setPreviewPlatformAd(null), 'preview-platform-ad-modal');
  useModalDismiss(Boolean(platformAdResolutionWarning), () => setPlatformAdResolutionWarning(null), 'resolution-warning-modal');
  useModalDismiss(showAdvertiserAdsModal, () => setShowAdvertiserAdsModal(false), 'advertiser-ads-modal');

  // Quota & Watermark helpers
  const openQuotaModal = (hostApp) => {
    setSelectedHostApp(hostApp);
    const isClosed = hostApp?.allowOpenAds === false || hostApp?.adMode === 'closed';
    setActiveQuotaTab('tablet');
    setQuotaForm({
      customMaxVideoSlots: hostApp?.customMaxVideoSlots ?? (isClosed ? 3 : 2),
      customDailyVideoQuota: hostApp?.customDailyVideoQuota ?? (isClosed ? 6 : 4),
      customMaxImageSlots: hostApp?.customMaxImageSlots ?? (isClosed ? 8 : 3),
      customDailyImageQuota: hostApp?.customDailyImageQuota ?? (isClosed ? 15 : 10),
      customMaxScreenVideoSlots: hostApp?.customMaxScreenVideoSlots ?? hostApp?.customMaxScreenSlots ?? (isClosed ? 3 : 2),
      customDailyScreenVideoQuota: hostApp?.customDailyScreenVideoQuota ?? hostApp?.customDailyScreenQuota ?? (isClosed ? 6 : 4),
      customMaxScreenImageSlots: hostApp?.customMaxScreenImageSlots ?? hostApp?.customMaxScreenSlots ?? (isClosed ? 8 : 3),
      customDailyScreenImageQuota: hostApp?.customDailyScreenImageQuota ?? (isClosed ? 15 : 10)
    });
    setIsQuotaModalOpen(true);
  };

  const openWatermarkModal = (hostApp) => {
    setSelectedHostApp(hostApp);
    const billConfig = hostApp?.billConfig || {};
    setWatermarkForm({
      showPoweredBy: billConfig.showPoweredBy !== false,
      customWatermark: billConfig.customWatermark !== undefined ? billConfig.customWatermark : 'POWERED BY - DIGIADS'
    });
    setShowWatermarkModal(true);
  };

  const handleResetQuotaDefaults = () => {
    if (!selectedHostApp) return;
    const isClosed = selectedHostApp?.allowOpenAds === false || selectedHostApp?.adMode === 'closed';
    setQuotaForm({
      customMaxVideoSlots: isClosed ? 3 : 2,
      customDailyVideoQuota: isClosed ? 6 : 4,
      customMaxImageSlots: isClosed ? 8 : 3,
      customDailyImageQuota: isClosed ? 15 : 10,
      customMaxScreenVideoSlots: isClosed ? 3 : 2,
      customDailyScreenVideoQuota: isClosed ? 6 : 4,
      customMaxScreenImageSlots: isClosed ? 8 : 3,
      customDailyScreenImageQuota: isClosed ? 15 : 10
    });
  };

  const modalActions = useAdminModalActions({
    token,
    fetchDashboardData,
    showNotification,
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
  });

  return {
    ...modalActions,

    // Venue states
    selectedHostApp,
    showVenueModal,
    setShowVenueModal,
    setSelectedHostApp,
    openQuotaModal,
    openWatermarkModal,
    handleResetQuotaDefaults,
    showWatermarkModal,
    setShowWatermarkModal,
    watermarkForm,
    setWatermarkForm,
    watermarkSaving,
    isQuotaModalOpen,
    setIsQuotaModalOpen,
    activeQuotaTab,
    setActiveQuotaTab,
    quotaForm,
    setQuotaForm,

    // Device Requests & Deploy
    showDeviceReqModal,
    setShowDeviceReqModal,
    selectedDeviceReq,
    setSelectedDeviceReq,
    showDeployForm,
    setShowDeployForm,
    deviceForm,
    setDeviceForm,

    // Creative & Campaigns
    showVideoModal,
    setShowVideoModal,
    activeVideoUrl,
    setActiveVideoUrl,
    watchedVideos,
    setWatchedVideos,
    selectedCampaign,
    setSelectedCampaign,
    showDetailsModal,
    setShowDetailsModal,
    showDenyModal,
    setShowDenyModal,
    denyReasonText,
    setDenyReasonText,
    showRevokeModal,
    setShowRevokeModal,
    revokeReason,
    setRevokeReason,
    revokePassword,
    setRevokePassword,
    revokeLoading,
    showRevenueModal,
    setShowRevenueModal,

    // Analytics
    showAnalyticsModal,
    setShowAnalyticsModal,
    analyticsBookingId,
    setAnalyticsBookingId,
    activeAnalyticsData,
    setActiveAnalyticsData,
    analyticsLoading,
    cooldownRemaining,

    // Users
    selectedUser,
    setSelectedUser,
    editingUser,
    setEditingUser,
    userForm,
    setUserForm,
    deletingUser,
    setDeletingUser,
    adminDeletePassword,
    setAdminDeletePassword,

    // Settings
    isPromoDurationsModalOpen,
    setIsPromoDurationsModalOpen,
    promoDurations,
    setPromoDurations,
    isSavingPromoDurations,
    isCommercialImageDurationModalOpen,
    setIsCommercialImageDurationModalOpen,
    commercialImageDuration,
    setCommercialImageDuration,
    isSavingCommercialDuration,

    // Release
    showReleaseModal,
    setShowReleaseModal,
    releaseForm,
    setReleaseForm,
    uploadingRelease,

    // Platform Ads
    showCreatePlatformAdModal,
    setShowCreatePlatformAdModal,
    createPlatformAdForm,
    setCreatePlatformAdForm,
    uploadingPlatformAd,
    uploadProgress,
    previewPlatformAd,
    setPreviewPlatformAd,
    platformAdResolutionWarning,
    setPlatformAdResolutionWarning,

    // Advertiser Ads
    selectedAdvertiserUser,
    setSelectedAdvertiserUser,
    showAdvertiserAdsModal,
    setShowAdvertiserAdsModal
  };
}
