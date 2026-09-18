'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/stores/useAdminStore';
import CampaignsRequestSubTab from './requests/CampaignsRequestSubTab';
import VenuesRequestSubTab from './requests/VenuesRequestSubTab';
import DeviceRequestSubTab from './requests/DeviceRequestSubTab';
import ModeChangeRequestSubTab from './requests/ModeChangeRequestSubTab';

export default function RequestsTab({
  watchedVideos: externalWatchedVideos,
  setWatchedVideos: externalSetWatchedVideos,
  onReviewCampaign,
  onOpenDenyCampaignModal,
  onOpenRevokeCampaignModal,
  onViewCreative,
  onViewCampaignDetails,
  onSelectHost,
  onReviewHost,
  onViewDeviceReqModal,
  onReviewDeviceRequest,
  onReviewModeChange
}) {
  const [requestsSubTab, setRequestsSubTab] = useState('campaigns'); // 'campaigns' | 'hosts' | 'devices' | 'mode_changes'
  const [hostFilter, setHostFilter] = useState('pending');
  const [adFilter, setAdFilter] = useState('pending');
  const [deviceReqFilter, setDeviceReqFilter] = useState('pending');
  const [modeChangeFilter, setModeChangeFilter] = useState('pending');
  const [localWatchedVideos, setLocalWatchedVideos] = useState(new Set());

  const watchedVideos = externalWatchedVideos || localWatchedVideos;
  const setWatchedVideos = externalSetWatchedVideos || setLocalWatchedVideos;

  const hosts = useAdminStore((s) => s.hosts);
  const campaigns = useAdminStore((s) => s.campaigns);
  const deviceRequests = useAdminStore((s) => s.deviceRequests);
  const modeChangeRequests = useAdminStore((s) => s.modeChangeRequests);
  const setSelectedHostApp = useAdminStore((s) => s.setSelectedHostApp);
  const setShowVenueModal = useAdminStore((s) => s.setShowVenueModal);

  // Filtered lists
  const filteredCampaigns = campaigns.filter((c) => {
    if (adFilter === 'all') return true;
    if (adFilter === 'rejected') return c.approvalStatus === 'rejected';
    if (adFilter === 'pending') {
      return (
        c.paymentStatus === 'completed' &&
        c.approvalStatus === 'pending' &&
        c.mediaUrl &&
        c.mediaUrl.trim() !== '' &&
        (c.transcodeStatus === 'completed' || !c.transcodeStatus)
      );
    }
    return c.approvalStatus === adFilter;
  });

  const filteredHosts = hosts.filter((h) => {
    if (hostFilter === 'all') return true;
    return h.status === hostFilter;
  });

  const filteredDeviceReqs = deviceRequests.filter((req) => {
    if (deviceReqFilter === 'all') return true;
    return req.status === deviceReqFilter;
  });

  const filteredModeReqs = modeChangeRequests.filter((req) => {
    if (modeChangeFilter === 'all') return true;
    return req.status === modeChangeFilter;
  });

  return (
    <motion.div
      key="requests-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Subtab Buttons & Filters */}
      <div className="bg-card/40 border border-border p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap shadow-sm">
        <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
          <button
            onClick={() => setRequestsSubTab('campaigns')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              requestsSubTab === 'campaigns'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ad Campaigns
          </button>
          <button
            onClick={() => setRequestsSubTab('hosts')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              requestsSubTab === 'hosts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Venue Applications
          </button>
          <button
            onClick={() => setRequestsSubTab('devices')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              requestsSubTab === 'devices'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Device Requests
          </button>
          <button
            onClick={() => setRequestsSubTab('mode_changes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              requestsSubTab === 'mode_changes'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mode Changes
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {requestsSubTab === 'campaigns' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground font-semibold">Moderation Status:</span>
              <select
                value={adFilter}
                onChange={(e) => setAdFilter(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold cursor-pointer"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved & Streaming</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Campaigns</option>
              </select>
            </div>
          )}

          {requestsSubTab === 'hosts' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <select
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold cursor-pointer"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Applications</option>
              </select>
            </div>
          )}

          {requestsSubTab === 'devices' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <select
                value={deviceReqFilter}
                onChange={(e) => setDeviceReqFilter(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Requests</option>
              </select>
            </div>
          )}

          {requestsSubTab === 'mode_changes' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <select
                value={modeChangeFilter}
                onChange={(e) => setModeChangeFilter(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-bold cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Requests</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Subtab Content Panels */}
      {requestsSubTab === 'campaigns' && (
        <CampaignsRequestSubTab
          filteredCampaigns={filteredCampaigns}
          adFilter={adFilter}
          watchedVideos={watchedVideos}
          setWatchedVideos={setWatchedVideos}
          onReviewCampaign={onReviewCampaign}
          onOpenDenyCampaignModal={onOpenDenyCampaignModal}
          onOpenRevokeCampaignModal={onOpenRevokeCampaignModal}
          onViewCreative={onViewCreative}
          onViewCampaignDetails={onViewCampaignDetails}
        />
      )}

      {requestsSubTab === 'hosts' && (
        <VenuesRequestSubTab
          filteredHosts={filteredHosts}
          onSelectHost={(host) => {
            if (onSelectHost) onSelectHost(host);
            else {
              setSelectedHostApp(host);
              setShowVenueModal(true);
            }
          }}
          onReviewHost={onReviewHost}
        />
      )}

      {requestsSubTab === 'devices' && (
        <DeviceRequestSubTab
          filteredDeviceReqs={filteredDeviceReqs}
          onViewDeviceReqModal={onViewDeviceReqModal}
          onReviewDeviceRequest={onReviewDeviceRequest}
        />
      )}

      {requestsSubTab === 'mode_changes' && (
        <ModeChangeRequestSubTab
          filteredModeReqs={filteredModeReqs}
          onReviewModeChange={onReviewModeChange}
        />
      )}
    </motion.div>
  );
}
