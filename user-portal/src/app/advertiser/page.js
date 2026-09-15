"use client";

import { useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import { useAdvertiserStore } from "@/stores/useAdvertiserStore";
import AdvertiserHeader from "@/components/advertiser/layout/AdvertiserHeader";
import AdvertiserToast from "@/components/advertiser/common/AdvertiserToast";

// Dynamic imports for code-splitting
const CampaignsTab = dynamic(() => import("@/components/advertiser/tabs/CampaignsTab"), { ssr: false });
const BookAdTab = dynamic(() => import("@/components/advertiser/tabs/BookAdTab"), { ssr: false });
const AnalyticsModal = dynamic(() => import("@/components/advertiser/modals/AnalyticsModal"), { ssr: false });
const MediaPreviewModal = dynamic(() => import("@/components/advertiser/modals/MediaPreviewModal"), { ssr: false });
const VideoPlayerModal = dynamic(() => import("@/components/advertiser/modals/VideoPlayerModal"), { ssr: false });
const VideoResolutionModal = dynamic(() => import("@/components/advertiser/modals/VideoResolutionModal"), { ssr: false });

function AdvertiserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeTab,
    token,
    hydrateAuth,
    fetchBookings,
    fetchStates,
    fetchRates,
    handleVerifyPayment,
    showAnalyticsModal,
    closeAnalyticsModal,
    showMediaModal,
    setShowMediaModal,
    previewVideoUrl,
    setPreviewVideoUrl,
    videoResolutionWarning,
    setVideoResolutionWarning,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useAdvertiserStore();

  // Handle hardware / back button / esc dismiss for open overlays
  const anyModalOpen = showAnalyticsModal || showMediaModal || !!previewVideoUrl || !!videoResolutionWarning || mobileMenuOpen;
  useModalDismiss(anyModalOpen, () => {
    if (showAnalyticsModal) closeAnalyticsModal();
    else if (showMediaModal) setShowMediaModal(false);
    else if (previewVideoUrl) setPreviewVideoUrl(null);
    else if (videoResolutionWarning) setVideoResolutionWarning(null);
    else if (mobileMenuOpen) setMobileMenuOpen(false);
  });

  // Initial auth hydration & data fetch
  useEffect(() => {
    hydrateAuth(router);
  }, [hydrateAuth, router]);

  useEffect(() => {
    if (!token) return;
    fetchBookings();
    fetchStates();
    fetchRates();

    const verifyBookingId = searchParams.get("verifyBookingId");
    if (verifyBookingId) {
      handleVerifyPayment(verifyBookingId, token, true);
      // Clear verifyBookingId query parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [token, searchParams, fetchBookings, fetchStates, fetchRates, handleVerifyPayment]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <AdvertiserHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "bookings" && <CampaignsTab />}
        {activeTab === "new-booking" && <BookAdTab />}
      </main>

      <AnalyticsModal />
      <MediaPreviewModal />
      <VideoPlayerModal />
      <VideoResolutionModal />
      <AdvertiserToast />
    </div>
  );
}

export default function AdvertiserPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AdvertiserContent />
    </Suspense>
  );
}
