const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim();
    return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/$/, '')}/api/v1`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (host.includes('digiads.space')) {
        return `${protocol}//test-api.digiads.space/api/v1`;
      }
      return `${protocol}//${host}:4200/api/v1`;
    }
  }
  return 'http://localhost:4200/api/v1';
};

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (host.includes('digiads.space')) {
        return `${wsProto}//test-api.digiads.space`;
      }
      return `${wsProto}//${host}:4200`;
    }
  }
  return 'ws://localhost:4200';
};

const getUserPortalUrl = () => {
  if (process.env.NEXT_PUBLIC_USER_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_USER_PORTAL_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${protocol}//${host}${port}`;
    }
  }
  return 'http://localhost:3001';
};

export const config = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  userPortalUrl: getUserPortalUrl(),
  maxVideoDurationSeconds: parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_SECONDS, 10) || 60,
};

