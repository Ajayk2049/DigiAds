'use client';

import React from 'react';
import {
  X,
  Building,
  MapPin,
  ExternalLink,
  Smartphone,
  UserCheck,
  Sliders,
  RefreshCw,
  Unlock,
  Lock,
  Check,
  Settings
} from 'lucide-react';

export default function VenueDetailsModal({
  selectedHostApp,
  onClose,
  onReview,
  onOpenQuota,
  onOpenWatermark,
  onResetQuota
}) {
  if (!selectedHostApp) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                Venue Form Submission
              </span>
              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${selectedHostApp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : selectedHostApp.status === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                {selectedHostApp.status}
              </span>
            </div>
            <h3 className="font-outfit text-xl font-bold text-foreground mt-2">{selectedHostApp.outletName}</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted on {new Date(selectedHostApp.createdAt).toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close venue modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-semibold">
          <div className="space-y-1 bg-background/50 p-4 rounded-2xl border border-border/50">
            <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-primary" /> Outlet Overview & Description
            </span>
            <p className="text-foreground leading-relaxed font-semibold mt-1">{selectedHostApp.outletDescription || 'No description provided.'}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Full Address & Location
                </span>
                {selectedHostApp.latitude && selectedHostApp.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedHostApp.latitude},${selectedHostApp.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <p className="text-foreground font-semibold text-xs leading-relaxed">
                {selectedHostApp.doorNo}, {selectedHostApp.street}<br />
                {selectedHostApp.city}, {selectedHostApp.state} - <span className="font-mono text-primary">{selectedHostApp.zipCode}</span>
              </p>
              {selectedHostApp.latitude && selectedHostApp.longitude ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                  <span>📍 GPS: {Number(selectedHostApp.latitude).toFixed(4)}, {Number(selectedHostApp.longitude).toFixed(4)}</span>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground italic">GPS: Auto-geocoding upon approval</div>
              )}
            </div>

            <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-primary" /> Hardware Devices Requested
              </span>
              <div className="space-y-1 text-foreground font-bold">
                {selectedHostApp.requestTablet && (
                  <div className="flex items-center justify-between">
                    <span>Tablet Display (3:4)</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedHostApp.tabletQuantity}</span>
                  </div>
                )}
                {selectedHostApp.requestScreen && (
                  <div className="flex items-center justify-between">
                    <span>Wall Screen (16:9)</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedHostApp.screenQuantity}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" /> Owner / Contact Details
            </span>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[9px] text-muted-foreground block">Contact Person</span>
                <p className="text-foreground font-bold text-sm">{selectedHostApp.contactPerson}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground block">Phone Number</span>
                <p className="text-foreground font-mono font-bold">{selectedHostApp.phone}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground block">Email Address</span>
                <p className="text-foreground font-medium">{selectedHostApp.email}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-primary" /> Network Ad Mode & Quotas
                </span>
                <button
                  type="button"
                  onClick={() => onResetQuota && onResetQuota(selectedHostApp)}
                  className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-lg text-[9px] cursor-pointer border border-amber-500/30 flex items-center gap-1 transition-colors"
                  title="Reset daily quota remaining counters to 100% full capacity immediately"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Reset Quotas Now</span>
                </button>
              </div>
              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${selectedHostApp.allowOpenAds !== false ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                {selectedHostApp.allowOpenAds !== false ? <Unlock className="w-3 h-3 text-blue-500 shrink-0" /> : <Lock className="w-3 h-3 text-purple-500 shrink-0" />}
                <span>{selectedHostApp.allowOpenAds !== false ? 'OPEN ADS MODE' : 'PRIVATE MODE'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px] pt-1">
              <div className="p-2 bg-card/60 rounded-xl border border-border/40 text-center">
                <span className="text-[9px] font-sans text-muted-foreground block truncate">Tablet Video</span>
                <p className="font-bold text-foreground mt-0.5 text-[10px]">
                  {selectedHostApp.customMaxVideoSlots ?? (selectedHostApp.allowOpenAds === false ? 3 : 2)} / {selectedHostApp.customDailyVideoQuota ?? (selectedHostApp.allowOpenAds === false ? 6 : 4)}d
                </p>
              </div>
              <div className="p-2 bg-card/60 rounded-xl border border-border/40 text-center">
                <span className="text-[9px] font-sans text-muted-foreground block truncate">Tablet Image</span>
                <p className="font-bold text-foreground mt-0.5 text-[10px]">
                  {selectedHostApp.customMaxImageSlots ?? (selectedHostApp.allowOpenAds === false ? 8 : 3)} / {selectedHostApp.customDailyImageQuota ?? (selectedHostApp.allowOpenAds === false ? 15 : 10)}d
                </p>
              </div>
              <div className="p-2 bg-card/60 rounded-xl border border-border/40 text-center">
                <span className="text-[9px] font-sans text-muted-foreground block truncate">Screen Video</span>
                <p className="font-bold text-foreground mt-0.5 text-[10px]">
                  {selectedHostApp.customMaxScreenVideoSlots ?? selectedHostApp.customMaxScreenSlots ?? (selectedHostApp.allowOpenAds === false ? 3 : 2)} / {selectedHostApp.customDailyScreenVideoQuota ?? selectedHostApp.customDailyScreenQuota ?? (selectedHostApp.allowOpenAds === false ? 6 : 4)}d
                </p>
              </div>
              <div className="p-2 bg-card/60 rounded-xl border border-border/40 text-center">
                <span className="text-[9px] font-sans text-muted-foreground block truncate">Screen Image</span>
                <p className="font-bold text-foreground mt-0.5 text-[10px]">
                  {selectedHostApp.customMaxScreenImageSlots ?? selectedHostApp.customMaxScreenSlots ?? (selectedHostApp.allowOpenAds === false ? 8 : 3)} / {selectedHostApp.customDailyScreenImageQuota ?? (selectedHostApp.allowOpenAds === false ? 15 : 10)}d
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border/50 flex-wrap gap-3">
          {selectedHostApp.status === 'pending' ? (
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={() => onReview && onReview(selectedHostApp._id, 'approve')}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors duration-200 cursor-pointer shadow-md flex items-center justify-center space-x-1 text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Approve Application</span>
              </button>
              <button
                onClick={() => onReview && onReview(selectedHostApp._id, 'reject')}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors duration-200 cursor-pointer shadow-md flex items-center justify-center space-x-1 text-xs"
              >
                <X className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenQuota && onOpenQuota(selectedHostApp)}
                className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer text-xs"
              >
                <Settings className="w-4 h-4" />
                <span>Customize Quotas</span>
              </button>
              <button
                onClick={() => onOpenWatermark && onOpenWatermark(selectedHostApp)}
                className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold rounded-xl transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer text-xs"
              >
                <Sliders className="w-4 h-4" />
                <span>Manage Watermark</span>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs ml-auto"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
