'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Search,
  Tablet,
  Tv,
  Store,
  Layers,
  ChevronDown,
  X,
  ArrowRight,
  Sparkles,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { config } from '@/config';

export default function LocationsPage() {
  const [venues, setVenues] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [bookingModalVenue, setBookingModalVenue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const userPortalUrl = config.userPortalUrl || 'http://localhost:3001';
  const apiUrl = config.apiUrl || 'http://localhost:4200/api/v1';

  // Categories list
  const categories = [
    'All',
    'Restaurant',
    'Cafe',
    'Pub & Lounge',
    'Food Court',
    'Fine Dining',
    'Quick Service',
    'Bakery',
    'Sports Bar'
  ];

  // Fetch public venues directory
  useEffect(() => {
    async function fetchVenues() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCity !== 'all') queryParams.set('city', selectedCity);
        if (selectedCategory !== 'all') queryParams.set('category', selectedCategory);
        if (selectedDeviceType !== 'all') queryParams.set('deviceType', selectedDeviceType);
        if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

        const res = await fetch(`${apiUrl}/public/venues?${queryParams.toString()}`);
        const result = await res.json();

        if (result.success && result.data) {
          setVenues(result.data.venues || []);
          if (result.data.availableCities && availableCities.length === 0) {
            setAvailableCities(result.data.availableCities);
          }
        }
      } catch (err) {
        console.error('Failed to fetch public venues:', err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchVenues, 250);
    return () => clearTimeout(timer);
  }, [selectedCity, selectedCategory, selectedDeviceType, searchQuery]);

  // Load Leaflet dynamically via CDN scripts (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current || !window.L) return;

      const L = window.L;

      // Default map center (India / Bengaluru hub)
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: false
      });

      // Position zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Positron clean map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers when venues change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (venues.length === 0) return;

    const bounds = [];

    venues.forEach((venue) => {
      if (!venue.latitude || !venue.longitude) return;

      const latLng = [venue.latitude, venue.longitude];
      bounds.push(latLng);

      // Custom blue pin-drop marker with flag highlight
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center justify-center select-none" style="transform: translateY(-4px);">
            <div class="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-115">
              <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-lg">
                <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0069a8"/>
                <path d="M17 1.5C8.43959 1.5 1.5 8.43959 1.5 17C1.5 25.5 15.5 38.5 17 39.8C18.5 38.5 32.5 25.5 32.5 17C32.5 8.43959 25.5604 1.5 17 1.5Z" stroke="white" stroke-width="2"/>
                <circle cx="17" cy="16" r="11" fill="white"/>
              </svg>
              <span class="absolute top-[8px] text-[13px] leading-none select-none">🚩</span>
            </div>
            <div class="w-3.5 h-1 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
          </div>
        `,
        iconSize: [34, 46],
        iconAnchor: [17, 44],
        popupAnchor: [0, -42]
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      // Custom popup HTML with blue theme
      const popupContent = `
        <div class="p-3.5 font-sans min-w-[230px]">
          <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-[#0069a8] border border-sky-300">
            ${venue.category || 'Restaurant'}
          </span>
          <h4 class="font-bold text-sm text-slate-900 mt-1.5">${venue.outletName}</h4>
          <p class="text-xs text-slate-500 mt-0.5">📍 ${venue.street ? venue.street + ', ' : ''}${venue.city}</p>
          <div class="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-700">
            ${venue.hasTablets ? '<span class="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">📱 Tablets</span>' : ''}
            ${venue.hasScreens ? '<span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">📺 Screens</span>' : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedVenue(venue);
      });

      markersRef.current[venue._id] = marker;
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    }
  }, [venues, mapLoaded]);

  // Center on venue when clicked in sidebar
  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    if (mapInstanceRef.current && venue.latitude && venue.longitude) {
      mapInstanceRef.current.flyTo([venue.latitude, venue.longitude], 15, { duration: 1.2 });
      const marker = markersRef.current[venue._id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background text-foreground flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <header className="h-16 bg-background/90 backdrop-blur-xl border-b border-border/80 px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-8">
          <a href="/" className="flex items-center space-x-3 group">
            <img
              src="/digiads-icon.svg"
              alt="DigiAds Logo"
              className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <span className="font-outfit text-xl font-bold tracking-tight text-foreground leading-none brandLogo">
              Digi<span className="text-[#0069a8]">Ads</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="/#demo" className="hover:text-foreground transition-colors">Device Demo</a>
            <a href="/locations" className="text-[#0069a8] flex items-center space-x-1">
              <span>Locations Directory</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0069a8]"></span>
            </a>
            <a href="/#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href={`${userPortalUrl}/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-foreground hover:text-[#0069a8] px-3.5 py-2 rounded-md hover:bg-muted transition-all"
          >
            Advertiser Sign In
          </a>
          <a
            href={`${userPortalUrl}/register?role=advertiser`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold bg-[#0069a8] hover:bg-[#005a91] text-white px-4 py-2 rounded-md transition-all shadow-sm"
          >
            <span>Book Campaign</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Workspace: Full Map with Floating Overlays */}
      <div className="relative flex-1 w-full h-[calc(100vh-64px)] overflow-hidden">
        {/* Full-Screen Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-slate-100 dark:bg-slate-900" />

        {/* Top Floating Filter Bar (Centered) */}
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
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
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
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedDeviceType === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Devices
              </button>
              <button
                onClick={() => setSelectedDeviceType('tablet')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  selectedDeviceType === 'tablet' ? 'bg-background shadow-sm text-sky-600 dark:text-sky-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablets</span>
              </button>
              <button
                onClick={() => setSelectedDeviceType('screen')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  selectedDeviceType === 'screen' ? 'bg-background shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Screens</span>
              </button>
            </div>

            {/* Venue Counter Pill */}
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center space-x-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{venues.length} Venues Active</span>
            </div>
          </div>
        </div>

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
                  <Compass className="w-5 h-5 text-[#0069a8]" />
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
                        ? 'bg-[#0069a8] text-white shadow-sm'
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
                  <div className="w-8 h-8 rounded-full border-2 border-[#0069a8] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">Scanning live venue fleet...</p>
                </div>
              ) : venues.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Store className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-bold text-foreground">No venues found</p>
                  <p className="text-xs text-muted-foreground">Try clearing your search query or selecting "All Cities".</p>
                </div>
              ) : (
                venues.map((venue) => {
                  const isSelected = selectedVenue?._id === venue._id;
                  return (
                    <motion.div
                      key={venue._id}
                      onClick={() => handleSelectVenue(venue)}
                      whileHover={{ y: -2 }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-[#0069a8]/5 border-[#0069a8] shadow-md ring-1 ring-[#0069a8]'
                          : 'bg-card/90 border-border/70 hover:border-[#0069a8]/40 hover:shadow-sm'
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
                        <MapPin className="w-3.5 h-3.5 text-[#0069a8] shrink-0" />
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
                        <span className="text-[11px] font-bold text-[#0069a8] hover:underline flex items-center space-x-1">
                          <span>Focus Pin</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingModalVenue(venue);
                          }}
                          className="px-3 py-1.5 rounded-md bg-[#0069a8] hover:bg-[#005a91] text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
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
          className={`absolute top-20 z-20 bg-background border border-border shadow-lg p-2 rounded-r-xl transition-all duration-300 ${
            sidebarOpen ? 'left-[416px]' : 'left-0'
          }`}
          aria-label="Toggle Venue Sidebar"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-foreground" /> : <ChevronRight className="w-4 h-4 text-foreground" />}
        </button>
      </div>

      {/* Advertiser Booking Conversion Modal */}
      <AnimatePresence>
        {bookingModalVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-left"
            >
              <button
                onClick={() => setBookingModalVenue(null)}
                className="absolute top-5 right-5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-[#0069a8]/10 text-[#0069a8] border border-[#0069a8]/20">
                  Targeted Ad Placement
                </span>
                <h3 className="font-outfit text-2xl font-extrabold text-foreground">
                  Advertise at {bookingModalVenue.outletName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  📍 {bookingModalVenue.street ? `${bookingModalVenue.street}, ` : ''}{bookingModalVenue.city}, {bookingModalVenue.state}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                <p className="text-xs font-semibold text-foreground">Available Display Channels:</p>
                <div className="flex flex-wrap gap-2">
                  {bookingModalVenue.hasTablets && (
                    <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/20 flex items-center space-x-1.5">
                      <Tablet className="w-3.5 h-3.5" />
                      <span>Tabletop Ordering Tablets</span>
                    </span>
                  )}
                  {bookingModalVenue.hasScreens && (
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
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-[#0069a8] hover:bg-[#005a91] text-white font-bold text-xs px-5 py-3 rounded-lg transition-all shadow-md"
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
    </div>
  );
}
