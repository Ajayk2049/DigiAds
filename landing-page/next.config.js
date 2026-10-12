const apiHost = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL).hostname;
    } catch (_) {}
  }
  return null;
})();

const apiConnectOrigin = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL).origin;
    } catch (_) {}
  }
  return '';
})();

const extraImageHosts = (process.env.NEXT_PUBLIC_ALLOWED_IMAGE_DOMAINS || '')
  .split(',')
  .map(h => h.trim())
  .filter(Boolean);

const remotePatterns = [
  { protocol: 'http', hostname: 'localhost', pathname: '/**' },
  { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
];

if (apiHost && !remotePatterns.some(p => p.hostname === apiHost)) {
  remotePatterns.push({ protocol: 'https', hostname: apiHost, pathname: '/**' });
}

extraImageHosts.forEach(h => {
  if (!remotePatterns.some(p => p.hostname === h)) {
    remotePatterns.push({ protocol: 'https', hostname: h, pathname: '/**' });
  }
});

const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    appIsrStatus: false,
  },
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    remotePatterns,
  },
  // Allows local network connections without HMR blocking in Next.js development
  allowedDevOrigins: ['192.168.0.101', '192.168.31.195', '172.16.0.2', 'localhost', '127.0.0.1'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
              `connect-src 'self' ${apiConnectOrigin} http://localhost:* ws://localhost:* wss: https:`,
              "font-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].filter(Boolean).join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
