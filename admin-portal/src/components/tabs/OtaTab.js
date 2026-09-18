'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, RefreshCw } from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function OtaTab({
  onOpenReleaseModal,
  onOpenUploadModal,
  onToggleReleaseStatus,
  onToggleRelease
}) {
  const handleOpenReleaseModal = onOpenReleaseModal || onOpenUploadModal;
  const handleToggleReleaseStatus = onToggleReleaseStatus || onToggleRelease;

  const otaSubTab = useAdminStore((s) => s.otaSubTab);
  const setOtaSubTab = useAdminStore((s) => s.setOtaSubTab);
  const releases = useAdminStore((s) => s.releases);
  const devices = useAdminStore((s) => s.devices);

  const updatedDevices = devices.filter(
    (d) => d.lastKnownVersionCode >= 2 || (d.lastKnownAppVersion && d.lastKnownAppVersion !== '1.0.0')
  );

  return (
    <motion.div
      key="ota-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center border-b border-border/50 pb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
            <button
              onClick={() => setOtaSubTab('telemetry')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                otaSubTab === 'telemetry'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recent Devices
            </button>
            <button
              onClick={() => setOtaSubTab('history')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                otaSubTab === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Release History & Revokes ({releases.length})
            </button>
          </div>
        </div>

        <button
          onClick={handleOpenReleaseModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors duration-200 shadow-md flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Release APK</span>
        </button>
      </div>

      {/* Sub-Tab 1: Fleet Devices Telemetry */}
      {otaSubTab === 'telemetry' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Device Release Updates Tracker
            </h4>
            <span className="text-xs font-bold text-muted-foreground">
              Updated Terminals: {updatedDevices.length} / {devices.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                  <th className="p-3 pl-4">Terminal Serial</th>
                  <th className="p-3">Venue / Location</th>
                  <th className="p-3">Device Type</th>
                  <th className="p-3">Reported Version</th>
                  <th className="p-3">Heartbeat Status</th>
                  <th className="p-3">Last Heartbeat Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold">
                {updatedDevices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-foreground italic font-normal">
                      No recently updated devices recorded yet. Terminals will appear here automatically once their OTA
                      update is applied and reported.
                    </td>
                  </tr>
                ) : (
                  updatedDevices.map((d) => (
                    <tr key={d._id} className="hover:bg-card/20 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-primary">{d.deviceId}</td>
                      <td className="p-3 text-foreground font-bold">
                        {d.hostApplicationId?.outletName || 'Standalone'}
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {d.hostApplicationId?.city || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3 capitalize text-muted-foreground">{d.deviceType || 'tablet'}</td>
                      <td className="p-3 font-mono font-bold">
                        <span className="px-2.5 py-1 rounded text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {d.lastKnownAppVersion ? `v${d.lastKnownAppVersion}` : 'v1.0.1'}{' '}
                          {d.lastKnownVersionCode ? `(Build ${d.lastKnownVersionCode})` : '(Build 2)'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center w-fit gap-1">
                          <CheckCircle className="w-3 h-3" /> Updated
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-normal">
                        {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Release History & Revokes */}
      {otaSubTab === 'history' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-primary" /> Published Release History & Rollback Controls
            </h4>
            <span className="text-xs font-bold text-muted-foreground">Total Releases: {releases.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                  <th className="p-3 pl-4">Release Version</th>
                  <th className="p-3">Target App</th>
                  <th className="p-3">Published Date</th>
                  <th className="p-3">Adopted Devices</th>
                  <th className="p-3">SHA-256 Digest</th>
                  <th className="p-3">Disk Storage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-semibold">
                {releases.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-muted-foreground italic">
                      No published APK releases recorded yet.
                    </td>
                  </tr>
                ) : (
                  releases.map((rel) => {
                    const isActive = rel.status === 'active';
                    return (
                      <tr key={rel._id} className="hover:bg-card/20 transition-colors">
                        <td className="p-3 pl-4 font-mono font-bold text-foreground">
                          v{rel.versionName} <span className="text-[10px] text-muted-foreground">(Build #{rel.versionCode})</span>
                        </td>
                        <td className="p-3 font-bold text-muted-foreground">
                          {rel.appType === 'TABLET_APP' ? 'Tabletop Tablet (3:4)' : 'Wall Screen (16:9)'}
                        </td>
                        <td className="p-3 text-muted-foreground font-normal">
                          {new Date(rel.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-card/60 border border-border/40 text-[11px]">
                            <span>📱</span>
                            <span>{rel.deviceCount || 0} devices</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground" title={rel.sha256}>
                          {rel.sha256 ? `${rel.sha256.substring(0, 12)}...` : 'N/A'}
                        </td>
                        <td className="p-3">
                          {rel.isDiskCleaned ? (
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              title={`File cleaned from disk on ${
                                rel.cleanedAt ? new Date(rel.cleanedAt).toLocaleDateString() : '15d+ sweep'
                              }`}
                            >
                              🗑️ Cleaned (15d+)
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              💾 File Available
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                          >
                            {rel.status}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4">
                          <button
                            onClick={() => handleToggleReleaseStatus && handleToggleReleaseStatus(rel._id, rel.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20'
                                : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20'
                            }`}
                          >
                            {isActive ? 'Revoke Release' : 'Activate Release'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
