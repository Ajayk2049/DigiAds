'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tablet,
  Tv,
  MapPin,
  BarChart3,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Store,
  Layers,
  ChevronDown,
  Check,
  CreditCard,
  IndianRupee
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { config } from '@/config';

// Import local assets
import imgTablet1 from '@/assets/Tablet/TT_1.png';
import imgTablet2 from '@/assets/Tablet/TT_2.png';
import imgTablet3 from '@/assets/Tablet/TT_3.png';
import imgTablet4 from '@/assets/Tablet/TT_4.png';

import imgScreen1 from '@/assets/Screen/HUAWEI-IdeaHub-S-HUAWEI-IdeaHub-Pro-angle.webp';
import imgScreen2 from '@/assets/Screen/M6APro_V2-EDLA.webp';

import imgHeroBanner from '@/assets/HeroBanner.png';

const tabletImages = [imgTablet1, imgTablet2, imgTablet3, imgTablet4];
const screenImages = [imgScreen1, imgScreen2];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('tablet');
  const [workflowTab, setWorkflowTab] = useState('merchant');
  const [openFaq, setOpenFaq] = useState(null);
  const [tabletIndex, setTabletIndex] = useState(0);
  const [screenIndex, setScreenIndex] = useState(0);
  const [userPortalUrl, setUserPortalUrl] = useState('http://localhost:3001');

  useEffect(() => {
    setUserPortalUrl(config.userPortalUrl);
  }, []);

  // Auto-slide slideshow for both carousels
  useEffect(() => {
    const timer = setInterval(() => {
      setTabletIndex((prev) => (prev + 1) % tabletImages.length);
      setScreenIndex((prev) => (prev + 1) % screenImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <Tablet className="w-7 h-7 text-sky-500 dark:text-sky-400" />,
      accentColor: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
      title: "Tabletop Ordering Tablet",
      tag: "Interactive Kiosk",
      description: "Interactive vertical kiosk placed directly on dining tables. Runs full-screen digital ads when idle and instantly transitions to the food menu on customer touch."
    },
    {
      icon: <Tv className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />,
      accentColor: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      title: "Landscape Advertising Screen",
      tag: "24/7 Digital Display",
      description: "High-brightness display screens mounted on venue walls. Configured for continuous, non-intrusive local brand campaigns and high-reach display loops."
    },
    {
      icon: <MapPin className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />,
      accentColor: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      title: "Precision Targeted Ad Booking",
      tag: "State → City → Venue",
      description: "Book high-conversion ad spots directly via location selectors. Target the exact dining audience demographics that match your brand's regional focus."
    },
    {
      icon: <BarChart3 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />,
      accentColor: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      title: "Real-Time Telemetry & Tracking",
      tag: "Live Proof-Of-Play",
      description: "Real-time tracking of ad playback, ensuring advertisers know exactly when and how long their ads were displayed. Monitor campaign performance with transparent metrics and analytics."
    }
  ];

  const faqs = [
    {
      q: "How does the tabletop tablet switch between video ads and the food menu?",
      a: "When the table is unoccupied or diners are conversing, the tablet runs in Standby Ad Mode, rotating through video and image ads. As soon as a customer touches anywhere on the screen, the kiosk transitions within milliseconds to the interactive digital food menu and ordering catalog."
    },
    {
      q: "How are ad impressions and campaign performance measured?",
      a: "Every single ad playback is tracked . The kiosk records completed loops, interactive screen taps, and Run time, syncing metrics directly to the advertiser dashboard for 100% transparent proof-of-play reporting."
    },
    {
      q: "Can venue owners (merchants) run their own in-house promotional ads?",
      a: "Yes! Venue owners receive dedicated Promo Ad Slots directly within their Merchant Portal. They can easily upload chef specials, daily discounts, or event banners to stream seamlessly across all the tabletops and screens in their venue."
    },
    {
      q: "How are the payments handled by the tabletop inside the venue?",
      a: "The customer can complete their payment using the payment gateway provided in the tabletop app, meanwhile venue owners can mark the payment as complete or pending in the merchant portal."
    }
  ];

  const nextTabletSlide = () => {
    setTabletIndex((prev) => (prev + 1) % tabletImages.length);
  };
  const prevTabletSlide = () => {
    setTabletIndex((prev) => (prev - 1 + tabletImages.length) % tabletImages.length);
  };

  const nextScreenSlide = () => {
    setScreenIndex((prev) => (prev + 1) % screenImages.length);
  };
  const prevScreenSlide = () => {
    setScreenIndex((prev) => (prev - 1 + screenImages.length) % screenImages.length);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden selection:bg-[#0069a8] selection:text-white">
      {/* Dynamic Glassmorphism Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/70 transition-all">
        <div className="w-full max-w-[1700px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-10">
            <motion.a
              href="#"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-3 group"
            >
              <img
                src="/digiads-icon.svg"
                alt="DigiAds Logo"
                className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <span className="font-outfit text-xl font-bold tracking-tight text-foreground leading-none brandLogo">
                Digi<span className="text-[#0069a8]">Ads</span>
              </span>
            </motion.a>

            <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors hover:text-[#0069a8]">Features</a>
              <a href="#demo" className="hover:text-foreground transition-colors hover:text-[#0069a8]">Device Demo</a>
              <a href="/locations" className="hover:text-foreground transition-colors hover:text-[#0069a8] flex items-center space-x-1">
                <span>Locations</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0069a8]"></span>
              </a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors hover:text-[#0069a8]">How It Works</a>
              <a href="#faq" className="hover:text-foreground transition-colors hover:text-[#0069a8]">FAQ</a>
              <a href="#about" className="hover:text-foreground transition-colors hover:text-[#0069a8]">About</a>
            </nav>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <a
              href={`${userPortalUrl}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-foreground/80 hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all"
            >
              Sign In
            </a>
            <a
              href={`${userPortalUrl}/register?role=merchant`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold bg-[#0069a8] hover:bg-[#005a91] text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-[#0069a8]/20"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
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

            {/* Dual CTA Group with Sleek Semi-Sharp Corners */}
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

          {/* Right Column: Enlarged Hero Graphic with Floating Telemetry Badges */}
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

              {/* Floating Badge 1: 60 FPS Single Surface */}
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

      {/* Enterprise Architecture Trust Ribbon */}
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

      {/* Features Grid */}
      <section id="features" className="py-10 px-6 bg-muted/20 relative">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-4"
          >
            <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
              Complete Ecosystem
            </span>
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              All-In-One Hardware & Software Network
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
              Custom Android firmware combined with responsive cloud management for seamless tablet onboarding, menu ordering, and localized ad delivery.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-7"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -3 }}
                className="glassmorphism-card p-7 md:p-9 rounded-xl flex flex-col md:flex-row items-start md:space-x-6 hover:border-[#0069a8]/50 transition-all duration-300 shadow-md relative group"
              >
                <div className="p-3.5 bg-background border border-border/80 rounded-lg mb-4 md:mb-0 shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0">
                  {feature.icon}
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2.5">
                    <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${feature.accentColor}`}>
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="font-outfit text-xl font-bold text-foreground tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Mockups & Device Showcase */}
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
                className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'tablet'
                  ? 'bg-[#0069a8] text-white shadow-md shadow-[#0069a8]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                <Tablet className="w-4 h-4" />
                <span>Tabletop Tablet (Vertical)</span>
              </button>
              <button
                onClick={() => setActiveTab('screen')}
                className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === 'screen'
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
                  // Tablet Clean Large Borderless Preview
                  <motion.div
                    key="carousel-tablet"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    className="relative w-full max-w-[560px] xl:max-w-[620px] flex flex-col items-center justify-center"
                  >
                    {/* Large Image Viewport */}
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

                    {/* Pill-Shaped Progress Indicator Capsule */}
                    <div className="w-full pt-6 flex justify-center items-center">
                      <div className="bg-muted/70 backdrop-blur-md px-4 py-2 rounded-full border border-border/60 shadow-sm inline-flex items-center space-x-2.5">
                        {tabletImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setTabletIndex(i)}
                            className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${tabletIndex === i
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
                  // Wall Display Screen Clean Large Borderless Preview
                  <motion.div
                    key="carousel-screen"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    className="relative w-full max-w-[820px] xl:max-w-[900px] flex flex-col items-center justify-center"
                  >
                    {/* Large Image Viewport */}
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

                    {/* Pill-Shaped Progress Indicator Capsule */}
                    <div className="w-full pt-6 flex justify-center items-center">
                      <div className="bg-muted/70 backdrop-blur-md px-4 py-2 rounded-full border border-border/60 shadow-sm inline-flex items-center space-x-2.5">
                        {screenImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setScreenIndex(i)}
                            className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${screenIndex === i
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

      {/* Guided 3-Step "How It Works" Section */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/20 relative">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14 space-y-3"
          >
            <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
              Simple Onboarding
            </span>
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              How DigiAds Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              A frictionless onboarding flow designed for both venue operators and commercial brand advertisers.
            </p>

            {/* Workflow Switcher */}
            <div className="flex justify-center pt-3">
              <div className="bg-background border border-border p-1 rounded-lg inline-flex space-x-2 shadow-sm">
                <button
                  onClick={() => setWorkflowTab('merchant')}
                  className={`px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer ${workflowTab === 'merchant'
                    ? 'bg-[#0069a8] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  For Venue Merchants
                </button>
                <button
                  onClick={() => setWorkflowTab('advertiser')}
                  className={`px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer ${workflowTab === 'advertiser'
                    ? 'bg-[#0069a8] text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  For Brand Advertisers
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {workflowTab === 'merchant' ? (
              <motion.div
                key="wf-merchant"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-3 gap-6"
              >
                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#0069a8]/10 text-[#0069a8] flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      1
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Apply as Venue</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Register your restaurant, cafe, or venue profile. Select your table count and display screen preferences to receive provisioned hardware.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-[#0069a8] flex items-center space-x-1">
                    <span>Quick verification within 24h</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      2
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Upload Menu & UPI</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Configure your food catalog, dish categories, packaging rates, and PhonePe merchant UPI ID using our intuitive Merchant Portal.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-sky-500 flex items-center space-x-1">
                    <span>Real-time instant gRPC sync</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      3
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Place & Earn</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Place tablets on dining tables. Enjoy automated self-ordering for diners while earning passive ad revenue sharing from the digital ad network.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-emerald-500 flex items-center space-x-1">
                    <span>Zero-maintenance silent updates</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="wf-advertiser"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-3 gap-6"
              >
                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      1
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Target Locations</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Select target states, cities, or specific premium dining venues. Choose 30-second or 60-second video placement tiers.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-indigo-500 flex items-center space-x-1">
                    <span>Granular venue-level selection</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      2
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Upload Video Creative</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload your MP4 video ad creative. Our automated FFmpeg pipeline transcodes and optimizes video streams for silent 60 FPS kiosk playback.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-sky-500 flex items-center space-x-1">
                    <span>Automated format verification</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>

                <div className="glassmorphism-card p-7 rounded-xl relative flex flex-col justify-between space-y-6">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-outfit text-lg font-extrabold mb-4">
                      3
                    </div>
                    <h3 className="font-outfit text-xl font-bold text-foreground mb-2">Track Real-Time ROI</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Access live campaign telemetry with verifiable proof-of-play timestamps, display durations, and engagement metrics across the fleet.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-emerald-500 flex items-center space-x-1">
                    <span>100% transparent telemetry</span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* /
      <section id="telemetry" className="py-2 px-6 bg-background relative overflow-hidden">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
          <div className="glassmorphism-card p-7 md:p-12 rounded-2xl border border-[#0069a8]/20 glow-blue relative overflow-hidden">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5 text-left">
                <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
                  Verifiable Proof-Of-Play
                </span>
                <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                  Transparent Telemetry <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0069a8] to-indigo-600">
                    For Every Single Impression
                  </span>
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  Unlike traditional billboards with estimated viewership, DigiAds provides hardware-level telemetry. Track exactly how many times your ad was displayed, customer engagement duration, and verified playback completions.
                </p>
                <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="flex items-center space-x-2.5 text-sm font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Exact second-by-second playback logs</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-sm font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Interactive engagement duration tracking</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-sm font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Venue-by-venue demographic breakdown</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-sm font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Automated exportable Excel/CSV reports</span>
                  </div>
                </div>
                <div className="pt-3">
                  <a
                    href={`${userPortalUrl}/register?role=advertiser`}
                    className="inline-flex items-center space-x-2 bg-[#0069a8] hover:bg-[#005a91] text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md hover:scale-[1.01]"
                  >
                    <span>Launch Campaign Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 bg-card/60 border border-border p-5 rounded-xl shadow-lg space-y-3.5">
                <div className="flex justify-between items-center border-b border-border pb-2.5">
                  <span className="text-xs font-bold text-muted-foreground">LIVE FLEET TELEMETRY</span>
                  <span className="text-xs font-extrabold text-emerald-500 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ACTIVE</span>
                  </span>
                </div>
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex justify-between items-center">
                    <span className="text-muted-foreground">Ad Slot ID:</span>
                    <span className="font-bold text-[#0069a8]">AD_8VVCG</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex justify-between items-center">
                    <span className="text-muted-foreground">Target Terminal:</span>
                    <span className="font-bold text-foreground">TAB_A8X9K (Table 4)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex justify-between items-center">
                    <span className="text-muted-foreground">Loop Duration:</span>
                    <span className="font-bold text-emerald-500">30.0s (Completed)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex justify-between items-center">
                    <span className="text-muted-foreground">Resolution / Engine:</span>
                    <span className="font-bold text-foreground">1080p @ 60 FPS (ExoPlayer)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Progressive Disclosure FAQ Section */}
      <section id="faq" className="py-4 px-6 bg-muted/20 relative">
        <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14 space-y-3"
          >
            <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
              Questions & Answers
            </span>
            <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              Everything you need to know about placing tablets in your venue or booking commercial ad campaigns.
            </p>
          </motion.div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="glassmorphism-card rounded-xl border border-border/80 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex justify-between items-center font-outfit text-base md:text-lg font-bold text-foreground hover:text-[#0069a8] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-4 ${openFaq === idx ? 'rotate-180 text-[#0069a8]' : ''
                      }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-5 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed border-t border-border/40 pt-3.5"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-10 px-6 bg-muted/10 relative overflow-hidden">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            {/* Logo Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-5 flex justify-center"
            >
              <div className="relative group p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl rounded-2xl border border-border/80 shadow-xl hover:border-[#0069a8]/40 transition-all duration-500 max-w-[320px] w-full aspect-square flex items-center justify-center">
                <div className="absolute inset-0 bg-[#0069a8]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src="/digiads-logo.svg"
                  alt="DigiAds Brand Logo"
                  className="w-full h-full object-contain max-h-[160px] filter drop-shadow-[0_8px_24px_rgba(0,105,168,0.2)] group-hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </motion.div>

            {/* Content Side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-7 space-y-5 text-left"
            >
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-[#0069a8] tracking-widest uppercase bg-[#0069a8]/10 px-3 py-1 rounded-md border border-[#0069a8]/20">
                  About Aibot Ink
                </span>
                <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                  Driving Innovation <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0069a8] to-indigo-600">
                    To Serve Society
                  </span>
                </h2>
              </div>
              <div className="space-y-3.5 text-base text-muted-foreground leading-relaxed font-normal">
                <p>
                  Aibot Ink is an innovative technology enterprise formed by visionary engineers and industry veterans dedicated to serving society through cutting-edge technology. We believe advanced hardware and software must be accessible, reliable, and affordable to every business and individual.
                </p>
                <p>
                  We research, engineer, and manufacture state-of-the-art solutions spanning Automation, Digital Kiosks, and Smart IoT Ecosystems — powering reliable, high-performance customer engagement worldwide.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modern High-Conversion Footer */}
      <footer className="bg-card/80 border-t border-border py-12 px-6">
        <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-muted-foreground">
          <div className="flex items-center space-x-3">
            <img src="/digiads-icon.svg" alt="DigiAds Icon" className="w-8 h-8 object-contain shrink-0" />
            <span className="font-outfit text-lg font-bold text-foreground brandLogo">
              Digi<span className="text-[#0069a8]">Ads</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-7 text-xs font-semibold">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Devices</a>
            <a href="/locations" className="hover:text-foreground transition-colors text-[#0069a8]">Locations</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#about" className="hover:text-foreground transition-colors">About Us</a>
          </div>

          <p className="text-xs text-center md:text-right">
            &copy; 2026 DigiAds Platform by Aibot Ink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
