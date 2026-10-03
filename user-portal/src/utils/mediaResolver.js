import { config } from '@/config';

/**
 * Centralized Media URL Resolver for DigiAds User Portal
 * Resolves relative, absolute, blob, and data URLs cleanly against API backend origin.
 */
export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const base = (config?.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').split('/api/v1')[0];
  let subpath = url;

  if (url.includes('/uploads/')) {
    subpath = `/uploads/${url.split('/uploads/')[1]}`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    subpath = url.startsWith('/') ? url : `/${url}`;
  } else {
    try {
      const parsed = new URL(url);
      subpath = parsed.pathname;
    } catch (e) {
      subpath = url;
    }
  }

  if (subpath.includes('/uploads/ads/')) {
    subpath = subpath.replace('/uploads/ads/', '/uploads/creative/');
  }

  if (subpath.startsWith('http://') || subpath.startsWith('https://')) {
    return subpath;
  }

  return `${base}${subpath}`;
};
