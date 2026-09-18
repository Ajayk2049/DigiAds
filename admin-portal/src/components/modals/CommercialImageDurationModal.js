'use client';

import React from 'react';
import { X, Clock, Layers, Check } from 'lucide-react';

export default function CommercialImageDurationModal({
  isOpen,
  commercialImageDuration,
  setCommercialImageDuration,
  isSaving = false,
  onSave,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-[28px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Advertiser Campaign Timing
              </span>
              <h3 className="font-outfit text-base font-bold text-foreground mt-1">
                Commercial Image Ad Duration
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
          Configure universal display duration for commercial image campaigns booked through the Advertiser Portal. Range between <strong className="text-foreground">5s</strong> and <strong className="text-foreground">30s</strong>.
        </p>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-bold text-foreground block">
                  Base Single Image Duration
                </label>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Default: 8s (Range: 5s – 30s)
                </span>
              </div>
              <div className="flex items-center space-x-1.5 bg-background border border-border/80 rounded-xl px-3 py-1.5 shadow-inner">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={commercialImageDuration}
                  onChange={(e) => {
                    const rawVal = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setCommercialImageDuration(rawVal === '' ? '' : Math.max(5, Math.min(30, rawVal)));
                  }}
                  onBlur={() => {
                    setCommercialImageDuration(Math.max(5, Math.min(30, Number(commercialImageDuration) || 8)));
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
                min="5"
                max="30"
                step="1"
                value={commercialImageDuration || 8}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCommercialImageDuration(val);
                }}
                className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-0.5">
                <span>5s (Min)</span>
                <span>8s (Default)</span>
                <span>30s (Max)</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-border/40">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {[5, 8, 10, 12, 15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCommercialImageDuration(sec)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      Number(commercialImageDuration) === sec
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm font-extrabold'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                    }`}
                  >
                    {sec}s {sec === 8 ? '(Default)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dual-Slide Carousel Information Card */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 text-left flex items-start space-x-2.5">
            <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
              <strong className="text-foreground">Dual-Slide Carousel Timing:</strong> If an advertiser uploads 2 images, the ad will automatically display for <strong className="text-emerald-500">{Number(commercialImageDuration || 8) * 2}s</strong> ({commercialImageDuration || 8}s per slide).
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCommercialImageDuration(8)}
            className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline transition-all cursor-pointer"
          >
            Reset to Default (8s)
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
                  <span>Save Duration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
