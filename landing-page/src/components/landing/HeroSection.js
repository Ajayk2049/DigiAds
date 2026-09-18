'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Store, ArrowRight, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import imgHeroBanner from '@/assets/HeroBanner.png';
import { fadeInUp, staggerContainer } from '@/data/landingData';

export default function HeroSection({ userPortalUrl }) {
  return (
    <section className="relative pt-20 md:pt-30 pb-20 md:pb-28 px-6 overflow-hidden">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
        {/* Left Column: Hero Copy & Dual Conversion CTAs */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="lg:col-span-5 text-left space-y-7"
        >
          {/* Status Pill */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#0069a8]/10 border border-[#0069a8]/20 text-[#0069a8] dark:text-sky-400 text-xs font-bold tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Dining & Digital Ad Network</span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="font-outfit text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]"
          >
            Transform Dining Tables Into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0069a8] via-sky-500 to-indigo-600">
              Interactive Ad Channels
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-normal"
          >
            DigiAds bridges dining hospitality and targeted digital advertising. Place smart ordering tablets on dining tables, stream engaging brand campaigns during idle moments, and measure every view in real time.
          </motion.p>

          {/* Dual CTA Group */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3"
          >
            <a
              href={`${userPortalUrl}/register?role=merchant`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2.5 bg-[#0069a8] hover:bg-[#005a91] text-white font-bold text-base px-7 py-3.5 rounded-lg glow-blue-lg transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            >
              <Store className="w-5 h-5" />
              <span>Apply as Venue Host</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href={`${userPortalUrl}/register?role=advertiser`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2.5 bg-background hover:bg-muted/80 border-2 border-border text-foreground font-bold text-base px-7 py-3.5 rounded-lg transition-all shadow-sm hover:border-[#0069a8]/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              <TrendingUp className="w-5 h-5 text-[#0069a8]" />
              <span>Book Ad Campaign</span>
            </a>
          </motion.div>

          {/* Micro Trust Stats */}
          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 md:gap-6 pt-5 border-t border-border/60"
          >
            <div className="space-y-1">
              <div className="font-outfit text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Multi-Format Ads
              </div>
              <div className="text-xs text-muted-foreground font-medium leading-relaxed">
                Run video or image ads with full customization
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-outfit text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                High Engagement
              </div>
              <div className="text-xs text-muted-foreground font-medium leading-relaxed">
                Single-use menu & ad displays result in higher engagement
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-outfit text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Fast Deployments
              </div>
              <div className="text-xs text-muted-foreground font-medium leading-relaxed">
                Upload content and deploy across venues within 15 minutes
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column: Hero Graphic with Floating Telemetry Badges */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 relative flex items-center justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-3xl xl:max-w-[880px]">
            <img
              src={imgHeroBanner.src}
              alt="DigiAds Tabletop Kiosk and Wall Screen Hardware"
              className="w-full h-auto object-contain drop-shadow-2xl hover:scale-[1.01] transition-transform duration-500 select-none scale-[1.03] origin-center"
            />

            {/* Floating Badge 1: Live Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="absolute -top-3 right-0 md:top-2 md:right-2 glassmorphism-card p-3 rounded-lg shadow-xl flex items-center space-x-3 border border-sky-500/20 glow-blue animate-bounce-subtle z-20"
            >
              <div className="w-8 h-8 rounded-md bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-foreground">Live Orders</p>
                <p className="text-[11px] text-muted-foreground font-medium">Order Now & Pay at Table</p>
              </div>
            </motion.div>

            {/* Floating Badge 2: Live Telemetry */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute -bottom-3 left-0 md:bottom-2 md:left-2 glassmorphism-card p-3 rounded-lg shadow-xl flex items-center space-x-3 border border-emerald-500/20 glow-emerald z-20"
            >
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-foreground">Live AD Analytics</p>
                <p className="text-[11px] text-muted-foreground font-medium">Real-Time Playback & View Tracking</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
