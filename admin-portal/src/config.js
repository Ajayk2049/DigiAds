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

export const config = {
  get apiUrl() {
    return getApiUrl();
  },
  get wsUrl() {
    return getWsUrl();
  },
};

