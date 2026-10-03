const mongoose = require('mongoose');
const AdBooking = require('../../models/AdBooking');
const AdImpression = require('../../models/AdImpression');
const HostApplication = require('../../models/HostApplication');

class AdAnalyticsController {
  /**
   * Get analytics for a specific ad campaign booking
   */
  async getCampaignAnalytics(req, res) {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).send({ success: false, message: 'Booking ID is required' });
    }

    try {
      const isAdminUser = req.user.role === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.includes('admin'));
      const isMongoId = mongoose.isValidObjectId(bookingId);
      const idFilter = isMongoId ? { $or: [{ _id: bookingId }, { bookingId }] } : { bookingId };
      const query = { ...idFilter };
      if (!isAdminUser) {
        query.$and = [{ $or: [{ advertiserId: req.user.uid }, { userId: req.user.uid }] }];
      }

      const booking = await AdBooking.findOne(query);
      if (!booking) {
        return res.status(404).send({ success: false, message: 'Ad campaign booking not found or access denied' });
      }

      if (!isAdminUser && (booking.paymentStatus !== 'completed' || booking.approvalStatus !== 'approved')) {
        return res.status(403).send({
          success: false,
          message: 'Analytics are only available for paid and approved ad campaigns.'
        });
      }

      const rawUrls = (booking.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
      const isImageCampaign = booking.mediaType === 'image' || rawUrls.some(u => u.endsWith('.webp') || u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg'));

      const defaultDuration = isImageCampaign
        ? (rawUrls.length >= 2 ? 16 : 8)
        : (booking.mediaDuration || 15);

      const aggregateStats = await AdImpression.aggregate([
        { $match: { bookingId } },
        {
          $group: {
            _id: null,
            totalPlays: { $sum: 1 },
            totalDurationSeconds: { $sum: { $ifNull: ['$durationSeconds', defaultDuration] } },
            totalClicks: { $sum: { $ifNull: ['$interactiveClicks', 0] } }
          }
        }
      ]);

      const agg = aggregateStats.length > 0 ? aggregateStats[0] : {
        totalPlays: 0,
        totalDurationSeconds: 0,
        totalClicks: 0
      };

      const distinctDevices = await AdImpression.distinct('deviceId', { bookingId, deviceId: { $ne: null } });
      const uniqueDevicesCount = distinctDevices.length;

      const totalPlays = Math.max(booking.totalPlays || 0, agg.totalPlays);
      const totalDurationSeconds = Math.max(booking.totalDurationSeconds || 0, agg.totalDurationSeconds);
      const totalClicks = Math.max(booking.totalClicks || 0, agg.totalClicks);

      const impressions = await AdImpression.find({ bookingId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const venueIds = [...new Set(impressions.map(imp => imp.hostApplicationId).filter(Boolean))];
      const venues = await HostApplication.find({ _id: { $in: venueIds } }).select('outletName city state').lean();
      const venueMap = {};
      venues.forEach(v => {
        venueMap[v._id.toString()] = v;
      });

      const formattedImpressions = impressions.map(imp => {
        const venue = imp.hostApplicationId ? venueMap[imp.hostApplicationId.toString()] : null;
        const dur = (imp.durationSeconds && imp.durationSeconds !== 15) ? imp.durationSeconds : defaultDuration;
        return {
          id: imp._id,
          deviceId: imp.deviceId || 'Tablet Kiosk',
          outletName: venue ? venue.outletName : (booking.targetScreenType === 'screen' ? 'Digital Display Screen' : 'Venue Tablet'),
          city: venue ? venue.city : '',
          durationSeconds: dur,
          interactiveClicks: imp.interactiveClicks || 0,
          createdAt: imp.createdAt
        };
      });

      return res.status(200).send({
        success: true,
        data: {
          bookingId,
          campaignName: booking.targetAudience || `Ad ${bookingId}`,
          targetScreenType: booking.targetScreenType,
          totalPlays,
          uniqueDevicesCount,
          totalDurationSeconds,
          totalDurationMinutes: (totalDurationSeconds / 60).toFixed(1),
          totalClicks,
          recentImpressions: formattedImpressions
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'getCampaignAnalytics Error');
      return res.status(500).send({ success: false, message: 'Failed to retrieve campaign analytics' });
    }
  }
}

module.exports = new AdAnalyticsController();
