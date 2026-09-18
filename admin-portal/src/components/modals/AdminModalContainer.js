'use client';

import React from 'react';
import UserDetailsModal from './UserDetailsModal';
import UserEditModal from './UserEditModal';
import UserDeleteModal from './UserDeleteModal';
import VenueDetailsModal from './VenueDetailsModal';
import VenueWatermarkModal from './VenueWatermarkModal';
import VenueQuotaModal from './VenueQuotaModal';
import DeviceRequestModal from './DeviceRequestModal';
import CreativePreviewModal from './CreativePreviewModal';
import CampaignReviewModal from './CampaignReviewModal';
import CampaignDenyModal from './CampaignDenyModal';
import CampaignRevokeModal from './CampaignRevokeModal';
import RevenueDetailsModal from './RevenueDetailsModal';
import CampaignAnalyticsModal from './CampaignAnalyticsModal';
import PromoDurationsModal from './PromoDurationsModal';
import CommercialImageDurationModal from './CommercialImageDurationModal';
import ReleaseUploadModal from './ReleaseUploadModal';
import PlatformAdModal from './PlatformAdModal';
import PlatformAdPreviewModal from './PlatformAdPreviewModal';
import PlatformAdResolutionModal from './PlatformAdResolutionModal';
import DeployDeviceModal from './DeployDeviceModal';
import AdvertiserAdsModal from './AdvertiserAdsModal';

export default function AdminModalContainer({
  // Venue modals
  selectedHostApp,
  showVenueModal,
  setShowVenueModal,
  setSelectedHostApp,
  handleReviewHost,
  openQuotaModal,
  openWatermarkModal,
  handleResetQuotaNow,
  showWatermarkModal,
  setShowWatermarkModal,
  watermarkForm,
  setWatermarkForm,
  handleSaveWatermark,
  watermarkSaving,
  isQuotaModalOpen,
  setIsQuotaModalOpen,
  quotaForm,
  setQuotaForm,
  activeQuotaTab,
  setActiveQuotaTab,
  handleSaveQuotas,
  handleResetQuotaDefaults,

  // Device request & deploy
  selectedDeviceReq,
  showDeviceReqModal,
  setShowDeviceReqModal,
  setSelectedDeviceReq,
  handleReviewDeviceRequest,
  showDeployForm,
  setShowDeployForm,
  deviceForm,
  setDeviceForm,
  handleDeployDevice,

  // Creative & Campaigns
  showVideoModal,
  setShowVideoModal,
  activeVideoUrl,
  setActiveVideoUrl,
  selectedCampaign,
  setSelectedCampaign,
  setWatchedVideos,
  showDetailsModal,
  setShowDetailsModal,
  fetchCampaignAnalytics,
  handleUpdateBookingCategory,
  showDenyModal,
  setShowDenyModal,
  denyReasonText,
  setDenyReasonText,
  handleReviewCampaign,
  showRevokeModal,
  setShowRevokeModal,
  revokeReason,
  setRevokeReason,
  revokePassword,
  setRevokePassword,
  revokeLoading,
  handleRevokeCampaign,
  showRevenueModal,
  setShowRevenueModal,
  campaigns,
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
  handleUserSave,
  deletingUser,
  setDeletingUser,
  adminDeletePassword,
  setAdminDeletePassword,
  handleUserDelete,

  // Settings
  isPromoDurationsModalOpen,
  setIsPromoDurationsModalOpen,
  promoDurations,
  setPromoDurations,
  hosts,
  isSavingPromoDurations,
  handleSavePromoDurations,
  isCommercialImageDurationModalOpen,
  setIsCommercialImageDurationModalOpen,
  commercialImageDuration,
  setCommercialImageDuration,
  isSavingCommercialDuration,
  handleSaveCommercialImageDuration,

  // Release
  showReleaseModal,
  setShowReleaseModal,
  releaseForm,
  setReleaseForm,
  uploadingRelease,
  handleUploadRelease,

  // Platform Ads
  showCreatePlatformAdModal,
  setShowCreatePlatformAdModal,
  createPlatformAdForm,
  setCreatePlatformAdForm,
  uploadingPlatformAd,
  uploadProgress,
  handleCreatePlatformAd,
  setPlatformAdResolutionWarning,
  showNotification,
  previewPlatformAd,
  setPreviewPlatformAd,
  platformAdResolutionWarning,

  // Advertiser Ads
  showAdvertiserAdsModal,
  setShowAdvertiserAdsModal,
  selectedAdvertiserUser,
  setSelectedAdvertiserUser
}) {
  return (
    <>
      <VenueDetailsModal
        selectedHostApp={selectedHostApp}
        onClose={() => {
          setShowVenueModal(false);
          setSelectedHostApp(null);
        }}
        onReview={handleReviewHost}
        onOpenQuota={openQuotaModal}
        onOpenWatermark={openWatermarkModal}
        onResetQuota={handleResetQuotaNow}
      />

      <VenueWatermarkModal
        isOpen={showWatermarkModal}
        selectedHostApp={selectedHostApp}
        watermarkForm={watermarkForm}
        setWatermarkForm={setWatermarkForm}
        onClose={() => setShowWatermarkModal(false)}
        onSave={handleSaveWatermark}
        saving={watermarkSaving}
      />

      <VenueQuotaModal
        isOpen={isQuotaModalOpen}
        selectedHostApp={selectedHostApp}
        quotaForm={quotaForm}
        setQuotaForm={setQuotaForm}
        activeQuotaTab={activeQuotaTab}
        setActiveQuotaTab={setActiveQuotaTab}
        onClose={() => setIsQuotaModalOpen(false)}
        onSave={handleSaveQuotas}
        onResetDefaults={handleResetQuotaDefaults}
        onResetQuotaNow={handleResetQuotaNow}
      />

      <DeviceRequestModal
        selectedDeviceReq={selectedDeviceReq}
        onClose={() => {
          setShowDeviceReqModal(false);
          setSelectedDeviceReq(null);
        }}
        onReview={handleReviewDeviceRequest}
      />

      <CreativePreviewModal
        isOpen={showVideoModal}
        activeVideoUrl={activeVideoUrl}
        selectedCampaign={selectedCampaign}
        onClose={() => {
          setShowVideoModal(false);
          setActiveVideoUrl('');
        }}
        onMediaPlayed={(id) => setWatchedVideos((prev) => new Set(prev).add(id))}
      />

      <CampaignReviewModal
        isOpen={showDetailsModal}
        selectedCampaign={selectedCampaign}
        setSelectedCampaign={setSelectedCampaign}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCampaign(null);
        }}
        onPreviewCreative={(url) => {
          setActiveVideoUrl(url);
          setShowVideoModal(true);
        }}
        onOpenAnalytics={fetchCampaignAnalytics}
        onUpdateCategory={handleUpdateBookingCategory}
        onApprove={(bookingId) => {
          handleReviewCampaign(bookingId, 'approve');
          setShowDetailsModal(false);
        }}
        onOpenDeny={(campaign) => {
          setShowDetailsModal(false);
          setSelectedCampaign(campaign);
          setDenyReasonText('');
          setShowDenyModal(true);
        }}
      />

      <CampaignDenyModal
        isOpen={showDenyModal}
        selectedCampaign={selectedCampaign}
        denyReasonText={denyReasonText}
        setDenyReasonText={setDenyReasonText}
        onClose={() => {
          setShowDenyModal(false);
          setSelectedCampaign(null);
          setDenyReasonText('');
        }}
        onConfirm={(e) => {
          e.preventDefault();
          handleReviewCampaign(selectedCampaign.bookingId, 'reject', denyReasonText);
          setShowDenyModal(false);
          setSelectedCampaign(null);
          setDenyReasonText('');
        }}
      />

      <CampaignRevokeModal
        isOpen={showRevokeModal}
        selectedCampaign={selectedCampaign}
        revokeReason={revokeReason}
        setRevokeReason={setRevokeReason}
        revokePassword={revokePassword}
        setRevokePassword={setRevokePassword}
        revokeLoading={revokeLoading}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedCampaign(null);
          setRevokePassword('');
          setRevokeReason('');
        }}
        onRevoke={handleRevokeCampaign}
      />

      <RevenueDetailsModal
        isOpen={showRevenueModal}
        campaigns={campaigns}
        onClose={() => setShowRevenueModal(false)}
      />

      <CampaignAnalyticsModal
        isOpen={showAnalyticsModal}
        analyticsBookingId={analyticsBookingId}
        activeAnalyticsData={activeAnalyticsData}
        analyticsLoading={analyticsLoading}
        cooldownRemaining={cooldownRemaining}
        onRefresh={fetchCampaignAnalytics}
        onClose={() => {
          setShowAnalyticsModal(false);
          setAnalyticsBookingId('');
          setActiveAnalyticsData(null);
        }}
      />

      <UserDetailsModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onEdit={(user) => {
          setSelectedUser(null);
          setEditingUser(user);
          setUserForm({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            roles: user.roles || [user.role]
          });
        }}
        onEditQuotas={(venue) => {
          setSelectedUser(null);
          openQuotaModal(venue);
        }}
        merchantVenues={hosts.filter(
          (h) => (h.userId?._id || h.userId)?.toString() === selectedUser?._id?.toString() && h.status === 'approved'
        )}
      />

      <UserEditModal
        editingUser={editingUser}
        userForm={userForm}
        setUserForm={setUserForm}
        onClose={() => setEditingUser(null)}
        onSave={handleUserSave}
      />

      <UserDeleteModal
        deletingUser={deletingUser}
        adminDeletePassword={adminDeletePassword}
        setAdminDeletePassword={setAdminDeletePassword}
        onClose={() => {
          setDeletingUser(null);
          setAdminDeletePassword('');
        }}
        onConfirmDelete={handleUserDelete}
      />

      <PromoDurationsModal
        isOpen={isPromoDurationsModalOpen}
        promoDurations={promoDurations}
        setPromoDurations={setPromoDurations}
        hosts={hosts}
        isSaving={isSavingPromoDurations}
        onSave={handleSavePromoDurations}
        onClose={() => setIsPromoDurationsModalOpen(false)}
      />

      <CommercialImageDurationModal
        isOpen={isCommercialImageDurationModalOpen}
        commercialImageDuration={commercialImageDuration}
        setCommercialImageDuration={setCommercialImageDuration}
        isSaving={isSavingCommercialDuration}
        onSave={handleSaveCommercialImageDuration}
        onClose={() => setIsCommercialImageDurationModalOpen(false)}
      />

      <DeployDeviceModal
        isOpen={showDeployForm}
        deviceForm={deviceForm}
        setDeviceForm={setDeviceForm}
        hosts={hosts}
        onDeploy={handleDeployDevice}
        onClose={() => setShowDeployForm(false)}
      />

      <ReleaseUploadModal
        isOpen={showReleaseModal}
        releaseForm={releaseForm}
        setReleaseForm={setReleaseForm}
        uploadingRelease={uploadingRelease}
        onUpload={handleUploadRelease}
        onClose={() => setShowReleaseModal(false)}
      />

      <PlatformAdModal
        isOpen={showCreatePlatformAdModal}
        createPlatformAdForm={createPlatformAdForm}
        setCreatePlatformAdForm={setCreatePlatformAdForm}
        hosts={hosts}
        uploadingPlatformAd={uploadingPlatformAd}
        uploadProgress={uploadProgress}
        onCreate={handleCreatePlatformAd}
        onClose={() => setShowCreatePlatformAdModal(false)}
        setPlatformAdResolutionWarning={setPlatformAdResolutionWarning}
        showToast={(msg, type) => showNotification(msg, type)}
      />

      <PlatformAdPreviewModal
        previewPlatformAd={previewPlatformAd}
        onClose={() => setPreviewPlatformAd(null)}
      />

      <PlatformAdResolutionModal
        platformAdResolutionWarning={platformAdResolutionWarning}
        onChangeVideo={() => {
          setCreatePlatformAdForm((prev) => ({ ...prev, file: null }));
          setPlatformAdResolutionWarning(null);
        }}
        onContinue={() => {
          setPlatformAdResolutionWarning(null);
          showNotification('Video retained! Click "Upload & Create Ad" to proceed.', 'info');
        }}
      />

      <AdvertiserAdsModal
        isOpen={showAdvertiserAdsModal}
        selectedAdvertiserUser={selectedAdvertiserUser}
        campaigns={campaigns}
        onClose={() => {
          setShowAdvertiserAdsModal(false);
          setSelectedAdvertiserUser(null);
        }}
        onViewCreative={(booking) => {
          setSelectedCampaign(booking);
          setActiveVideoUrl(booking.mediaUrl);
          setShowVideoModal(true);
        }}
        onViewAnalytics={fetchCampaignAnalytics}
        onViewDetails={(booking) => {
          setSelectedCampaign(booking);
          setShowDetailsModal(true);
        }}
        onRevokeCampaign={(booking) => {
          setSelectedCampaign(booking);
          setRevokePassword('');
          setRevokeReason('');
          setShowRevokeModal(true);
        }}
      />
    </>
  );
}
