'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { resolveMediaUrl } from '../common/constants';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function DashboardTab(props) {
  const outlet = useOutletStore();
  const auth = useAuthStore();

  const analyticsData = props.analyticsData ?? outlet.analyticsData;
  const analyticsDays = props.analyticsDays ?? outlet.analyticsDays;
  const setAnalyticsDays = props.setAnalyticsDays ?? outlet.setAnalyticsDays;
  const fetchVenueAnalytics = props.fetchVenueAnalytics ?? outlet.fetchVenueAnalytics;
  const token = props.token ?? auth.token;
  const analyticsSlotFilter = props.analyticsSlotFilter ?? outlet.analyticsSlotFilter;
  const setAnalyticsSlotFilter = props.setAnalyticsSlotFilter ?? outlet.setAnalyticsSlotFilter;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="font-outfit text-2xl font-black text-foreground flex items-center space-x-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span>Venue Analytics Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-xs font-semibold mt-1">
            Food sales performance & order activity for <span className="text-foreground font-bold">{analyticsData?.venueName || 'Your Venue'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Date Filter Selector */}
          <div className="flex items-center space-x-2 bg-card border border-border/40 p-1.5 rounded-2xl shadow-sm overflow-x-auto">
            {[
              { label: 'Today', value: 0 },
              { label: 'Last 7 Days', value: 7 },
              { label: 'Last 15 Days', value: 15 },
              { label: 'Last 30 Days', value: 30 }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setAnalyticsDays(item.value);
                  if (fetchVenueAnalytics) fetchVenueAnalytics(token, item.value);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  analyticsDays === item.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Food Revenue</span>
          <p className="text-2xl font-black text-foreground font-outfit">
            ₹{(((analyticsData?.summary?.totalRevenuePaise || 0) / 100)).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-muted-foreground font-medium block">
            {analyticsDays === 0 ? "Today's gross sales" : `Last ${analyticsDays} days gross sales`}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</span>
          <p className="text-2xl font-black text-primary font-outfit">
            {analyticsData?.summary?.totalCompletedOrders || 0}
          </p>
          <span className="text-[10px] text-muted-foreground font-medium block">
            Completed tablet/QR orders
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Order Value</span>
          <p className="text-2xl font-black text-foreground font-outfit">
            ₹{(((analyticsData?.summary?.avgOrderValuePaise || 0) / 100)).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-muted-foreground font-medium block">
            Per customer transaction
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peak Revenue Slot</span>
          <p className="text-2xl font-black text-primary font-outfit">
            {analyticsData?.summary?.peakSlotName || '--'}
          </p>
          <span className="text-[10px] text-muted-foreground font-medium block">
            Highest earning time period
          </span>
        </div>
      </div>

      {/* Time Slot Switcher & Item Analytics */}
      <div className="p-6 rounded-2xl bg-card border border-border/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground">Time-of-Day Food Sales</h3>
            <p className="text-xs text-muted-foreground font-semibold">
              Select a time slot to view best-selling dishes during that period
            </p>
          </div>

          {/* 4 Clean Slot Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {[
              { id: 'all', label: 'ALL (Overall)' },
              { id: 'breakfast', label: 'Breakfast' },
              { id: 'lunch', label: 'Lunch' },
              { id: 'dinner', label: 'Dinner' }
            ].map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setAnalyticsSlotFilter(slot.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  analyticsSlotFilter === slot.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Slot Item Performance Grid */}
        {(() => {
          const currentSlotData = analyticsData?.slots?.[analyticsSlotFilter];
          const topSeller = currentSlotData?.topSeller;
          const rankedItems = currentSlotData?.rankedItems || [];

          if (!currentSlotData || rankedItems.length === 0) {
            return (
              <div className="p-8 rounded-xl border border-dashed border-border/40 text-center space-y-2">
                <p className="text-sm font-bold text-muted-foreground">No dish orders recorded for this time slot yet.</p>
                <p className="text-xs text-muted-foreground">Orders placed during this slot will automatically rank here.</p>
              </div>
            );
          }

          return (
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* #1 Best Seller Spotlight Card */}
              <div className="md:col-span-5 p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Top Seller
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {analyticsSlotFilter.toUpperCase()} SLOT
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  {topSeller.imageUrl ? (
                    <img
                      src={resolveMediaUrl(topSeller.imageUrl)}
                      alt={topSeller.name}
                      className="w-16 h-16 rounded-xl object-cover border border-border/40 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">
                      🍽️
                    </div>
                  )}
                  <div>
                    <h4 className="font-outfit text-lg font-bold text-foreground">{topSeller.name}</h4>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {topSeller.qty} units sold
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Total Sales</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    ₹{((topSeller.revenuePaise || 0) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Top 3 Ranked Dish List (with Uniform Progress Meter Bars) */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Top 3 Performing Dishes (Ranked)
                </h4>

                <div className="space-y-3">
                  {rankedItems.map((item, idx) => (
                    <div key={item.itemId || idx} className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/10">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 font-bold text-foreground">
                          <span className="text-primary font-mono text-xs">#{idx + 1}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="font-semibold text-muted-foreground">{item.qty} sold</span>
                          <span className="font-mono font-bold text-foreground">
                            ₹{((item.revenuePaise || 0) / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Uniform Progress Fill Meter */}
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentageShare}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Table Utilization Frequency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Active Table */}
        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Most Active Table
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">High Turnover</span>
          </div>

          {analyticsData?.tables?.mostActiveTable ? (
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="font-outfit text-xl font-bold text-foreground">
                  {analyticsData.tables.mostActiveTable.tableNumber}
                </h4>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {analyticsData.tables.mostActiveTable.orderCount} total orders completed
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-semibold">Total Revenue</span>
                <span className="font-mono text-lg font-bold text-foreground">
                  ₹{((analyticsData.tables.mostActiveTable.totalAmount || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground pt-1">No table activity recorded yet.</p>
          )}
        </div>

        {/* Least Active Table */}
        <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Least Active Table
            </span>
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">Low Utilization</span>
          </div>

          {analyticsData?.tables?.leastActiveTable ? (
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="font-outfit text-xl font-bold text-foreground">
                  {analyticsData.tables.leastActiveTable.tableNumber}
                </h4>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {analyticsData.tables.leastActiveTable.orderCount} total orders completed
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-semibold">Total Revenue</span>
                <span className="font-mono text-lg font-bold text-foreground">
                  ₹{((analyticsData.tables.leastActiveTable.totalAmount || 0) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground pt-1">No low-activity tables flagged.</p>
          )}
        </div>
      </div>
    </div>
  );
}
