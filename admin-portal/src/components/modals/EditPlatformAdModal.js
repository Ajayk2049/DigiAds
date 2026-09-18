'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit3, Check } from 'lucide-react';

export default function EditPlatformAdModal({
  isOpen,
  ad,
  form,
  setForm,
  hosts = [],
  isSaving = false,
  onSave,
  onClose
}) {
  const [venueSearch, setVenueSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setVenueSearch('');
    }
  }, [isOpen]);

  if (!isOpen || !ad) return null;

  const isPlatformType = ad.type === 'platform';
  const openVenues = hosts.filter(
    (h) => h.status === 'approved' && h.allowOpenAds !== false && h.adMode !== 'closed'
  );

  const filteredVenues = openVenues.filter((h) => {
    if (!venueSearch) return true;
    const q = venueSearch.toLowerCase();
    return (h.outletName || '').toLowerCase().includes(q) || (h.city || '').toLowerCase().includes(q);
  });

  const toggleVenue = (venueId) => {
    const current = form.targetVenueIds || [];
    if (current.includes(venueId)) {
      setForm({ ...form, targetVenueIds: current.filter((id) => id !== venueId) });
    } else {
      setForm({ ...form, targetVenueIds: [...current, venueId] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit text-base font-bold text-foreground">Edit Platform Ad</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {ad.adId || ad._id} • {ad.type === 'fallback' ? 'Global Fallback' : 'Targeted Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
              Ad Title / Campaign Name
            </label>
            <input
              type="text"
              required
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
              Target Hardware Display
            </label>
            <select
              value={form.targetDeviceType || 'all'}
              onChange={(e) => setForm({ ...form, targetDeviceType: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Hardware (Tablets & Wall Screens)</option>
              <option value="tablet">Tabletop Tablets Only (3:4)</option>
              <option value="screen">Wall Screens Only (16:9)</option>
            </select>
          </div>

          {isPlatformType && (
            <div className="space-y-2 p-3 bg-muted/20 border border-border rounded-xl">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase text-muted-foreground font-bold">
                  Target Venues ({(form.targetVenueIds || []).length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetVenueIds: openVenues.map((v) => v._id) })}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Select All ({openVenues.length})
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetVenueIds: [] })}
                    className="text-[10px] font-bold text-muted-foreground hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Filter venues by name or city..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
              />

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredVenues.map((venue) => {
                  const isSelected = (form.targetVenueIds || []).includes(venue._id);
                  return (
                    <label
                      key={venue._id}
                      onClick={() => toggleVenue(venue._id)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40 text-foreground font-bold'
                          : 'bg-background border-border/50 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      <span className="truncate">{venue.outletName} ({venue.city || 'Unknown'})</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                Duration (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={form.durationSeconds || 10}
                onChange={(e) => setForm({ ...form, durationSeconds: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                Status
              </label>
              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive !== false}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-bold text-foreground">Active in rotation</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 hover:bg-muted border border-border rounded-xl text-muted-foreground font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
