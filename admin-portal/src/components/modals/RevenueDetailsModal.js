'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function RevenueDetailsModal({
  isOpen,
  campaigns = [],
  onClose
}) {
  if (!isOpen) return null;

  const completedCampaigns = campaigns.filter((c) => c.paymentStatus === 'completed');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-primary/20">
              Revenue Summary
            </span>
            <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Paid Advertisers & Completed Payments</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {completedCampaigns.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-xs font-semibold">No completed payments found.</p>
          ) : (
            completedCampaigns.map((c) => (
              <div key={c._id} className="p-4 rounded-2xl bg-background/50 border border-border/60 text-xs font-semibold space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-foreground text-sm">{c.advertiserId?.name || 'Advertiser'}</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">Campaign ID: {c.bookingId}</span>
                  </div>
                  <span className="text-emerald-500 font-black text-base">₹{c.amount / 100}</span>
                </div>

                <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 flex justify-between">
                  <span>Outlet: {c.outletId?.outletName || 'Venue'}</span>
                  <span>Payment Status: <span className="text-emerald-500 font-bold uppercase">{c.paymentStatus}</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
