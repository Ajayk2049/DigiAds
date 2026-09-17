const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Static Uploads Streaming & Portal Redirect Routes
 */
async function staticRoutes(fastify) {
  // Serve uploaded files statically with CORS, Content-Length, and Range support
  fastify.route({
    method: ['GET', 'HEAD', 'OPTIONS'],
    url: '/uploads/*',
    handler: async (req, res) => {
      const incomingOrigin = req.headers.origin;
      const allowedOrigins = Array.isArray(config.clientOrigins) ? config.clientOrigins : [];
      if (!incomingOrigin || config.env === 'development' || config.demoMode || allowedOrigins.includes(incomingOrigin)) {
        res.header('Access-Control-Allow-Origin', incomingOrigin || '*');
      } else {
        res.header('Access-Control-Allow-Origin', allowedOrigins[0] || 'null');
      }
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

      if (req.method === 'OPTIONS') {
        return res.status(204).send();
      }

      const rawSubpath = req.params['*'] || '';

      // Alias 'creative/' or 'media/' to 'ads/' so ad-blocker extensions don't block preview requests containing '/ads/'
      let subpath = rawSubpath;
      if (rawSubpath.startsWith('creative/')) {
        subpath = rawSubpath.replace(/^creative\//, 'ads/');
      } else if (rawSubpath.startsWith('media/')) {
        subpath = rawSubpath.replace(/^media\//, 'ads/');
      }

      const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
      let filePath = path.resolve(uploadsRoot, subpath);
      if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
        return res.status(403).send({ error: 'Access denied: Invalid file path' });
      }

      let stat;
      try {
        stat = await fs.promises.stat(filePath);
      } catch (e) {
        // Fallback to rawSubpath if aliased path was not found
        filePath = path.resolve(uploadsRoot, rawSubpath);
        if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
          return res.status(403).send({ error: 'Access denied: Invalid file path' });
        }
        try {
          stat = await fs.promises.stat(filePath);
        } catch (err) {
          return res.status(404).send({ error: 'File not found' });
        }
      }
      const ext = path.extname(subpath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      res.header('Content-Type', contentType);
      res.header('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.status(206);
        res.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.header('Content-Length', chunksize);
        return res.send(fileStream);
      }

      res.header('Content-Length', stat.size);
      if (req.method === 'HEAD') {
        return res.status(200).send();
      }

      return res.send(fs.createReadStream(filePath));
    }
  });

  // Safety redirect: If payment gateway or client redirects to backend server for /advertiser or /merchant,
  // forward user to frontend user portal with all query parameters preserved.
  fastify.get('/advertiser', async (req, reply) => {
    const rawUrl = req.raw.url || '';
    const queryIndex = rawUrl.indexOf('?');
    const query = queryIndex !== -1 ? rawUrl.substring(queryIndex) : '';
    const userPortalBase = (Array.isArray(config.clientOrigins)
      ? config.clientOrigins.find(o => o.includes('user') || o.includes('4200'))
      : null) || 'http://localhost:4200';
    return reply.redirect(`${userPortalBase}/advertiser${query}`, 302);
  });

  fastify.get('/merchant', async (req, reply) => {
    const rawUrl = req.raw.url || '';
    const queryIndex = rawUrl.indexOf('?');
    const query = queryIndex !== -1 ? rawUrl.substring(queryIndex) : '';
    const userPortalBase = (Array.isArray(config.clientOrigins)
      ? config.clientOrigins.find(o => o.includes('user') || o.includes('4200'))
      : null) || 'http://localhost:4200';
    return reply.redirect(`${userPortalBase}/merchant${query}`, 302);
  });
}

module.exports = staticRoutes;
