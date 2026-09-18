'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function DevicesTab({ onOpenDeployModal }) {
  const [deviceSubTab, setDeviceSubTab] = useState('tablet'); // 'tablet' | 'screen'

  const devices = useAdminStore((s) => s.devices);
  const searchQuery = useAdminStore((s) => s.searchQuery);

  const tablets = devices.filter((d) => d.deviceType === 'tablet');
  const screens = devices.filter((d) => d.deviceType === 'screen');

  const filteredDevices = devices
    .filter((d) => {
      if (d.deviceType !== deviceSubTab) return false;
      if (!searchQuery) return true;
      const query = searchQuery.trim().toLowerCase();
      return (
        (d.deviceId || '').toLowerCase().includes(query) ||
        (d.hostApplicationId?.outletName || '').toLowerCase().includes(query) ||
        (d.hostApplicationId?.city || '').toLowerCase().includes(query) ||
        (d.hostApplicationId?.state || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aNeverUsed = (!a.isActivated && !a.hardwareId) || a.status === 'never_used';
      const bNeverUsed = (!b.isActivated && !b.hardwareId) || b.status === 'never_used';

      // 1. Live online devices first
      const aOnline = !aNeverUsed && a.status === 'online' ? 1 : 0;
      const bOnline = !bNeverUsed && b.status === 'online' ? 1 : 0;
      if (aOnline !== bOnline) {
        return bOnline - aOnline;
      }

      // 2. Previously active offline devices second, Never Used devices last
      if (aNeverUsed !== bNeverUsed) {
        return aNeverUsed ? 1 : -1;
      }

      // 3. Among active devices: sort by most recent heartbeat
      if (!aNeverUsed) {
        const aTime = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
        const bTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return bTime - aTime;
      }

      // 4. Among never-used devices: sort by creation time (newest first)
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });

  return (
    <motion.div
      key="devices-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center border-b border-border/50 pb-6 flex-wrap gap-4">
        <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
          <button
            onClick={() => setDeviceSubTab('tablet')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              deviceSubTab === 'tablet'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tablets ({tablets.length})
          </button>
          <button
            onClick={() => setDeviceSubTab('screen')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              deviceSubTab === 'screen'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Display Screens ({screens.length})
          </button>
        </div>

        <button
          onClick={onOpenDeployModal}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-colors duration-200 shadow-md flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New Terminal</span>
        </button>
      </div>

      <div className="mx-1 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
              <th className="p-4 pl-6">Device Serial ID</th>
              <th className="p-4">Deployed Venue</th>
              <th className="p-4">App Version</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Sync Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredDevices.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-muted-foreground font-medium italic">
                  No deployed hardware terminals found for {deviceSubTab}.
                </td>
              </tr>
            ) : (
              filteredDevices.map((d) => {
                const isNeverUsed = (!d.isActivated && !d.hardwareId) || d.status === 'never_used';
                return (
                  <tr key={d._id} className="hover:bg-card/20 transition-colors duration-200">
                    <td className="p-4 pl-6 font-mono font-bold text-primary">
                      {d.deviceId}
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      {d.hostApplicationId?.outletName || 'Standalone'}
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {d.hostApplicationId?.city ? `${d.hostApplicationId.city}, ${d.hostApplicationId?.state || ''}` : 'No location specified'}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {isNeverUsed || !d.lastKnownAppVersion ? (
                        <span className="text-muted-foreground/60 font-mono text-[11px] font-medium">—</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono text-[11px] font-bold">
                          v{d.lastKnownAppVersion}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isNeverUsed ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Never Used
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                            d.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {d.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground font-medium text-xs">
                      {isNeverUsed || !d.lastHeartbeat ? (
                        <span className="text-muted-foreground/60 italic text-[11px]">Never synced</span>
                      ) : (
                        new Date(d.lastHeartbeat).toLocaleString()
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
