'use client';

import React from 'react';
import { Search, X, Tablet, Tv } from 'lucide-react';

export default function LocationsFilterBar({
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity,
  availableCities,
  selectedDeviceType,
  setSelectedDeviceType,
  venuesCount
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-4xl">
      <div className="bg-background/95 backdrop-blur-xl border border-border/80 shadow-xl rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] flex items-center space-x-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/60">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search venue name, locality, or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs font-medium focus:outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* City Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-muted-foreground hidden sm:inline">City:</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-muted/50 border border-border/60 text-foreground text-xs font-bold px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Cities ({availableCities.length})</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Device Type Selector */}
        <div className="hidden lg:flex items-center space-x-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs font-bold">
          <button
            onClick={() => setSelectedDeviceType('all')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              selectedDeviceType === 'all'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Devices
          </button>
          <button
            onClick={() => setSelectedDeviceType('tablet')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
              selectedDeviceType === 'tablet'
                ? 'bg-background shadow-sm text-sky-600 dark:text-sky-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablets</span>
          </button>
          <button
            onClick={() => setSelectedDeviceType('screen')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
              selectedDeviceType === 'screen'
                ? 'bg-background shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Screens</span>
          </button>
        </div>

        {/* Venue Counter Pill */}
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center space-x-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{venuesCount} Venues Active</span>
        </div>
      </div>
    </div>
  );
}
