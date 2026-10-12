const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim();
    return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/$/, '')}/api/v1`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `${protocol}//${host}:4000/api/v1`;
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      return `${protocol}//api.${rootDomain}/api/v1`;
    }
  }
  return 'http://localhost:4000/api/v1';
};

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `${wsProto}//${host}:4000`;
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      return `${wsProto}//api.${rootDomain}`;
    }
  }
  return 'ws://localhost:4000';
};

const getUserPortalUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_USER_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_USER_PORTAL_URL.trim().replace(/\/$/, '');
  }
  return 'http://localhost:4200';
};

const getLandingPageUrl = () => {
  if (process.env.NEXT_PUBLIC_LANDING_PAGE_URL) {
    return process.env.NEXT_PUBLIC_LANDING_PAGE_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `${protocol}//${host}:4100`;
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      return `${protocol}//${rootDomain}`;
    }
  }
  return 'http://localhost:4100';
};

export const config = {
  get apiUrl() {
    return getApiUrl();
  },
  get wsUrl() {
    return getWsUrl();
  },
  get userPortalUrl() {
    return getUserPortalUrl();
  },
  get landingPageUrl() {
    return getLandingPageUrl();
  },
  get downloadPageUrl() {
    return `${getLandingPageUrl()}/download`;
  },
  get githubDownloadUrl() {
    return process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || `${getLandingPageUrl()}/download`;
  },
  maxVideoDurationSeconds: parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_SECONDS, 10) || 60,
};

export const API_BASE = {
  toString: () => config.apiUrl,
  valueOf: () => config.apiUrl,
  replace: (pattern, replacement) => config.apiUrl.replace(pattern, replacement)
};


