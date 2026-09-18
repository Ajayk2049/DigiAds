'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function DeployDeviceModal({
  isOpen,
  deviceForm,
  setDeviceForm,
  hosts = [],
  onDeploy,
  onClose
}) {
  if (!isOpen) return null;

  const approvedHosts = hosts.filter((h) => h.status === 'approved');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <h3 className="font-outfit text-base font-bold text-foreground">Deploy New Terminal Device</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onDeploy} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Device Type</label>
              <select
                value={deviceForm.deviceType}
                onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              >
                <option value="tablet">Tablet Kiosk (3:4)</option>
                <option value="screen">Wall Screen (16:9)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Target Approved Venue</label>
              <select
                value={deviceForm.hostApplicationId}
                onChange={(e) => setDeviceForm({ ...deviceForm, hostApplicationId: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              >
                <option value="">Select Venue...</option>
                {approvedHosts.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.outletName} ({h.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              Deploy Terminal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
