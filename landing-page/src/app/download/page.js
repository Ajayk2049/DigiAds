'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Download,
  Monitor,
  Printer,
  Volume2,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Cpu,
  RefreshCw,
  ExternalLink,
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import DownloadHeader from '@/components/download/DownloadHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { config } from '@/config';

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

const REQUIREMENTS = [
  { label: 'Operating System', value: 'Windows 10 / Windows 11 (64-bit)' },
  { label: 'Processor', value: 'Intel Core i3 / AMD Ryzen 3 or higher' },
  { label: 'Memory (RAM)', value: '4 GB RAM minimum (8 GB recommended)' },
  { label: 'Disk Space', value: '250 MB free disk space' },
  { label: 'Thermal Printers', value: 'USB, LAN Ethernet, or COM Port ESC/POS (80mm & 58mm)' },
  { label: 'Display Resolution', value: '1280 x 720 minimum (1920 x 1080 Full HD optimal)' }
];

const STEPS = [
  {
    step: '01',
    title: 'Download the Installer',
    description: 'Click the download button above to grab the official DigiAds-POS-Setup.exe executable directly from our release repository.'
  },
  {
    step: '02',
    title: 'Run & Install',
    description: 'Launch the downloaded setup file on your billing counter PC. If Windows SmartScreen appears, click "More info" and then "Run anyway".'
  },
  {
    step: '03',
    title: 'Log In with Merchant OTP',
    description: 'Open DigiAds POS, enter your registered venue mobile number, and enter the OTP. All your tables, live orders, and menu items load automatically!'
  }
];

export default function DownloadPage() {
  const downloadUrl = config.githubDownloadUrl;
  const userPortalUrl = config.userPortalUrl;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent/20 selection:text-accent">
      <DownloadHeader userPortalUrl={userPortalUrl} downloadUrl={downloadUrl} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-12 md:pt-20 pb-16 md:pb-24 px-6 overflow-hidden border-b border-border/40">
          <div className="w-full max-w-[1400px] mx-auto text-center space-y-8 relative z-10">
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5" />
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
              <div className="relative rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xl overflow-hidden group">
                <div className="h-7 bg-muted/60 rounded-t-xl flex items-center px-4 space-x-2 border-b border-border/50 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="text-[11px] font-mono text-muted-foreground pl-3">DigiAds Merchant Terminal POS — Counter v1.0.0</span>
                </div>
                
                {/* Visual Representation of POS App Grid */}
                <div className="bg-background/90 rounded-xl p-6 sm:p-8 text-left grid md:grid-cols-3 gap-6 border border-border/40">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Tables (12)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <div className="text-xs font-bold">Table 01</div>
                        <div className="text-[10px] font-semibold">Dining • 3 Items</div>
                      </div>
                      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <div className="text-xs font-bold">Table 02</div>
                        <div className="text-[10px] font-semibold">Bill Requested</div>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <div className="text-xs font-bold text-foreground">Table 03</div>
                        <div className="text-[10px] text-muted-foreground">Available</div>
                      </div>
                      <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-card border border-border/50">
                        <span className="font-semibold text-foreground">2x Paneer Butter Masala (Special)</span>
                        <span className="font-mono text-muted-foreground">₹560.00</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-card border border-border/50">
                        <span className="font-semibold text-foreground">4x Butter Garlic Naan</span>
                        <span className="font-mono text-muted-foreground">₹240.00</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-lg bg-card border border-border/50">
                        <span className="font-semibold text-foreground">2x Fresh Lime Soda</span>
                        <span className="font-mono text-muted-foreground">₹160.00</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                      <div className="px-3 py-1.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                        🖨️ USB Thermal (80mm Ready)
                      </div>
                      <div className="px-4 py-1.5 rounded-md bg-accent text-white text-xs font-bold shadow-sm">
                        Print KOT & Settle Bill
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* WHY DESKTOP POS (FEATURES GRID) */}
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
                    className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-accent/40 transition-all space-y-3 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
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

        {/* SYSTEM REQUIREMENTS & SPECS */}
        <section className="py-16 md:py-24 px-6 border-b border-border/40">
          <div className="w-full max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Hardware Compatibility</span>
              </div>
              <h2 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
                Runs on Any Standard Windows Billing PC
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you have an all-in-one POS touch screen, an Intel NUC, or a standard counter desktop running Windows 10 or 11, DigiAds operates smoothly with minimal system resource footprint.
              </p>
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <Printer className="w-4 h-4" /> Thermal Printer Compatibility
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compatible with all standard ESC/POS USB, Ethernet, and Virtual COM receipt printers (Epson, TVS, NGX, Posiflex, Retsol, Everycom, and generic 58mm/80mm printers).
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="border border-border rounded-2xl bg-card p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="font-outfit text-lg font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-accent" /> Minimum & Recommended Specifications
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

        {/* 3-STEP SETUP GUIDE */}
        <section id="guide" className="py-16 md:py-24 px-6 bg-card/30 border-b border-border/40">
          <div className="w-full max-w-[1400px] mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground">
                Easy 3-Step Setup
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Get your restaurant counter ready in less than 3 minutes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((s, idx) => (
                <div
                  key={idx}
                  className="p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="font-outfit text-4xl font-black text-accent/20 select-none">
                    {s.step}
                  </div>
                  <h3 className="font-outfit text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>

            {/* SmartScreen Tip Alert */}
            <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 max-w-3xl mx-auto flex items-start gap-3.5 text-xs sm:text-sm leading-relaxed">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <strong className="font-bold block mb-0.5">Windows SmartScreen Note:</strong>
                Because this is an in-house enterprise executable, Windows Defender SmartScreen might display a protection prompt on first launch. Simply click <span className="underline font-bold">"More info"</span> and then <span className="underline font-bold">"Run anyway"</span> to proceed with installation.
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CALL TO ACTION */}
        <section className="py-16 md:py-24 px-6 text-center">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
              Ready to Upgrade Your Cash Counter?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Download the official Windows POS terminal client today and experience zero-lag dining operations.
            </p>
            <div className="pt-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-3 bg-accent hover:bg-accent/90 text-white font-bold text-base px-8 py-4 rounded-card transition-all shadow-card hover:shadow-pop active:scale-[0.99] group cursor-pointer"
              >
                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Download DigiAds for Windows</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
