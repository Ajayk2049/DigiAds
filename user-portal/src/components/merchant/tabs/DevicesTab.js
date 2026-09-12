'use client';

import React from 'react';
import { Tablet, Tv } from 'lucide-react';
import { useOutletStore } from '@/stores/useOutletStore';

export default function DevicesTab(props) {
  const outlet = useOutletStore();

  const devices = props.devices ?? outlet.devices;
  const applications = props.applications ?? outlet.applications;
  const deviceFilterVenue = props.deviceFilterVenue ?? outlet.deviceFilterVenue;
  const setDeviceFilterVenue = props.setDeviceFilterVenue ?? outlet.setDeviceFilterVenue;
  const deviceFilterStatus = props.deviceFilterStatus ?? outlet.deviceFilterStatus;
  const setDeviceFilterStatus = props.setDeviceFilterStatus ?? outlet.setDeviceFilterStatus;
  const deviceFilterType = props.deviceFilterType ?? outlet.deviceFilterType;
  const setDeviceFilterType = props.setDeviceFilterType ?? outlet.setDeviceFilterType;

  const filteredDevices = devices.filter(device => {
    const matchesType = device.deviceType === deviceFilterType;
    const matchesVenue = !deviceFilterVenue || device.hostApplicationId === deviceFilterVenue;
    const matchesStatus = deviceFilterStatus === 'all' ||
      (deviceFilterStatus === 'online' ? device.status === 'online' : device.status !== 'online');
    return matchesType && matchesVenue && matchesStatus;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 border-b border-border/40 pb-4">
        <div className="space-y-3">
          <div>
            <h1 className="font-outfit text-2xl font-black text-foreground">My Devices</h1>
            <p className="text-muted-foreground text-xs font-semibold">View and monitor the active tabletop kiosks and wall advertising screens provisioned for your venues.</p>
          </div>
          {/* Highlighted Instruction Banner */}
          <div className="bg-[#0069a8]/10 border border-[#0069a8]/20 rounded-xl px-4 py-3 text-xs max-w-xl text-left shadow-sm">
            <p className="text-[#0069a8] font-black uppercase tracking-wider text-[9px] mb-1">Activation Guidelines</p>
            <p className="text-muted-foreground font-semibold leading-relaxed text-[11px]">
              To link your physical Android kiosks, start the client app on your hardware and enter the unique <strong className="text-foreground">Device ID</strong> code displayed on any of the cards below.
            </p>
          </div>
        </div>

        {/* Filtering Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Venue Dropdown Selector */}
          <select
            value={deviceFilterVenue}
            onChange={(e) => setDeviceFilterVenue(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 cursor-pointer"
          >
            <option value="">All Venues</option>
            {applications.filter(app => app.status === 'approved').map(app => (
              <option key={app._id} value={app._id}>{app.outletName}</option>
            ))}
          </select>

          {/* Status Filter Tabs (All, Online, Offline) */}
          <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold space-x-0.5">
            <button
              onClick={() => setDeviceFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                deviceFilterStatus === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue)).length})
            </button>
            <button
              onClick={() => setDeviceFilterStatus('online')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
                deviceFilterStatus === 'online'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Online ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue) && d.status === 'online').length})
            </button>
            <button
              onClick={() => setDeviceFilterStatus('offline')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${
                deviceFilterStatus === 'offline'
                  ? 'bg-background text-foreground shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
              Offline ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue) && d.status !== 'online').length})
            </button>
          </div>

          {/* Device Type Tabs */}
          <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold">
            <button
              onClick={() => setDeviceFilterType('tablet')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                deviceFilterType === 'tablet'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tablets
            </button>
            <button
              onClick={() => setDeviceFilterType('screen')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                deviceFilterType === 'screen'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Screens
            </button>
          </div>
        </div>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Tablet className="w-12 h-12 text-[#0069a8] fill-[#0069a8] mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Provisioned Devices Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">
            No {deviceFilterStatus !== 'all' ? `${deviceFilterStatus} ` : ''}{deviceFilterType === 'tablet' ? 'tablets' : 'screens'} match the selected venue criteria.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => {
            const associatedApp = applications.find(app => app._id === device.hostApplicationId);
            return (
              <div key={device._id} className="p-5 rounded-2xl bg-card/10 border border-border/40 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-start border-b border-border/40 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Device ID</span>
                      <h4 className="font-mono font-bold text-foreground text-sm tracking-wide mt-0.5">{device.deviceId}</h4>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center ${
                      device.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted-foreground/10 text-muted-foreground border border-border/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      {device.status}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">Device Type</span>
                      <span className="text-foreground font-bold capitalize flex items-center">
                        {device.deviceType === 'tablet' ? (
                          <Tablet className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                        ) : (
                          <Tv className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                        )}
                        {device.deviceType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">Target Venue</span>
                      <span className="text-foreground font-bold">{associatedApp?.outletName || 'Host Outlet'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">Location</span>
                      <span className="text-foreground font-semibold text-right">{associatedApp ? `${associatedApp.city}, ${associatedApp.state}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
