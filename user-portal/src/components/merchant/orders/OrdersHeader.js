'use client';

import React from 'react';
import { Clock, ShoppingBag } from 'lucide-react';

export default function OrdersHeader({
  applications = [],
  activeVenueId,
  approvedOutlets = [],
  orders = [],
  activeShift,
  onSelectVenue,
  onOpenTakeoutModal
}) {
  const currentOutletName = applications.find(app => String(app._id) === String(activeVenueId))?.outletName
    || applications.find(app => app.status === 'approved')?.outletName
    || 'VENUE';

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b border-border/40 pb-4 gap-3 sm:gap-4">
      {/* Top Row: Outlet Name, Venue Switcher & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        <h1 className="font-outfit text-xl sm:text-2xl font-black text-foreground uppercase tracking-wider truncate">
          {currentOutletName}
        </h1>

        {/* Multiple Approved Outlets Tabs */}
        {approvedOutlets.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {approvedOutlets.map((app) => {
              const isSelected = String(app._id) === String(activeVenueId);
              const venueOrdersCount = orders.filter(o => String(o.hostApplicationId?._id || o.hostApplicationId) === String(app._id)).length;
              return (
                <button
                  key={app._id}
                  onClick={() => onSelectVenue?.(app._id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{app.outletName}</span>
                  {venueOrdersCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                    }`}>
                      {venueOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Live Status Pill for Mobile */}
        <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg shrink-0 sm:hidden">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>LIVE</span>
        </div>
      </div>

      {/* Actions & Menu Status Row */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
        <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg shrink-0">
          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Active Menu: <strong className="text-foreground">{activeShift}</strong></span>
        </div>

        <button
          onClick={onOpenTakeoutModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-3.5 py-2 rounded-lg text-[11px] sm:text-xs flex items-center space-x-1.5 cursor-pointer shadow-md tracking-wider uppercase transition-all whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span>+ Pickup Order</span>
        </button>

        {/* Live Status Pill for Desktop/Tablet */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}
