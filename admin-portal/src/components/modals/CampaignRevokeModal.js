'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function CampaignRevokeModal({
  isOpen,
  selectedCampaign,
  revokeReason,
  setRevokeReason,
  revokePassword,
  setRevokePassword,
  revokeLoading,
  onClose,
  onRevoke
}) {
  if (!isOpen || !selectedCampaign) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span>Revoke Ad Campaign</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onRevoke} className="space-y-4">
          <p className="text-xs text-muted-foreground font-semibold">
            Revoking campaign <span className="font-mono font-bold text-primary">{selectedCampaign.bookingId}</span> is a destructive action.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reason for Revocation
            </label>
            <textarea
              required
              rows="3"
              placeholder="Provide reason for revoking this campaign..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Administrator Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter admin password to confirm"
              value={revokePassword}
              onChange={(e) => setRevokePassword(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={revokeLoading}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50 min-h-[44px]"
            >
              {revokeLoading ? 'Revoking...' : 'Confirm Revocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
