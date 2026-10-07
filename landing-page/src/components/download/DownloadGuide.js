'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Download the Installer',
    description: 'Click the download button above to grab the official DigiAds-POS-Setup.exe executable directly from our release repository.'
  },
  {
    step: '02',
    title: 'Run & Install',
    description: 'Launch the downloaded setup file on your billing counter PC. If Windows SmartScreen appears, click "More info" and then "Run anyway".'
  },
  {
    step: '03',
    title: 'Log In with Merchant OTP',
    description: 'Open DigiAds POS, enter your registered venue mobile number, and enter the OTP. All your tables, live orders, and menu items load automatically!'
  }
];

export default function DownloadGuide() {
  return (
    <section id="guide" className="py-16 md:py-24 px-6 bg-card/30 border-b border-border/40">
      <div className="w-full max-w-[1400px] mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-outfit text-3xl sm:text-4xl font-extrabold text-foreground">
            Easy 3-Step Setup
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Get your restaurant counter ready in less than 3 minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, idx) => (
            <div
              key={idx}
              className="p-8 rounded-card border border-border bg-card shadow-card space-y-4 relative overflow-hidden"
            >
              <div className="font-outfit text-4xl font-black text-accent/20 select-none">
                {s.step}
              </div>
              <h3 className="font-outfit text-lg font-bold text-foreground">
                {s.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>

        {/* SmartScreen Tip Alert */}
        <div className="p-4 sm:p-5 rounded-card border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 max-w-3xl mx-auto flex items-start gap-3.5 text-xs sm:text-sm leading-relaxed">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Windows SmartScreen Note:</strong>
            Because this is an in-house enterprise executable, Windows Defender SmartScreen might display a protection prompt on first launch. Simply click <span className="underline font-bold">&quot;More info&quot;</span> and then <span className="underline font-bold">&quot;Run anyway&quot;</span> to proceed with installation.
          </div>
        </div>
      </div>
    </section>
  );
}
