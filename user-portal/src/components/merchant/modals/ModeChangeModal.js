'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { usePromoStore } from '@/stores/usePromoStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ModeChangeModal(props) {
  const promo = usePromoStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;
  const selectedOutletId = props.selectedOutletId ?? outlet.selectedOutletId;

  const isOpen = props.isOpen ?? promo.showModeChangeModal;
  const onClose = props.onClose ?? (() => promo.setShowModeChangeModal(false));
  const applications = props.applications ?? outlet.applications;
  const promosList = props.promosList ?? promo.promosList;
  const modeReqNotes = props.modeReqNotes ?? promo.modeReqNotes;
  const setModeReqNotes = props.setModeReqNotes ?? promo.setModeReqNotes;
  const submittingModeReq = props.submittingModeReq ?? promo.submittingModeReq;
  const handleRequestModeChange = props.handleRequestModeChange ?? ((targetMode) => promo.handleRequestModeChange(token, selectedOutletId, targetMode));

  if (!isOpen) return null;


  const currentApp = applications.find(a => a._id === selectedOutletId);
  const currentMode = currentApp?.adMode || (currentApp?.allowOpenAds === false ? 'closed' : 'open');
  const targetMode = currentMode === 'open' ? 'closed' : 'open';
  const hasActivePromos = (promosList || []).some(p => p.isStreaming);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
        <div className="flex justify-between items-center border-b border-border/40 pb-4">
          <div>
            <h3 className="text-lg font-black uppercase text-foreground">Request Ad Mode Change</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Submit request to Platform Admin</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Current Venue Mode:</div>
            <div className="text-sm font-black uppercase text-foreground flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-xs ${currentMode === 'closed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {currentMode} Mode
              </span>
              <span>→ Target: {targetMode.toUpperCase()} Mode</span>
            </div>
          </div>

          {hasActivePromos ? (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Active In-House Promos Detected</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Please clear all active in-house promo slots in your venue before applying for a mode transition.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Merchant Notes / Reason (Optional)
                </label>
                <textarea
                  value={modeReqNotes}
                  onChange={(e) => setModeReqNotes(e.target.value)}
                  placeholder="Briefly state why you want to switch modes..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary min-h-[80px]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRequestModeChange(targetMode)}
                disabled={submittingModeReq}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 uppercase tracking-wider disabled:opacity-50"
              >
                {submittingModeReq ? (
                  <span>Submitting Request...</span>
                ) : (
                  <span>Submit Request for {targetMode.toUpperCase()} Mode</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
