import React from 'react';
import { Receipt, ShieldCheck, Loader2 } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';
import { getFrequencyLabel } from '../../utils/mediaUtils';

export default function OrderSummaryCard({ matchingPlans }) {
  const {
    selectedOutlet,
    selectedMediaType,
    maxVideoLengthSeconds,
    selectedRateId,
    adDurationDays,
    frequency,
    computedAmount,
    submittingBooking,
    uploading,
  } = useAdvertiserStore();

  const selectedPlan = matchingPlans.find(p => (p.rateId || p._id) === selectedRateId);

  return (
    <div className="lg:col-span-5">
      {selectedRateId ? (
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-emerald-500 shrink-0" />
              <h4 className="font-outfit text-xs font-bold uppercase tracking-wider text-foreground">
                Order & Pricing Summary
              </h4>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Verified Rate
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-background/50 border border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Selected Format</span>
              <span className="font-extrabold text-foreground">
                {selectedMediaType === 'image' ? '🖼️ Static Image' : `🎬 ${maxVideoLengthSeconds}s Video Plan`}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-background/50 border border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Target Hardware</span>
              <span className="font-extrabold text-foreground capitalize">
                {selectedOutlet?.deviceType === 'tablet' ? '📱 Tablet Kiosk (3:4)' : '📺 Wall Screen (16:9)'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-background/50 border border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Campaign Duration</span>
              <span className="font-extrabold text-foreground">
                {adDurationDays} {adDurationDays === 1 ? 'Day' : 'Days'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-background/50 border border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Coverage Scope</span>
              <span className="font-extrabold text-foreground">
                {selectedPlan?.pricingType === 'whole_venue'
                  ? `Full Venue (All ${selectedOutlet?.quantity || 1} Devices)`
                  : `${selectedOutlet?.quantity || 1} Devices (${(selectedOutlet?.quantity || 1)}x Rate)`
                }
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-background/50 border border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Rotation Frequency</span>
              <span className="font-extrabold text-foreground">
                {getFrequencyLabel(frequency)}
              </span>
            </div>
          </div>

          {/* Total Cost Summary Row */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                Total Payable Amount
              </span>
              <div className="font-outfit text-2xl font-black text-emerald-500">
                ₹{(computedAmount / 100).toLocaleString('en-IN')}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Phone Pe Payments Gateway</p>
          </div>

          {/* Pay Button on Right Column (Desktop View) */}
          <div className="pt-2 hidden lg:block">
            <button
              type="submit"
              disabled={computedAmount === 0 || submittingBooking || uploading || !selectedRateId}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground text-white font-black py-3.5 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-xl hover:shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed text-xs min-h-[48px]"
            >
              {submittingBooking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0 text-white" />
                  <span>Pay ₹{(computedAmount / 100).toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-card/30 border border-dashed border-border/60 text-center space-y-2">
          <Receipt className="w-6 h-6 text-muted-foreground mx-auto opacity-50" />
          <p className="text-xs font-bold text-foreground">Order & Pricing Summary</p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Select options on the left to calculate total payable rate card amount.
          </p>
        </div>
      )}
    </div>
  );
}
