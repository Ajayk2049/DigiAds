'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tablet, Tv, ArrowRight, ExternalLink } from 'lucide-react';
import useModalDismiss from '@/hooks/useModalDismiss';

export default function LocationBookingModal({ venue, onClose, userPortalUrl }) {
  // Universal Modal Dismissal (Desktop Esc key & Mobile back gesture)
  useModalDismiss(Boolean(venue), onClose, 'locations-booking-modal');

  return (
    <AnimatePresence>
      {venue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-left"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-accent/10 text-accent border border-accent/20">
                Targeted Ad Placement
              </span>
              <h3 className="font-outfit text-2xl font-extrabold text-foreground">
                Advertise at {venue.outletName}
              </h3>
              <p className="text-xs text-muted-foreground">
                📍 {venue.street ? `${venue.street}, ` : ''}{venue.city}, {venue.state}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
              <p className="text-xs font-semibold text-foreground">Available Display Channels:</p>
              <div className="flex flex-wrap gap-2">
                {venue.hasTablets && (
                  <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/20 flex items-center space-x-1.5">
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tabletop Ordering Tablets</span>
                  </span>
                )}
                {venue.hasScreens && (
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20 flex items-center space-x-1.5">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Landscape Wall Screens</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                To select advertising slots, upload video ad creatives, and track real-time impressions at this venue, please sign in or register an Advertiser Account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`${userPortalUrl}/register?role=advertiser`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-accent hover:bg-accent/90 text-white font-bold text-xs px-5 py-3 rounded-lg transition-all shadow-md"
              >
                <span>Create Advertiser Account</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`${userPortalUrl}/login`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-1.5 bg-background border border-border hover:bg-muted text-foreground font-bold text-xs px-5 py-3 rounded-lg transition-all"
              >
                <span>Sign In</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
