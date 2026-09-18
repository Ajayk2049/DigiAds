'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Tv,
  Megaphone,
  Building,
  Search,
  Plus,
  Play,
  Trash2,
  Edit,
  Tablet,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';
import { resolveMediaUrl } from '@/components/common/MediaResolver';

export default function PlatformAdsTab({
  onCreateAd,
  onOpenCreateModal,
  onEditAd,
  onDeleteAd,
  onPreviewAd,
  onToggleStatus
}) {
  const handleCreateAd = onCreateAd || onOpenCreateModal;
  const [subTab, setSubTab] = useState('fallback'); // 'fallback' | 'platform'
  const [localSearch, setLocalSearch] = useState('');

  const platformAds = useAdminStore((s) => s.platformAds);
  const hosts = useAdminStore((s) => s.hosts);

  const fallbackAds = platformAds.filter((a) => a.type === 'fallback');
  const targetedAds = platformAds.filter((a) => a.type === 'platform');
  const eligibleVenuesCount = hosts.filter(
    (h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed'
  ).length;

  const currentAds = platformAds.filter((a) => {
    if (a.type !== subTab) return false;
    if (!localSearch) return true;
    const q = localSearch.trim().toLowerCase();
    return (
      (a.title || '').toLowerCase().includes(q) ||
      (a._id || '').toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      key="platform-ads-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card/40 border border-border flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Fallback Ads</p>
            <h4 className="font-outfit text-2xl font-black text-blue-500 mt-1">
              {fallbackAds.filter((a) => a.isActive).length}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Broadcasts to all open venues on 0 ads
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Tv className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/40 border border-border flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Targeted Platform Ads
            </p>
            <h4 className="font-outfit text-2xl font-black text-emerald-500 mt-1">
              {targetedAds.filter((a) => a.isActive).length}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Active in selected venue loops
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Megaphone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/40 border border-border flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Eligible Open-Ads Venues
            </p>
            <h4 className="font-outfit text-2xl font-black text-indigo-500 mt-1">{eligibleVenuesCount}</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Closed-Ads venues remain 100% private
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/40 border border-border">
        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => setSubTab('fallback')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'fallback'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Global Fallback Ads ({fallbackAds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('platform')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'platform'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Targeted Platform Ads ({targetedAds.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ads by title or ID..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <button
            type="button"
            onClick={() => handleCreateAd && handleCreateAd(subTab)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New {subTab === 'fallback' ? 'Fallback Ad' : 'Platform Ad'}</span>
          </button>
        </div>
      </div>

      {/* Ads List Table */}
      <div className="rounded-2xl border border-border bg-card/30 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase font-black text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 pl-6">Preview & Title</th>
                <th className="p-4">Format</th>
                <th className="p-4">Hardware Target</th>
                <th className="p-4">Scope / Venues</th>
                <th className="p-4">Duration</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {currentAds.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                        {subTab === 'fallback' ? <Tv className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
                      </div>
                      <h4 className="font-outfit text-base font-bold text-foreground">
                        No {subTab === 'fallback' ? 'Global Fallback Ads' : 'Targeted Platform Ads'} Configured
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {subTab === 'fallback'
                          ? 'Fallback ads automatically stream across all Open-Ads tablets & screens when no other active ads are available.'
                          : 'Targeted platform ads allow you to stream in-house trailers or plan promos to specific selected venues for free.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => onCreateAd && onCreateAd(subTab)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create First {subTab === 'fallback' ? 'Fallback Ad' : 'Platform Ad'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentAds.map((ad) => (
                  <tr key={ad._id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={() => onPreviewAd && onPreviewAd(ad)}
                          className="w-16 h-10 rounded-lg bg-black/40 border border-border/80 overflow-hidden shrink-0 cursor-pointer relative group flex items-center justify-center"
                        >
                          {ad.mediaType === 'video' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <Play className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(ad.mediaUrl)}
                              alt={ad.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{ad.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{ad._id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {ad.mediaType}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold">
                        {ad.targetDeviceType === 'tablet' ? (
                          <>
                            <Tablet className="w-3.5 h-3.5 text-blue-500" />
                            <span>Tablets (3:4)</span>
                          </>
                        ) : ad.targetDeviceType === 'screen' ? (
                          <>
                            <Tv className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Screens (16:9)</span>
                          </>
                        ) : (
                          <span>All Displays</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-xs">
                      {ad.type === 'fallback' ? (
                        <span className="text-muted-foreground">Global Network</span>
                      ) : (
                        <span>{ad.targetVenueIds?.length || 0} Venues</span>
                      )}
                    </td>

                    <td className="p-4 font-mono font-bold text-xs">{ad.durationSeconds}s</td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => onToggleStatus && onToggleStatus(ad, !ad.isActive)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer transition-colors ${
                          ad.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}
                      >
                        {ad.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEditAd && onEditAd(ad)}
                          className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                          title="Edit Platform Ad"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAd && onDeleteAd(ad._id || ad)}
                          className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                          title="Delete Platform Ad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
