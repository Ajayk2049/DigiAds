export { resolveMediaUrl } from '@/utils/mediaResolver';

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
