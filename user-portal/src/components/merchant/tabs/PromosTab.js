'use client';

import React from 'react';
import { Send, Tablet, Tv, Video, Upload, Lock, Trash2, Plus } from 'lucide-react';
import { usePromoStore } from '@/stores/usePromoStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function PromosTab(props) {
  const promo = usePromoStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;

  const selectedOutletId = props.selectedOutletId ?? outlet.selectedOutletId;
  const applications = props.applications ?? outlet.applications;
  const pendingModeReq = props.pendingModeReq ?? promo.pendingModeReq;
  const handleStreamAds = props.handleStreamAds ?? (() => promo.handleStreamAds(token, selectedOutletId));
  const isStreamingPromos = props.isStreamingPromos ?? promo.isStreamingPromos;
  const promoQuotaStats = props.promoQuotaStats ?? promo.promoQuotaStats;
  const activePromoSubTab = props.activePromoSubTab ?? promo.activePromoSubTab;
  const setActivePromoSubTab = props.setActivePromoSubTab ?? promo.setActivePromoSubTab;
  const promoDraftSlots = props.promoDraftSlots ?? promo.promoDraftSlots;
  const setPromoDraftSlots = props.setPromoDraftSlots ?? promo.setPromoDraftSlots;
  const handleClearPromoSlot = props.handleClearPromoSlot ?? promo.handleClearPromoSlot;

  const selectedApp = applications.find(app => app._id === selectedOutletId);
  const isClosedMode = selectedApp?.adMode === 'closed' || selectedApp?.allowOpenAds === false;
  const handleSelectPromoFile = props.handleSelectPromoFile ?? ((type, idx, file) => promo.handleSelectPromoFile(type, idx, file, isClosedMode));

  const remaining = promo.getEffectiveRemaining();
  const effectiveTabletVideoRemaining = props.effectiveTabletVideoRemaining ?? remaining.tabletVideoRemaining;
  const effectiveTabletImageRemaining = props.effectiveTabletImageRemaining ?? remaining.tabletImageRemaining;
  const effectiveScreenVideoRemaining = props.effectiveScreenVideoRemaining ?? remaining.screenVideoRemaining;
  const effectiveScreenImageRemaining = props.effectiveScreenImageRemaining ?? remaining.screenImageRemaining;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
            IN-HOUSE VENUE PROMOS
          </h1>
          <p className="text-muted-foreground text-xs font-semibold mt-1">
            Stream your own video ads, daily offers, and promotional banners directly onto your tabletop tablets and wall screens.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {pendingModeReq && pendingModeReq.status === 'pending' && (
            <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs font-bold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Mode Change Pending Admin Review ({pendingModeReq.requestedMode?.toUpperCase()})</span>
            </div>
          )}

          <button
            onClick={handleStreamAds}
            disabled={isStreamingPromos || promoQuotaStats.isPaused || promoQuotaStats.isRevoked}
            className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg cursor-pointer glow-hover flex items-center space-x-2 uppercase tracking-wider"
          >
            {isStreamingPromos ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Processing & Streaming...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Stream Ads</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation: Tablet vs Wall Screen */}
      <div className="flex items-center space-x-2 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={() => setActivePromoSubTab('tablet')}
          className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${activePromoSubTab === 'tablet'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-card/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/40'
            }`}
        >
          <Tablet className="w-4 h-4" />
          <span>Tabletop Tablets</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePromoSubTab('screen')}
          className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${activePromoSubTab === 'screen'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-card/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/40'
            }`}
        >
          <Tv className="w-4 h-4" />
          <span>Wall Display Screens</span>
        </button>
      </div>

      {/* SUB-TAB 1: TABLETOP TABLETS */}
      {activePromoSubTab === 'tablet' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quota Cards Banner */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left flex items-center space-x-3">
              <Video className="w-6 h-6 text-blue-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Tablet Video Changes Left</span>
                <div className="text-lg font-black text-foreground mt-0.5">
                  {effectiveTabletVideoRemaining} / {promoQuotaStats.dailyVideoQuota ?? 4} Remaining
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left flex items-center space-x-3">
              <Upload className="w-6 h-6 text-purple-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider">Tablet Image Changes Left</span>
                <div className="text-lg font-black text-foreground mt-0.5">
                  {effectiveTabletImageRemaining} / {promoQuotaStats.dailyImageQuota ?? 10} Remaining
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-center space-x-3">
              <Video className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Video Duration Limit</span>
                <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">
                  {(() => {
                    const currentApp = applications.find(app => app._id === selectedOutletId);
                    const isClosed = currentApp?.adMode === 'closed' || currentApp?.allowOpenAds === false;
                    return isClosed ? 'Max 60 Seconds per video (Closed Mode)' : 'Max 30 Seconds per video (Open Ads Mode)';
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Video Promo Slots Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                <Video className="w-4 h-4 text-blue-500" />
                <span>Tablet Video Promo Slots ({promoQuotaStats.maxVideoSlots || 2} Max)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: promoQuotaStats.maxVideoSlots || 2 }).map((_, idx) => {
                const key = `video_${idx}`;
                const slot = promoDraftSlots[key] || {};
                const hasMedia = slot.previewUrl && !slot.isDeleted;

                return (
                  <div
                    key={key}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${hasMedia
                      ? 'bg-card border-blue-500/40 shadow-sm'
                      : 'bg-card/20 border-dashed border-border/60 hover:border-blue-500/50'
                      }`}
                  >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                      <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Tablet Video Slot #{idx + 1}</span>
                      </span>
                      {hasMedia && (
                        <button
                          type="button"
                          onClick={() => handleClearPromoSlot('video', idx)}
                          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer shadow-sm"
                          title="Delete / Clear Ad Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {hasMedia ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                          <video
                            src={slot.previewUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Enter Video Ad Title (Optional)"
                          value={slot.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoDraftSlots(prev => ({
                              ...prev,
                              [key]: { ...prev[key], title: val, isModified: true }
                            }));
                          }}
                          className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/mov"
                          onChange={(e) => handleSelectPromoFile('video', idx, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Click to Choose Video File</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">MP4, WEBM (Max 100MB, ≤ 30s)</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image Promo Slots Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                <Upload className="w-4 h-4 text-purple-500" />
                <span>Tablet Image Promo Slots ({promoQuotaStats.maxImageSlots || 5} Max)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: promoQuotaStats.maxImageSlots || 5 }).map((_, idx) => {
                const key = `image_${idx}`;
                const slot = promoDraftSlots[key] || {};
                const hasMedia = slot.previewUrl && !slot.isDeleted;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${hasMedia
                      ? 'bg-card border-purple-500/40 shadow-sm'
                      : 'bg-card/20 border-dashed border-border/60 hover:border-purple-500/50'
                      }`}
                  >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="text-[11px] font-black uppercase text-foreground flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>Tablet Image #{idx + 1}</span>
                      </span>
                      {hasMedia && (
                        <button
                          type="button"
                          onClick={() => handleClearPromoSlot('image', idx)}
                          className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer"
                          title="Delete / Clear Ad Slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {hasMedia ? (
                      <div className="space-y-2">
                        <div className="relative w-full h-32 bg-black/40 rounded-lg overflow-hidden border border-border/40">
                          <img
                            src={slot.previewUrl}
                            alt={`Image slot ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Ad Title (Optional)"
                          value={slot.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoDraftSlots(prev => ({
                              ...prev,
                              [key]: { ...prev[key], title: val, isModified: true }
                            }));
                          }}
                          className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all min-h-[140px]">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleSelectPromoFile('image', idx, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-foreground">Choose Image</p>
                          <p className="text-[9px] text-muted-foreground font-medium">JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WALL DISPLAY SCREENS */}
      {activePromoSubTab === 'screen' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quota Cards Banner */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-center space-x-3">
              <Video className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Screen Video Changes Left</span>
                <div className="text-lg font-black text-foreground mt-0.5">
                  {effectiveScreenVideoRemaining} / {promoQuotaStats.dailyScreenVideoQuota ?? 4} Remaining
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-left flex items-center space-x-3">
              <Upload className="w-6 h-6 text-teal-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-teal-500 tracking-wider">Screen Image Changes Left</span>
                <div className="text-lg font-black text-foreground mt-0.5">
                  {effectiveScreenImageRemaining} / {promoQuotaStats.dailyScreenImageQuota ?? 10} Remaining
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-left flex items-center space-x-3">
              <Lock className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Safeguard</span>
                <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">
                  Wall screen ads stream live to TV display hardware when you click <strong className="text-foreground">Stream Ads</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Screen Video Promo Slots Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <span>Wall Screen Video Promo Slots ({promoQuotaStats.maxScreenVideoSlots || 2} Max)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: promoQuotaStats.maxScreenVideoSlots || 2 }).map((_, idx) => {
                const key = `screen_video_${idx}`;
                const slot = promoDraftSlots[key] || promoDraftSlots[`screen_${idx}`] || {};
                const hasMedia = slot.previewUrl && !slot.isDeleted;

                return (
                  <div
                    key={key}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${hasMedia
                      ? 'bg-card border-emerald-500/40 shadow-sm'
                      : 'bg-card/20 border-dashed border-border/60 hover:border-emerald-500/50'
                      }`}
                  >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                      <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Screen Video Slot #{idx + 1}</span>
                      </span>
                      {hasMedia && (
                        <button
                          type="button"
                          onClick={() => handleClearPromoSlot('screen_video', idx)}
                          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer shadow-sm"
                          title="Delete / Clear Ad Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {hasMedia ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                          <video
                            src={slot.previewUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Enter Video Ad Title (Optional)"
                          value={slot.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoDraftSlots(prev => ({
                              ...prev,
                              [key]: { ...prev[key], title: val, isModified: true }
                            }));
                          }}
                          className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/mov"
                          onChange={(e) => handleSelectPromoFile('screen_video', idx, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Choose Wall Screen Video</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">MP4, WEBM (Full HD 1920×1080)</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Screen Image Promo Slots Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                <Upload className="w-4 h-4 text-teal-500" />
                <span>Wall Screen Image Promo Slots ({promoQuotaStats.maxScreenImageSlots || 5} Max)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: promoQuotaStats.maxScreenImageSlots || 5 }).map((_, idx) => {
                const key = `screen_image_${idx}`;
                const slot = promoDraftSlots[key] || {};
                const hasMedia = slot.previewUrl && !slot.isDeleted;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${hasMedia
                      ? 'bg-card border-teal-500/40 shadow-sm'
                      : 'bg-card/20 border-dashed border-border/60 hover:border-teal-500/50'
                      }`}
                  >
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="text-[11px] font-black uppercase text-foreground flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        <span>Screen Image #{idx + 1}</span>
                      </span>
                      {hasMedia && (
                        <button
                          type="button"
                          onClick={() => handleClearPromoSlot('screen_image', idx)}
                          className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer"
                          title="Delete / Clear Ad Slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {hasMedia ? (
                      <div className="space-y-2">
                        <div className="relative w-full h-32 bg-black/40 rounded-lg overflow-hidden border border-border/40">
                          <img
                            src={slot.previewUrl}
                            alt={`Screen image slot ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Ad Title (Optional)"
                          value={slot.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromoDraftSlots(prev => ({
                              ...prev,
                              [key]: { ...prev[key], title: val, isModified: true }
                            }));
                          }}
                          className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all min-h-[140px]">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleSelectPromoFile('screen_image', idx, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 border border-teal-500/20">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-foreground">Choose Image</p>
                          <p className="text-[9px] text-muted-foreground font-medium">JPG, PNG (Max 10MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
