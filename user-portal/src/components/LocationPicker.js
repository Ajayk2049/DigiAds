'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Maximize2, X, Check, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import useModalDismiss from '@/hooks/useModalDismiss';

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onDetectGps,
  isDetectingGps = false,
  addressHint = '',
  title = 'GPS Storefront Coordinates'
}) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tempCoords, setTempCoords] = useState({ lat: latitude, lng: longitude });

  useModalDismiss(showModal, () => setShowModal(false), 'location-picker-modal');

  // References for Desktop Embedded Map
  const inlineMapContainerRef = useRef(null);
  const inlineMapInstanceRef = useRef(null);
  const inlineMarkerRef = useRef(null);

  // References for Modal Fullscreen Map
  const modalMapContainerRef = useRef(null);
  const modalMapInstanceRef = useRef(null);
  const modalMarkerRef = useRef(null);

  const effectiveLat = latitude || 12.9716;
  const effectiveLng = longitude || 77.5946;
  const hasCoordinates = Boolean(latitude && longitude);

  // Dynamic SSR-safe Leaflet CSS/JS loader
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
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Helper to create custom draggable storefront marker
  const createStorefrontIcon = (L) => {
    return L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div class="relative group cursor-grab active:cursor-grabbing flex flex-col items-center justify-center select-none" style="transform: translateY(-8px);">
          <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-115">
            <svg width="38" height="46" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-xl">
              <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0069a8"/>
              <path d="M17 1.5C8.43959 1.5 1.5 8.43959 1.5 17C1.5 25.5 15.5 38.5 17 39.8C18.5 38.5 32.5 25.5 32.5 17C32.5 8.43959 25.5604 1.5 17 1.5Z" stroke="white" stroke-width="2"/>
              <circle cx="17" cy="16" r="11" fill="white"/>
            </svg>
            <span class="absolute top-[9px] text-[14px] leading-none select-none">🚩</span>
          </div>
          <div class="w-4 h-1.5 bg-black/40 rounded-full blur-[1.5px] mt-0.5 animate-pulse"></div>
        </div>
      `,
      iconSize: [38, 50],
      iconAnchor: [19, 48]
    });
  };

  // Initialize & Update Inline Desktop Map
  useEffect(() => {
    if (!leafletLoaded || !inlineMapContainerRef.current || !window.L) return;
    const L = window.L;

    if (!inlineMapInstanceRef.current) {
      const map = L.map(inlineMapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: hasCoordinates ? 16 : 13,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([effectiveLat, effectiveLng], {
        icon: createStorefrontIcon(L),
        draggable: true
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange({
          latitude: Number(pos.lat.toFixed(6)),
          longitude: Number(pos.lng.toFixed(6))
        });
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChange({
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6))
        });
      });

      inlineMapInstanceRef.current = map;
      inlineMarkerRef.current = marker;
    } else {
      const map = inlineMapInstanceRef.current;
      const marker = inlineMarkerRef.current;
      if (marker && (latitude || longitude)) {
        marker.setLatLng([effectiveLat, effectiveLng]);
        map.setView([effectiveLat, effectiveLng], hasCoordinates ? 16 : 13, { animate: true });
      }
    }
  }, [leafletLoaded, latitude, longitude]);

  // Clean up inline map on unmount
  useEffect(() => {
    return () => {
      if (inlineMapInstanceRef.current) {
        inlineMapInstanceRef.current.remove();
        inlineMapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize Modal Map when modal opens
  useEffect(() => {
    if (!showModal || !leafletLoaded || !modalMapContainerRef.current || !window.L) return;
    const L = window.L;

    setTempCoords({ lat: effectiveLat, lng: effectiveLng });

    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current) return;

      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }

      const map = L.map(modalMapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: hasCoordinates ? 16 : 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([effectiveLat, effectiveLng], {
        icon: createStorefrontIcon(L),
        draggable: true
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setTempCoords({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6))
        });
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setTempCoords({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        });
      });

      modalMapInstanceRef.current = map;
      modalMarkerRef.current = marker;
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [showModal, leafletLoaded]);

  const handleConfirmModal = () => {
    if (tempCoords.lat && tempCoords.lng) {
      onChange({
        latitude: tempCoords.lat,
        longitude: tempCoords.lng
      });
    }
    setShowModal(false);
  };

  const handleModalGpsDetect = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setTempCoords({ lat, lng });
        if (modalMapInstanceRef.current && modalMarkerRef.current) {
          modalMarkerRef.current.setLatLng([lat, lng]);
          modalMapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        }
      },
      (err) => console.warn('Modal GPS error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Top Header & GPS Status Card */}
      <div className="p-3.5 bg-muted/30 hover:bg-muted/40 rounded-xl border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-foreground block leading-tight">{title}</span>
              {hasCoordinates && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  PINPOINTED
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {hasCoordinates
                ? `📍 Lat: ${latitude}, Lng: ${longitude}`
                : 'Auto-geocoded from address or tap Detect to use exact storefront GPS.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {/* Mobile-Only: Open Fullscreen Map Modal */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="sm:hidden px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-[#0069a8] dark:text-sky-400 border border-sky-500/20 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{hasCoordinates ? 'Adjust on Map' : 'Pick on Map'}</span>
          </button>

          {/* Detect GPS Button */}
          <button
            type="button"
            onClick={onDetectGps}
            disabled={isDetectingGps}
            className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isDetectingGps ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Detecting GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>{hasCoordinates ? 'Update GPS' : '📍 Detect GPS'}</span>
              </>
            )}
          </button>

          {/* Desktop Enlarge Button */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            title="Enlarge Map for street-level precision"
            className="hidden sm:flex p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop In-Form Mini Map (Hidden on mobile to eliminate touch traps) */}
      <div className="hidden sm:block rounded-xl border border-border/80 overflow-hidden shadow-sm bg-card">
        <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-900">
          <div ref={inlineMapContainerRef} className="w-full h-full z-0" />
          <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-border/70 text-[10px] font-bold text-foreground shadow-sm flex items-center space-x-1.5">
            <span className="text-[#0069a8]">🚩</span>
            <span>Drag pin or click map to adjust storefront</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Touch Modal (For Mobile + Desktop Enlarge) */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full h-full sm:h-[88vh] sm:max-w-4xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-card border-b border-border/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-sm text-foreground leading-tight">
                    Pinpoint Exact Storefront Entrance
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Drag the red flag marker directly onto your restaurant front door.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Map Canvas */}
            <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
              <div ref={modalMapContainerRef} className="w-full h-full z-0" />

              {/* Floating Top Coordinate Pill */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-lg text-xs font-mono font-bold text-foreground flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Lat: {tempCoords.lat || effectiveLat}, Lng: {tempCoords.lng || effectiveLng}</span>
              </div>

              {/* Floating GPS Recenter Button */}
              <button
                type="button"
                onClick={handleModalGpsDetect}
                className="absolute bottom-4 left-4 z-10 bg-background/95 hover:bg-background border border-border shadow-xl px-3 py-2 rounded-xl text-xs font-bold text-foreground flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-primary" />
                <span>My GPS</span>
              </button>
            </div>

            {/* Modal Bottom Confirmation Bar */}
            <div className="p-3.5 bg-card border-t border-border/80 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Click map or drag the pin to set your exact storefront position.
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModal}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold bg-[#0069a8] hover:bg-[#005a91] text-white flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
