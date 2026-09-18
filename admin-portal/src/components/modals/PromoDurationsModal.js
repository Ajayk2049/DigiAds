'use client';

import React, { useState } from 'react';
import { X, Clock, Unlock, Lock, Check } from 'lucide-react';

export default function PromoDurationsModal({
  isOpen,
  promoDurations,
  setPromoDurations,
  hosts = [],
  isSaving = false,
  onSave,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'closed'

  if (!isOpen) return null;

  const openHostsCount = hosts.filter(
    (h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed'
  ).length;
  const closedHostsCount = hosts.filter(
    (h) => h.status === 'approved' && (h.allowOpenAds === false || h.adMode === 'closed')
  ).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-[28px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                Network Playback Timing
              </span>
              <h3 className="font-outfit text-base font-bold text-foreground mt-1">
                In-Venue Promo Image Durations
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground font-semibold mb-4 leading-relaxed">
          Configure universal image promo display durations for tablets and wall screens. Minimum{' '}
          <strong className="text-foreground">10 seconds</strong> and maximum{' '}
          <strong className="text-foreground">30 seconds</strong>.
        </p>

        {/* 2-Tab Navigation */}
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'open'
                ? 'bg-primary text-primary-foreground shadow-md font-extrabold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Open Ads Network ({openHostsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'closed'
                ? 'bg-primary text-primary-foreground shadow-md font-extrabold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Private Promos ({closedHostsCount})</span>
          </button>
        </div>

        {/* Tab 1: Open Ads Network */}
        {activeTab === 'open' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left">
              <div className="flex items-center space-x-2 text-blue-500 font-bold text-xs">
                <Unlock className="w-4 h-4" />
                <span>Open Ads Network Venues</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                Universal duration for venues sharing display rotation with commercial advertiser campaigns and platform ads.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-foreground block">
                    Open Venues Image Duration
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Default: 10s (Allowed: 10s – 30s)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 bg-background border border-border/80 rounded-xl px-3 py-1.5 shadow-inner">
                  <input
                    type="number"
                    min="10"
                    max="30"
                    value={promoDurations.openDurationSeconds}
                    onChange={(e) => {
                      const rawVal = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setPromoDurations((prev) => ({
                        ...prev,
                        openDurationSeconds: rawVal === '' ? '' : Math.max(10, Math.min(30, rawVal))
                      }));
                    }}
                    onBlur={() => {
                      setPromoDurations((prev) => ({
                        ...prev,
                        openDurationSeconds: Math.max(10, Math.min(30, Number(prev.openDurationSeconds) || 10))
                      }));
                    }}
                    className="w-12 bg-transparent text-center font-outfit text-base font-black text-foreground focus:outline-none"
                  />
                  <span className="text-xs font-bold text-muted-foreground">sec</span>
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="1"
                  value={promoDurations.openDurationSeconds || 10}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPromoDurations((prev) => ({ ...prev, openDurationSeconds: val }));
                  }}
                  className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-0.5">
                  <span>10s (Min & Default)</span>
                  <span>20s</span>
                  <span>30s (Max)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-border/40">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 25, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setPromoDurations((prev) => ({ ...prev, openDurationSeconds: sec }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        Number(promoDurations.openDurationSeconds) === sec
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm font-extrabold'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                      }`}
                    >
                      {sec}s {sec === 10 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Closed Private Promos */}
        {activeTab === 'closed' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left">
              <div className="flex items-center space-x-2 text-purple-500 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>Closed / Private Promo Venues</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                Universal duration for private venues running 100% in-house food promotions and restaurant branding without external ads.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-foreground block">
                    Private Venues Image Duration
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Default: 15s (Allowed: 10s – 30s)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 bg-background border border-border/80 rounded-xl px-3 py-1.5 shadow-inner">
                  <input
                    type="number"
                    min="10"
                    max="30"
                    value={promoDurations.closedDurationSeconds}
                    onChange={(e) => {
                      const rawVal = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setPromoDurations((prev) => ({
                        ...prev,
                        closedDurationSeconds: rawVal === '' ? '' : Math.max(10, Math.min(30, rawVal))
                      }));
                    }}
                    onBlur={() => {
                      setPromoDurations((prev) => ({
                        ...prev,
                        closedDurationSeconds: Math.max(10, Math.min(30, Number(prev.closedDurationSeconds) || 15))
                      }));
                    }}
                    className="w-12 bg-transparent text-center font-outfit text-base font-black text-foreground focus:outline-none"
                  />
                  <span className="text-xs font-bold text-muted-foreground">sec</span>
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="1"
                  value={promoDurations.closedDurationSeconds || 15}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPromoDurations((prev) => ({ ...prev, closedDurationSeconds: val }));
                  }}
                  className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-0.5">
                  <span>10s (Min)</span>
                  <span>15s (Default)</span>
                  <span>30s (Max)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-border/40">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 25, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setPromoDurations((prev) => ({ ...prev, closedDurationSeconds: sec }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        Number(promoDurations.closedDurationSeconds) === sec
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm font-extrabold'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                      }`}
                    >
                      {sec}s {sec === 15 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPromoDurations({ openDurationSeconds: 10, closedDurationSeconds: 15 })}
            className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline transition-all cursor-pointer"
          >
            Reset to Defaults (10s / 15s)
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-muted/40 hover:bg-muted text-foreground border border-border/60 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all cursor-pointer shadow-md flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Durations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
