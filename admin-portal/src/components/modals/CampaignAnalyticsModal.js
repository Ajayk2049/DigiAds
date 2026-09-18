'use client';

import React from 'react';
import { X, BarChart3, RefreshCw, Play, Tablet, Clock, Activity } from 'lucide-react';

export default function CampaignAnalyticsModal({
  isOpen,
  analyticsBookingId,
  activeAnalyticsData,
  analyticsLoading,
  cooldownRemaining = 0,
  onRefresh,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border/40 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit text-md font-bold text-foreground flex items-center space-x-2">
                <span>Campaign Analytics</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                  {analyticsBookingId}
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Real-time playback telemetry & impression statistics
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onRefresh && onRefresh(analyticsBookingId)}
              disabled={analyticsLoading || cooldownRemaining > 0}
              className={`p-2 border border-border/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                analyticsLoading || cooldownRemaining > 0
                  ? 'bg-muted/40 text-muted-foreground opacity-60 cursor-not-allowed'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
              title={cooldownRemaining > 0 ? `Refresh available in ${cooldownRemaining}s` : 'Refresh Live Data'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {cooldownRemaining > 0 ? `Refresh (${cooldownRemaining}s)` : 'Refresh'}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold"
              aria-label="Close analytics"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-6 pr-1">
          {analyticsLoading && !activeAnalyticsData ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-muted-foreground">Fetching playback telemetry data...</p>
            </div>
          ) : activeAnalyticsData ? (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Plays</span>
                    <Play className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="text-2xl font-black font-outfit text-foreground">
                    {activeAnalyticsData.totalPlays || 0}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold mt-1">Full Campaign Impressions</span>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Devices Reached</span>
                    <Tablet className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <span className="text-2xl font-black font-outfit text-foreground">
                    {activeAnalyticsData.uniqueDevicesCount || 0}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold mt-1">Unique Tablets / Screens</span>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Duration</span>
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-2xl font-black font-outfit text-foreground">
                    {activeAnalyticsData.totalDurationMinutes ||
                      Math.round((activeAnalyticsData.totalDurationSeconds || 0) / 60)}
                    <span className="text-xs font-semibold text-muted-foreground ml-1">mins</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold mt-1">
                    {activeAnalyticsData.totalDurationSeconds || 0} Seconds Broadcast
                  </span>
                </div>
              </div>

              {/* Impression History Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>Playback Impression Log (Last 10 Plays)</span>
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">Auto-refreshes every 2m</span>
                </div>

                {!activeAnalyticsData.recentImpressions || activeAnalyticsData.recentImpressions.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-border/40 text-center">
                    <p className="text-xs font-semibold text-muted-foreground">No playback telemetry recorded yet.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Impressions will appear here automatically once the ad plays on target devices.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/40">
                        <tr>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3">Device ID</th>
                          <th className="py-2.5 px-3">Outlet / Venue</th>
                          <th className="py-2.5 px-3 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 font-medium">
                        {activeAnalyticsData.recentImpressions.map((imp) => (
                          <tr key={imp.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                              {new Date(imp.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-foreground font-semibold">
                              {imp.deviceId}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {imp.outletName} {imp.city ? `(${imp.city})` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[11px] text-emerald-500 font-bold">
                              {imp.durationSeconds}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
