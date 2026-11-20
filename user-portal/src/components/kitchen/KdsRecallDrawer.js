'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, RotateCcw, Search, Calendar, CheckCircle2, Clock, Package, Loader2 } from 'lucide-react';
import { config } from '@/config';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function KdsRecallDrawer({ isOpen, onClose, token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const searchTimerRef = useRef(null);

  // Fetch recalled/served orders bounded by the selected day to safeguard database performance
  const fetchRecalledOrders = async (query = searchInput, date = selectedDate) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        date: date || getTodayDateString()
      };
      if (query && query.trim()) params.search = query.trim();

      const res = await axios.get(`${config.apiUrl}/kds/orders/recall`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data?.data || []);
    } catch (_) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !token) return;
    fetchRecalledOrders(searchInput, selectedDate);
  }, [isOpen, token, selectedDate]);

  // Debounced search
  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchRecalledOrders(val, selectedDate);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-fade-in">
      <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl animate-slide-in text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <RotateCcw className="w-5 h-5 text-[#0069a8]" />
            </div>
            <div>
              <h3 className="font-outfit text-base font-bold text-foreground">
                Served Order Recall
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Showing today&apos;s completed orders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Date Selector defaulted to current day */}
            <div className="flex items-center space-x-1.5 bg-background border border-input rounded-lg px-2 py-1 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || getTodayDateString())}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border cursor-pointer transition-colors"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Summary Bar */}
        <div className="p-3 border-b border-border/60 bg-muted/20 space-y-2 shrink-0">
          <div className="relative">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
            <input
              type="text"
              placeholder="Filter by table, dish, or order ID..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex justify-between items-center text-[11px] text-muted-foreground px-0.5">
            <span>
              {selectedDate === getTodayDateString() ? "Today's Orders" : `Date: ${selectedDate}`}
            </span>
            <span className="font-mono font-bold text-foreground">
              {orders.length} {orders.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>
        </div>

        {/* Scrollable Order Cards (Zero financial data) */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {loading && orders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-1.5 border-2 border-dashed border-border rounded-xl">
              <RotateCcw className="w-8 h-8 opacity-40 mx-auto text-primary" />
              <p className="text-xs font-bold text-foreground">No served orders for this day</p>
              <p className="text-[11px] text-muted-foreground">
                Orders marked served today will appear here for recall.
              </p>
            </div>
          ) : (
            orders.map((ord, idx) => {
              const isTakeout = ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT';
              const ordTime = ord.createdAt
                ? new Date(ord.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '';
              const readyTime = ord.servedAt
                ? new Date(ord.servedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '';

              return (
                <div
                  key={ord.orderId || idx}
                  className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-2.5 text-xs transition-colors hover:border-border/80"
                >
                  {/* Card Header: Table, Order ID, and Served Badge */}
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                        isTakeout
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700/60'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {isTakeout ? 'TAKEOUT' : `Table ${ord.tableNumber || '-'}`}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        {ord.orderId}
                      </span>
                    </div>

                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Served</span>
                    </span>
                  </div>

                  {/* Items List (Zero prices or currency) */}
                  <div className="space-y-1.5 pl-0.5">
                    {Array.isArray(ord.items) && ord.items.map((it, i) => (
                      <div key={i} className="flex items-start justify-between text-xs">
                        <div className="flex items-start space-x-2">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                            {it.quantity || 1}x
                          </span>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {it.name}
                            </span>
                            {it.customization && (
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                                ↳ {it.customization}
                              </div>
                            )}
                          </div>
                        </div>
                        {it.isPacked && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold shrink-0">
                            <Package className="w-2.5 h-2.5" />
                            <span>PACK</span>
                          </span>
                        )}
                      </div>
                    ))}

                    {ord.specialInstructions && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                        Note: {ord.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Timestamps Footer */}
                  <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between items-center">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>Placed {ordTime}</span>
                    </span>
                    {readyTime && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Ready {readyTime}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
