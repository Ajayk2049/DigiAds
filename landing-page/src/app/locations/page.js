'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { config } from '@/config';
import LocationsHeader from '@/components/locations/LocationsHeader';
import LocationsFilterBar from '@/components/locations/LocationsFilterBar';
import LocationsSidebar from '@/components/locations/LocationsSidebar';
import LocationsMap from '@/components/locations/LocationsMap';
import LocationBookingModal from '@/components/locations/LocationBookingModal';

const CATEGORIES = [
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
  const [isOffline, setIsOffline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userPortalUrl = config.userPortalUrl || 'http://localhost:4200';
  const apiUrl = config.apiUrl || 'http://localhost:4000/api/v1';

  // Fetch public venues directory
  const fetchVenues = useCallback(async () => {
    setIsLoading(true);
    setIsOffline(false);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCity !== 'all') queryParams.set('city', selectedCity);
      if (selectedCategory !== 'all') queryParams.set('category', selectedCategory);
      if (selectedDeviceType !== 'all') queryParams.set('deviceType', selectedDeviceType);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const res = await fetch(`${apiUrl}/public/venues?${queryParams.toString()}`);
      if (!res.ok) {
        setIsOffline(true);
        setVenues([]);
        return;
      }
      const result = await res.json();

      if (result.success && result.data) {
        setVenues(result.data.venues || []);
        setIsOffline(false);
        if (result.data.availableCities && availableCities.length === 0) {
          setAvailableCities(result.data.availableCities);
        }
      } else {
        setVenues([]);
      }
    } catch {
      setIsOffline(true);
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, selectedCity, selectedCategory, selectedDeviceType, searchQuery, availableCities.length]);

  useEffect(() => {
    const timer = setTimeout(fetchVenues, 250);
    return () => clearTimeout(timer);
  }, [fetchVenues]);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background text-foreground flex flex-col font-sans">
      {/* Top Header Navigation */}
      <LocationsHeader userPortalUrl={userPortalUrl} />

      {/* Main Map Workspace with Overlays */}
      <div className="relative flex-1 w-full h-[calc(100vh-64px)] overflow-hidden">
        <LocationsMap
          venues={venues}
          selectedVenue={selectedVenue}
          onSelectVenue={setSelectedVenue}
        />

        <LocationsFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          availableCities={availableCities}
          selectedDeviceType={selectedDeviceType}
          setSelectedDeviceType={setSelectedDeviceType}
          venuesCount={venues.length}
        />

        <LocationsSidebar
          venues={venues}
          selectedVenue={selectedVenue}
          onSelectVenue={setSelectedVenue}
          onBookVenue={setBookingModalVenue}
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          isLoading={isLoading}
          isOffline={isOffline}
          onRetry={fetchVenues}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Advertiser Booking Conversion Modal */}
      <LocationBookingModal
        venue={bookingModalVenue}
        onClose={() => setBookingModalVenue(null)}
        userPortalUrl={userPortalUrl}
      />
    </div>
  );
}
