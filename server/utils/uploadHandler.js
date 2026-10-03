const path = require('path');
const fs = require('fs');
const stream = require('stream');
const { promisify } = require('util');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_LIMITS } = require('../config/constants');
const logger = require('./logger');

const pipeline = promisify(stream.pipeline);

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi'];

/**
 * Validate file extension against permitted list
 * @param {string} filename 
 * @param {string[]} allowedExts 
 * @returns {{ isValid: boolean, ext: string }}
 */
function validateExtension(filename, allowedExts = ALLOWED_IMAGE_EXTS) {
  const ext = path.extname(filename || '').toLowerCase();
  return {
    isValid: allowedExts.includes(ext),
    ext
  };
}

/**
 * Fast early rejection if Content-Length exceeds allowable limit
 * @param {object} req - Fastify request
 * @param {number} maxBytes - Maximum byte limit
 * @param {string} entityName - Entity name for error message
 * @returns {string|null} - Error message or null if valid
 */
function validateContentLength(req, maxBytes = UPLOAD_LIMITS.IMAGE_MAX_SIZE_BYTES, entityName = 'File') {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return `${entityName} size exceeds maximum allowable limit of ${maxMb}MB`;
  }
  return null;
}

/**
 * Generates collision-resistant unique filename
 * @param {string} prefix 
 * @param {string} extension 
 * @returns {string}
 */
function generateMediaFilename(prefix = 'media', extension = '.webp') {
  const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 16)}${cleanExt}`;
}

/**
 * Streams and converts an image payload (stream, raw, or Buffer) to optimized WebP
 * Automatically creates target directory and unlinks partial files if pipeline fails.
 * 
 * @param {ReadableStream|Buffer|object} input - req.body, req.raw, or Buffer
 * @param {string} destinationPath - Absolute destination file path
 * @param {object} options - Sharp resize & format options
 * @returns {Promise<void>}
 */
async function streamAndOptimizeImage(input, destinationPath, options = {}) {
  const {
    width = 800,
    height = 800,
    fit = 'inside',
    withoutEnlargement = true,
    quality = 85,
    limitInputPixels = 25000000
  } = options;

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  const transformer = sharp({ limitInputPixels })
    .resize(width, height, { fit, withoutEnlargement })
    .webp({ quality });

  try {
    if (Buffer.isBuffer(input)) {
      await sharp(input, { limitInputPixels })
        .resize(width, height, { fit, withoutEnlargement })
        .webp({ quality })
        .toFile(destinationPath);
    } else if (input && typeof input.pipe === 'function') {
      await pipeline(input, transformer, fs.createWriteStream(destinationPath));
    } else if (input && input.raw && typeof input.raw.pipe === 'function') {
      await pipeline(input.raw, transformer, fs.createWriteStream(destinationPath));
    } else {
      throw new Error('Unsupported or empty image stream payload');
    }
  } catch (err) {
    // Clean up partial orphaned file on disk
    try {
      if (fs.existsSync(destinationPath)) {
        await fs.promises.unlink(destinationPath);
      }
    } catch (cleanupErr) {
      logger.warn({ err: cleanupErr.message, destinationPath }, 'Failed to unlink failed upload destination');
    }
    throw err;
  }
}

/**
 * Streams input (stream, raw, or Buffer) directly to disk with cleanup on failure
 * @param {ReadableStream|Buffer|object} input - req.body, req.raw, or Buffer
 * @param {string} destinationPath - Absolute destination file path
 * @param {object} options - maxBytes
 * @returns {Promise<void>}
 */
async function streamToFile(input, destinationPath, options = {}) {
  const { maxBytes = UPLOAD_LIMITS.VIDEO_MAX_SIZE_BYTES } = options;
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    if (Buffer.isBuffer(input)) {
      if (input.length > maxBytes) {
        throw new Error(`File size exceeds maximum allowable limit of ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`);
      }
      await fs.promises.writeFile(destinationPath, input);
    } else {
      const inputStream = (input && typeof input.pipe === 'function')
        ? input
        : (input && input.raw && typeof input.raw.pipe === 'function')
          ? input.raw
          : null;

      if (!inputStream) {
        throw new Error('Unsupported or empty stream payload');
      }

      let bytesWritten = 0;
      const passThrough = new stream.Transform({
        transform(chunk, encoding, callback) {
          bytesWritten += chunk.length;
          if (bytesWritten > maxBytes) {
            callback(new Error(`File size exceeds maximum allowable limit of ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`));
          } else {
            callback(null, chunk);
          }
        }
      });

      await pipeline(inputStream, passThrough, fs.createWriteStream(destinationPath));
    }
  } catch (err) {
    try {
      if (fs.existsSync(destinationPath)) {
        await fs.promises.unlink(destinationPath);
      }
    } catch (cleanupErr) {
      logger.warn({ err: cleanupErr.message, destinationPath }, 'Failed to unlink failed file destination');
    }
    throw err;
  }
}

module.exports = {
  ALLOWED_IMAGE_EXTS,
  ALLOWED_VIDEO_EXTS,
  validateExtension,
  validateContentLength,
  generateMediaFilename,
  streamAndOptimizeImage,
  streamToFile
};
