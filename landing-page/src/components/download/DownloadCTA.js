'use client';

import React from 'react';
import { Download, ArrowRight } from 'lucide-react';

export default function DownloadCTA({ downloadUrl }) {
  return (
    <section className="py-16 md:py-24 px-6 text-center">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <h2 className="font-outfit text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
          Ready to Upgrade Your Cash Counter?
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Download the official Windows POS terminal client today and experience zero-lag dining operations.
        </p>
        <div className="pt-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center space-x-3 bg-accent hover:bg-accent/90 text-white font-bold text-base px-8 py-4 rounded-card transition-all shadow-card hover:shadow-pop active:scale-[0.99] group cursor-pointer"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span>Download DigiAds for Windows</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
