'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  Unlock,
  Lock,
  Eye,
  Settings,
  Clock
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function VenuesTab({
  onSelectVenue,
  onOpenQuotaModal,
  onOpenWatermarkModal,
  onOpenPromoDurations
}) {
  const hosts = useAdminStore((s) => s.hosts);
  const devices = useAdminStore((s) => s.devices);
  const venueStatusFilter = useAdminStore((s) => s.venueStatusFilter);
  const setVenueStatusFilter = useAdminStore((s) => s.setVenueStatusFilter);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const setSelectedHostApp = useAdminStore((s) => s.setSelectedHostApp);
  const setShowVenueModal = useAdminStore((s) => s.setShowVenueModal);
  const setIsPromoDurationsModalOpen = useAdminStore((s) => s.setIsPromoDurationsModalOpen);

  const handleSelectVenue = (venue) => {
    if (onSelectVenue) onSelectVenue(venue);
    else {
      setSelectedHostApp(venue);
      setShowVenueModal(true);
    }
  };

  const handleOpenPromoDurations = () => {
    if (onOpenPromoDurations) onOpenPromoDurations();
    else setIsPromoDurationsModalOpen(true);
  };

  // Filter approved venues according to status and search
  const approvedVenuesList = hosts.filter((h) => {
    const isApproved = h.status === 'approved';
    if (!isApproved) return false;

    const isClosed = h.allowOpenAds === false || h.adMode === 'closed';

    if (venueStatusFilter === 'open' && (isClosed || h.isPaused)) return false;
    if (venueStatusFilter === 'private' && (!isClosed || h.isPaused)) return false;
    if (venueStatusFilter === 'paused' && !h.isPaused && !h.isRevoked) return false;

    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      (h.venueId || '').toLowerCase().includes(query) ||
      (h.outletName || '').toLowerCase().includes(query) ||
      (h.contactPerson || '').toLowerCase().includes(query) ||
      (h.city || '').toLowerCase().includes(query) ||
      (h.state || '').toLowerCase().includes(query)
    );
  });

  return (
    <motion.div
      key="venues-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 animate-fade-in"
    >
      {/* Header Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved Outlets</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">
            {hosts.filter((h) => h.status === 'approved').length}
          </h3>
          <p className="text-[10px] text-emerald-500 font-semibold mt-1">Active streaming outlets</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Open Ads Mode</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-blue-500">
            {hosts.filter((h) => h.status === 'approved' && h.allowOpenAds !== false).length}
          </h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Public ad Network venues</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Closed Private Mode</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-purple-500">
            {hosts.filter((h) => h.status === 'approved' && h.allowOpenAds === false).length}
          </h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Private venue promos</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Deployed Terminals</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">{devices.length}</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Tablets & Display Screens</p>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-card/40 border border-border p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
          {[
            { id: 'all', label: `All Outlets (${hosts.filter((h) => h.status === 'approved').length})` },
            {
              id: 'open',
              label: `Open Ads Network (${
                hosts.filter(
                  (h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed' && !h.isPaused
                ).length
              })`
            },
            {
              id: 'private',
              label: `Private Promos (${
                hosts.filter(
                  (h) =>
                    h.status === 'approved' &&
                    (h.allowOpenAds === false || h.adMode === 'closed') &&
                    !h.isPaused
                ).length
              })`
            },
            {
              id: 'paused',
              label: `Paused (${hosts.filter((h) => h.status === 'approved' && (h.isPaused || h.isRevoked)).length})`
            }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setVenueStatusFilter(f.id)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${
                venueStatusFilter === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleOpenPromoDurations}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted/70 border border-border/80 text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm hover:border-primary/50 group"
            title="Configure Universal In-Venue Promo Image Display Durations"
          >
            <Clock className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
            <span>Promo Durations</span>
          </button>

          <span className="text-xs text-muted-foreground font-semibold">
            Showing <span className="text-foreground font-bold">{approvedVenuesList.length}</span> venue outlets
          </span>
        </div>
      </div>

      {/* Full-width Outlets Data Table */}
      <div className="w-full mx-1 overflow-x-auto animate-fade-in">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
              <th className="p-4 pl-6">Venue Outlet</th>
              <th className="p-4">Owner & Location</th>
              <th className="p-4">Ad Mode</th>
              <th className="p-4">Quotas (V/I/S)</th>
              <th className="p-4 text-center">Full Form Details</th>
              <th className="p-4 text-right pr-6">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {approvedVenuesList.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                  No active venues found.
                </td>
              </tr>
            ) : (
              approvedVenuesList.map((app) => {
                const isClosed = app.allowOpenAds === false || app.adMode === 'closed';
                const vMax = app.customMaxVideoSlots ?? (isClosed ? 3 : 2);
                const vDaily = app.customDailyVideoQuota ?? (isClosed ? 6 : 4);
                const iMax = app.customMaxImageSlots ?? (isClosed ? 8 : 3);
                const iDaily = app.customDailyImageQuota ?? (isClosed ? 15 : 10);
                const sMax = app.customMaxScreenSlots ?? (isClosed ? 8 : 3);

                return (
                  <tr
                    key={app._id}
                    onClick={() => handleSelectVenue(app)}
                    className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                  >
                    <td className="p-4 pl-6 font-bold text-foreground">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-outfit text-sm">{app.outletName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium pl-6">
                        {app.requestTablet && `Tablet (${app.tabletQuantity}) `}
                        {app.requestScreen && `Screen (${app.screenQuantity})`}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      <div>{app.contactPerson}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {app.city}, {app.state} • {app.phone}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                          !isClosed
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}
                      >
                        {!isClosed ? (
                          <Unlock className="w-3 h-3 text-blue-500 shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-purple-500 shrink-0" />
                        )}
                        <span>{!isClosed ? 'OPEN ADS' : 'PRIVATE'}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] font-bold">
                      <div className="text-foreground">
                        Vid: {vMax}/{vDaily}d
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        Img: {iMax}/{iDaily}d • Scr: {sMax}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVenue(app);
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors duration-200 flex items-center space-x-1 mx-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Form Popup</span>
                      </button>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenQuotaModal) onOpenQuotaModal(app);
                          }}
                          className="px-2.5 py-1.5 text-[10px] font-bold bg-muted hover:bg-muted-foreground/20 text-foreground border border-border rounded-lg transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
                          title="Edit Custom Quotas"
                          aria-label="Edit Quotas"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Quotas</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
