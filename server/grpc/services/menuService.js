const grpc = require('@grpc/grpc-js');
const Menu = require('../../models/Menu');
const HostApplication = require('../../models/HostApplication');
const { verifyGrpcToken } = require('../grpcAuth');

// In-memory TTL cache for GetMenu (30 seconds per venue)
const grpcMenuCache = new Map();

global.invalidateMenuCache = (hostAppId) => {
  if (hostAppId) grpcMenuCache.delete(hostAppId.toString());
};

// Implement Menu gRPC Service Handlers
const menuServiceHandlers = {
  GetMenu: async (call, callback) => {
    try {
      const claims = await verifyGrpcToken(call);
      const { hostApplicationId } = claims;
      const hostAppKey = hostApplicationId ? hostApplicationId.toString() : null;

      if (hostAppKey) {
        const cached = grpcMenuCache.get(hostAppKey);
        if (cached && Date.now() < cached.expiresAt) {
          return callback(null, cached.payload);
        }
      }

      const app = await HostApplication.findById(hostApplicationId).select('outletName').lean();
      const outletName = app ? app.outletName : 'Aster & Ice';

      const menu = await Menu.findOne({ hostApplicationId }).select('activeShift items categories popularCategory').lean();
      const activeShift = menu?.activeShift || 'Breakfast';

      const items = menu ? menu.items
        .filter(item => {
          // 1. Exclude unavailable items (Drop completely from tablet food menu)
          if (item.isAvailable === false) return false;

          // 2. Filter by active shift / all shifts
          if (item.isAllShifts === true) return true;
          if (Array.isArray(item.shifts) && item.shifts.length > 0) {
            return item.shifts.some(s => s.toLowerCase() === activeShift.toLowerCase());
          }
          // Backward compatibility fallback: if item has no shifts array, include by default
          return true;
        })
        .map(item => ({
          itemId: item.itemId,
          name: item.name,
          description: item.description || '',
          price: parseInt(item.price, 10),
          category: item.category,
          isAvailable: item.isAvailable !== false,
          imageUrl: item.imageUrl || '',
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          isPopular: Boolean(item.isPopular),
          customizations: Array.isArray(item.customizations) && item.customizations.length > 0
            ? JSON.stringify(item.customizations)
            : ''
        })) : [];

      const rawCategories = menu?.categories;
      const categories = (Array.isArray(rawCategories) && rawCategories.length > 0)
        ? rawCategories.map(cat => {
          if (typeof cat === 'string') return { name: cat.trim(), icon: '' };
          if (cat && typeof cat === 'object') {
            return { name: (cat.name || '').trim(), icon: (cat.icon || '').trim() };
          }
          return { name: String(cat).trim(), icon: '' };
        }).filter(c => c.name.length > 0)
        : [];

      const responsePayload = {
        success: true,
        message: outletName,
        items,
        categories,
        popularCategory: {
          name: (menu?.popularCategory?.name || 'Popular').trim(),
          icon: (menu?.popularCategory?.icon || 'star').trim()
        }
      };

      if (hostAppKey) {
        grpcMenuCache.set(hostAppKey, {
          payload: responsePayload,
          expiresAt: Date.now() + 30000 // 30s cache
        });
      }

      callback(null, responsePayload);
    } catch (err) {
      const code = err.code || grpc.status.INTERNAL;
      callback({ code, message: err.message });
    }
  }
};

module.exports = {
  menuServiceHandlers,
  grpcMenuCache
};
