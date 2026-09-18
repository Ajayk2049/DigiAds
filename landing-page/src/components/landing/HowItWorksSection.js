'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export default function HowItWorksSection() {
  const [workflowTab, setWorkflowTab] = useState('merchant');

  return (
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
                className={`px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  workflowTab === 'merchant'
                    ? 'bg-[#0069a8] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                For Venue Merchants
              </button>
              <button
                onClick={() => setWorkflowTab('advertiser')}
                className={`px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  workflowTab === 'advertiser'
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
  );
}
