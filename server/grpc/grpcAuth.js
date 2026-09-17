const jwt = require('jsonwebtoken');
const grpc = require('@grpc/grpc-js');
const config = require('../config/config');
const Device = require('../models/Device');
const { throttleDeviceDbTouch } = require('../websocket/wsManager');

// In-memory cache for device activation status to protect MongoDB from gRPC telemetry query storms
const deviceStatusCache = new Map();

/**
 * Helper to verify gRPC metadata JWT token for devices
 */
async function verifyGrpcToken(call) {
  const metadata = call.metadata;
  if (!metadata) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'No metadata provided' };
  }
  const authHeaders = metadata.get('authorization');
  if (!authHeaders || authHeaders.length === 0) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Authorization token is missing' };
  }
  const authHeader = authHeaders[0];
  if (!authHeader.startsWith('Bearer ')) {
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid authorization header format' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, config.jwtSecret, (err, res) => (err ? reject(err) : resolve(res)));
    });
    if (!decoded || !decoded.deviceId) {
      throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid device credentials in token' };
    }

    // Verify that device is activated and not revoked (cached for 30s)
    const now = Date.now();
    let cached = deviceStatusCache.get(decoded.deviceId);
    if (!cached || cached.expiresAt < now) {
      const devDoc = await Device.findOne({ deviceId: decoded.deviceId }).select('isActivated').lean();
      cached = { isActivated: devDoc?.isActivated === true, expiresAt: now + 30000 };
      deviceStatusCache.set(decoded.deviceId, cached);
    }
    if (!cached.isActivated) {
      throw { code: grpc.status.UNAUTHENTICATED, message: 'Device is not activated or has been revoked' };
    }

    // Touch lastHeartbeat & online status in MongoDB on valid gRPC calls (throttled to at most once every 20s)
    if (throttleDeviceDbTouch(decoded.deviceId)) {
      Device.updateOne(
        { deviceId: decoded.deviceId },
        { $set: { status: 'online', lastHeartbeat: new Date() } }
      ).catch(err => {
        console.error(`[gRPC Touch] Failed to update heartbeat for ${decoded.deviceId}:`, err.message);
      });
    }

    return decoded; // { deviceId, deviceType, hostApplicationId }
  } catch (err) {
    if (err.code === grpc.status.UNAUTHENTICATED) throw err;
    throw { code: grpc.status.UNAUTHENTICATED, message: 'Invalid or expired device token' };
  }
}

module.exports = {
  verifyGrpcToken,
  deviceStatusCache
};
