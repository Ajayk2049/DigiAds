'use client';

import React from 'react';
import DownloadHeader from '@/components/download/DownloadHeader';
import DownloadHero from '@/components/download/DownloadHero';
import DownloadFeatures from '@/components/download/DownloadFeatures';
import DownloadSpecs from '@/components/download/DownloadSpecs';
import DownloadGuide from '@/components/download/DownloadGuide';
import DownloadCTA from '@/components/download/DownloadCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import { config } from '@/config';

export default function DownloadPage() {
  const downloadUrl = config.githubDownloadUrl;
  const userPortalUrl = config.userPortalUrl;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent/20 selection:text-accent">
      <DownloadHeader userPortalUrl={userPortalUrl} downloadUrl={downloadUrl} />

      <main className="flex-1">
        <DownloadHero downloadUrl={downloadUrl} />
        <DownloadFeatures />
        <DownloadSpecs />
        <DownloadGuide />
        <DownloadCTA downloadUrl={downloadUrl} />
      </main>

      <LandingFooter />
    </div>
  );
}
