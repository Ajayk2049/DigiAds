'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  Tv,
  FileCheck,
  Building,
  ShieldCheck
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function DashboardTab({
  onViewRevenue,
  onSelectCampaign,
  onSelectHost,
  onSelectUser
}) {
  const stats = useAdminStore((s) => s.stats);
  const hosts = useAdminStore((s) => s.hosts);
  const campaigns = useAdminStore((s) => s.campaigns);
  const devices = useAdminStore((s) => s.devices);
  const users = useAdminStore((s) => s.users);
  const setActiveTab = useAdminStore((s) => s.setActiveTab);
  const setSelectedHostApp = useAdminStore((s) => s.setSelectedHostApp);
  const setShowVenueModal = useAdminStore((s) => s.setShowVenueModal);
  const setSelectedBooking = useAdminStore((s) => s.setSelectedBooking);
  const setShowMediaModal = useAdminStore((s) => s.setShowMediaModal);
  const setSelectedUser = useAdminStore((s) => s.setSelectedUser);

  const pendingCampaignsCount = campaigns.filter(
    (c) =>
      c.paymentStatus === 'completed' &&
      c.approvalStatus === 'pending' &&
      c.mediaUrl &&
      c.mediaUrl.trim() !== '' &&
      (c.transcodeStatus === 'completed' || !c.transcodeStatus)
  ).length;

  const approvedCampaignsCount = campaigns.filter((c) => c.approvalStatus === 'approved').length;
  const approvedHostsCount = hosts.filter((h) => h.status === 'approved').length;
  const pendingHostsCount = hosts.filter((h) => h.status === 'pending').length;

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = totalDevices - onlineDevices;
  const onlinePercentage = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;
  const tabletsCount = devices.filter((d) => d.deviceType === 'tablet').length;
  const screensCount = devices.filter((d) => d.deviceType === 'screen').length;

  return (
    <motion.div
      key="stats-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 animate-fade-in"
    >
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div
          onClick={onViewRevenue}
          className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
        >
          <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Revenue</p>
          <h3 className="font-outfit text-2xl font-black mt-2">₹{stats?.revenue?.totalINR || 0}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold group-hover:text-emerald-500 transition-colors">
            Click to view paid advertisers
          </p>
        </div>

        {/* Total Ads Deployed */}
        <div
          onClick={() => setActiveTab('advertisers')}
          className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
        >
          <div className="absolute right-4 top-4 p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <Tv className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Campaigns</p>
          <h3 className="font-outfit text-2xl font-black mt-2">{approvedCampaignsCount}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
            <span className="text-[#0069a8] font-bold">{pendingCampaignsCount} pending review</span> / {campaigns.length} total
          </p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => setActiveTab('requests')}
          className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
        >
          <div className="absolute right-4 top-4 p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
            <FileCheck className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Ads</p>
          <h3 className="font-outfit text-2xl font-black mt-2">{pendingCampaignsCount}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Moderation queue waiting</p>
        </div>

        {/* Active Venue Outlets */}
        <div
          onClick={() => setActiveTab('venues')}
          className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
        >
          <div className="absolute right-4 top-4 p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Outlets</p>
          <h3 className="font-outfit text-2xl font-black mt-2">{approvedHostsCount}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
            <span className="text-purple-500 font-bold">{pendingHostsCount} pending apps</span> / {hosts.length} total
          </p>
        </div>
      </div>

      {/* Telemetry Status Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-3 glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h4 className="font-outfit text-xs font-bold text-foreground">Kiosk Fleet Health & Metrics</h4>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black">
                <span className="text-primary font-bold">Operational Health Status</span>
                <span>{onlinePercentage}% Online</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 border border-border/40 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-700 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${onlinePercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-l border-border/40 pl-6 h-full py-1">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block">Active Terminals</span>
                <span className="text-xl font-black text-foreground mt-1 block">
                  {onlineDevices}{' '}
                  <span className="text-xs font-semibold text-muted-foreground">/ {totalDevices} deployed</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">
                  {tabletsCount} Tablets • {screensCount} Display Screens
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-l border-border/40 pl-6 h-full py-1">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{onlineDevices}</p>
              </div>
              <div className="p-3 bg-muted/20 border border-border/30 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Offline</span>
                <p className="text-lg font-black text-foreground/80 mt-0.5">{offlineDevices}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Widgets grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Venue Applications Widget */}
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
          <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">
            Venue Applications
          </h4>
          {hosts.filter((h) => h.status === 'pending').slice(0, 3).length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center font-medium">No pending host requests.</p>
          ) : (
            <div className="space-y-3">
              {hosts
                .filter((h) => h.status === 'pending')
                .slice(0, 3)
                .map((app) => (
                  <div
                    key={app._id}
                    onClick={() => {
                      if (onSelectHost) onSelectHost(app);
                      else {
                        setSelectedHostApp(app);
                        setShowVenueModal(true);
                      }
                    }}
                    className="flex justify-between items-start border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                    title="Click to view host request popup"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">{app.outletName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">
                        {app.requestTablet && `TAB (${app.tabletQuantity})`}
                        {app.requestTablet && app.requestScreen && ' / '}
                        {app.requestScreen && `SCR (${app.screenQuantity})`}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-primary shrink-0 uppercase tracking-wide">
                      Review &rarr;
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recent Booked Ads Widget */}
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
          <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">
            Recent Booked Ads
          </h4>
          {campaigns.slice(0, 3).length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center font-medium">No ad bookings found.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 3).map((booking) => (
                <div
                  key={booking.bookingId}
                  onClick={() => {
                    if (onSelectCampaign) onSelectCampaign(booking);
                    else {
                      setSelectedBooking(booking);
                      setShowMediaModal(true);
                    }
                  }}
                  className="flex justify-between items-center border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                  title="Click to view campaign details popup"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">Campaign {booking.bookingId}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {booking.outletId?.outletName || 'Outlet'} - {booking.adDurationDays} days
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                      booking.paymentStatus === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    }`}
                  >
                    {booking.paymentStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New User Registrations Widget */}
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
          <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">
            New User Registrations
          </h4>
          {users.slice(0, 3).length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center font-medium">No registered user accounts.</p>
          ) : (
            <div className="space-y-3">
              {users.slice(0, 3).map((u) => (
                <div
                  key={u._id}
                  onClick={() => {
                    setActiveTab('users');
                    if (onSelectUser) onSelectUser(u);
                    else setSelectedUser(u);
                  }}
                  className="flex justify-between items-center border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                  title="Click to manage user details"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{u.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{u.phone}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {u.roles?.join(', ') || u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
