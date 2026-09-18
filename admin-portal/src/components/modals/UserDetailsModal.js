'use client';

import React from 'react';
import { X, User, Phone, Mail, Calendar, Shield, Building, Tv, Smartphone, Settings, Edit, CheckCircle } from 'lucide-react';

export default function UserDetailsModal({
  user,
  onClose,
  onEdit,
  onEditQuotas,
  merchantVenues = []
}) {
  if (!user) return null;

  const roles = user.roles || (user.role ? [user.role] : []);
  const isMerchant = roles.includes('merchant');
  const isAdvertiser = roles.includes('advertiser');
  const isAdmin = roles.includes('admin');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit text-base font-bold text-foreground">
                {user.name || 'Unnamed User'}
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">ID: {user._id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close user details modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 py-4 overflow-y-auto pr-1">
          {/* Role Badges */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Roles:</span>
            {isMerchant && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Building className="w-3 h-3" /> Venue Host
              </span>
            )}
            {isAdvertiser && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Tv className="w-3 h-3" /> Advertiser
              </span>
            )}
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Administrator
              </span>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-background/60 border border-border rounded-2xl text-xs">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-primary" /> Contact Phone
              </div>
              <div className="font-bold text-foreground">{user.phone || 'N/A'}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" /> Email Address
              </div>
              <div className="font-semibold text-foreground truncate" title={user.email || 'None'}>
                {user.email || 'Not provided'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> Registered On
              </div>
              <div className="font-semibold text-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" /> Account Status
              </div>
              <div className="font-bold text-emerald-500">Active</div>
            </div>
          </div>

          {/* Activity Statistics */}
          <div className="space-y-2">
            <h4 className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Platform Activity</h4>
            <div className="grid grid-cols-2 gap-3">
              {isMerchant && (
                <>
                  <div className="p-3 bg-muted/40 border border-border rounded-2xl flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold">Venue Outlets</div>
                      <div className="text-base font-black text-foreground">
                        {user.stats?.merchant?.applicationsCount || 0}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 border border-border rounded-2xl flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold">Deployed Devices</div>
                      <div className="text-base font-black text-foreground">
                        {user.stats?.merchant?.devicesCount || 0}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isAdvertiser && (
                <div className="p-3 bg-muted/40 border border-border rounded-2xl flex items-center space-x-3 col-span-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-semibold">Campaign Bookings</div>
                    <div className="text-base font-black text-foreground">
                      {user.stats?.advertiser?.bookingsCount || 0}
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && !isMerchant && !isAdvertiser && (
                <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-center space-x-3 col-span-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">System Administrator</div>
                    <div className="text-xs text-muted-foreground">Full management privileges for DigiAds Network.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border/50 flex justify-between items-center">
          <div>
            {isMerchant && merchantVenues.length > 0 && onEditQuotas && (
              <button
                onClick={() => {
                  onClose();
                  onEditQuotas(merchantVenues[0]);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Venue Quotas</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(user);
              }}
              className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit User</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
