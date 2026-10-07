'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Download } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LocationsHeader({ userPortalUrl }) {
  return (
    <header className="h-16 bg-background px-6 border-b border-border/40 flex items-center justify-between z-30 shrink-0">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-10">
          <a href="/" className="flex items-center space-x-3 group">
            <Image
              src="/digiads-icon.svg"
              alt="DigiAds Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <span className="font-outfit text-xl font-bold tracking-tight text-foreground leading-none brandLogo">
              Digi<span className="text-accent">Ads</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-muted-foreground">
            <a href="/#features" className="hover:text-foreground transition-colors hover:text-accent">Features</a>
            <a href="/#demo" className="hover:text-foreground transition-colors hover:text-accent">Device Demo</a>
            <a href="/locations" className="text-foreground transition-colors hover:text-accent flex items-center space-x-1.5 font-bold">
              <span>Locations</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            </a>
            <a href="/#how-it-works" className="hover:text-foreground transition-colors hover:text-accent">How It Works</a>
            <a href="/#guides" className="hover:text-foreground transition-colors hover:text-accent">User Guide</a>
            <a href="/#faq" className="hover:text-foreground transition-colors hover:text-accent">FAQ</a>
            <a href="/#about" className="hover:text-foreground transition-colors hover:text-accent">About</a>
          </nav>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <a
            href="/download"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold px-3 sm:px-3.5 py-2 rounded-card border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Download POS</span>
          </a>
          <a
            href={`${userPortalUrl}/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-card border border-border bg-card text-foreground hover:bg-muted transition-colors"
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
        </div>
      </div>
    </header>
  );
}
