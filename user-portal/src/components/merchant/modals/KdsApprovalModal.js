'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Tv, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrderStore } from '@/stores/useOrderStore';

export default function KdsApprovalModal() {
  const { token } = useAuthStore();
  const { showKdsApprovalModal, pendingKdsRequest, setShowKdsApprovalModal, setPendingKdsRequest } = useOrderStore();
  const [submitting, setSubmitting] = useState(false);

  if (!showKdsApprovalModal || !pendingKdsRequest) return null;

  const handleDecision = async (action) => {
    setSubmitting(true);
    try {
      await axios.post(
        `${config.apiUrl}/kds/auth/approve-access`,
        { requestId: pendingKdsRequest.requestId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (action === 'approve') {
        toast.success(`Station "${pendingKdsRequest.stationName}" approved!`);
      } else {
        toast.info(`Connection request rejected.`);
      }
      setPendingKdsRequest(null);
      setShowKdsApprovalModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in">
      <div className="bg-card border-2 border-primary/50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-in">
        {/* Header with pulsing alert */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 relative">
            <Tv className="w-6 h-6 text-[#0069a8]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground">Kitchen Display Connection</h3>
            <p className="text-xs text-muted-foreground">New screen requesting station access</p>
          </div>
        </div>

        {/* Details Card */}
        <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Station Name</span>
            <span className="font-bold text-foreground">{pendingKdsRequest.stationName || 'Kitchen Display'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Venue Outlet</span>
            <span className="font-bold text-foreground">{pendingKdsRequest.venueName || 'Selected Venue'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Client IP</span>
            <span className="font-mono text-muted-foreground">{pendingKdsRequest.ip || 'Unknown'}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Approving this station authorizes it to view active food orders and update cooking statuses. Revoking can be done anytime in Venue Settings.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={() => handleDecision('reject')}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Reject</span>
          </button>
          <button
            onClick={() => handleDecision('approve')}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#0069a8] hover:bg-[#005a91] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve Station</span>
          </button>
        </div>
      </div>
    </div>
  );
}
