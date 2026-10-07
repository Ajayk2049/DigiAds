const path = require('path');
const HostApplication = require('../../models/HostApplication');
const Menu = require('../../models/Menu');
const Device = require('../../models/Device');
const logger = require('../../utils/logger');
const { getVenueFolderInfo, unlinkMediaFile } = require('./venueHelper');
const {
  validateExtension,
  generateMediaFilename,
  streamAndOptimizeImage
} = require('../../utils/uploadHandler');

const DEFAULT_CATEGORIES = [
  { name: 'Starters', icon: 'fastfood' },
  { name: 'Main Course', icon: 'dinner' },
  { name: 'Dessert', icon: 'cookie' },
  { name: 'Beverages', icon: 'coffee' }
];

function normalizeCategories(rawCats) {
  if (!Array.isArray(rawCats) || rawCats.length === 0) return DEFAULT_CATEGORIES;
  return rawCats.map(cat => {
    if (typeof cat === 'string') return { name: cat.trim(), icon: '' };
    if (cat && typeof cat === 'object') {
      return { name: (cat.name || '').trim(), icon: (cat.icon || '').trim() };
    }
    return { name: String(cat).trim(), icon: '' };
  }).filter(c => c.name.length > 0);
}

class MenuController {
  /**
   * Get restaurant menu (Merchant only)
   */
  async getMenu(req, res) {
    const { hostApplicationId } = req.query || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId query parameter is required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied: Host application does not belong to you' });
      }

      const menu = await Menu.findOne({ hostApplicationId });
      if (!menu) {
        return res.status(200).send({
          success: true,
          data: {
            items: [],
            categories: DEFAULT_CATEGORIES,
            popularCategory: { name: 'Popular', icon: 'star' },
            shifts: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
            activeShift: 'Breakfast',
            hostApplicationId
          }
        });
      }

      return res.status(200).send({
        success: true,
        data: {
          _id: menu._id,
          hostApplicationId: menu.hostApplicationId,
          merchantId: menu.merchantId,
          items: menu.items,
          categories: normalizeCategories(menu.categories),
          popularCategory: {
            name: menu.popularCategory?.name || 'Popular',
            icon: menu.popularCategory?.icon || 'star'
          },
          shifts: menu.shifts && menu.shifts.length > 0 ? menu.shifts : ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
          activeShift: menu.activeShift || 'Breakfast',
          defaultGst: menu.defaultGst || 0,
          defaultOtherCharges: menu.defaultOtherCharges || 0,
          defaultOtherChargesType: menu.defaultOtherChargesType || 'percentage',
          createdAt: menu.createdAt,
          updatedAt: menu.updatedAt
        }
      });
    } catch (error) {
      logger.error({ err: error.message }, 'getMenu Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch menu' });
    }
  }

  /**
   * Create or Update restaurant menu
   */
  async updateMenu(req, res) {
    const { 
      hostApplicationId, 
      items, 
      categories, 
      shifts, 
      activeShift, 
      defaultGst, 
      defaultOtherCharges, 
      defaultOtherChargesType, 
      popularCategory 
    } = req.body || {};

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied: Host application does not belong to you' });
      }

      if (Array.isArray(items) && items.length > 500) {
        return res.status(400).send({ success: false, message: 'Menu cannot exceed 500 items to prevent document bloat' });
      }

      // Unlink orphaned menu item images from disk if removed or replaced
      const existingMenu = await Menu.findOne({ hostApplicationId });
      if (existingMenu && Array.isArray(existingMenu.items)) {
        const oldImageUrls = new Set(existingMenu.items.map(i => i.imageUrl).filter(url => url && url.startsWith('/uploads/')));
        const newImageUrls = new Set(items.map(i => i.imageUrl).filter(url => url && url.startsWith('/uploads/')));

        for (const oldUrl of oldImageUrls) {
          if (!newImageUrls.has(oldUrl)) {
            unlinkMediaFile(oldUrl);
          }
        }
      }

      let normalizedCats = undefined;
      if (Array.isArray(categories)) {
        normalizedCats = normalizeCategories(categories);
      }

      const updateData = { 
        merchantId: req.user.uid, 
        items, 
        categories: normalizedCats !== undefined ? normalizedCats : undefined, 
        defaultGst: defaultGst !== undefined ? Number(defaultGst) : undefined, 
        defaultOtherCharges: defaultOtherCharges !== undefined ? Number(defaultOtherCharges) : undefined, 
        defaultOtherChargesType: defaultOtherChargesType || undefined, 
        updatedAt: Date.now() 
      };

      if (popularCategory && typeof popularCategory === 'object') {
        updateData.popularCategory = {
          name: (popularCategory.name || 'Popular').trim(),
          icon: (popularCategory.icon || 'star').trim()
        };
      }

      if (Array.isArray(shifts) && shifts.length > 0) updateData.shifts = shifts;
      if (activeShift) updateData.activeShift = activeShift;

      // Check for compact single-item property modification
      let singleItemDelta = null;
      if (
        existingMenu &&
        Array.isArray(existingMenu.items) &&
        Array.isArray(items) &&
        existingMenu.items.length === items.length &&
        (!normalizedCats || JSON.stringify(existingMenu.categories) === JSON.stringify(normalizedCats)) &&
        (!shifts || JSON.stringify(existingMenu.shifts) === JSON.stringify(shifts)) &&
        (!activeShift || existingMenu.activeShift === activeShift)
      ) {
        const oldMap = new Map(existingMenu.items.map(i => [i.itemId, i]));
        const changedItems = [];
        for (const newItem of items) {
          const oldItem = oldMap.get(newItem.itemId);
          if (!oldItem) {
            changedItems.push(newItem);
            break;
          }
          const hasPropChange =
            oldItem.isAvailable !== newItem.isAvailable ||
            oldItem.price !== newItem.price ||
            oldItem.isPopular !== newItem.isPopular;

          const hasStructuralChange =
            oldItem.name !== newItem.name ||
            oldItem.category !== newItem.category ||
            oldItem.imageUrl !== newItem.imageUrl ||
            oldItem.isVeg !== newItem.isVeg ||
            oldItem.isAllShifts !== newItem.isAllShifts ||
            JSON.stringify(oldItem.shifts || []) !== JSON.stringify(newItem.shifts || []) ||
            JSON.stringify(oldItem.customizations || []) !== JSON.stringify(newItem.customizations || []);

          if (hasStructuralChange) {
            changedItems.length = 0;
            changedItems.push(null, null);
            break;
          } else if (hasPropChange) {
            changedItems.push(newItem);
          }
        }

        if (changedItems.length === 1 && changedItems[0]) {
          const target = changedItems[0];
          singleItemDelta = {
            event: 'menu_item_updated',
            itemId: target.itemId,
            isAvailable: target.isAvailable,
            pricePaise: target.price,
            isPopular: target.isPopular
          };
        }
      }

      const menu = await Menu.findOneAndUpdate(
        { hostApplicationId },
        updateData,
        { upsert: true, new: true }
      );

      if (typeof global.invalidateMenuCache === 'function') {
        global.invalidateMenuCache(hostApplicationId);
      }

      if (global.deviceSockets) {
        const devices = await Device.find({ hostApplicationId });
        const wsPayload = singleItemDelta
          ? JSON.stringify(singleItemDelta)
          : JSON.stringify({ event: 'reload_menu', activeShift: menu.activeShift });

        for (const device of devices) {
          const socket = global.deviceSockets.get(device.deviceId);
          if (socket && socket.readyState === 1) {
            socket.send(wsPayload);
          }
        }
      }

      // Notify active merchant sockets (Windows Desktop POS client & web portal)
      if (typeof global.sendToMerchant === 'function') {
        global.sendToMerchant(req.user.uid, {
          event: 'menu_updated',
          hostApplicationId: hostApplicationId.toString(),
          activeShift: menu.activeShift
        });
      }

      return res.status(200).send({
        success: true,
        message: 'Menu updated successfully',
        data: menu
      });
    } catch (error) {
      logger.error({ err: error.message }, 'updateMenu Error');
      return res.status(500).send({ success: false, message: 'Failed to update menu' });
    }
  }

  /**
   * Switch live active menu shift
   */
  async switchShift(req, res) {
    const { hostApplicationId, activeShift: rawActiveShift, shift } = req.body || {};
    const activeShift = rawActiveShift || shift;

    if (!hostApplicationId || !activeShift) {
      return res.status(400).send({ success: false, message: 'hostApplicationId and activeShift are required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied: Host application does not belong to you' });
      }

      const menu = await Menu.findOneAndUpdate(
        { hostApplicationId },
        { activeShift, updatedAt: Date.now() },
        { new: true }
      );

      if (!menu) {
        return res.status(404).send({ success: false, message: 'Menu not found for this venue' });
      }

      if (global.deviceSockets) {
        const devices = await Device.find({ hostApplicationId });
        for (const device of devices) {
          const socket = global.deviceSockets.get(device.deviceId);
          if (socket) {
            socket.send(JSON.stringify({ event: 'reload_menu', activeShift }));
          }
        }
      }

      // Notify active merchant sockets (Windows Desktop POS client & web portal)
      if (typeof global.sendToMerchant === 'function') {
        global.sendToMerchant(req.user.uid, {
          event: 'menu_updated',
          hostApplicationId: hostApplicationId.toString(),
          activeShift
        });
      }

      return res.status(200).send({
        success: true,
        message: `Live menu successfully switched to ${activeShift}`,
        data: { activeShift: menu.activeShift }
      });
    } catch (error) {
      logger.error({ err: error.message }, 'switchShift Error');
      return res.status(500).send({ success: false, message: 'Failed to switch menu shift' });
    }
  }

  /**
   * Upload dish/menu item photo
   */
  async uploadImage(req, res) {
    const hostApplicationId = req.headers['x-host-application-id'] || req.headers['X-Host-Application-Id'] || req.query.hostApplicationId;

    if (req.user && req.user.role !== 'admin') {
      const merchantApp = await HostApplication.findOne({ userId: req.user.uid });
      if (!merchantApp || (hostApplicationId && merchantApp._id.toString() !== hostApplicationId.toString())) {
        return res.status(403).send({ success: false, message: 'Access denied: You can only upload menu images to your own venue.' });
      }
    }

    const { folderName } = await getVenueFolderInfo(hostApplicationId);

    const filenameHeader = req.headers['x-filename'] || 'image.png';
    const { isValid } = validateExtension(filenameHeader);
    if (!isValid) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.' });
    }

    const uniqueFilename = generateMediaFilename('menu', '.webp');
    const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads', 'outlets', folderName, 'menu');
    const filePath = path.join(uploadsDir, uniqueFilename);

    try {
      await streamAndOptimizeImage(req.body || req.raw, filePath, { width: 800, height: 800, quality: 80 });

      const fileUrl = `/uploads/outlets/${folderName}/menu/${uniqueFilename}`;

      return res.status(200).send({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          filename: uniqueFilename,
          url: fileUrl
        }
      });
    } catch (error) {
      logger.error({ err: error.message }, 'uploadImage Error');
      return res.status(500).send({ success: false, message: 'Failed to upload and process image: ' + error.message });
    }
  }
}

module.exports = new MenuController();
