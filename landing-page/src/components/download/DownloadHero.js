'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  HelpCircle,
  CheckCircle2,
  HardDrive,
  Monitor,
  Printer
} from 'lucide-react';

export default function DownloadHero({ downloadUrl }) {
  return (
    <section className="relative pt-12 md:pt-20 pb-16 md:pb-24 px-6 overflow-hidden border-b border-border/40">
      <div className="w-full max-w-[1400px] mx-auto text-center space-y-8 relative z-10">
        {/* Version Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-pill bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide"
        >
          <span>Official Release v1.0.0 • Windows 64-bit</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-outfit text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.08]"
        >
          DigiAds Terminal for <br />
          <span className="text-accent">Windows Desktop</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal"
        >
          The dedicated desktop Point-of-Sale client built for restaurant cash counters. Direct thermal receipt printing, loud kitchen chimes, and instant table order management.
        </motion.p>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-accent hover:bg-accent/90 text-white font-bold text-base px-8 py-4 rounded-card transition-all shadow-card hover:shadow-pop active:scale-[0.99] group cursor-pointer"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span>Download for Windows (.exe)</span>
          </a>

          <a
            href="#guide"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-card hover:bg-muted/80 border border-border text-foreground font-bold text-base px-7 py-4 rounded-card transition-all shadow-card hover:border-accent/40 active:scale-[0.99] cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-accent" />
            <span>Installation Guide</span>
          </a>
        </motion.div>

        {/* File Info Metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground font-semibold pt-2"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free with Merchant Account
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-accent" /> ~65 MB Setup Package
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-accent" /> Windows 10 & 11 (x64)
          </span>
        </motion.div>

        {/* Application Mockup Preview Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="pt-8 max-w-5xl mx-auto"
        >
          <div className="relative rounded-modal border border-border/80 bg-card p-3 sm:p-4 shadow-modal overflow-hidden group">
            <div className="h-7 bg-muted/60 rounded-t-card flex items-center px-4 space-x-2 border-b border-border/50 mb-3">
              <div className="w-3 h-3 rounded-pill bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-pill bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-pill bg-green-500/80"></div>
              <span className="text-[11px] font-mono text-muted-foreground pl-3">DigiAds Merchant Terminal POS — Counter v1.0.0</span>
            </div>

            {/* Visual Representation of POS App Grid */}
            <div className="bg-background rounded-card p-6 sm:p-8 text-left grid md:grid-cols-3 gap-6 border border-border/40">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Tables (12)</span>
                  <span className="w-2 h-2 rounded-pill bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-card border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <div className="text-xs font-bold">Table 01</div>
                    <div className="text-[10px] font-semibold">Dining • 3 Items</div>
                  </div>
                  <div className="p-3 rounded-card border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <div className="text-xs font-bold">Table 02</div>
                    <div className="text-[10px] font-semibold">Bill Requested</div>
                  </div>
                  <div className="p-3 rounded-card border border-border bg-card">
                    <div className="text-xs font-bold text-foreground">Table 03</div>
                    <div className="text-[10px] text-muted-foreground">Available</div>
                  </div>
                  <div className="p-3 rounded-card border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <div className="text-xs font-bold">Table 04</div>
                    <div className="text-[10px] font-semibold">Active KOT #104</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Counter Order #ORD-8924</span>
                  <span className="text-xs font-mono font-bold text-accent">₹1,240.00</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-card bg-card border border-border/50">
                    <span className="font-semibold text-foreground">2x Paneer Butter Masala (Special)</span>
                    <span className="font-mono text-muted-foreground">₹560.00</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-card bg-card border border-border/50">
                    <span className="font-semibold text-foreground">4x Butter Garlic Naan</span>
                    <span className="font-mono text-muted-foreground">₹240.00</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-card bg-card border border-border/50">
                    <span className="font-semibold text-foreground">2x Fresh Lime Soda</span>
                    <span className="font-mono text-muted-foreground">₹160.00</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-muted text-[11px] font-bold text-muted-foreground">
                    <Printer className="w-3.5 h-3.5 text-accent" />
                    <span>USB Thermal (80mm Ready)</span>
                  </div>
                  <div className="px-4 py-1.5 rounded-card bg-accent text-white text-xs font-bold shadow-card">
                    Print KOT & Settle Bill
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
