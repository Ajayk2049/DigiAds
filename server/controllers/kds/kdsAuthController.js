const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const HostApplication = require('../../models/HostApplication');
const KdsPendingAuth = require('../../models/KdsPendingAuth');

/**
 * KDS Authentication Controller
 * Manages unique PIN generation, rotation, access gating, and station fleet.
 * Line cap: < 250 lines (Universal Modular Architecture §13).
 */
class KdsAuthController {
  /**
   * Venue Admin generates or rotates a persistent 6-digit kitchen PIN
   * POST /api/v1/host/venues/:id/kitchen-pin
   */
  async generateOrRotatePin(req, res) {
    const { id } = req.params;
    try {
      const app = await HostApplication.findOne({ _id: id, userId: req.user.uid });
      if (!app) {
        return res.status(404).send({ success: false, message: 'Venue not found or access denied' });
      }

      // Generate random 6-digit numeric PIN
      const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
      if (!app.kitchenConfig) {
        app.kitchenConfig = { activeStations: [] };
      }
      app.kitchenConfig.pin = rawPin;
      app.kitchenConfig.pinCreatedAt = new Date();
      await app.save();

      return res.status(200).send({
        success: true,
        message: 'Kitchen PIN generated successfully',
        pin: rawPin,
        pinCreatedAt: app.kitchenConfig.pinCreatedAt,
        activeStations: app.kitchenConfig.activeStations || []
      });
    } catch (err) {
      req.log.error({ err }, 'generateOrRotatePin error');
      return res.status(500).send({ success: false, message: 'Failed to generate PIN: ' + err.message });
    }
  }

  /**
   * Venue Admin fetches current kitchen config & active stations
   * GET /api/v1/host/venues/:id/kitchen-config
   */
  async getVenueKitchenConfig(req, res) {
    const { id } = req.params;
    try {
      const app = await HostApplication.findOne({ _id: id, userId: req.user.uid })
        .select('businessName kitchenConfig')
        .lean();
      if (!app) {
        return res.status(404).send({ success: false, message: 'Venue not found or access denied' });
      }

      return res.status(200).send({
        success: true,
        businessName: app.businessName,
        kitchenConfig: app.kitchenConfig || { pin: null, activeStations: [] }
      });
    } catch (err) {
      req.log.error({ err }, 'getVenueKitchenConfig error');
      return res.status(500).send({ success: false, message: 'Failed to fetch config' });
    }
  }

  /**
   * Kitchen Display submits PIN to request login access
   * POST /api/v1/kds/auth/request-access (Rate limited §22.3)
   */
  async requestAccess(req, res) {
    const { pin, stationName } = req.body || {};
    if (!pin) {
      return res.status(400).send({ success: false, message: 'PIN is required' });
    }

    const cleanPin = pin.toString().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      return res.status(400).send({ success: false, message: 'PIN must be 6 digits' });
    }

    try {
      const venue = await HostApplication.findOne({
        'kitchenConfig.pin': cleanPin,
        status: 'approved'
      }).select('_id businessName userId');

      if (!venue) {
        return res.status(401).send({ success: false, message: 'Invalid or unassigned Kitchen PIN' });
      }

      const clientIp = req.ip || req.raw?.socket?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'Kitchen Display';
      const requestId = 'REQ_KDS_' + crypto.randomUUID();

      const pendingDoc = await KdsPendingAuth.create({
        requestId,
        hostApplicationId: venue._id,
        venueName: venue.businessName,
        merchantId: venue.userId.toString(),
        stationName: stationName || 'Kitchen Display',
        ip: clientIp,
        userAgent,
        status: 'pending'
      });

      // Push real-time notification modal to Merchant Dashboard / POS
      if (global.sendToMerchant) {
        global.sendToMerchant(venue.userId.toString(), {
          event: 'kds_login_request',
          data: {
            requestId: pendingDoc.requestId,
            hostApplicationId: venue._id.toString(),
            venueName: venue.businessName,
            stationName: pendingDoc.stationName,
            ip: clientIp,
            createdAt: pendingDoc.createdAt
          }
        });
      }

      return res.status(200).send({
        success: true,
        status: 'pending',
        requestId: pendingDoc.requestId,
        venueName: venue.businessName
      });
    } catch (err) {
      req.log.error({ err }, 'requestAccess error');
      return res.status(500).send({ success: false, message: 'Error processing access request' });
    }
  }

  /**
   * Kitchen Display polls request status
   * GET /api/v1/kds/auth/status/:requestId
   */
  async checkAccessStatus(req, res) {
    const { requestId } = req.params;
    try {
      const pending = await KdsPendingAuth.findOne({ requestId }).lean();
      if (!pending) {
        return res.status(404).send({ success: false, status: 'expired', message: 'Request expired or not found' });
      }

      if (pending.status === 'approved') {
        return res.status(200).send({
          success: true,
          status: 'approved',
          token: pending.token,
          stationId: pending.stationId,
          venueName: pending.venueName,
          hostApplicationId: pending.hostApplicationId
        });
      }

      if (pending.status === 'rejected') {
        return res.status(200).send({
          success: false,
          status: 'rejected',
          message: 'Access request was rejected by manager'
        });
      }

      return res.status(200).send({ success: true, status: 'pending' });
    } catch (err) {
      req.log.error({ err }, 'checkAccessStatus error');
      return res.status(500).send({ success: false, message: 'Failed to check status' });
    }
  }

  /**
   * Venue Admin approves or rejects kitchen station login
   * POST /api/v1/kds/auth/approve-access
   */
  async approveAccess(req, res) {
    const { requestId, action } = req.body || {};
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return res.status(400).send({ success: false, message: 'Valid requestId and action (approve/reject) are required' });
    }

    try {
      const pending = await KdsPendingAuth.findOne({ requestId, merchantId: req.user.uid });
      if (!pending) {
        return res.status(404).send({ success: false, message: 'Pending request not found or unauthorized' });
      }

      if (action === 'reject') {
        pending.status = 'rejected';
        await pending.save();
        if (global.sendToPendingKds) {
          global.sendToPendingKds(requestId, { event: 'kds_login_rejected', data: { requestId } });
        }
        return res.status(200).send({ success: true, message: 'Station connection rejected' });
      }

      // Approved: Generate unique station ID & scoped JWT token
      const stationId = 'STN_' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const token = jwt.sign(
        {
          role: 'kds',
          hostApplicationId: pending.hostApplicationId.toString(),
          merchantId: pending.merchantId,
          stationId,
          stationName: pending.stationName
        },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      pending.status = 'approved';
      pending.token = token;
      pending.stationId = stationId;
      await pending.save();

      // Register station in Venue fleet
      await HostApplication.findByIdAndUpdate(pending.hostApplicationId, {
        $push: {
          'kitchenConfig.activeStations': {
            stationId,
            stationName: pending.stationName,
            ip: pending.ip,
            userAgent: pending.userAgent,
            approvedAt: new Date(),
            lastActiveAt: new Date()
          }
        }
      });

      // Broadcast approved event to pending WebSocket connection if connected
      if (global.sendToPendingKds) {
        global.sendToPendingKds(requestId, {
          event: 'kds_login_approved',
          data: {
            token,
            stationId,
            venueName: pending.venueName,
            hostApplicationId: pending.hostApplicationId.toString()
          }
        });
      }

      return res.status(200).send({
        success: true,
        message: 'Station approved successfully',
        stationId
      });
    } catch (err) {
      req.log.error({ err }, 'approveAccess error');
      return res.status(500).send({ success: false, message: 'Error approving station: ' + err.message });
    }
  }

  /**
   * Venue Admin revokes an active station
   * DELETE /api/v1/host/venues/:id/kitchen-stations/:stationId
   */
  async revokeStation(req, res) {
    const { id, stationId } = req.params;
    try {
      const app = await HostApplication.findOneAndUpdate(
        { _id: id, userId: req.user.uid },
        { $pull: { 'kitchenConfig.activeStations': { stationId } } },
        { new: true }
      ).select('kitchenConfig.activeStations');

      if (!app) {
        return res.status(404).send({ success: false, message: 'Venue not found' });
      }

      // If station socket is active, disconnect it
      if (global.disconnectKdsStation) {
        global.disconnectKdsStation(stationId);
      }

      return res.status(200).send({
        success: true,
        message: 'Station revoked successfully',
        activeStations: app.kitchenConfig.activeStations
      });
    } catch (err) {
      req.log.error({ err }, 'revokeStation error');
      return res.status(500).send({ success: false, message: 'Failed to revoke station' });
    }
  }
}

module.exports = new KdsAuthController();
