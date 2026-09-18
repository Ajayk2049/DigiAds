'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Video,
  Clock,
  Edit,
  Trash2
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function RatesTab({
  onSaveRate,
  onDeleteRate,
  onOpenCommercialImageDurationModal,
  onOpenDurationModal
}) {
  const [rateSubTab, setRateSubTab] = useState('tablet'); // 'tablet' | 'screen'
  const [editingRateId, setEditingRateId] = useState(null);
  const [frequencyOption, setFrequencyOption] = useState('hourly');
  const [customMinutes, setCustomMinutes] = useState('');

  const [form, setForm] = useState({
    deviceType: 'tablet',
    mediaType: 'video',
    maxVideoLengthSeconds: '30',
    durationDays: '7',
    frequency: 'hourly',
    amount: '',
    pricingType: 'per_device'
  });

  const rates = useAdminStore((s) => s.rates);
  const setIsCommercialImageDurationModalOpen = useAdminStore((s) => s.setIsCommercialImageDurationModalOpen);

  const handleOpenCommercialImageDurationModal = () => {
    if (onOpenCommercialImageDurationModal) onOpenCommercialImageDurationModal();
    else if (onOpenDurationModal) onOpenDurationModal();
    else setIsCommercialImageDurationModalOpen(true);
  };

  const handleTabChange = (tab) => {
    setRateSubTab(tab);
    if (!editingRateId) {
      setForm((prev) => ({ ...prev, deviceType: tab }));
    }
  };

  const getFrequencyLabel = (freq) => {
    if (!freq || freq === 'hourly') return 'Hourly (60m)';
    if (freq === 'continuous') return 'Continuous Loop';
    if (freq.startsWith('every_') && freq.endsWith('_mins')) {
      const m = freq.replace('every_', '').replace('_mins', '');
      return `Every ${m} mins`;
    }
    return freq;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let computedFrequency = frequencyOption;
    if (frequencyOption === 'custom') {
      computedFrequency = `every_${customMinutes || '60'}_mins`;
    }
    if (onSaveRate) {
      onSaveRate({
        id: editingRateId,
        ...form,
        frequency: computedFrequency
      });
    }
    setEditingRateId(null);
    setForm({
      deviceType: rateSubTab,
      mediaType: 'video',
      maxVideoLengthSeconds: '30',
      durationDays: '7',
      frequency: 'hourly',
      amount: '',
      pricingType: 'per_device'
    });
  };

  const handleStartEdit = (rate) => {
    setEditingRateId(rate._id);
    let freqOpt = 'hourly';
    let mins = '';
    if (rate.frequency === 'continuous') freqOpt = 'continuous';
    else if (rate.frequency && rate.frequency.startsWith('every_')) {
      freqOpt = 'custom';
      mins = rate.frequency.replace('every_', '').replace('_mins', '');
    }
    setFrequencyOption(freqOpt);
    setCustomMinutes(mins);
    setForm({
      deviceType: rate.deviceType || 'tablet',
      mediaType: rate.mediaType || 'video',
      maxVideoLengthSeconds: String(rate.maxVideoLengthSeconds || '30'),
      durationDays: String(rate.durationDays || '7'),
      frequency: rate.frequency || 'hourly',
      amount: String(rate.amount / 100 || ''),
      pricingType: rate.pricingType || 'per_device'
    });
  };

  return (
    <motion.div
      key="rates-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Rate Creation / Edit Form Card */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 p-6 rounded-2xl bg-card/40 border border-border space-y-4 shadow-xl"
        >
          <h3 className="font-outfit text-sm font-bold text-foreground">
            {editingRateId ? 'Edit Ad Pricing Tier' : 'Configure New Ad Rate Tier'}
          </h3>

          <div className="space-y-3 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Target Display</label>
                <select
                  value={form.deviceType}
                  onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  <option value="tablet">Tabletop Tablet (3:4)</option>
                  <option value="screen">Wall Screen (16:9)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Creative Format</label>
                <select
                  value={form.mediaType}
                  onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  <option value="video">Dynamic Video (MP4)</option>
                  <option value="image">Static Poster (JPG/PNG)</option>
                </select>
              </div>
            </div>

            {form.mediaType === 'video' && (
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Max Video Length</label>
                <select
                  value={form.maxVideoLengthSeconds || '30'}
                  onChange={(e) => setForm({ ...form, maxVideoLengthSeconds: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  <option value="30">30 Seconds Maximum</option>
                  <option value="60">60 Seconds Maximum</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Billing Model</label>
                <select
                  value={form.pricingType}
                  onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                >
                  <option value="per_device">Per Device Metric</option>
                  <option value="whole_venue">Whole Venue Flat Rate</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Duration (Days)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Rate Price (INR ₹)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Broadcast Frequency</label>
              <select
                value={frequencyOption}
                onChange={(e) => setFrequencyOption(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              >
                <option value="hourly">Hourly (Every 60 mins)</option>
                <option value="continuous">Continuous Loop (Non-stop)</option>
                <option value="custom">Custom Minute Interval...</option>
              </select>

              {frequencyOption === 'custom' && (
                <div className="mt-2">
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Interval in minutes (e.g. 45)"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            {editingRateId && (
              <button
                type="button"
                onClick={() => {
                  setEditingRateId(null);
                  setForm({
                    deviceType: rateSubTab,
                    mediaType: 'video',
                    maxVideoLengthSeconds: '30',
                    durationDays: '7',
                    frequency: 'hourly',
                    amount: '',
                    pricingType: 'per_device'
                  });
                }}
                className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md min-h-[44px]"
            >
              {editingRateId ? 'Update Rate' : 'Create Rate Card'}
            </button>
          </div>
        </form>

        {/* Rates Table Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border w-fit">
              <button
                type="button"
                onClick={() => handleTabChange('tablet')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                  rateSubTab === 'tablet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tablet Rates
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('screen')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                  rateSubTab === 'screen'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Screen Rates
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenCommercialImageDurationModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-muted/70 border border-border text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm hover:border-primary/50 group"
              title="Configure Commercial Advertiser Image Ad Display Duration"
            >
              <Clock className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
              <span>Image Ad Duration</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                  <th className="p-4 pl-6">Media Type</th>
                  <th className="p-4">Pricing Model</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Price Rate</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rates.filter((r) => r.deviceType === rateSubTab).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium italic">
                      No rates configured for {rateSubTab} displays.
                    </td>
                  </tr>
                ) : (
                  rates
                    .filter((r) => r.deviceType === rateSubTab)
                    .map((rate) => (
                      <tr key={rate._id} className="hover:bg-card/20 transition-colors duration-200">
                        <td className="p-4 pl-6 font-bold text-foreground">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              rate.mediaType === 'image'
                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}
                          >
                            {rate.mediaType === 'image' ? (
                              <Upload className="w-3 h-3 text-purple-500 shrink-0" />
                            ) : (
                              <Video className="w-3 h-3 text-blue-500 shrink-0" />
                            )}
                            <span>
                              {rate.mediaType === 'image'
                                ? 'Static Image'
                                : `Dynamic Video (${rate.maxVideoLengthSeconds || 30}s Plan)`}
                            </span>
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              rate.pricingType === 'whole_venue'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-slate-500/10 text-muted-foreground border border-border/50'
                            }`}
                          >
                            <span>
                              {rate.pricingType === 'whole_venue' ? 'Whole Venue (Flat)' : 'Per Device'}
                            </span>
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-foreground">{rate.durationDays} Days</td>
                        <td className="p-4 font-semibold text-muted-foreground">
                          {getFrequencyLabel(rate.frequency)}
                        </td>
                        <td className="p-4 font-black text-emerald-500 text-sm">
                          ₹{rate.amount / 100}{' '}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {rate.pricingType === 'whole_venue' ? '/ venue' : '/ device'}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleStartEdit(rate)}
                              className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                              title="Edit rate"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRate && onDeleteRate(rate._id)}
                              className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                              title="Delete rate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
