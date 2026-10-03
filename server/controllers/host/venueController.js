const HostApplication = require('../../models/HostApplication');
const Device = require('../../models/Device');
const DeviceRequest = require('../../models/DeviceRequest');
const User = require('../../models/User');
const { generateUniqueCustomId } = require('../../utils/idGenerator');
const geocodeService = require('../../services/geocodeService');
const passwordUtils = require('../../utils/password');
const { TIMEOUTS } = require('../../config/constants');
const logger = require('../../utils/logger');
const { getVenueFolderInfo, unlinkMediaFile } = require('./venueHelper');

const CITY_ALIASES = {
  'bangalore': 'Bengaluru',
  'bangalore urban': 'Bengaluru',
  'bangalore rural': 'Bengaluru',
  'bengaluru': 'Bengaluru',
  'bombay': 'Mumbai',
  'mumbai suburban': 'Mumbai',
  'mumbai city': 'Mumbai',
  'madras': 'Chennai',
  'calcutta': 'Kolkata',
  'gurgaon': 'Gurugram',
  'pondicherry': 'Puducherry',
  'cochin': 'Kochi',
  'trivandrum': 'Thiruvananthapuram',
  'mysore': 'Mysuru',
  'mangalore': 'Mangaluru',
  'belgaum': 'Belagavi',
  'hubli': 'Hubballi',
  'hubli-dharwad': 'Hubballi-Dharwad',
  'baroda': 'Vadodara',
  'calicut': 'Kozhikode',
  'trichy': 'Tiruchirappalli',
  'benaras': 'Varanasi',
  'banaras': 'Varanasi',
  'allahabad': 'Prayagraj',
  'orissa': 'Odisha',
  'simla': 'Shimla',
  'waltair': 'Visakhapatnam',
  'vizag': 'Visakhapatnam'
};

function normalizeCity(city) {
  if (!city) return '';
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];
  return trimmed
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

class VenueController {
  /**
   * Submit application to host a device (Tablet / Screen)
   */
  async applyForHost(req, res) {
    const {
      outletName,
      outletDescription,
      doorNo,
      street,
      city,
      state,
      zipCode,
      contactPerson,
      phone,
      email,
      requestTablet,
      tabletQuantity,
      requestScreen,
      screenQuantity
    } = req.body || {};

    const isRequestingTablet = !!requestTablet;
    const isRequestingScreen = !!requestScreen;
    const parsedTabletQty = isRequestingTablet ? parseInt(tabletQuantity, 10) : 0;
    const parsedScreenQty = isRequestingScreen ? parseInt(screenQuantity, 10) : 0;

    try {
      const existingApp = await HostApplication.findOne({ userId: req.user.uid });
      if (existingApp) {
        return res.status(400).send({ success: false, message: 'You have already submitted a host application. Only one venue is allowed per account.' });
      }

      const venueId = await generateUniqueCustomId(HostApplication, 'venueId', 'VEN_');
      const normalizedCity = normalizeCity(city);

      const resolvedGeo = await geocodeService.resolveCoordinates({
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        street,
        city: normalizedCity,
        state,
        zipCode
      });

      const application = new HostApplication({
        venueId,
        userId: req.user.uid,
        outletName,
        outletDescription,
        doorNo,
        street,
        city: normalizedCity,
        state,
        zipCode,
        latitude: resolvedGeo.latitude,
        longitude: resolvedGeo.longitude,
        contactPerson,
        phone,
        email,
        requestTablet: isRequestingTablet,
        tabletQuantity: parsedTabletQty,
        requestScreen: isRequestingScreen,
        screenQuantity: parsedScreenQty,
        adMode: req.body.adMode || 'open',
        allowOpenAds: req.body.allowOpenAds !== undefined ? !!req.body.allowOpenAds : true,
        dailyVideoChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        dailyImageChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 15 : 10,
        dailyScreenVideoChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        dailyScreenImageChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 15 : 10,
        dailyScreenChangesRemaining: (req.body.allowOpenAds === false || req.body.adMode === 'closed') ? 6 : 4,
        status: 'pending'
      });

      await application.save();

      if (global.broadcastToAdmins) {
        global.broadcastToAdmins('new_host_app', { outletName });
      }

      return res.status(201).send({
        success: true,
        message: 'Host application submitted successfully. It is now pending admin approval',
        data: application
      });
    } catch (error) {
      logger.error({ err: error.message }, 'applyForHost Error');
      return res.status(500).send({ success: false, message: 'Failed to submit application' });
    }
  }

  /**
   * Get applications submitted by logged-in merchant
   */
  async getMyApplications(req, res) {
    try {
      const applications = await HostApplication.find({ userId: req.user.uid }).sort({ createdAt: -1 });
      return res.status(200).send({ success: true, data: applications });
    } catch (error) {
      logger.error({ err: error.message }, 'getMyApplications Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch host applications' });
    }
  }

  /**
   * Update details of an existing host application
   */
  async updateApplication(req, res) {
    const { applicationId } = req.params;
    const {
      outletName,
      outletDescription,
      doorNo,
      street,
      city,
      state,
      zipCode,
      contactPerson,
      phone,
      email
    } = req.body || {};

    try {
      const application = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!application) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      const addressChanged = (
        application.doorNo !== doorNo ||
        application.street !== street ||
        application.city !== city ||
        application.state !== state ||
        application.zipCode !== zipCode
      );

      if (req.body.latitude !== undefined && req.body.longitude !== undefined && req.body.latitude !== null && req.body.longitude !== null) {
        const resolvedGeo = await geocodeService.resolveCoordinates({
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          street,
          city,
          state,
          zipCode
        });
        application.latitude = resolvedGeo.latitude;
        application.longitude = resolvedGeo.longitude;
      } else if (addressChanged || application.latitude === null || application.latitude === undefined) {
        const resolvedGeo = await geocodeService.resolveCoordinates({
          street,
          city,
          state,
          zipCode
        });
        application.latitude = resolvedGeo.latitude;
        application.longitude = resolvedGeo.longitude;
      }

      const normalizedCity = normalizeCity(city);
      application.outletName = outletName;
      application.outletDescription = outletDescription;
      application.doorNo = doorNo;
      application.street = street;
      application.city = normalizedCity;
      application.state = state;
      application.zipCode = zipCode;
      application.contactPerson = contactPerson;
      application.phone = phone;
      application.email = email;
      if (req.body.adMode !== undefined) application.adMode = req.body.adMode;
      if (req.body.allowOpenAds !== undefined) application.allowOpenAds = !!req.body.allowOpenAds;

      await application.save();

      // Notify connected tablet devices via WebSocket to update venue & menu details live
      if (global.deviceSockets) {
        const devices = await Device.find({ hostApplicationId: applicationId }).select('deviceId').limit(500).lean();
        for (const device of devices) {
          const socket = global.deviceSockets.get(device.deviceId);
          if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ event: 'reload_menu' }));
          }
        }
      }

      return res.status(200).send({
        success: true,
        message: 'Host application details updated successfully',
        data: application
      });
    } catch (error) {
      logger.error({ err: error.message }, 'updateApplication Error');
      return res.status(500).send({ success: false, message: 'Failed to update application details' });
    }
  }

  /**
   * Get devices deployed for merchant's venues
   */
  async getMyDevices(req, res) {
    try {
      const apps = await HostApplication.find({ userId: req.user.uid, status: 'approved' });
      const appIds = apps.map(app => app._id);

      const rawDevices = await Device.find({ hostApplicationId: { $in: appIds } });
      const now = new Date();
      const offlineThresholdMs = TIMEOUTS.DEVICE_OFFLINE_THRESHOLD_MS;

      const devices = rawDevices.map(d => {
        const doc = d.toObject();
        const hasActiveSocket = global.deviceSockets && global.deviceSockets.has(doc.deviceId);
        const isRecentlyPinged = doc.lastHeartbeat && (now - new Date(doc.lastHeartbeat)) < offlineThresholdMs;

        doc.status = (hasActiveSocket || isRecentlyPinged) ? 'online' : 'offline';

        const sessionStartTime = doc.sessionStart ? new Date(doc.sessionStart).getTime() : new Date(doc.createdAt).getTime();
        const lastPingTime = doc.lastHeartbeat ? new Date(doc.lastHeartbeat).getTime() : now.getTime();
        doc.sessionStart = doc.sessionStart || doc.createdAt;
        doc.runtimeMinutes = Math.max(0, Math.round((lastPingTime - sessionStartTime) / 60000));

        return doc;
      });

      return res.status(200).send({ success: true, data: devices });
    } catch (error) {
      logger.error({ err: error.message }, 'getMyDevices Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch devices' });
    }
  }

  /**
   * Request additional tablets or screens
   */
  async requestMoreDevices(req, res) {
    const { hostApplicationId, requestTablet, tabletQuantity, requestScreen, screenQuantity } = req.body || {};
    const isRequestingTablet = !!requestTablet;
    const isRequestingScreen = !!requestScreen;
    const parsedTabletQty = isRequestingTablet ? parseInt(tabletQuantity, 10) : 0;
    const parsedScreenQty = isRequestingScreen ? parseInt(screenQuantity, 10) : 0;

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) return res.status(403).send({ success: false, message: 'Access denied' });

      const requestId = await generateUniqueCustomId(DeviceRequest, 'requestId', 'NEW_HW_');
      const deviceReq = new DeviceRequest({
        requestId,
        hostApplicationId,
        userId: req.user.uid,
        requestTablet: isRequestingTablet,
        tabletQuantity: parsedTabletQty,
        requestScreen: isRequestingScreen,
        screenQuantity: parsedScreenQty
      });
      await deviceReq.save();

      if (global.broadcastToAdmins) {
        global.broadcastToAdmins('new_device_request', { outletName: app.outletName });
      }

      return res.status(200).send({ success: true, message: 'Request submitted successfully' });
    } catch (error) {
      logger.error({ err: error.message }, 'requestMoreDevices Error');
      return res.status(500).send({ success: false, message: 'Failed to submit device request' });
    }
  }

  /**
   * Verify merchant account password for security-sensitive operations
   */
  async verifyPassword(req, res) {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).send({ success: false, message: 'Password is required' });
    }

    try {
      const user = await User.findById(req.user.uid);
      if (!user || !user.password) {
        return res.status(404).send({ success: false, message: 'User account not found' });
      }

      const pwdResult = await passwordUtils.comparePassword(password, user.password);
      if (!pwdResult.isValid) {
        return res.status(401).send({ success: false, message: 'Incorrect account password' });
      }

      return res.status(200).send({ success: true, message: 'Password verified successfully' });
    } catch (error) {
      logger.error({ err: error.message }, 'verifyPassword Error');
      return res.status(500).send({ success: false, message: 'Failed to verify password' });
    }
  }

  getVenueFolderInfo(hostApplicationId) {
    return getVenueFolderInfo(hostApplicationId);
  }

  unlinkMediaFile(mediaUrl) {
    return unlinkMediaFile(mediaUrl);
  }
}

module.exports = new VenueController();
