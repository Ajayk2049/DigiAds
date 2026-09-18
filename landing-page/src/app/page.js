'use client';

import React, { useState, useEffect } from 'react';
import { config } from '@/config';

import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import TrustRibbon from '@/components/landing/TrustRibbon';
import FeaturesSection from '@/components/landing/FeaturesSection';
import DeviceShowcaseSection from '@/components/landing/DeviceShowcaseSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import UserGuidesSection from '@/components/landing/UserGuidesSection';
import FaqSection from '@/components/landing/FaqSection';
import AboutUsSection from '@/components/landing/AboutUsSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const [userPortalUrl, setUserPortalUrl] = useState('http://localhost:3001');

  useEffect(() => {
    setUserPortalUrl(config.userPortalUrl);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden selection:bg-[#0069a8] selection:text-white">
      <LandingHeader userPortalUrl={userPortalUrl} />
      <HeroSection userPortalUrl={userPortalUrl} />
      <TrustRibbon />
      <FeaturesSection />
      <DeviceShowcaseSection userPortalUrl={userPortalUrl} />
      <HowItWorksSection />
      <UserGuidesSection />
      <FaqSection />
      <AboutUsSection />
      <LandingFooter />
    </div>
  );
}
