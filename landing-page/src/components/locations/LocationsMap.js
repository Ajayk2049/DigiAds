'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export default function LocationsMap({ venues, selectedVenue, onSelectVenue }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;
      if (!isMounted || !mapContainerRef.current) return;

      window.L = L;

      // Default map center (India / Bengaluru hub)
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    }

    initMap();

    return () => {
      isMounted = false;
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

    const bounds = [];
    const coordCounts = {};

    venues.forEach((venue) => {
      if (!venue.latitude || !venue.longitude) return;

      const latLng = [venue.latitude, venue.longitude];
      bounds.push(latLng);

      // Micro-spread only if 2 venues have exact identical coordinates (e.g. food court)
      const coordKey = `${venue.latitude.toFixed(4)}_${venue.longitude.toFixed(4)}`;
      const count = coordCounts[coordKey] || 0;
      coordCounts[coordKey] = count + 1;

      let plotLat = venue.latitude;
      let plotLng = venue.longitude;
      if (count > 0) {
        const angle = count * 1.05;
        plotLat += 0.00022 * Math.sin(angle);
        plotLng += 0.00022 * Math.cos(angle);
      }

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

      const marker = L.marker([plotLat, plotLng], { icon: customIcon }).addTo(map);

      // Custom popup HTML with token theme
      const popupContent = `
        <div class="p-3.5 font-sans min-w-[240px]">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-[#0069a8] border border-sky-300">
              ${venue.category || 'Restaurant'}
            </span>
            <span class="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              ${venue.venueId || ''}
            </span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 mt-1.5">${venue.outletName}</h4>
          <p class="text-xs text-slate-500 mt-0.5 leading-tight">📍 ${venue.street ? venue.street + ', ' : ''}${venue.city}, ${venue.state}${venue.zipCode ? ' - ' + venue.zipCode : ''}</p>
          <div class="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-700">
            ${venue.hasTablets ? '<span class="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">📱 Tablets</span>' : ''}
            ${venue.hasScreens ? '<span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">📺 Screens</span>' : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectVenue(venue);
      });

      markersRef.current[venue._id] = marker;
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [venues, mapLoaded, onSelectVenue]);

  // Center on selected venue and trigger popup
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVenue?.latitude || !selectedVenue?.longitude) return;
    mapInstanceRef.current.setView([selectedVenue.latitude, selectedVenue.longitude], 15, { animate: true });
    const marker = markersRef.current[selectedVenue._id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedVenue]);

  return (
    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-slate-100 dark:bg-slate-900" />
  );
}
