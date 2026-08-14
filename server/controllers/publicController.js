const HostApplication = require('../models/HostApplication');

// Known default coordinates for Indian cities to provide fallback geo-anchors
const CITY_COORDINATES = {
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
  'goa': { lat: 15.2993, lng: 74.1240 }
};

// Deterministic small coordinate jitter so multiple venues in the same city don't stack on exact same pixel
function getDeterministicOffset(idString) {
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = (hash << 5) - hash + idString.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) * 0.0008; // ~±400m
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) * 0.0008;
  return { latOffset, lngOffset };
}

class PublicController {
  /**
   * Fetch all approved public venues with sanitized details and geo-coordinates
   */
  async getPublicVenues(req, res) {
    try {
      const { city, category, deviceType, search } = req.query || {};

      const query = {
        status: 'approved',
        allowOpenAds: { $ne: false },
        isPaused: { $ne: true },
        isRevoked: { $ne: true }
      };

      if (city && city.toLowerCase() !== 'all') {
        query.city = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
      }

      if (category && category.toLowerCase() !== 'all') {
        query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
      }

      if (deviceType === 'tablet') {
        query.requestTablet = true;
        query.tabletQuantity = { $gt: 0 };
      } else if (deviceType === 'screen') {
        query.requestScreen = true;
        query.screenQuantity = { $gt: 0 };
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { outletName: searchRegex },
          { city: searchRegex },
          { state: searchRegex },
          { street: searchRegex },
          { zipCode: searchRegex }
        ];
      }

      const venues = await HostApplication.find(query)
        .select('_id venueId outletName outletDescription category street city state zipCode requestTablet tabletQuantity requestScreen screenQuantity latitude longitude createdAt')
        .sort({ createdAt: -1 })
        .lean();

      // Format and resolve geo-coordinates for each venue
      const formattedVenues = venues.map((v) => {
        const idStr = v._id.toString();
        let lat = v.latitude;
        let lng = v.longitude;

        if (!lat || !lng) {
          const cityKey = (v.city || '').toLowerCase().trim();
          const baseCoord = CITY_COORDINATES[cityKey] || { lat: 12.9716, lng: 77.5946 };
          const { latOffset, lngOffset } = getDeterministicOffset(idStr);
          lat = Number((baseCoord.lat + latOffset).toFixed(6));
          lng = Number((baseCoord.lng + lngOffset).toFixed(6));
        }

        const hasTablets = Boolean(v.requestTablet && (v.tabletQuantity || 0) > 0);
        const hasScreens = Boolean(v.requestScreen && (v.screenQuantity || 0) > 0);

        return {
          _id: v._id,
          venueId: v.venueId || `VEN_${idStr.slice(-5).toUpperCase()}`,
          outletName: v.outletName,
          outletDescription: v.outletDescription || 'Premium dining venue with interactive digital channels.',
          category: v.category || 'Restaurant',
          street: v.street || '',
          city: v.city || '',
          state: v.state || '',
          zipCode: v.zipCode || '',
          hasTablets,
          hasScreens,
          latitude: lat,
          longitude: lng,
          createdAt: v.createdAt
        };
      });

      // Extract unique cities list for quick filters
      const allCities = await HostApplication.distinct('city', {
        status: 'approved',
        allowOpenAds: { $ne: false },
        isPaused: { $ne: true },
        isRevoked: { $ne: true }
      });

      return res.status(200).send({
        success: true,
        data: {
          venues: formattedVenues,
          totalVenues: formattedVenues.length,
          availableCities: allCities.filter(Boolean).sort()
        }
      });
    } catch (error) {
      console.error('getPublicVenues Error:', error.message);
      return res.status(500).send({
        success: false,
        message: 'Failed to fetch public venues directory'
      });
    }
  }
}

module.exports = new PublicController();
