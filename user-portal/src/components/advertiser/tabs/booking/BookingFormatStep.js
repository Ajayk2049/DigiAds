import React from 'react';
import { Layers, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';

export default function BookingFormatStep() {
  const {
    selectedOutlet,
    selectedMediaType,
    setSelectedMediaType,
    maxVideoLengthSeconds,
    setMaxVideoLengthSeconds,
  } = useAdvertiserStore();

  return (
    <div className="space-y-4 pt-6 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
          <Layers className="w-4 h-4 mr-2 text-primary shrink-0" />
          <span>Step 2: Choose What You Want to Advertise</span>
        </h3>
        <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
          Step 2 of 3
        </span>
      </div>
      <p className="text-xs text-muted-foreground font-semibold">
        Select your creative ad format. Static image plans are cheaper than dynamic video motion plans.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <button
          type="button"
          disabled={!selectedOutlet}
          onClick={() => setSelectedMediaType('image')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedMediaType === 'image'
              ? 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-md'
              : 'border-border/60 hover:border-emerald-500/50 bg-card/10 text-muted-foreground'
          } ${!selectedOutlet ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl">🖼️</span>
              {selectedMediaType === 'image' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            </div>
            <h4 className="font-bold text-xs text-foreground">Static Image Ad</h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Economical static banners (Upload up to 2 images for front & back display).
            </p>
          </div>
          <span className="text-[9px] font-black uppercase text-emerald-500 mt-3">Affordable Static Rates</span>
        </button>

        <button
          type="button"
          disabled={!selectedOutlet}
          onClick={() => setSelectedMediaType('video')}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedMediaType === 'video'
              ? 'border-purple-500 bg-purple-500/10 text-foreground shadow-md'
              : 'border-border/60 hover:border-purple-500/50 bg-card/10 text-muted-foreground'
          } ${!selectedOutlet ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl">🎬</span>
              {selectedMediaType === 'video' && <CheckCircle className="w-5 h-5 text-purple-500" />}
            </div>
            <h4 className="font-bold text-xs text-foreground">Dynamic Video Ad</h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              High-impact motion video clips (Select 30s or 60s plan tier below).
            </p>
          </div>
          <span className="text-[9px] font-black uppercase text-purple-500 mt-3">Premium Dynamic Rates</span>
        </button>
      </div>

      {/* Video Duration Tier Selector & Warning Banner */}
      {selectedMediaType === 'video' && (
        <div className="pt-3 space-y-3 animate-fade-in border-t border-border/30 mt-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Select Video Duration Plan Tier
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMaxVideoLengthSeconds(30)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                maxVideoLengthSeconds === 30
                  ? 'border-blue-500 bg-blue-500/10 text-foreground shadow-sm'
                  : 'border-border/60 hover:border-blue-500/40 bg-card/10 text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground">🎬 30s Standard Plan</span>
                {maxVideoLengthSeconds === 30 && <CheckCircle className="w-4 h-4 text-blue-500" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">For videos from 1 second up to 30 seconds</p>
            </button>

            <button
              type="button"
              onClick={() => setMaxVideoLengthSeconds(60)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                maxVideoLengthSeconds === 60
                  ? 'border-purple-500 bg-purple-500/10 text-foreground shadow-sm'
                  : 'border-border/60 hover:border-purple-500/40 bg-card/10 text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-foreground">🎬 60s Extended Plan</span>
                {maxVideoLengthSeconds === 60 && <CheckCircle className="w-4 h-4 text-purple-500" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">For long commercials from 31 to 60 seconds</p>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Important Video Plan Rule</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold leading-relaxed pl-5 space-y-0.5">
              <p>• <strong>30s Plan</strong>: Covers videos from <strong>1s up to 30s</strong>.</p>
              <p>• <strong>60s Plan</strong>: Covers commercials from <strong>31s up to 60s</strong>.</p>
              <p className="text-amber-500 pt-0.5">⚠️ <em>Videos exceeding your selected paid plan duration tier will be rejected during media upload.</em></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
