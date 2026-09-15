import React from 'react';
import {
  Megaphone,
  MapPin,
  Tablet,
  Tv,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  RefreshCw,
  Trash2,
  Upload,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { useAdvertiserStore } from '@/stores';
import { getFrequencyLabel } from '../utils/mediaUtils';

export default function CampaignsTab() {
  const {
    bookings,
    expandedCampaigns,
    toggleExpandCampaign,
    handleRetryPayment,
    retryingBookingId,
    handleVerifyPayment,
    handleCancelBooking,
    cancellingBookingId,
    setActiveUploadBooking,
    setActiveTab,
    openAnalyticsModal,
    setActiveMediaUrl,
    setShowMediaModal
  } = useAdvertiserStore();

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto p-4 bg-transparent">
      <h1 className="font-outfit text-2xl font-black text-foreground mb-2">My Ad Campaigns</h1>
      <p className="text-muted-foreground text-xs font-semibold mb-8">Review the payment and delivery status of your local campaigns.</p>

      {bookings.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No campaigns booked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Click &ldquo;Book Ad Spot&rdquo; in the navigation to launch your first location-based ad.</p>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto m-0 p-0 bg-transparent border-none">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="pb-4 pr-4">Campaign ID</th>
                <th className="pb-4 pr-4">Target Venue</th>
                <th className="pb-4 pr-4">Display Type</th>
                <th className="pb-4 pr-4">Schedule Scale</th>
                <th className="pb-4 pr-4">Amount Paid</th>
                <th className="pb-4 pr-4">Status</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {bookings.map((booking) => {
                const isExpanded = expandedCampaigns[booking.bookingId];
                return (
                  <React.Fragment key={booking.bookingId}>
                    <tr className="hover:bg-muted/10">
                      <td className="py-4 pr-4">
                        <div className="flex items-center space-x-1.5 font-bold text-primary uppercase tracking-wider">
                          <Megaphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{booking.bookingId}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-foreground text-xs">{booking.outletId?.outletName || 'Host Outlet'}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{booking.city}, {booking.state}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center space-x-1.5 capitalize font-semibold text-foreground">
                          {booking.deviceType === 'tablet' ? (
                            <Tablet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          )}
                          <span>{booking.deviceType}s (Qty: {booking.quantity})</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center space-x-1.5 font-semibold text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{booking.adDurationDays} Days / {getFrequencyLabel(booking.frequency)}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center space-x-1 font-extrabold text-foreground">
                          <span className="text-emerald-500 font-bold">₹</span>
                          <span>{booking.amount / 100}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center ${
                            booking.paymentStatus === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : booking.paymentStatus === 'failed'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                          }`}>
                            {booking.paymentStatus === 'completed' ? (
                              <>
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-500 shrink-0 mr-1" />
                                <span>Paid</span>
                              </>
                            ) : booking.paymentStatus === 'failed' ? (
                              <>
                                <XCircle className="w-2.5 h-2.5 text-destructive shrink-0 mr-1" />
                                <span>Failed</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-2.5 h-2.5 text-orange-500 shrink-0 mr-1 animate-pulse" />
                                <span>Processing</span>
                              </>
                            )}
                          </span>
                          {booking.approvalStatus === 'approved' ? (
                            <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              <CheckCircle className="w-2.5 h-2.5 text-sky-500 shrink-0 mr-1" />
                              <span>Approved</span>
                            </span>
                          ) : booking.approvalStatus === 'rejected' ? (
                            <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-destructive/10 text-destructive border border-destructive/20">
                              <XCircle className="w-2.5 h-2.5 text-destructive shrink-0 mr-1" />
                              <span>Rejected</span>
                            </span>
                          ) : booking.paymentStatus === 'completed' ? (
                            <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                              <Clock className="w-2.5 h-2.5 text-orange-500 shrink-0 mr-1" />
                              <span>Reviewing</span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
                          {booking.paymentStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleRetryPayment(booking.bookingId)}
                                disabled={retryingBookingId === booking.bookingId}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm disabled:opacity-50"
                                title="Pay Now"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>{retryingBookingId === booking.bookingId ? 'Opening...' : 'Pay Now'}</span>
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(booking.bookingId)}
                                className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                title="Verify Payment Status"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span className="hidden md:inline">Verify</span>
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking.bookingId)}
                                disabled={cancellingBookingId === booking.bookingId}
                                className="flex items-center space-x-1 px-2 py-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm disabled:opacity-50"
                                title="Cancel Pending Booking"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="hidden md:inline">{cancellingBookingId === booking.bookingId ? 'Cancelling...' : 'Cancel'}</span>
                              </button>
                            </>
                          )}
                          {booking.paymentStatus === 'completed' && booking.approvalStatus === 'pending' && (!booking.mediaUrl || booking.mediaUrl.trim() === '') && (
                            <button
                              onClick={() => {
                                useAdvertiserStore.setState({ activeUploadBookingDismissed: false });
                                setActiveUploadBooking(booking);
                                setActiveTab('new-booking');
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm animate-pulse"
                              title="Upload Ad Creative"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Media</span>
                            </button>
                          )}

                          {booking.paymentStatus === 'completed' && booking.approvalStatus === 'approved' && (
                            <button
                              onClick={() => openAnalyticsModal(booking.bookingId)}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                              title="View Campaign Analytics"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>Analytics</span>
                            </button>
                          )}
                          <button
                            onClick={() => toggleExpandCampaign(booking.bookingId)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground font-semibold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-card/5">
                        <td colSpan="7" className="p-4 border-t border-border/40">
                          <div className="grid md:grid-cols-2 gap-6 items-start">
                            {/* Left Panel Metadata */}
                            <div className="space-y-3 text-xs">
                              <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                <span className="text-muted-foreground font-semibold">Order ID</span>
                                <span className="col-span-2 text-foreground font-semibold break-all">{booking.orderId || 'N/A'}</span>
                              </div>
                              <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                <span className="text-muted-foreground font-semibold">Payment ID</span>
                                <span className="col-span-2 text-foreground font-semibold break-all">{booking.paymentId || 'N/A'}</span>
                              </div>
                              <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                <span className="text-muted-foreground font-semibold">Created At</span>
                                <span className="col-span-2 text-foreground font-semibold">{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'}</span>
                              </div>
                              {booking.approvalStatus === 'rejected' && booking.denialReason && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold space-y-1">
                                  <p className="uppercase font-bold text-[9px] tracking-wider">Reason for Denial</p>
                                  <p className="text-foreground leading-relaxed font-semibold">{booking.denialReason}</p>
                                </div>
                              )}
                              {booking.approvalStatus === 'approved' && (
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                  Campaign Approved & Broadcasting on Target Devices.
                                </div>
                              )}
                            </div>

                            {/* Right Panel - Media Asset Action */}
                            <div className="flex flex-col justify-center items-center p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3 text-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Media Creative Attachments
                              </span>
                              {booking.mediaUrl && booking.mediaUrl.trim() !== '' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMediaUrl(booking.mediaUrl);
                                    setShowMediaModal(true);
                                  }}
                                  className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm w-full max-w-[220px]"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Media Attachment</span>
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">No media attached yet</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
