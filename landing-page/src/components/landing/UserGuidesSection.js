'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Store, BarChart3, FileText, CheckCircle2 } from 'lucide-react';

export default function UserGuidesSection() {
  return (
    <section id="guides" className="py-16 md:py-24 px-6 bg-background relative overflow-hidden">
      <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 space-y-3"
        >
          <span className="text-xs font-extrabold text-accent tracking-widest uppercase bg-accent/10 px-3.5 py-1.5 rounded-pill border border-accent/20 inline-flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Official Documentation</span>
          </span>
          <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            User Guides & Resources
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Download our comprehensive PDF manuals tailored for venue hosts, brand advertisers, and page visitors to get the most out of DigiAds.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {/* Guide 1: Venue Host Guide */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="token-card rounded-card border border-border p-7 flex flex-col justify-between hover:border-accent/40 transition-all duration-200 group shadow-card hover:shadow-pop relative overflow-hidden"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-pill">
                  For Venue Hosts
                </span>
                <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-input">
                  PDF • 7.1 MB
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-input bg-accent/10 text-accent flex items-center justify-center transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-2xl font-extrabold text-foreground tracking-tight pt-1">
                  Venue Host & POS Guide
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A complete operational manual for restaurant, cafe, and bar owners managing dining tables, live POS orders, and ad revenue.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Smart table ordering tablet deployment & pairing</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Fast & Efforless UPI payments and account management</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Custom bill setup, thermal printing & logos</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Digital menu manager, categories & pricing</span>
                </div>
              </div>
            </div>

            <div className="pt-7">
              <a
                href="/guides/DigiAds-Venue-Guide.pdf"
                download="DigiAds-Venue-Guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center space-x-2 bg-accent hover:bg-accent/90 text-white font-bold text-sm px-5 py-3 rounded-card transition-all shadow-card hover:shadow-pop"
              >
                <Download className="w-4 h-4" />
                <span>Download Venue Guide</span>
              </a>
            </div>
          </motion.div>

          {/* Guide 2: Advertiser Guide */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="token-card rounded-card border border-border p-7 flex flex-col justify-between hover:border-accent/40 transition-all duration-200 group shadow-card hover:shadow-pop relative overflow-hidden"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-pill">
                  For Advertisers
                </span>
                <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-input">
                  PDF • 3.5 MB
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-input bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-2xl font-extrabold text-foreground tracking-tight pt-1">
                  Advertiser Portal Guide
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Everything brand managers and media agencies need to know to launch targeted dining tablet ad campaigns and track ROI.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Location targeting by city, district & venue & type</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Creative specs for full-screen idle video & banner ads</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>telemetry & proof-of-play logs</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Guide to upload Optimised media</span>
                </div>
              </div>
            </div>

            <div className="pt-7">
              <a
                href="/guides/DigiAds-Advertiser-Portal-Guide.pdf"
                download="DigiAds-Advertiser-Portal-Guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-card transition-all shadow-card hover:shadow-pop"
              >
                <Download className="w-4 h-4" />
                <span>Download Advertiser Guide</span>
              </a>
            </div>
          </motion.div>

          {/* Guide 3: Platform User Guide */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="token-card rounded-card border border-border p-7 flex flex-col justify-between hover:border-accent/40 transition-all duration-200 group shadow-card hover:shadow-pop relative overflow-hidden"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-pill">
                  General Platform
                </span>
                <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-input">
                  PDF • 2.3 MB
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-input bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-2xl font-extrabold text-foreground tracking-tight pt-1">
                  Platform User Guide
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A comprehensive walk-through of the DigiAds web portal, user management, account management and general platform features.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Portal onboarding, sign-in & role permissions</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Multi-device connectivity & fleet monitoring</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Security protocols, OTP's & account recovery</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Operational FAQs, best practices & support lines</span>
                </div>
              </div>
            </div>

            <div className="pt-7">
              <a
                href="/guides/DigiAds-User-Guide.pdf"
                download="DigiAds-User-Guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-card transition-all shadow-card hover:shadow-pop"
              >
                <Download className="w-4 h-4" />
                <span>Download User Guide</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
