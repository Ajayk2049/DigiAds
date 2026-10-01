'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Store,
  MapPin,
  Tablet,
  Tv,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function LocationsSidebar({
  venues,
  selectedVenue,
  onSelectVenue,
  onBookVenue,
  categories,
  selectedCategory,
  setSelectedCategory,
  isLoading,
  isOffline,
  onRetry,
  sidebarOpen,
  setSidebarOpen
}) {
  return (
    <>
      {/* Left Floating Sidebar Panel (Overlay on Map) */}
      <div
        className={`absolute top-20 left-4 bottom-6 z-20 w-[94%] sm:w-[400px] max-w-full transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl flex flex-col h-full overflow-hidden">
          {/* Sidebar Header & Summary Strip */}
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-accent" />
                <h2 className="font-outfit text-base font-bold text-foreground">Venues Directory</h2>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">Public Explorer</span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'All' ? 'all' : cat)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md shrink-0 transition-all cursor-pointer ${
                    (selectedCategory === 'all' && cat === 'All') || selectedCategory === cat
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Venue Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {isLoading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Scanning live venue fleet...</p>
              </div>
            ) : isOffline ? (
              <div className="p-6 text-center space-y-3.5 token-card rounded-card border border-border m-2 shadow-card">
                <Store className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Backend Server Offline</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    API server is currently unreachable. Start the backend server to inspect live venues.
                  </p>
                </div>
                <button
                  onClick={onRetry}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-card bg-accent hover:bg-accent/90 text-white transition-all shadow-card hover:shadow-pop cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : venues.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Store className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm font-bold text-foreground">No venues found</p>
                <p className="text-xs text-muted-foreground">Try clearing your search query or selecting &quot;All Cities&quot;.</p>
              </div>
            ) : (
              venues.map((venue) => {
                const isSelected = selectedVenue?._id === venue._id;
                return (
                  <motion.div
                    key={venue._id}
                    onClick={() => onSelectVenue(venue)}
                    whileHover={{ y: -2 }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-accent/5 border-accent shadow-md ring-1 ring-accent'
                        : 'bg-card/90 border-border/70 hover:border-accent/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                          {venue.category || 'Restaurant'}
                        </span>
                        <h3 className="font-outfit text-sm font-bold text-foreground mt-1.5 leading-snug">
                          {venue.outletName}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {venue.venueId}
                      </span>
                    </div>

                    {/* Location address */}
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center space-x-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>{venue.street ? `${venue.street}, ` : ''}{venue.city}, {venue.state}</span>
                    </p>

                    {/* Available Terminal Types */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {venue.hasTablets && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          <Tablet className="w-3 h-3" />
                          <span>Tabletop Tablets</span>
                        </span>
                      )}
                      {venue.hasScreens && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <Tv className="w-3 h-3" />
                          <span>Wall Screens</span>
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-accent hover:underline flex items-center space-x-1">
                        <span>Focus Pin</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookVenue(venue);
                        }}
                        className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent/90 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Book Ads</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 bg-muted/20 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">
              Showing public outlet locations. Real-time fleet sync enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Tab Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute top-20 z-20 bg-background border border-border shadow-lg p-2 rounded-r-xl transition-all duration-300 cursor-pointer ${
          sidebarOpen ? 'left-[416px]' : 'left-0'
        }`}
        aria-label="Toggle Venue Sidebar"
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-foreground" /> : <ChevronRight className="w-4 h-4 text-foreground" />}
      </button>
    </>
  );
}
