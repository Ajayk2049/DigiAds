const axios = require('axios');

// Comprehensive fallback coordinates for Indian cities, tier-1/2/3 metros and hubs
const EXPANDED_CITY_COORDINATES = {
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'panaji': { lat: 15.4909, lng: 73.8278 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'greater noida': { lat: 28.4744, lng: 77.5040 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'mangalore': { lat: 12.9141, lng: 74.8560 },
  'mangaluru': { lat: 12.9141, lng: 74.8560 },
  'hubli': { lat: 15.3647, lng: 75.1240 },
  'belgaum': { lat: 15.8497, lng: 74.4977 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'kozhikode': { lat: 11.2588, lng: 75.7804 },
  'calicut': { lat: 11.2588, lng: 75.7804 },
  'thrissur': { lat: 10.5276, lng: 76.2144 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'salem': { lat: 11.6643, lng: 78.1460 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'guntur': { lat: 16.3067, lng: 80.4365 },
  'warangal': { lat: 17.9689, lng: 79.5941 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'gwalior': { lat: 26.2183, lng: 78.1828 },
  'jabalpur': { lat: 23.1815, lng: 79.9864 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'cuttack': { lat: 20.4625, lng: 85.8828 },
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'jamshedpur': { lat: 22.8046, lng: 86.2029 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'prayagraj': { lat: 25.4358, lng: 81.8463 },
  'allahabad': { lat: 25.4358, lng: 81.8463 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'jalandhar': { lat: 31.3260, lng: 75.5762 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'jammu': { lat: 32.7266, lng: 74.8570 }
};

class GeocodeService {
  /**
   * Validate whether given lat/lng are valid coordinates within Indian geography
   */
  isValidCoordinate(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return false;
    // Bounds for India: Lat approx 6°N to 38°N, Lng approx 68°E to 98°E
    return numLat >= 6.0 && numLat <= 38.0 && numLng >= 68.0 && numLng <= 98.0;
  }

  /**
   * Perform HTTP lookup against OpenStreetMap Nominatim
   */
  async queryNominatim(params) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'in',
          ...params
        },
        headers: {
          'User-Agent': 'DigiAds-CMS-Platform/1.0 (contact@digiads.local)',
          'Accept-Language': 'en'
        },
        timeout: 3500
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (this.isValidCoordinate(lat, lng)) {
          return {
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            displayName: item.display_name,
            source: 'nominatim'
          };
        }
      }
      return null;
    } catch (err) {
      // Nominatim failed or timed out — silently fallback to next tier
      return null;
    }
  }

  /**
   * Multi-tier Geocoding Pipeline
   * 1. If explicit valid GPS lat/lng provided, use them directly
   * 2. Full Street Address via OpenStreetMap Nominatim
   * 3. Pincode Centroid via OpenStreetMap Nominatim
   * 4. City + State via OpenStreetMap Nominatim
   * 5. Fallback Indian Cities Dictionary
   */
  async resolveCoordinates({
    latitude = null,
    longitude = null,
    street = '',
    city = '',
    state = '',
    zipCode = ''
  } = {}) {
    // Tier 1: Explicit valid GPS coordinates from client/device
    if (this.isValidCoordinate(latitude, longitude)) {
      return {
        latitude: Number(Number(latitude).toFixed(6)),
        longitude: Number(Number(longitude).toFixed(6)),
        source: 'gps_provided'
      };
    }

    const cleanStreet = (street || '').trim();
    const cleanCity = (city || '').trim();
    const cleanState = (state || '').trim();
    const cleanZip = (zipCode || '').toString().trim();

    // Tier 2: Try Full Street Address lookup
    if (cleanStreet && cleanCity) {
      const fullQuery = `${cleanStreet}, ${cleanCity}, ${cleanState} ${cleanZip}, India`.replace(/,\s*,/g, ',').trim();
      const resStreet = await this.queryNominatim({ q: fullQuery });
      if (resStreet) return resStreet;
    }

    // Tier 3: Try Pincode Centroid lookup (very accurate for Indian 6-digit postal zones)
    if (cleanZip && /^\d{6}$/.test(cleanZip)) {
      const resZip = await this.queryNominatim({ postalcode: cleanZip, country: 'India' });
      if (resZip) return resZip;
    }

    // Tier 4: Try City + State lookup
    if (cleanCity) {
      const resCity = await this.queryNominatim({
        city: cleanCity,
        state: cleanState || undefined,
        country: 'India'
      });
      if (resCity) return resCity;
    }

    // Tier 5: Internal expanded Indian cities dictionary fallback
    const cityKey = cleanCity.toLowerCase().replace(/[^a-z]/g, '');
    const matchedCity = Object.keys(EXPANDED_CITY_COORDINATES).find(k => k.replace(/[^a-z]/g, '') === cityKey);

    if (matchedCity) {
      const coord = EXPANDED_CITY_COORDINATES[matchedCity];
      return {
        latitude: coord.lat,
        longitude: coord.lng,
        source: 'city_dictionary'
      };
    }

    // Default Anchor: Bengaluru City Center
    return {
      latitude: 12.9716,
      longitude: 77.5946,
      source: 'default_anchor'
    };
  }
}

module.exports = new GeocodeService();
