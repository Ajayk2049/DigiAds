'use client';

import React from 'react';
import { Tv, ArrowLeft, Loader2 } from 'lucide-react';

export default function KdsWaitingRadar({ venueName, stationName, onCancel }) {
  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-card border border-border rounded-xl shadow-2xl text-center space-y-6 animate-scale-in">
      {/* Animated Radar Pulse */}
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/20"></span>
        <span className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-primary/30"></span>
        <div className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <Tv className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-outfit text-lg font-bold text-foreground">Waiting for Approval</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Request sent for <span className="font-bold text-foreground">{stationName}</span> at{' '}
          <span className="font-bold text-foreground">{venueName}</span>.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center justify-center space-x-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
        <span>Manager has received the approval prompt on their dashboard.</span>
      </div>

      <button
        onClick={onCancel}
        className="w-full py-2.5 px-4 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center justify-center space-x-2 border border-border transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Cancel & Try Another PIN</span>
      </button>
    </div>
  );
}
