'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Tv, Megaphone } from 'lucide-react';

export default function PlatformAdModal({
  isOpen,
  createPlatformAdForm,
  setCreatePlatformAdForm,
  hosts = [],
  uploadingPlatformAd = false,
  uploadProgress = 0,
  onCreate,
  onClose,
  setPlatformAdResolutionWarning,
  showToast
}) {
  const [venueSearchFilter, setVenueSearchFilter] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              {createPlatformAdForm.type === 'fallback' ? <Tv className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-outfit text-base font-bold text-foreground">
                Create {createPlatformAdForm.type === 'fallback' ? 'Global Fallback Ad' : 'Targeted Platform Ad'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {createPlatformAdForm.type === 'fallback'
                  ? 'Streams across all Open-Ads venues when devices have zero active ads'
                  : 'Streams in rotation on specific Open-Ads venues selected below'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onCreate} className="space-y-4 text-xs font-semibold">
          {/* Ad Type Selector */}
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1.5 font-bold">
              Ad Distribution Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreatePlatformAdForm({ ...createPlatformAdForm, type: 'fallback' })}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  createPlatformAdForm.type === 'fallback'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-background text-muted-foreground border-input hover:text-foreground'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Global Fallback Ad</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatePlatformAdForm({ ...createPlatformAdForm, type: 'platform' })}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  createPlatformAdForm.type === 'platform'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-background text-muted-foreground border-input hover:text-foreground'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Targeted Platform Ad</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
              Ad Title / Campaign Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Website Promotion / Spring Special Promo"
              value={createPlatformAdForm.title}
              onChange={(e) => setCreatePlatformAdForm({ ...createPlatformAdForm, title: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Hardware Target */}
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
              Target Hardware Display
            </label>
            <select
              value={createPlatformAdForm.targetDeviceType}
              onChange={(e) => setCreatePlatformAdForm({ ...createPlatformAdForm, targetDeviceType: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Hardware (Tablets & Wall Screens)</option>
              <option value="tablet">Tabletop Tablets Only (3:4)</option>
              <option value="screen">Wall Screens Only (16:9)</option>
            </select>
          </div>

          {/* Venue Selection (for Targeted Platform Ads only) */}
          {createPlatformAdForm.type === 'platform' && (
            <div className="space-y-2 p-3 bg-muted/20 border border-border rounded-xl">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase text-muted-foreground font-bold">
                  Target Open-Ads Venues ({createPlatformAdForm.targetVenueIds.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const openVenues = hosts
                        .filter((h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed')
                        .map((h) => h._id);
                      setCreatePlatformAdForm({ ...createPlatformAdForm, targetVenueIds: openVenues });
                    }}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Select All Open
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setCreatePlatformAdForm({ ...createPlatformAdForm, targetVenueIds: [] })}
                    className="text-[10px] font-bold text-muted-foreground hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Filter venues by name or city..."
                value={venueSearchFilter}
                onChange={(e) => setVenueSearchFilter(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
              />

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {hosts
                  .filter((h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed')
                  .filter((h) => {
                    if (!venueSearchFilter) return true;
                    const q = venueSearchFilter.toLowerCase();
                    return (
                      (h.outletName || '').toLowerCase().includes(q) ||
                      (h.city || '').toLowerCase().includes(q)
                    );
                  })
                  .map((venue) => {
                    const isSelected = createPlatformAdForm.targetVenueIds.includes(venue._id);
                    return (
                      <label
                        key={venue._id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-foreground font-bold'
                            : 'bg-background border-border/50 text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreatePlatformAdForm({
                                  ...createPlatformAdForm,
                                  targetVenueIds: [...createPlatformAdForm.targetVenueIds, venue._id]
                                });
                              } else {
                                setCreatePlatformAdForm({
                                  ...createPlatformAdForm,
                                  targetVenueIds: createPlatformAdForm.targetVenueIds.filter((id) => id !== venue._id)
                                });
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="truncate text-xs">{venue.outletName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{venue.city || 'City'}</span>
                      </label>
                    );
                  })}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                ℹ️ Closed-Ads venues are excluded to protect private dining exclusivity.
              </p>
            </div>
          )}

          {/* Media File Upload */}
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
              Media Creative File (Video or Image, Max 100MB)
            </label>
            <input
              type="file"
              required
              accept=".mp4,.webm,.mov,.avi,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const selected = e.target.files[0];
                if (selected) {
                  if (selected.size > 100 * 1024 * 1024) {
                    if (showToast) {
                      showToast(
                        `File size (${(selected.size / (1024 * 1024)).toFixed(1)} MB) exceeds 100 MB limit.`,
                        'error'
                      );
                    }
                    e.target.value = '';
                    setCreatePlatformAdForm({
                      ...createPlatformAdForm,
                      file: null
                    });
                    return;
                  }
                  const isVid = ['.mp4', '.webm', '.mov', '.avi'].some((ext) =>
                    selected.name.toLowerCase().endsWith(ext)
                  );
                  setCreatePlatformAdForm({
                    ...createPlatformAdForm,
                    file: selected,
                    mediaType: isVid ? 'video' : 'image',
                    durationSeconds: isVid ? 30 : 10
                  });

                  if (isVid && setPlatformAdResolutionWarning) {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => {
                      window.URL.revokeObjectURL(video.src);
                      const w = video.videoWidth || 0;
                      const h = video.videoHeight || 0;
                      const targetDevice = createPlatformAdForm.targetDeviceType;

                      let isLowRes = false;
                      let isOrientationMismatch = false;
                      let mismatchDesc = null;
                      let recommended = '1920 × 1080 (16:9 Landscape Full HD)';

                      if (targetDevice === 'screen' || targetDevice === 'all') {
                        isLowRes = w < 1280 || h < 720;
                        isOrientationMismatch = h > w;
                        recommended = '1920 × 1080 (16:9 Landscape Full HD)';
                        if (isOrientationMismatch) {
                          mismatchDesc =
                            'You selected a Vertical / Portrait video for Horizontal Wall Screens. It will be centered with black letterbox bars on the left and right.';
                        }
                      } else if (targetDevice === 'tablet') {
                        isLowRes = w < 720 || h < 1280;
                        isOrientationMismatch = w > h;
                        recommended = '1080 × 1920 (9:16 Portrait Full HD)';
                        if (isOrientationMismatch) {
                          mismatchDesc =
                            'You selected a Horizontal / Landscape video for Vertical Tabletop Tablets. It will be centered with black letterbox bars on top and bottom.';
                        }
                      }

                      if (w > 0 && h > 0 && (isLowRes || isOrientationMismatch)) {
                        setPlatformAdResolutionWarning({
                          width: w,
                          height: h,
                          recommended,
                          isLowRes,
                          isOrientationMismatch,
                          mismatchDesc
                        });
                      }
                    };
                    video.onerror = () => {};
                    video.src = URL.createObjectURL(selected);
                  }
                }
              }}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              ⚡ Auto-optimized: Sharp WebP / FFmpeg H.264 Baseline 3.1 silent transcode pipeline.
            </p>
          </div>

          {/* Image Duration (Only for Images) */}
          {createPlatformAdForm.mediaType === 'image' && (
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                Image Display Duration (Seconds)
              </label>
              <input
                type="number"
                required
                min="3"
                max="300"
                value={createPlatformAdForm.durationSeconds}
                onChange={(e) =>
                  setCreatePlatformAdForm({
                    ...createPlatformAdForm,
                    durationSeconds: parseInt(e.target.value, 10) || 10
                  })
                }
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Timer before advancing to next ad.</p>
            </div>
          )}

          {/* Activation Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isAdActive"
              checked={createPlatformAdForm.isActive}
              onChange={(e) => setCreatePlatformAdForm({ ...createPlatformAdForm, isActive: e.target.checked })}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isAdActive" className="text-xs text-foreground cursor-pointer font-bold">
              Activate Immediately
            </label>
          </div>

          {/* Upload Progress Bar */}
          {uploadingPlatformAd && (
            <div className="space-y-1 p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex justify-between text-[11px] font-bold text-primary">
                <span>Uploading & Optimizing Media...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={uploadingPlatformAd}
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer hover:bg-muted/80 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingPlatformAd}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md disabled:opacity-50 flex items-center space-x-1.5"
            >
              {uploadingPlatformAd ? 'Processing...' : 'Upload & Create Ad'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
