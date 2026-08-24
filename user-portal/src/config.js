const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4200/api/v1`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:4200/api/v1';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `ws://${host}:4200`;
    }
  }
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  return 'ws://localhost:4200';
};

const getUserPortalUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}${port}`;
    }
  }
  if (process.env.NEXT_PUBLIC_USER_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_USER_PORTAL_URL;
  }
  return 'http://localhost:3001';
};

export const config = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  userPortalUrl: getUserPortalUrl(),
  maxVideoDurationSeconds: parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_SECONDS, 10) || 60,
};
