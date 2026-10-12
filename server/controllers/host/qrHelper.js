const sharp = require('sharp');
const jsQR = require('jsqr');

/**
 * Ensures pixel buffer is exactly 4-channel RGBA (Uint8ClampedArray) for jsQR
 */
function toRgbaClampedArray(pixelData, channels, width, height) {
  const pixelCount = width * height;
  if (channels === 4 && pixelData.length === pixelCount * 4) {
    return new Uint8ClampedArray(pixelData.buffer, pixelData.byteOffset, pixelData.byteLength);
  }
  const rgba = new Uint8ClampedArray(pixelCount * 4);
  if (channels === 1) {
    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
      const val = pixelData[i];
      rgba[j] = val;
      rgba[j + 1] = val;
      rgba[j + 2] = val;
      rgba[j + 3] = 255;
    }
  } else if (channels === 3) {
    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
      const srcIdx = i * 3;
      rgba[j] = pixelData[srcIdx];
      rgba[j + 1] = pixelData[srcIdx + 1];
      rgba[j + 2] = pixelData[srcIdx + 2];
      rgba[j + 3] = 255;
    }
  }
  return rgba;
}

/**
 * Execute CPU-bound jsQR decoding inside setImmediate so it never starves event loop I/O
 */
function decodeQrAsync(pixelData, channels, width, height) {
  return new Promise((resolve) => {
    setImmediate(() => {
      try {
        const clamped = toRgbaClampedArray(pixelData, channels, width, height);
        const res = jsQR(clamped, width, height, { inversionAttempts: 'attemptBoth' });
        resolve(res);
      } catch (_) {
        resolve(null);
      }
    });
  });
}

/**
 * Extract UPI details from raw decoded text
 */
function extractUpiDetails(decodedText) {
  if (!decodedText || typeof decodedText !== 'string') return null;
  const trimmed = decodedText.trim();
  let upiId = '';
  let payeeName = '';

  if (trimmed.toLowerCase().includes('upi://pay')) {
    try {
      const queryPart = trimmed.split('?')[1] || '';
      const params = new URLSearchParams(queryPart);
      const pa = params.get('pa') || params.get('PA');
      const pn = params.get('pn') || params.get('PN');
      if (pa) {
        upiId = decodeURIComponent(pa).trim();
        payeeName = pn ? decodeURIComponent(pn).trim() : '';
      }
    } catch (_) {}

    if (!upiId) {
      const paMatch = trimmed.match(/[?&]pa=([^&]+)/i);
      const pnMatch = trimmed.match(/[?&]pn=([^&]+)/i);
      if (paMatch) {
        try { upiId = decodeURIComponent(paMatch[1]).trim(); } catch (_) { upiId = paMatch[1].trim(); }
      }
      if (pnMatch) {
        try { payeeName = decodeURIComponent(pnMatch[1]).trim(); } catch (_) { payeeName = pnMatch[1].trim(); }
      }
    }
  }

  if (!upiId) {
    const vpaMatch = trimmed.match(/([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,64})/);
    if (vpaMatch) {
      upiId = vpaMatch[1].trim();
    }
  }

  if (!upiId) return null;
  return { upiId, payeeName };
}

/**
 * Decodes UPI QR code from image buffer with multi-pass resolution and contrast pipeline
 */
async function decodeUpiQr(buffer) {
  let code = null;

  // Pass 1: High-res (max 1600x1600) direct RGBA for crisp screenshots and high-res photos
  try {
    const { data, info } = await sharp(buffer, { limitInputPixels: 35000000 })
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    code = await decodeQrAsync(data, info.channels, info.width, info.height);
  } catch (_) {}

  // Pass 2: Medium-res (max 1200x1200) with contrast normalization for uneven camera lighting
  if (!code || !code.data) {
    try {
      const { data, info } = await sharp(buffer, { limitInputPixels: 35000000 })
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });

      code = await decodeQrAsync(data, info.channels, info.width, info.height);
    } catch (_) {}
  }

  // Pass 3: Medium-res (max 1000x1000) with sharpen for slightly blurry camera photos
  if (!code || !code.data) {
    try {
      const { data, info } = await sharp(buffer, { limitInputPixels: 35000000 })
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .sharpen()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      code = await decodeQrAsync(data, info.channels, info.width, info.height);
    } catch (_) {}
  }

  // Pass 4: Low-res (max 800x800) thresholded binarization for colored standee QR codes
  if (!code || !code.data) {
    try {
      const { data, info } = await sharp(buffer, { limitInputPixels: 35000000 })
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .threshold(128)
        .raw()
        .toBuffer({ resolveWithObject: true });

      code = await decodeQrAsync(data, info.channels, info.width, info.height);
    } catch (_) {}
  }

  if (!code || !code.data) {
    return null;
  }

  return extractUpiDetails(code.data);
}

module.exports = {
  decodeQrAsync,
  decodeUpiQr,
  extractUpiDetails
};
