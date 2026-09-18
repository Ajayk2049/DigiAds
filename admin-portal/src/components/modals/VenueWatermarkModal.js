'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function VenueWatermarkModal({
  isOpen,
  selectedHostApp,
  watermarkForm,
  setWatermarkForm,
  onClose,
  onSave,
  saving = false
}) {
  if (!isOpen || !selectedHostApp) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative space-y-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20">
              Platform Admin Control
            </span>
            <h3 className="font-outfit text-lg font-bold text-foreground mt-1">Manage Watermark for {selectedHostApp.outletName}</h3>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">Control "Powered by DigiAds" footer text per venue (support white-label premium hosts)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <label className="flex items-center space-x-3 cursor-pointer p-3 bg-muted/20 border border-border/40 rounded-xl">
            <input
              type="checkbox"
              checked={watermarkForm.showPoweredBy}
              onChange={(e) => setWatermarkForm({ ...watermarkForm, showPoweredBy: e.target.checked })}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
            <div>
              <span className="font-bold text-foreground block text-xs">Enable Receipt Watermark</span>
              <span className="text-[10px] text-muted-foreground">Uncheck only for verified premium white-label venues</span>
            </div>
          </label>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-bold uppercase block">Watermark Text Line</label>
            <input
              type="text"
              value={watermarkForm.customWatermark}
              onChange={(e) => setWatermarkForm({ ...watermarkForm, customWatermark: e.target.value })}
              placeholder="POWERED BY - DIGIADS"
              disabled={!watermarkForm.showPoweredBy}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setWatermarkForm({ showPoweredBy: true, customWatermark: 'POWERED BY - DIGIADS' })}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg text-[10px] uppercase border border-border/40 cursor-pointer"
            >
              Preset: Default DigiAds
            </button>
            <button
              type="button"
              onClick={() => setWatermarkForm({ showPoweredBy: false, customWatermark: '' })}
              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold rounded-lg text-[10px] uppercase border border-purple-500/20 cursor-pointer"
            >
              Preset: White-Label (Blank)
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer border border-border"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center space-x-1.5"
          >
            {saving ? 'Saving...' : 'Save Watermark Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
