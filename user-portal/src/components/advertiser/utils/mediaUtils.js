import { config } from '@/config';

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const base = config.apiUrl.split('/api/v1')[0];
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

export const getFrequencyLabel = (freq) => {
  if (!freq) return 'Unknown';
  const f = freq.toLowerCase();
  if (f === 'continuous') return 'Continuous Loop';
  if (f === 'hourly') return 'Once Every Hour';
  if (f === 'every_15_mins') return 'Once Every 15 Mins';
  if (f === 'every_30_mins') return 'Once Every 30 Mins';
  if (f === 'every_2_hours') return 'Once Every 2 Hours';
  const numMatch = f.match(/\d+/);
  if (numMatch) {
    return `Once Every ${numMatch[0]} Mins`;
  }
  return freq;
};
