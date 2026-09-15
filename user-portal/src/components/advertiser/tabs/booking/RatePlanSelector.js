import React from 'react';
import { Check, ShieldCheck, Loader2 } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';
import { getFrequencyLabel } from '../../utils/mediaUtils';

export default function RatePlanSelector({ matchingPlans }) {
  const {
    selectedOutlet,
    selectedDeviceType,
    selectedRateId,
    setSelectedRateId,
    computedAmount,
    submittingBooking,
    uploading,
  } = useAdvertiserStore();

  return (
    <div className="lg:col-span-7 space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
          Select an Advertising Plan ({matchingPlans.length} Available)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matchingPlans.map((plan) => {
            const planKey = plan.rateId || plan._id;
            const isSelected = selectedRateId === planKey;
            const outletDevices = selectedOutlet?.quantity || 1;
            const planTotal = plan.pricingType === 'whole_venue'
              ? plan.amount
              : (plan.amount * outletDevices);

            return (
              <button
                key={planKey}
                type="button"
                onClick={() => setSelectedRateId(planKey)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-md ring-1 ring-emerald-500'
                    : 'border-border/60 hover:border-emerald-500/40 bg-card/20 text-muted-foreground hover:bg-card/40'
                }`}
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-outfit text-sm font-black text-foreground">
                        {plan.durationDays} {plan.durationDays === 1 ? 'Day Campaign' : 'Days Campaign'}
                      </span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {getFrequencyLabel(plan.frequency)}
                        </span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-semibold pt-1">
                    {plan.pricingType === 'whole_venue' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        🌟 Full Venue Package (All {outletDevices} {selectedDeviceType === 'tablet' ? 'Tablets' : 'Screens'})
                      </span>
                    ) : (
                      <span>
                        ₹{(plan.amount / 100).toLocaleString('en-IN')}/device × {outletDevices} devices
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-3 border-t border-border/40 mt-3 w-full">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Payable</span>
                  <span className="font-outfit text-lg font-black text-foreground">
                    ₹{(planTotal / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Pay button for Mobile View */}
      <div className="pt-2 block lg:hidden">
        <button
          type="submit"
          disabled={computedAmount === 0 || submittingBooking || uploading || !selectedRateId}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground text-white font-black py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-xl hover:shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed text-sm min-h-[54px]"
        >
          {submittingBooking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
              <span>Processing Payment...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 shrink-0 text-white" />
              <span>
                {computedAmount > 0
                  ? `Pay ₹${(computedAmount / 100).toLocaleString('en-IN')} & Reserve Ad Slots`
                  : 'Select a Plan Above to Proceed'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
