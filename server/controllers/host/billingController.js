const path = require('path');
const fs = require('fs');
const HostApplication = require('../../models/HostApplication');
const { getVenueFolderInfo, unlinkMediaFile } = require('./venueHelper');
const { decodeUpiQr } = require('./qrHelper');
const {
  validateExtension,
  generateMediaFilename,
  validateContentLength,
  streamAndOptimizeImage
} = require('../../utils/uploadHandler');
const { UPLOAD_LIMITS } = require('../../config/constants');

class BillingController {
  /**
   * Save UPI payment config for a venue
   */
  async savePaymentConfig(req, res) {
    const { hostApplicationId, upiId, payeeName } = req.body || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }
    if (upiId && !upiId.includes('@')) {
      return res.status(400).send({ success: false, message: 'A valid UPI ID is required (e.g. merchant@okhdfcbank)' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied' });
      }

      app.upiId = upiId ? upiId.trim() : null;
      app.payeeName = (upiId && payeeName) ? payeeName.trim() : null;
      await app.save();

      return res.status(200).send({
        success: true,
        message: 'UPI payment configuration saved',
        data: { hostApplicationId, upiId: app.upiId, payeeName: app.payeeName }
      });
    } catch (error) {
      req.log.error({ err: error }, 'savePaymentConfig Error');
      return res.status(500).send({ success: false, message: 'Failed to save payment config' });
    }
  }

  /**
   * Get UPI payment config for a venue
   */
  async getPaymentConfig(req, res) {
    const { hostApplicationId } = req.query || {};
    if (!hostApplicationId) {
      return res.status(400).send({ success: false, message: 'hostApplicationId is required' });
    }

    try {
      const app = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      if (!app) {
        return res.status(403).send({ success: false, message: 'Access denied' });
      }

      return res.status(200).send({
        success: true,
        data: {
          hasUpiId: !!app.upiId,
          upiId: app.upiId || '',
          payeeName: app.payeeName || ''
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'getPaymentConfig Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch payment config' });
    }
  }

  /**
   * Upload and decode QR Code from image stream in memory
   */
  async uploadQrCode(req, res) {
    try {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES) {
        return res.status(400).send({ success: false, message: 'QR image file size exceeds maximum limit of 5MB' });
      }

      let buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (req.body && typeof req.body[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const chunk of req.body) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
      } else if (req.body) {
        buffer = Buffer.from(req.body);
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).send({ success: false, message: 'Empty image upload. Please select a valid QR image file.' });
      }

      const decoded = await decodeUpiQr(buffer);
      if (!decoded) {
        return res.status(400).send({
          success: false,
          message: 'Could not decode QR code. Please ensure the image contains a clear, unobstructed UPI QR code.'
        });
      }

      return res.status(200).send({
        success: true,
        message: 'QR Code successfully decrypted and verified',
        data: decoded
      });
    } catch (error) {
      req.log.error({ err: error }, 'uploadQrCode Error');
      return res.status(500).send({ success: false, message: 'Failed to process QR code image: ' + error.message });
    }
  }

  /**
   * Get modular bill config for venue
   */
  async getBillConfig(req, res) {
    const { applicationId } = req.params;
    try {
      const hostApp = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }
      return res.status(200).send({
        success: true,
        data: hostApp.billConfig || {}
      });
    } catch (error) {
      req.log.error({ err: error }, 'getBillConfig Error');
      return res.status(500).send({ success: false, message: 'Failed to fetch bill config' });
    }
  }

  /**
   * Update modular bill config for venue
   */
  async updateBillConfig(req, res) {
    const { applicationId } = req.params;
    const billConfigData = req.body || {};

    try {
      const hostApp = await HostApplication.findOne({ _id: applicationId, userId: req.user.uid });
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found' });
      }

      const prevConfig = hostApp.billConfig ? hostApp.billConfig.toObject() : {};

      // Immediately unlink old logoUrl from disk if deleted or replaced
      if (prevConfig.logoUrl && billConfigData.logoUrl !== undefined && billConfigData.logoUrl !== prevConfig.logoUrl) {
        await unlinkMediaFile(prevConfig.logoUrl);
      }

      // Immediately unlink old qrImageUrl from disk if deleted or replaced
      if (prevConfig.qrImageUrl && billConfigData.qrImageUrl !== undefined && billConfigData.qrImageUrl !== prevConfig.qrImageUrl) {
        await unlinkMediaFile(prevConfig.qrImageUrl);
      }

      hostApp.billConfig = {
        ...prevConfig,
        ...billConfigData
      };

      hostApp.markModified('billConfig');
      await hostApp.save();

      return res.status(200).send({
        success: true,
        message: 'Bill configuration saved successfully',
        data: hostApp.billConfig
      });
    } catch (error) {
      req.log.error({ err: error }, 'updateBillConfig Error');
      return res.status(500).send({ success: false, message: 'Failed to update bill config' });
    }
  }

  /**
   * Delete bill image (logoUrl or qrImageUrl) immediately from disk & update DB
   */
  async deleteBillImage(req, res) {
    const { imageType, hostApplicationId } = req.body || {};

    if (!imageType || !['logoUrl', 'qrImageUrl'].includes(imageType)) {
      return res.status(400).send({ success: false, message: 'Invalid imageType. Must be logoUrl or qrImageUrl.' });
    }

    try {
      const query = { _id: hostApplicationId };
      if (req.user && req.user.role !== 'admin') {
        query.userId = req.user.uid;
      }

      const hostApp = await HostApplication.findOne(query);
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host application not found or access denied' });
      }

      const prevUrl = hostApp.billConfig ? hostApp.billConfig[imageType] : '';
      if (prevUrl) {
        await unlinkMediaFile(prevUrl);
      }

      if (hostApp.billConfig) {
        hostApp.billConfig[imageType] = '';
        hostApp.markModified('billConfig');
        await hostApp.save();
      }

      return res.status(200).send({
        success: true,
        message: `${imageType === 'logoUrl' ? 'Header logo' : 'Footer QR image'} deleted successfully from disk`,
        data: hostApp.billConfig
      });
    } catch (error) {
      req.log.error({ err: error }, 'deleteBillImage Error');
      return res.status(500).send({ success: false, message: 'Failed to delete bill image: ' + error.message });
    }
  }

  /**
   * Upload bill image (logo or QR code image)
   */
  async uploadBillImage(req, res) {
    const hostApplicationId = req.headers['x-host-application-id'] || req.headers['X-Host-Application-Id'] || req.query.hostApplicationId;

    if (req.user && req.user.role !== 'admin') {
      const query = { userId: req.user.uid };
      if (hostApplicationId) query._id = hostApplicationId;
      const merchantApp = await HostApplication.findOne(query);
      if (!merchantApp) {
        return res.status(403).send({ success: false, message: 'Access denied: You can only upload bill images to your own venue.' });
      }
    }

    const { folderName } = await getVenueFolderInfo(hostApplicationId);

    const filenameHeader = req.headers['x-filename'] || 'bill_image.png';
    const { isValid } = validateExtension(filenameHeader);
    if (!isValid) {
      return res.status(400).send({ success: false, message: 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.' });
    }

    const sizeError = validateContentLength(req, UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, 'Bill image file');
    if (sizeError) {
      return res.status(400).send({ success: false, message: sizeError });
    }

    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'outlets', folderName, 'bills');
    const uniqueFilename = generateMediaFilename('bill_logo', '.webp');
    const filePath = path.join(uploadDir, uniqueFilename);

    try {
      await streamAndOptimizeImage(req.body || req.raw, filePath, { width: 800, height: 800, quality: 85 });
      const fileUrl = `/uploads/outlets/${folderName}/bills/${uniqueFilename}`;
      return res.status(200).send({
        success: true,
        message: 'Image uploaded successfully',
        url: fileUrl
      });
    } catch (error) {
      req.log.error({ err: error }, 'uploadBillImage Error');
      return res.status(500).send({ success: false, message: 'Failed to upload bill image: ' + error.message });
    }
  }
}

module.exports = new BillingController();
