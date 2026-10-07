'use client';

import React from 'react';
import {
  Printer,
  Volume2,
  Zap,
  ShieldCheck,
  RefreshCw,
  Cpu
} from 'lucide-react';

const FEATURES = [
  {
    icon: Printer,
    title: 'Direct Thermal & KOT Printing',
    description: 'Directly sends receipt and kitchen KOT jobs to 80mm & 58mm USB and Network ESC/POS thermal printers without browser dialog interruptions.'
  },
  {
    icon: Volume2,
    title: 'Loud Kitchen Sound Chimes',
    description: 'High-visibility audio notifications alert counter staff instantly when diners place orders from their tabletop tablets, even in busy, noisy environments.'
  },
  {
    icon: Zap,
    title: 'Sub-Second Live WebSocket Sync',
    description: 'Orders flow instantly from guest table tablets to your billing screen in under 300ms, ensuring immediate kitchen dispatch and zero order latency.'
  },
  {
    icon: ShieldCheck,
    title: 'Order Cancellation Protection',
    description: 'Double-confirmation safety prompts prevent accidental order cancellations and protect kitchen prep workflows.'
  },
  {
    icon: RefreshCw,
    title: 'Offline Resilience & Auto-Reconnect',
    description: 'Maintains local state and gracefully reconnects the moment internet connectivity restores without disrupting cashier operations.'
  },
  {
    icon: Cpu,
    title: 'Native 64-Bit Performance',
    description: 'Built with Flutter for Windows desktop. Ultra-fast rendering, low memory footprint, and zero reliance on sluggish browser tabs.'
  }
];

export default function DownloadFeatures() {
  return (
    <section className="py-16 md:py-24 px-6 bg-card/40 border-b border-border/40">
      <div className="w-full max-w-[1400px] mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground">
            Why Run the Windows Desktop App?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Browser tabs can lag, sleep in the background, or get closed accidentally. DigiAds for Windows is built for high-tempo hospitality environments.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-card border border-border bg-card shadow-card hover:border-accent/40 transition-all space-y-3 group"
              >
                <div className="w-12 h-12 rounded-card bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-lg font-bold text-foreground">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
