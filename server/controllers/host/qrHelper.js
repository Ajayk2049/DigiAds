const sharp = require('sharp');
const jsQR = require('jsqr');

/**
 * Execute CPU-bound jsQR decoding inside setImmediate so it never starves event loop I/O
 */
function decodeQrAsync(pixelData, width, height) {
  return new Promise((resolve) => {
    setImmediate(() => {
      try {
        const res = jsQR(new Uint8ClampedArray(pixelData), width, height);
        resolve(res);
      } catch (_) {
        resolve(null);
      }
    });
  });
}

/**
 * Decodes UPI QR code from image buffer with fallback contrast enhancement
 */
async function decodeUpiQr(buffer) {
  let code = null;

  // 1. Single-pass normalized pipeline: resize to 450x450, grayscale & contrast normalize
  try {
    const { data, info } = await sharp(buffer, { limitInputPixels: 25000000 })
      .resize(450, 450, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    code = await decodeQrAsync(data, info.width, info.height);
  } catch (err) {
    // Ignore and proceed to fallback
  }

  // 2. Fallback pass with linear contrast stretch
  if (!code || !code.data) {
    try {
      const enhanced = await sharp(buffer, { limitInputPixels: 25000000 })
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .linear(1.3, -20)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      code = await decodeQrAsync(enhanced.data, enhanced.info.width, enhanced.info.height);
    } catch (err) {
      // Ignore
    }
  }

  if (!code || !code.data) {
    return null;
  }

  const decodedText = (code.data || '').trim();
  let upiId = '';
  let payeeName = '';

  if (decodedText.toLowerCase().startsWith('upi://pay')) {
    const queryString = decodedText.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const pa = params.get('pa') || params.get('PA');
    const pn = params.get('pn') || params.get('PN');

    if (pa) {
      upiId = decodeURIComponent(pa).trim();
      payeeName = pn ? decodeURIComponent(pn).trim() : '';
    }
  } else if (decodedText.includes('@') && !decodedText.includes(' ')) {
    upiId = decodedText;
  }

  if (!upiId) return null;

  return { upiId, payeeName };
}

module.exports = {
  decodeQrAsync,
  decodeUpiQr
};
