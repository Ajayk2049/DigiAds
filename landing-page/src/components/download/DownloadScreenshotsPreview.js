'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Utensils, Receipt, ShoppingBag, Sun, Moon } from 'lucide-react';

const SCREENS = [
  {
    id: 'live_orders',
    label: 'Live Orders POS',
    tag: 'Real-time KOT & Queue',
    icon: ShoppingBag,
    dark: '/DownloadPageImages/dark3.png',
    light: '/DownloadPageImages/light3.png',
    alt: 'DigiAds Windows Desktop POS Live Orders Screen'
  },
  {
    id: 'menu_manager',
    label: 'Menu Manager',
    tag: 'Dishes & Shift Pricing',
    icon: Utensils,
    dark: '/DownloadPageImages/dark1.png',
    light: '/DownloadPageImages/light1.png',
    alt: 'DigiAds Windows Desktop POS Menu Manager Screen'
  },
  {
    id: 'payment_history',
    label: 'Payment History',
    tag: 'Settlements & Print Receipts',
    icon: Receipt,
    dark: '/DownloadPageImages/dark2.png',
    light: '/DownloadPageImages/light2.png',
    alt: 'DigiAds Windows Desktop POS Payment History Screen'
  }
];

export default function DownloadScreenshotsPreview() {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('live_orders');
  const [previewTheme, setPreviewTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      setPreviewTheme(resolvedTheme);
    }
  }, [resolvedTheme]);

  const currentScreen = SCREENS.find((s) => s.id === activeTab) || SCREENS[0];
  const imageSrc = previewTheme === 'dark' ? currentScreen.dark : currentScreen.light;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="pt-10 max-w-6xl mx-auto space-y-4"
    >
      {/* Controls Bar: Screen Switcher + Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        {/* Screen Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-card bg-muted/60 border border-border/60">
          {SCREENS.map((screen) => {
            const Icon = screen.icon;
            const isActive = activeTab === screen.id;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveTab(screen.id)}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-card text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-background text-foreground shadow-card border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                <span>{screen.label}</span>
              </button>
            );
          })}
        </div>

        {/* Preview Theme Switcher */}
        <div className="inline-flex items-center space-x-1 p-1 rounded-card bg-muted/60 border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setPreviewTheme('dark')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-card font-semibold transition-all cursor-pointer ${
              previewTheme === 'dark'
                ? 'bg-background text-foreground shadow-card border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Preview in Dark Mode"
          >
            <Moon className="w-3.5 h-3.5 text-accent" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTheme('light')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-card font-semibold transition-all cursor-pointer ${
              previewTheme === 'light'
                ? 'bg-background text-foreground shadow-card border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Preview in Light Mode"
          >
            <Sun className="w-3.5 h-3.5 text-accent" />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* Desktop Window Mockup Frame */}
      <div className="relative rounded-modal border border-border/90 bg-card p-2 sm:p-3 shadow-modal overflow-hidden">
        {/* Window Title Bar */}
        <div className="h-8 bg-muted/70 rounded-t-card flex items-center justify-between px-3.5 border-b border-border/60">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-pill bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-pill bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-pill bg-emerald-500/80 inline-block" />
            <span className="text-[11px] font-mono text-muted-foreground pl-2 hidden sm:inline">
              DigiAds Merchant Terminal POS — Counter v1.0.0
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[10px] font-bold text-muted-foreground">
            <span className="px-2 py-0.5 rounded-pill bg-background border border-border/60 text-accent">
              {currentScreen.tag}
            </span>
            <span className="hidden md:inline uppercase tracking-wider text-[9px]">
              {previewTheme} Theme
            </span>
          </div>
        </div>

        {/* Screenshot Container */}
        <div className="relative rounded-b-card overflow-hidden bg-background border border-border/40 aspect-[16/10] sm:aspect-[16/9.5]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${previewTheme}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full h-full"
            >
              <Image
                src={imageSrc}
                alt={currentScreen.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1400px) 90vw, 1200px"
                className="object-cover object-top"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
