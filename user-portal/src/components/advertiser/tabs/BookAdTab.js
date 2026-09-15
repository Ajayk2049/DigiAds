import React, { useMemo, useEffect } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';
import MediaUploadWorkflow from './MediaUploadWorkflow';
import BookingLocationStep from './booking/BookingLocationStep';
import BookingFormatStep from './booking/BookingFormatStep';
import RatePlanSelector from './booking/RatePlanSelector';
import OrderSummaryCard from './booking/OrderSummaryCard';

export default function BookAdTab() {
  const {
    activeUploadBooking,
    rates,
    selectedDeviceType,
    selectedMediaType,
    maxVideoLengthSeconds,
    selectedRateId,
    setSelectedRateId,
    selectedOutlet,
    setQuantity,
    setAdDurationDays,
    setFrequency,
    setComputedAmount,
    handleInitiateBooking,
  } = useAdvertiserStore();

  // Filter matching rate plans dynamically based on selected hardware & creative format
  const matchingPlans = useMemo(() => {
    if (!selectedDeviceType || !selectedMediaType) return [];
    return rates.filter((r) => {
      if (r.deviceType !== selectedDeviceType) return false;
      if (selectedMediaType === 'image') {
        return r.mediaType === 'image' || !r.mediaType;
      }
      if (selectedMediaType === 'video') {
        const isVideo = r.mediaType === 'video';
        const matchTier = r.maxVideoLengthSeconds ? r.maxVideoLengthSeconds === maxVideoLengthSeconds : true;
        return isVideo && matchTier;
      }
      return false;
    });
  }, [rates, selectedDeviceType, selectedMediaType, maxVideoLengthSeconds]);

  // Pre-select first matching rate plan when plans list updates
  useEffect(() => {
    if (matchingPlans.length > 0) {
      const exists = matchingPlans.find(p => (p.rateId || p._id) === selectedRateId);
      if (!exists) {
        setSelectedRateId(matchingPlans[0].rateId || matchingPlans[0]._id);
      }
    } else {
      setSelectedRateId('');
      setComputedAmount(0);
    }
  }, [matchingPlans, selectedRateId, setSelectedRateId, setComputedAmount]);

  // Sync pricing, duration, frequency, quantity from selected plan
  useEffect(() => {
    if (!selectedOutlet || !selectedMediaType || !selectedRateId) {
      setComputedAmount(0);
      return;
    }
    const currentPlan = matchingPlans.find(p => (p.rateId || p._id) === selectedRateId);
    if (!currentPlan) {
      setComputedAmount(0);
      return;
    }

    setAdDurationDays(currentPlan.durationDays);
    setFrequency(currentPlan.frequency);

    const outletDevices = selectedOutlet.quantity || 1;
    setQuantity(outletDevices.toString());

    if (currentPlan.pricingType === 'whole_venue') {
      setComputedAmount(currentPlan.amount);
    } else {
      setComputedAmount(currentPlan.amount * outletDevices);
    }
  }, [selectedRateId, matchingPlans, selectedOutlet, selectedMediaType, setAdDurationDays, setFrequency, setQuantity, setComputedAmount]);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 rounded-2xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)] space-y-6 transition-all duration-500">
      {activeUploadBooking ? (
        <MediaUploadWorkflow />
      ) : (
        <>
          <h1 className="font-outfit text-2xl font-black text-foreground mb-1">Book Advertising Spot</h1>
          <p className="text-muted-foreground text-xs font-semibold mb-6">
            Select your target venue outlet and duration to proceed to payment checkout.
          </p>

          {/* Step 1: Location selection */}
          <BookingLocationStep />

          {/* Step 2: Creative Format Selection */}
          <BookingFormatStep />

          {/* Step 3: Campaign Schedule & Pricing Package */}
          {!selectedMediaType ? (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center space-x-3 mt-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Please choose whether you want to advertise <strong>Static Image</strong> or <strong>Dynamic Video</strong> above to unlock pricing plans.</span>
            </div>
          ) : matchingPlans.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card/20 border border-dashed border-border/60 text-center space-y-3 mt-6 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto text-muted-foreground">
                <AlertCircle className="w-6 h-6 opacity-60" />
              </div>
              <div>
                <h4 className="font-outfit text-sm font-bold text-foreground">No Plans Available for This Selection</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto font-medium">
                  There are currently no active pricing rate cards configured for {selectedDeviceType === 'tablet' ? 'Tabletop Tablets' : 'Wall Screens'} with {selectedMediaType === 'image' ? 'Static Images' : `${maxVideoLengthSeconds}s Videos`}. Please select another format or check back later.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitiateBooking} className="space-y-4 pt-6 border-t border-border/40 mt-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-primary shrink-0" />
                  <span>Step 3: Select Plan & Proceed to Pay ({selectedMediaType === 'image' ? '🖼️ Static Image Plans' : `🎬 ${maxVideoLengthSeconds}s Video Plans`})</span>
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Step 3 of 3
                </span>
              </div>

              {/* 2-Column Side-by-Side Layout */}
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <RatePlanSelector matchingPlans={matchingPlans} />
                <OrderSummaryCard matchingPlans={matchingPlans} />
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
