'use client';

import React from 'react';
import { Cpu, Printer, FileCheck } from 'lucide-react';

const REQUIREMENTS = [
  { label: 'Operating System', value: 'Windows 10 / Windows 11 (64-bit)' },
  { label: 'Processor', value: 'Intel Core i3 / AMD Ryzen 3 or higher' },
  { label: 'Memory (RAM)', value: '4 GB RAM minimum (8 GB recommended)' },
  { label: 'Disk Space', value: '250 MB free disk space' },
  { label: 'Thermal Printers', value: 'USB, LAN Ethernet, or COM Port ESC/POS (80mm & 58mm)' },
  { label: 'Display Resolution', value: '1280 x 720 minimum (1920 x 1080 Full HD optimal)' }
];

export default function DownloadSpecs() {
  return (
    <section className="py-16 md:py-24 px-6 border-b border-border/40">
      <div className="w-full max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-pill bg-accent/10 text-accent text-xs font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardware Compatibility</span>
          </div>
          <h2 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            Runs on Any Standard Windows Billing PC
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Whether you have an all-in-one POS touch screen, an Intel NUC, or a standard counter desktop running Windows 10 or 11, DigiAds operates smoothly with minimal system resource footprint.
          </p>
          <div className="p-4 rounded-card border border-accent/20 bg-accent/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-accent">
              <Printer className="w-4 h-4" />
              <span>Thermal Printer Compatibility</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compatible with all standard ESC/POS USB, Ethernet, and Virtual COM receipt printers (Epson, TVS, NGX, Posiflex, Retsol, Everycom, and generic 58mm/80mm printers).
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-border rounded-modal bg-card p-6 sm:p-8 shadow-card space-y-4">
            <h3 className="font-outfit text-lg font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-accent" />
              <span>Minimum & Recommended Specifications</span>
            </h3>
            <div className="divide-y divide-border/60">
              {REQUIREMENTS.map((req, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                  <span className="font-semibold text-muted-foreground">{req.label}</span>
                  <span className="font-bold text-foreground text-left sm:text-right">{req.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
