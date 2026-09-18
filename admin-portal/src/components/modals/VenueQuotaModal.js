'use client';

import React from 'react';
import { X, Tablet, Tv, Video, Image, RefreshCw, Unlock, Lock } from 'lucide-react';

export default function VenueQuotaModal({
  isOpen,
  selectedHostApp,
  quotaForm,
  setQuotaForm,
  activeQuotaTab,
  setActiveQuotaTab,
  onClose,
  onSave,
  onResetDefaults,
  onResetQuotaNow
}) {
  if (!isOpen || !selectedHostApp) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              Custom Quota Override
            </span>
            <h3 className="font-outfit text-base font-bold text-foreground mt-2">
              Edit Quotas for {selectedHostApp.outletName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <div className="p-3 bg-muted/30 border border-border/40 rounded-xl flex justify-between items-center">
            <span className="text-muted-foreground">Current Mode Plan:</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${selectedHostApp.allowOpenAds !== false ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
              {selectedHostApp.allowOpenAds !== false ? <Unlock className="w-3 h-3 text-blue-500 shrink-0" /> : <Lock className="w-3 h-3 text-purple-500 shrink-0" />}
              <span>{selectedHostApp.allowOpenAds !== false ? 'Open Ads Mode' : 'Closed Private Mode'}</span>
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 gap-1">
            <button
              type="button"
              onClick={() => setActiveQuotaTab('tablet')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeQuotaTab === 'tablet'
                  ? 'bg-primary text-primary-foreground shadow-md font-extrabold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tabletop Tablets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveQuotaTab('screen')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeQuotaTab === 'screen'
                  ? 'bg-primary text-primary-foreground shadow-md font-extrabold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Wall Display Screens</span>
            </button>
          </div>

          {/* Tab Content: Tablet */}
          {activeQuotaTab === 'tablet' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3 p-3 bg-card/40 border border-border/40 rounded-2xl">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-500">
                  <Video className="w-3.5 h-3.5" /> Video Promo Quotas (Tablet)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxVideoSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxVideoSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyVideoQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyVideoQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3 bg-card/40 border border-border/40 rounded-2xl">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-emerald-500">
                  <Image className="w-3.5 h-3.5" /> Image Promo Quotas (Tablet)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxImageSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxImageSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyImageQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyImageQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Screen */}
          {activeQuotaTab === 'screen' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3 p-3 bg-card/40 border border-border/40 rounded-2xl">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-purple-500">
                  <Video className="w-3.5 h-3.5" /> Video Promo Quotas (Wall Screen)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxScreenVideoSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxScreenVideoSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyScreenVideoQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyScreenVideoQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3 bg-card/40 border border-border/40 rounded-2xl">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-500">
                  <Image className="w-3.5 h-3.5" /> Image Promo Quotas (Wall Screen)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxScreenImageSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxScreenImageSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyScreenImageQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyScreenImageQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-border/40 flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onResetDefaults}
                className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer"
              >
                Reset Plan Defaults
              </button>
              <button
                type="button"
                onClick={() => onResetQuotaNow && onResetQuotaNow(selectedHostApp)}
                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl text-xs cursor-pointer border border-amber-500/30 flex items-center gap-1 transition-colors"
                title="Reset remaining change limits to 100% full capacity immediately"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Quotas Now</span>
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md min-h-[44px]"
              >
                Save Quota Overrides
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
