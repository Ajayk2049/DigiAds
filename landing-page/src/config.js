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

const getUserPortalUrl = () => {
  if (process.env.NEXT_PUBLIC_USER_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_USER_PORTAL_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `${protocol}//${host}:4200`;
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      return `${protocol}//user.${rootDomain}`;
    }
  }
  return 'http://localhost:4200';
};

export const config = {
  get apiUrl() {
    return getApiUrl();
  },
  get userPortalUrl() {
    return getUserPortalUrl();
  },
  get githubDownloadUrl() {
    return process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || '/download';
  },
};
