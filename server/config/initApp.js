const fs = require('fs');
const path = require('path');

/**
 * Initialize core application runtime settings and storage directories.
 */
function initApp() {
  // Cap libvips thread pool + disable file cache for 1 vCPU / 3.8GB VPS.
  // Same output pixels — prevents thread explosion when concurrent image uploads hit sharp.
  try {
    const sharp = require('sharp');
    sharp.concurrency(1);
    sharp.cache(false);
  } catch (_) {}

  // Ensure required upload and log directories exist on server boot (for fresh VPS deployments)
  const requiredDirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'uploads/outlets'),
    path.join(__dirname, '..', 'uploads/ads'),
    path.join(__dirname, '..', 'uploads/staging'),
    path.join(__dirname, '..', 'uploads/releases'),
    path.join(__dirname, '..', 'uploads/host_promos'),
    path.join(__dirname, '..', 'uploads/platform-ads'),
    path.join(__dirname, '..', 'logs')
  ];

  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = { initApp };
