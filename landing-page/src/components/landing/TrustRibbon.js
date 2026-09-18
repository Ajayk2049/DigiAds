'use client';

import React from 'react';
import { ShieldCheck, Zap, IndianRupee, Layers, BarChart3 } from 'lucide-react';

export default function TrustRibbon() {
  return (
    <section className="py-7 bg-muted/40 border-y border-border/80 relative">
      <div className="w-full max-w-[1700px] mx-auto px-6 md:px-12">
        <div className="flex flex-wrap items-center justify-between gap-6 text-xs md:text-sm font-semibold text-muted-foreground">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#0069a8]" />
            <span className="text-foreground">Secure TableTop Kiosks</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-foreground">Realtime gRPC & WebSockets Updates</span>
          </div>
          <div className="flex items-center space-x-2">
            <IndianRupee className="w-4 h-4 text-emerald-500" />
            <span className="text-foreground">UPI Payment Integration</span>
          </div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-foreground">Analytics Dashboard</span>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-500" />
            <span className="text-foreground">Targeted Advertisements</span>
          </div>
        </div>
      </div>
    </section>
  );
}
