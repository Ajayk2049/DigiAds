'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tablet, Tv, CheckCircle2, ArrowRight } from 'lucide-react';

import imgTablet1 from '@/assets/Tablet/TT_1.png';
import imgTablet2 from '@/assets/Tablet/TT_2.png';
import imgTablet3 from '@/assets/Tablet/TT_3.png';
import imgTablet4 from '@/assets/Tablet/TT_4.png';

import imgScreen1 from '@/assets/Screen/HUAWEI-IdeaHub-S-HUAWEI-IdeaHub-Pro-angle.webp';
import imgScreen2 from '@/assets/Screen/M6APro_V2-EDLA.webp';

const tabletImages = [imgTablet1, imgTablet2, imgTablet3, imgTablet4];
const screenImages = [imgScreen1, imgScreen2];

export default function DeviceShowcaseSection({ userPortalUrl }) {
  const [activeTab, setActiveTab] = useState('tablet');
  const [tabletIndex, setTabletIndex] = useState(0);
  const [screenIndex, setScreenIndex] = useState(0);

  // Auto-slide slideshow for both carousels
  useEffect(() => {
    const timer = setInterval(() => {
      setTabletIndex((prev) => (prev + 1) % tabletImages.length);
      setScreenIndex((prev) => (prev + 1) % screenImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="demo" className="px-6 relative overflow-hidden bg-background">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 space-y-3"
        >
          <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
            Device Showcase
          </span>
          <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Experience Our Product Suite
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Toggle between our tabletop tablet and wall display modes below to inspect the devices designs and experience.
          </p>
        </motion.div>

        {/* Elevated Interactive Tab Controller */}
        <div className="flex justify-center mb-14">
          <div className="bg-muted/70 backdrop-blur-md border border-border/80 p-1.5 rounded-lg inline-flex space-x-2 shadow-inner">
            <button
              onClick={() => setActiveTab('tablet')}
              className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'tablet'
                  ? 'bg-[#0069a8] text-white shadow-md shadow-[#0069a8]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Tablet className="w-4 h-4" />
              <span>Tabletop Tablet (Vertical)</span>
            </button>
            <button
              onClick={() => setActiveTab('screen')}
              className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'screen'
                  ? 'bg-[#0069a8] text-white shadow-md shadow-[#0069a8]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Wall Display Screen (Landscape)</span>
            </button>
          </div>
        </div>

        {/* Two-Column Showcase Layout */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Device Narrative & In-Section Direct CTAs */}
          <div className="lg:col-span-5 text-left space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'tablet' ? (
                <motion.div
                  key="desc-tablet"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="inline-flex items-center space-x-2 text-xs font-extrabold text-[#0069a8] uppercase tracking-wider bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tabletop Hardware Terminal</span>
                  </div>

                  <h3 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                    Vertical Tabletop Ordering Kiosk
                  </h3>

                  <p className="text-muted-foreground text-base leading-relaxed">
                    Positioned directly on dining tables, these tablets run high-impact full-screen video ads when sitting idle. A single touch seamlessly launches the live food catalog with item modifiers, parcel options, and UPI payments.
                  </p>

                  <div className="space-y-3 pt-1">
                    {[
                      "Zero-latency transition from ads to food menu",
                      "Mobile Charging dock with multiple cable types for customers",
                      "Dine-in and Parcel options available",
                      "On device UPI payments available",
                      "Order History and Billing features also available",
                      "In Venue Promos for advertising Special Offer items",
                      "Dashboard for tracking orders and revenue and analytics"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start text-sm font-semibold text-foreground/90">
                        <div className="p-0.5 rounded-md bg-emerald-500/10 text-emerald-500 mr-2.5 mt-0.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3">
                    <a
                      href={`${userPortalUrl}/register?role=merchant`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-[#0069a8] hover:bg-[#005a91] text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md shadow-[#0069a8]/20 hover:scale-[1.01]"
                    >
                      <span>Deploy Tablets for Your Venue</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="desc-screen"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="inline-flex items-center space-x-2 text-xs font-extrabold text-indigo-500 uppercase tracking-wider bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Wall Display</span>
                  </div>

                  <h3 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                    Landscape Digital Wall Displays
                  </h3>

                  <p className="text-muted-foreground text-base leading-relaxed">
                    Wall-mounted commercial display screens deliver non-intrusive brand impressions to dining venue. Runs Advertisements on loop for desired duration.
                  </p>

                  <div className="space-y-3 pt-1">
                    {[
                      "Full Day continuous advertising loop",
                      "Bigger Lanscape Display Supports Both Images and Videos",
                      "Runs Higher Resolution Ads",
                      "No Audio playback ensures no disturbance to dining ambiance"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start text-sm font-semibold text-foreground/90">
                        <div className="p-0.5 rounded-md bg-indigo-500/10 text-indigo-500 mr-2.5 mt-0.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3">
                    <a
                      href={`${userPortalUrl}/register?role=advertiser`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.01]"
                    >
                      <span>Book Wall Display Campaign Slots</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Clean Large Borderless Carousel & Pill Progress Indicators */}
          <div className="lg:col-span-7 flex flex-col justify-center items-center relative">
            <AnimatePresence mode="wait">
              {activeTab === 'tablet' ? (
                <motion.div
                  key="carousel-tablet"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  className="relative w-full max-w-[560px] xl:max-w-[620px] flex flex-col items-center justify-center"
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden flex items-center justify-center rounded-2xl">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={tabletIndex}
                        src={tabletImages[tabletIndex].src}
                        alt={`DigiAds Tablet Interface Slide ${tabletIndex + 1}`}
                        className="w-full h-full object-contain select-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </AnimatePresence>
                  </div>

                  <div className="w-full pt-6 flex justify-center items-center">
                    <div className="bg-muted/70 backdrop-blur-md px-4 py-2 rounded-full border border-border/60 shadow-sm inline-flex items-center space-x-2.5">
                      {tabletImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTabletIndex(i)}
                          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                            tabletIndex === i
                              ? 'w-9 bg-[#0069a8] shadow-sm shadow-[#0069a8]/40'
                              : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="carousel-screen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  className="relative w-full max-w-[820px] xl:max-w-[900px] flex flex-col items-center justify-center"
                >
                  <div className="relative w-full aspect-[16/10] overflow-hidden flex items-center justify-center rounded-2xl">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={screenIndex}
                        src={screenImages[screenIndex].src}
                        alt={`DigiAds Screen Interface Slide ${screenIndex + 1}`}
                        className="w-full h-full object-contain select-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </AnimatePresence>
                  </div>

                  <div className="w-full pt-6 flex justify-center items-center">
                    <div className="bg-muted/70 backdrop-blur-md px-4 py-2 rounded-full border border-border/60 shadow-sm inline-flex items-center space-x-2.5">
                      {screenImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setScreenIndex(i)}
                          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                            screenIndex === i
                              ? 'w-9 bg-indigo-600 shadow-sm shadow-indigo-600/40'
                              : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
