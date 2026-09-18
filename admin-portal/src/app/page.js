'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { useAdminStore } from '@/stores/useAdminStore';
import useAdminModals from '@/hooks/useAdminModals';
import { config } from '@/config';

// Layout & Common
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';
import LoginView from '@/components/layout/LoginView';
import AdminToast from '@/components/common/AdminToast';
import AdminModalContainer from '@/components/modals/AdminModalContainer';

// Dynamically split tabs for instant loading and code-splitting
const DashboardTab = dynamic(() => import('@/components/tabs/DashboardTab'), { ssr: false });
const RequestsTab = dynamic(() => import('@/components/tabs/RequestsTab'), { ssr: false });
const VenuesTab = dynamic(() => import('@/components/tabs/VenuesTab'), { ssr: false });
const AdvertisersTab = dynamic(() => import('@/components/tabs/AdvertisersTab'), { ssr: false });
const PlatformAdsTab = dynamic(() => import('@/components/tabs/PlatformAdsTab'), { ssr: false });
const DevicesTab = dynamic(() => import('@/components/tabs/DevicesTab'), { ssr: false });
const OtaTab = dynamic(() => import('@/components/tabs/OtaTab'), { ssr: false });
const UsersTab = dynamic(() => import('@/components/tabs/UsersTab'), { ssr: false });
const RatesTab = dynamic(() => import('@/components/tabs/RatesTab'), { ssr: false });

export default function AdminPortal() {
  const token = useAdminStore((s) => s.token);
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
  const mounted = useAdminStore((s) => s.mounted);
  const activeTab = useAdminStore((s) => s.activeTab);
  const hydrateAuth = useAdminStore((s) => s.hydrateAuth);
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const showNotification = useAdminStore((s) => s.showNotification);

  // Entities
  const hosts = useAdminStore((s) => s.hosts);
  const campaigns = useAdminStore((s) => s.campaigns);

  // Modals management hook
  const modals = useAdminModals(token, fetchDashboardData, showNotification);

  // Initialize Auth
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!mounted || !isAuthenticated || !token) return;
    let ws = null;
    let reconnectTimeout = null;
    let reconnectDelay = 1000;
    let stopReconnect = false;

    const connectWebSocket = () => {
      if (stopReconnect) return;
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
      ws = new WebSocket(`${config.wsUrl}/ws/admin?token=${token}`);
      ws.onopen = () => { reconnectDelay = 1000; };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.error && (payload.error.includes('token') || payload.error.includes('Access denied'))) {
            stopReconnect = true;
            try { ws.close(); } catch (e) {}
            return;
          }
          if ([
            'new_host_app', 'host_app_reviewed', 'new_campaign', 'campaign_reviewed',
            'report_updated', 'new_device_request', 'device_request_reviewed'
          ].includes(payload.event)) {
            fetchDashboardData(token);
          }
        } catch (e) {
          console.error('[WebSocket] Error parsing:', e.message);
        }
      };
      ws.onclose = () => {
        if (stopReconnect) return;
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connectWebSocket();
        }, reconnectDelay);
      };
      ws.onerror = () => {
        try { ws.close(); } catch (e) {}
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.onclose = null;
        try { ws.close(); } catch (e) {}
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [mounted, isAuthenticated, token, fetchDashboardData]);

  if (!mounted) return null;
  if (!isAuthenticated) return <LoginView />;

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden font-sans relative">
      <AdminToast />
      <AdminSidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <AdminHeader
          onSelectHost={(h) => {
            modals.setSelectedHostApp(h);
            modals.setShowVenueModal(true);
          }}
          onOpenHostModal={() => modals.setShowVenueModal(true)}
          onSelectCampaign={(c) => {
            modals.setSelectedCampaign(c);
            modals.setShowDetailsModal(true);
          }}
          onOpenCampaignModal={() => modals.setShowDetailsModal(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <DashboardTab
                onViewRevenue={() => modals.setShowRevenueModal(true)}
                onSelectCampaign={(c) => {
                  modals.setSelectedCampaign(c);
                  modals.setShowDetailsModal(true);
                }}
                onSelectHost={(h) => {
                  modals.setSelectedHostApp(h);
                  modals.setShowVenueModal(true);
                }}
                onSelectUser={(u) => modals.setSelectedUser(u)}
              />
            )}

            {activeTab === 'requests' && (
              <RequestsTab
                watchedVideos={modals.watchedVideos}
                setWatchedVideos={modals.setWatchedVideos}
                onViewCreative={(booking) => {
                  modals.setSelectedCampaign(booking);
                  modals.setActiveVideoUrl(booking.mediaUrl);
                  modals.setShowVideoModal(true);
                  modals.setWatchedVideos((prev) => new Set(prev).add(booking.bookingId));
                }}
                onViewCampaignDetails={(booking) => {
                  modals.setSelectedCampaign(booking);
                  modals.setShowDetailsModal(true);
                }}
                onReviewCampaign={modals.handleReviewCampaign}
                onOpenDenyCampaignModal={(booking) => {
                  modals.setSelectedCampaign(booking);
                  modals.setDenyReasonText('');
                  modals.setShowDenyModal(true);
                }}
                onOpenRevokeCampaignModal={(booking) => {
                  modals.setSelectedCampaign(booking);
                  modals.setRevokePassword('');
                  modals.setRevokeReason('');
                  modals.setShowRevokeModal(true);
                }}
                onSelectHost={(host) => {
                  modals.setSelectedHostApp(host);
                  modals.setShowVenueModal(true);
                }}
                onReviewHost={modals.handleReviewHost}
                onViewDeviceReqModal={(req) => {
                  modals.setSelectedDeviceReq(req);
                  modals.setShowDeviceReqModal(true);
                }}
                onReviewDeviceRequest={modals.handleReviewDeviceRequest}
              />
            )}

            {activeTab === 'venues' && (
              <VenuesTab
                onSelectVenue={(v) => {
                  modals.setSelectedHostApp(v);
                  modals.setShowVenueModal(true);
                }}
                onOpenQuotaModal={modals.openQuotaModal}
                onOpenWatermarkModal={modals.openWatermarkModal}
                onResetQuota={modals.handleResetQuotaNow}
                onOpenPromoDurations={() => modals.setIsPromoDurationsModalOpen(true)}
              />
            )}

            {activeTab === 'advertisers' && (
              <AdvertisersTab
                onSelectAdvertiser={(adv) => {
                  modals.setSelectedAdvertiserUser(adv);
                  modals.setShowAdvertiserAdsModal(true);
                }}
              />
            )}

            {activeTab === 'platform_ads' && (
              <PlatformAdsTab
                onOpenCreateModal={() => modals.setShowCreatePlatformAdModal(true)}
                onPreviewAd={(ad) => modals.setPreviewPlatformAd(ad)}
                onToggleStatus={modals.handleTogglePlatformAdActive}
                onDeleteAd={modals.handleDeletePlatformAd}
                onEditAd={modals.handleOpenEditPlatformAd}
              />
            )}

            {activeTab === 'devices' && (
              <DevicesTab onOpenDeployModal={() => modals.setShowDeployForm(true)} />
            )}

            {activeTab === 'ota' && (
              <OtaTab
                onOpenUploadModal={() => modals.setShowReleaseModal(true)}
                onToggleRelease={modals.handleToggleReleaseStatus}
              />
            )}

            {activeTab === 'users' && (
              <UsersTab
                onSelectUser={(u) => modals.setSelectedUser(u)}
                onEditUser={(u) => {
                  modals.setEditingUser(u);
                  modals.setUserForm({
                    name: u.name || '',
                    phone: u.phone || '',
                    email: u.email || '',
                    roles: u.roles || [u.role]
                  });
                }}
                onDeleteUser={(u) => {
                  modals.setDeletingUser(u);
                  modals.setAdminDeletePassword('');
                }}
                onOpenQuotaModal={modals.openQuotaModal}
              />
            )}

            {activeTab === 'rates' && (
              <RatesTab
                onSaveRate={modals.handleSaveRate}
                onDeleteRate={modals.handleDeleteRate}
                onOpenCommercialImageDurationModal={() => modals.setIsCommercialImageDurationModalOpen(true)}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ALL MODAL OVERLAYS */}
      <AdminModalContainer
        {...modals}
        hosts={hosts}
        campaigns={campaigns}
        showNotification={showNotification}
      />
    </div>
  );
}
