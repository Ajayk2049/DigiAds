'use client';

import React from 'react';
import { X, UserCheck, Building, Smartphone, Layers, Video, BarChart3, Check } from 'lucide-react';

const AD_CATEGORIES = ['Electronics', 'RealEstate', 'Automotive', 'Beverages', 'Fashion', 'Finance', 'Entertainment', 'Other'];

export default function CampaignReviewModal({
  isOpen,
  selectedCampaign,
  setSelectedCampaign,
  onClose,
  onPreviewCreative,
  onOpenAnalytics,
  onUpdateCategory,
  onApprove,
  onOpenDeny
}) {
  if (!isOpen || !selectedCampaign) return null;

  const getFrequencyLabel = (freq) => {
    if (!freq) return 'Standard Frequency';
    if (freq === 60) return '1 play per minute (Max)';
    if (freq === 12) return '1 play every 5 mins';
    if (freq === 6) return '1 play every 10 mins';
    if (freq === 4) return '1 play every 15 mins';
    if (freq === 2) return '1 play every 30 mins';
    if (freq === 1) return '1 play per hour';
    return `${freq} plays / hour`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                Advertiser Campaign Submission
              </span>
              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                selectedCampaign.approvalStatus === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : selectedCampaign.approvalStatus === 'rejected'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
              }`}>
                {selectedCampaign.approvalStatus}
              </span>
            </div>
            <h3 className="font-outfit text-xl font-bold text-foreground mt-2 font-mono">
              Booking ID: {selectedCampaign.bookingId}
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Booked on {new Date(selectedCampaign.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close details modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-semibold">
          <div className="p-4 bg-background/50 rounded-2xl border border-border/50 space-y-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" /> Advertiser Account Info
            </span>
            <div className="grid sm:grid-cols-3 gap-4 font-semibold mt-1">
              <div>
                <span className="text-[9px] text-muted-foreground block">Advertiser Name</span>
                <p className="text-foreground font-bold text-sm">{selectedCampaign.advertiserId?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground block">Phone</span>
                <p className="text-foreground font-mono font-bold">{selectedCampaign.advertiserId?.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground block">Email</span>
                <p className="text-foreground font-medium">{selectedCampaign.advertiserId?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-primary" /> Target Venue Outlet
              </span>
              <p className="text-foreground font-bold text-sm">{selectedCampaign.outletId?.outletName || 'Standalone Venue'}</p>
              <p className="text-[11px] text-muted-foreground font-medium">
                {selectedCampaign.city}, {selectedCampaign.state}
              </p>
            </div>

            <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-primary" /> Display Hardware Target
              </span>
              <p className="text-foreground font-bold capitalize">
                {selectedCampaign.deviceType} Display ({selectedCampaign.deviceType === 'tablet' ? '3:4 Aspect Ratio' : '16:9 Aspect Ratio'})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Quantity: <span className="font-bold text-foreground">{selectedCampaign.quantity}</span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" /> Campaign Category & Schedule
            </span>
            <div className="grid sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-card/60 rounded-xl border border-border/40 text-left">
                <span className="text-[9px] text-muted-foreground block font-semibold mb-0.5">Ad Category</span>
                <select
                  value={selectedCampaign.adCategory || 'Other'}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    if (setSelectedCampaign) {
                      setSelectedCampaign({ ...selectedCampaign, adCategory: newCat });
                    }
                    if (onUpdateCategory) {
                      onUpdateCategory(selectedCampaign.bookingId, newCat);
                    }
                  }}
                  className="w-full text-[11px] font-bold text-foreground bg-card border border-border/80 rounded-lg px-2 py-1 uppercase cursor-pointer focus:outline-none focus:border-primary"
                >
                  {AD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-card text-foreground uppercase">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Media Type</span>
                <p className="font-bold text-foreground capitalize text-[11px] mt-0.5">
                  {selectedCampaign.mediaType || selectedCampaign.adType || 'Video'}
                </p>
              </div>
              <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Duration</span>
                <p className="font-bold text-foreground text-[11px] mt-0.5">{selectedCampaign.adDurationDays} Days</p>
              </div>
              <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                <span className="text-[9px] text-muted-foreground block">Frequency</span>
                <p className="font-bold text-foreground text-[11px] mt-0.5">{getFrequencyLabel(selectedCampaign.frequency)}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase block">Total Payout Collected</span>
              <p className="text-2xl font-black text-emerald-500 mt-0.5">₹{selectedCampaign.amount / 100}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-muted-foreground uppercase block">Payment Status</span>
              <span className="inline-block text-xs font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mt-1">
                {selectedCampaign.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border/50 flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPreviewCreative && onPreviewCreative(selectedCampaign.mediaUrl)}
              disabled={!selectedCampaign.mediaUrl}
              className={`px-4 py-2.5 rounded-xl transition-colors text-xs flex items-center space-x-1.5 ${
                selectedCampaign.mediaUrl
                  ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 font-bold cursor-pointer'
                  : 'bg-muted/40 text-muted-foreground border border-border/40 cursor-not-allowed opacity-50 font-semibold'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{selectedCampaign.mediaUrl ? 'Preview Creative' : 'No Media Uploaded'}</span>
            </button>

            {selectedCampaign.paymentStatus === 'completed' && selectedCampaign.approvalStatus === 'approved' && (
              <button
                onClick={() => onOpenAnalytics && onOpenAnalytics(selectedCampaign.bookingId)}
                className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedCampaign.approvalStatus === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove && onApprove(selectedCampaign.bookingId)}
                  className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDeny && onOpenDeny(selectedCampaign)}
                  className="px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Deny</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
            >
              Close Modal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
