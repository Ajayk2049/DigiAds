'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Tv } from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function AdvertisersTab({ onSelectAdvertiser }) {
  const users = useAdminStore((s) => s.users);
  const campaigns = useAdminStore((s) => s.campaigns);
  const stats = useAdminStore((s) => s.stats);
  const searchQuery = useAdminStore((s) => s.searchQuery);

  const getAdvertiserCampaigns = (advId) => {
    return campaigns.filter(
      (c) =>
        (c.advertiserId?._id || c.advertiserId)?.toString() === advId?.toString()
    );
  };

  const getAdvertiserTotalSpend = (advId) => {
    const advCampaigns = getAdvertiserCampaigns(advId);
    return advCampaigns
      .filter((c) => c.paymentStatus === 'completed')
      .reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  };

  // Filter approved advertisers matching role and query
  const approvedAdvertisersList = users.filter((u) => {
    const isAdv = (u.roles || [u.role]).includes('advertiser');
    if (!isAdv) return false;

    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      (u._id || '').toLowerCase().includes(query) ||
      (u.name || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query) ||
      (u.email || '').toLowerCase().includes(query)
    );
  });

  const totalCampaignsCount = campaigns.length;
  const liveActiveAdsCount = campaigns.filter((c) => c.approvalStatus === 'approved').length;

  return (
    <motion.div
      key="advertisers-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 animate-fade-in"
    >
      {/* Header Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved Advertisers</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">
            {approvedAdvertisersList.length}
          </h3>
          <p className="text-[10px] text-emerald-500 font-semibold mt-1">Registered advertiser accounts</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Campaigns Booked</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-blue-500">{totalCampaignsCount}</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Active & historical bookings</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Live Active Ads</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-purple-500">{liveActiveAdsCount}</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Currently streaming on kiosks</p>
        </div>
        <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Ad Spend</p>
          <h3 className="font-outfit text-2xl font-black mt-2 text-emerald-500">
            ₹{stats?.revenue?.totalINR || 0}
          </h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Collected advertiser revenue</p>
        </div>
      </div>

      {/* Info Header Bar */}
      <div className="bg-card/40 border border-border p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Approved Advertiser Accounts Directory</span>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing <span className="text-foreground font-bold">{approvedAdvertisersList.length}</span> advertiser accounts
        </span>
      </div>

      {/* Approved Advertisers Accounts Table */}
      <div className="mx-1 overflow-x-auto animate-fade-in">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
              <th className="p-4 pl-6">Advertiser Account</th>
              <th className="p-4">Contact Phone</th>
              <th className="p-4">Email Address</th>
              <th className="p-4 text-center">Campaigns Running</th>
              <th className="p-4">Total Spend (₹)</th>
              <th className="p-4 text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {approvedAdvertisersList.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                  No approved advertiser accounts found matching filter.
                </td>
              </tr>
            ) : (
              approvedAdvertisersList.map((adv) => {
                const advCampaigns = getAdvertiserCampaigns(adv._id);
                const totalSpend = getAdvertiserTotalSpend(adv._id);

                return (
                  <tr
                    key={adv._id}
                    onClick={() => onSelectAdvertiser && onSelectAdvertiser(adv)}
                    className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                  >
                    <td className="p-4 pl-6 font-bold text-foreground">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <div className="font-outfit text-sm">{adv.name || 'Advertiser'}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{adv._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-foreground">{adv.phone}</td>
                    <td className="p-4 font-semibold text-muted-foreground">{adv.email || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
                          advCampaigns.length > 0
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {advCampaigns.length} Campaign{advCampaigns.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-500 text-sm">₹{totalSpend}</td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectAdvertiser) onSelectAdvertiser(adv);
                        }}
                        className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer text-xs flex items-center space-x-1.5 ml-auto"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>View Running Ads ({advCampaigns.length})</span>
                      </button>
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
