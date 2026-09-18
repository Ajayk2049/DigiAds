import React from 'react';
import { Tablet, Tv, MapPin, BarChart3 } from 'lucide-react';

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const features = [
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

export const faqs = [
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
