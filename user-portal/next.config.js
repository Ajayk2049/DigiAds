const apiHost = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL).hostname;
    } catch (_) {}
  }
  return null;
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
  allowedDevOrigins: ['192.168.0.101', 'localhost', '127.0.0.1'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    remotePatterns,
  },
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/register',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
