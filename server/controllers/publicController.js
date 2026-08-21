const HostApplication = require('../models/HostApplication');
const geocodeService = require('../services/geocodeService');

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

        if (!geocodeService.isValidCoordinate(lat, lng)) {
          lat = 12.9716;
          lng = 77.5946;
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
          latitude: Number(Number(lat).toFixed(6)),
          longitude: Number(Number(lng).toFixed(6)),
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
