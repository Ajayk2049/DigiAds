'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingHeader({ userPortalUrl }) {
  return (
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
            <a href="#guides" className="hover:text-foreground transition-colors hover:text-[#0069a8]">User Guide</a>
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
            className="text-sm font-bold text-foreground/80 hover:text-foreground px-4 py-2 rounded-lg bg-black text-white hover:text-black hover:bg-white dark:bg-white dark:text-black dark:hover:text-white dark:hover:bg-black transition-all"
          >
            Sign In
          </a>
          <a
            href={`${userPortalUrl}/register`}
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
  );
}
