const HostApplication = require('../../models/HostApplication');
const AdsRates = require('../../models/AdsRates');

class AdDiscoveryController {
  /**
   * Get unique states with approved host outlets
   */
  async getStates(req, res) {
    try {
      const states = await HostApplication.distinct('state', { status: 'approved' });
      return res.status(200).send({ success: true, data: states });
    } catch (error) {
      req.log.error({ err: error }, 'getStates Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch states' });
    }
  }

  /**
   * Get unique cities inside a state with approved host outlets
   */
  async getCities(req, res) {
    const { state } = req.query || {};
    if (!state) {
      return res.status(400).send({ success: false, message: 'State parameter is required' });
    }

    try {
      const cities = await HostApplication.distinct('city', { state, status: 'approved' });
      return res.status(200).send({ success: true, data: cities });
    } catch (error) {
      req.log.error({ err: error }, 'getCities Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch cities' });
    }
  }

  /**
   * Get approved host outlets inside a city/state
   */
  async getOutlets(req, res) {
    const { state, city } = req.query || {};
    if (!state || !city) {
      return res.status(400).send({ success: false, message: 'State and city parameters are required' });
    }

    try {
      const apps = await HostApplication.find(
        { state, city, status: 'approved', allowOpenAds: { $ne: false } },
        'outletName requestTablet tabletQuantity requestScreen screenQuantity'
      );

      const outlets = [];
      for (const app of apps) {
        if (app.requestTablet && app.tabletQuantity > 0) {
          outlets.push({
            _id: app._id,
            outletName: app.outletName,
            deviceType: 'tablet',
            quantity: app.tabletQuantity
          });
        }
        if (app.requestScreen && app.screenQuantity > 0) {
          outlets.push({
            _id: app._id,
            outletName: app.outletName,
            deviceType: 'screen',
            quantity: app.screenQuantity
          });
        }
      }
      return res.status(200).send({ success: true, data: outlets });
    } catch (error) {
      req.log.error({ err: error }, 'getOutlets Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch outlets' });
    }
  }

  /**
   * Fetch current ad rates
   */
  async getRates(req, res) {
    const { deviceType, mediaType } = req.query || {};
    const query = {};
    if (deviceType) query.deviceType = deviceType;
    if (mediaType) query.mediaType = mediaType;

    try {
      const rates = await AdsRates.find(query).sort({ deviceType: 1, mediaType: 1, durationDays: 1 });
      return res.status(200).send({ success: true, data: rates });
    } catch (error) {
      req.log.error({ err: error }, 'getRates Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch rates' });
    }
  }
}

module.exports = new AdDiscoveryController();
