'use client';

import React from 'react';
import { UserCheck, Check, X, Video, Upload, Trash2 } from 'lucide-react';

export default function CampaignsRequestSubTab({
  filteredCampaigns,
  adFilter,
  watchedVideos,
  setWatchedVideos,
  onReviewCampaign,
  onOpenDenyCampaignModal,
  onOpenRevokeCampaignModal,
  onViewCreative,
  onViewCampaignDetails
}) {
  if (filteredCampaigns.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card/10 text-xs">
        <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-semibold">
          {adFilter === 'rejected'
            ? 'No rejected ad campaigns found.'
            : adFilter === 'pending'
            ? 'All booked and paid ad campaigns are resolved.'
            : 'No matching ad campaigns found in moderation queue.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-1 mt-2 overflow-x-auto animate-fade-in">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
            <th className="p-4 pl-6">Advertiser Name</th>
            <th className="p-4">Ad ID</th>
            <th className="p-4 text-center">Attachment</th>
            <th className="p-4 text-center">Details</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {filteredCampaigns.map((booking) => (
            <tr key={booking.bookingId} className="hover:bg-card/20 transition-colors duration-200">
              <td className="p-4 pl-6 font-bold text-foreground">
                <div>{booking.advertiserId?.name || booking.advertiserId?.phone || 'Advertiser'}</div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {booking.city}, {booking.state}
                </div>
              </td>
              <td className="p-4 font-mono font-bold text-primary">
                <div>{booking.bookingId}</div>
              </td>
              <td className="p-4 text-center">
                {booking.mediaUrl && booking.mediaUrl.trim() !== '' ? (
                  <button
                    onClick={() => {
                      if (onViewCreative) onViewCreative(booking);
                      setWatchedVideos((prev) => new Set(prev).add(booking.bookingId));
                    }}
                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-colors duration-200 cursor-pointer border border-blue-500/20 inline-flex items-center justify-center shadow-sm"
                    title="Preview media attachment"
                  >
                    {(booking.mediaUrl || '').includes('.mp4') || (booking.mediaUrl || '').includes('.webm') ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 whitespace-nowrap">
                    Awaiting Media
                  </span>
                )}
              </td>
              <td className="p-4 text-center">
                <button
                  onClick={() => onViewCampaignDetails && onViewCampaignDetails(booking)}
                  className="px-3 py-1.5 bg-muted hover:bg-muted-foreground/20 text-foreground border border-border font-bold rounded-lg transition-colors duration-200 cursor-pointer"
                >
                  Details
                </button>
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center space-x-2">
                  {booking.approvalStatus === 'pending' ? (
                    !booking.mediaUrl || !booking.mediaUrl.trim() ? (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border whitespace-nowrap">
                        Awaiting Upload
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => onReviewCampaign && onReviewCampaign(booking.bookingId, 'approve')}
                          disabled={!watchedVideos.has(booking.bookingId)}
                          title={
                            !watchedVideos.has(booking.bookingId)
                              ? 'You must view the media creative before approving'
                              : 'Approve this campaign'
                          }
                          className={`px-3 py-1.5 border font-bold rounded-lg transition-colors duration-200 flex items-center space-x-1 ${
                            watchedVideos.has(booking.bookingId)
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20 hover:border-emerald-500 cursor-pointer'
                              : 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{watchedVideos.has(booking.bookingId) ? 'Approve' : 'View First'}</span>
                        </button>
                        <button
                          onClick={() => onOpenDenyCampaignModal && onOpenDenyCampaignModal(booking)}
                          className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>
                      </>
                    )
                  ) : booking.approvalStatus === 'approved' ? (
                    <button
                      onClick={() => onOpenRevokeCampaignModal && onOpenRevokeCampaignModal(booking)}
                      className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1"
                      title="Revoke active campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20 capitalize">
                      {booking.approvalStatus}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
