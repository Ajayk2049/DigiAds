'use client';

import React from 'react';
import { X, UserCheck, Upload, Video, BarChart3, Trash2 } from 'lucide-react';

export default function AdvertiserAdsModal({
  isOpen,
  selectedAdvertiserUser,
  campaigns = [],
  onClose,
  onViewCreative,
  onViewAnalytics,
  onViewDetails,
  onRevokeCampaign
}) {
  if (!isOpen || !selectedAdvertiserUser) return null;

  const advId = selectedAdvertiserUser._id;
  const advCampaigns = campaigns.filter(
    (c) => (c.advertiserId?._id || c.advertiserId)?.toString() === advId?.toString()
  );
  const totalSpend = advCampaigns
    .filter((c) => c.paymentStatus === 'completed')
    .reduce((sum, c) => sum + (c.amount || 0) / 100, 0);
  const liveCount = advCampaigns.filter((c) => c.approvalStatus === 'approved').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-4xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/50 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                Advertiser Portfolio & Campaigns
              </span>
            </div>
            <h3 className="font-outfit text-xl font-bold text-foreground mt-2 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>{selectedAdvertiserUser.name || 'Advertiser Account'}</span>
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Phone: <span className="font-mono text-foreground font-bold">{selectedAdvertiserUser.phone}</span> • Email:{' '}
              {selectedAdvertiserUser.email || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close advertiser ads modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Advertiser Summary Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-background/50 rounded-2xl border border-border/40 text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Campaigns</span>
            <p className="text-2xl font-black text-foreground mt-1">{advCampaigns.length}</p>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Ad Spend</span>
            <p className="text-2xl font-black text-emerald-500 mt-1">₹{totalSpend}</p>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Live Running Ads</span>
            <p className="text-2xl font-black text-purple-500 mt-1">{liveCount}</p>
          </div>
        </div>

        {/* Campaign Table for Selected Advertiser */}
        <div>
          <h4 className="font-outfit text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
            All Booked Ad Campaigns by {selectedAdvertiserUser.name || 'this Advertiser'}
          </h4>

          {advCampaigns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs font-medium border border-border/50 rounded-2xl bg-background/30">
              This advertiser account has not submitted any ad campaign bookings yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/50 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/20">
                    <th className="p-3.5 pl-4">Booking ID</th>
                    <th className="p-3.5">Target Outlet</th>
                    <th className="p-3.5">Display & Format</th>
                    <th className="p-3.5">Duration & Payout</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Creative</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {advCampaigns.map((booking) => {
                    const isImage =
                      booking.mediaType === 'image' ||
                      booking.adType === 'image' ||
                      (booking.mediaUrl || '').includes('/images/');

                    return (
                      <tr key={booking.bookingId} className="hover:bg-card/20 transition-colors duration-200">
                        <td className="p-3.5 pl-4 font-mono font-bold text-primary">
                          <div>{booking.bookingId}</div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">
                            {booking.adCategory || 'Other'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          <div>{booking.outletId?.outletName || 'Standalone Venue'}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {booking.city}, {booking.state}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              isImage ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            {isImage ? <Upload className="w-3 h-3 shrink-0" /> : <Video className="w-3 h-3 shrink-0" />}
                            <span>
                              {isImage ? 'IMAGE' : 'VIDEO'} ({booking.deviceType})
                            </span>
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold">
                          <div className="text-foreground">{booking.adDurationDays} Days</div>
                          <div className="text-emerald-500 font-bold">₹{booking.amount / 100}</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                              booking.approvalStatus === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : booking.approvalStatus === 'rejected'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            }`}
                          >
                            {booking.approvalStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => onViewCreative && onViewCreative(booking)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors cursor-pointer border border-blue-500/20 inline-flex items-center justify-center"
                            title="View Creative Media"
                          >
                            {isImage ? <Upload className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end space-x-1.5">
                            {booking.paymentStatus === 'completed' && booking.approvalStatus === 'approved' && (
                              <button
                                onClick={() => onViewAnalytics && onViewAnalytics(booking.bookingId)}
                                className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
                                title="View Campaign Telemetry Analytics"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Analytics</span>
                              </button>
                            )}
                            <button
                              onClick={() => onViewDetails && onViewDetails(booking)}
                              className="px-2 py-1 bg-muted hover:bg-muted-foreground/20 text-foreground border border-border font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                            >
                              Details
                            </button>
                            {booking.approvalStatus === 'approved' && (
                              <button
                                onClick={() => onRevokeCampaign && onRevokeCampaign(booking)}
                                className="p-1.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 rounded-lg transition-colors cursor-pointer"
                                title="Revoke Campaign"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
