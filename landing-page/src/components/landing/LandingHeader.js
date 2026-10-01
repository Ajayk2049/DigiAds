'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingHeader({ userPortalUrl }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background transition-colors duration-base">
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
              Digi<span className="text-accent">Ads</span>
            </span>
          </motion.a>

          <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors hover:text-accent">Features</a>
            <a href="#demo" className="hover:text-foreground transition-colors hover:text-accent">Device Demo</a>
            <a href="/locations" className="hover:text-foreground transition-colors hover:text-accent flex items-center space-x-1.5">
              <span>Locations</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors hover:text-accent">How It Works</a>
            <a href="#guides" className="hover:text-foreground transition-colors hover:text-accent">User Guide</a>
            <a href="#faq" className="hover:text-foreground transition-colors hover:text-accent">FAQ</a>
            <a href="#about" className="hover:text-foreground transition-colors hover:text-accent">About</a>
          </nav>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-3"
        >
          <a
            href={`${userPortalUrl}/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold px-4 py-2 rounded-card border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            Sign In
          </a>
          <a
            href={`${userPortalUrl}/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-card transition-all shadow-card hover:shadow-pop"
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
