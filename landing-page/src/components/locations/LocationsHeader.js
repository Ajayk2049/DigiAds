'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LocationsHeader({ userPortalUrl }) {
  return (
    <header className="h-16 bg-background px-6 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center space-x-8">
        <a href="/" className="flex items-center space-x-3 group">
          <img
            src="/digiads-icon.svg"
            alt="DigiAds Logo"
            className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
          />
          <span className="font-outfit text-xl font-bold tracking-tight text-foreground leading-none brandLogo">
            Digi<span className="text-accent">Ads</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors hover:text-accent">Home</a>
          <a href="/#features" className="hover:text-foreground transition-colors hover:text-accent">Features</a>
          <a href="/#demo" className="hover:text-foreground transition-colors hover:text-accent">Device Demo</a>
          <a href="/locations" className="text-accent flex items-center space-x-1.5">
            <span>Locations Directory</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          </a>
          <a href="/#faq" className="hover:text-foreground transition-colors hover:text-accent">FAQ</a>
        </nav>
      </div>

      <div className="flex items-center space-x-3">
        <a
          href={`${userPortalUrl}/login`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-foreground hover:text-accent px-3.5 py-2 rounded-card border border-border bg-card hover:bg-muted transition-colors"
        >
          Advertiser Sign In
        </a>
        <a
          href={`${userPortalUrl}/register?role=advertiser`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-card transition-all shadow-card hover:shadow-pop"
        >
          <span>Book Campaign</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
