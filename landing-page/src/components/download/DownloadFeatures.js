'use client';

import React from 'react';
import {
  Printer,
  Radio,
  Cpu,
  AppWindow,
  Bell,
  RefreshCw
} from 'lucide-react';

const FEATURES = [
  {
    icon: Printer,
    title: 'Direct Bill & KOT Printing',
    description: 'Directly sends thermal receipts and kitchen order tickets to 80mm & 58mm USB/Network printers without browser dialog interruptions or print delays.'
  },
  {
    icon: Radio,
    title: 'Live WebSockets Order Updates',
    description: 'Real-time two-way synchronization ensures table orders, menu edits, and status transitions reflect across counter screens in milliseconds.'
  },
  {
    icon: Cpu,
    title: 'Native Windows App for Quick Launch',
    description: 'Built natively for 64-bit Windows with near-instant boot times, snappy navigation, and an ultra-lean memory footprint without heavy browser bloat.'
  },
  {
    icon: AppWindow,
    title: 'Runs in the Background',
    description: 'Silently minimizes to the Windows system tray and taskbar so counter workstations stay active and cashiers never miss an incoming table order.'
  },
  {
    icon: Bell,
    title: 'Notifications for Orders & Requests',
    description: 'Clear visual badges, native OS alerts, and distinct audio chimes notify staff instantly whenever customers place orders or request assistance.'
  },
  {
    icon: RefreshCw,
    title: 'Auto Reconnect',
    description: 'Resilient network layer automatically detects dropped connections and reconnects to the cloud without requiring cashiers to refresh or restart.'
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
