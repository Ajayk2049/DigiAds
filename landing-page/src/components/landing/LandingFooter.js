'use client';

import React from 'react';
import Image from 'next/image';

export default function LandingFooter() {
  return (
    <footer className="bg-card border-t border-border py-12 px-6">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-muted-foreground">
        <div className="flex items-center space-x-3">
          <Image src="/digiads-icon.svg" alt="DigiAds Icon" width={32} height={32} className="w-8 h-8 object-contain shrink-0" />
          <span className="font-outfit text-lg font-bold text-foreground brandLogo">
            Digi<span className="text-accent">Ads</span>
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-7 text-xs font-semibold">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#demo" className="hover:text-foreground transition-colors">Devices</a>
          <a href="/locations" className="hover:text-foreground transition-colors text-accent">Locations</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#guides" className="hover:text-foreground transition-colors">User Guide</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          <a href="#about" className="hover:text-foreground transition-colors">About Us</a>
        </div>

        <p className="text-xs text-center md:text-right">
          &copy; 2026 DigiAds Platform by Aibot Ink. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
