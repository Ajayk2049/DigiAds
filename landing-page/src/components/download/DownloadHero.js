'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  HelpCircle,
  CheckCircle2,
  HardDrive,
  Monitor
} from 'lucide-react';
import DownloadScreenshotsPreview from './DownloadScreenshotsPreview';

export default function DownloadHero({ downloadUrl }) {
  return (
    <section className="relative pt-12 md:pt-20 pb-16 md:pb-24 px-6 overflow-hidden border-b border-border/40">
      <div className="w-full max-w-[1400px] mx-auto text-center space-y-8 relative z-10">
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
            <HardDrive className="w-4 h-4 text-accent" /> ~15 MB Setup Package
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-accent" /> Windows 10 & 11 (x64)
          </span>
        </motion.div>

        {/* Real Screenshots Showcase Preview */}
        <DownloadScreenshotsPreview />
      </div>
    </section>
  );
}
