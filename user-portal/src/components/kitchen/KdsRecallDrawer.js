'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import { config } from '@/config';

export default function KdsRecallDrawer({ isOpen, onClose, token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    axios.get(`${config.apiUrl}/kds/orders/recall`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setOrders(res.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-fade-in">
      <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
          <div className="flex items-center space-x-2.5">
            <RotateCcw className="w-5 h-5 text-primary" />
            <h3 className="font-outfit text-base font-bold text-foreground">Served Order Recall</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-semibold">Loading served tickets...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-medium">No recalled orders found in the last 2 hours.</div>
          ) : (
            orders.map(ord => (
              <div key={ord.orderId} className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="font-bold text-foreground">
                    {ord.orderType === 'TAKEOUT' ? 'TAKEOUT' : `Table ${ord.tableNumber || '-'}`}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Served</span>
                  </span>
                </div>
                <div className="space-y-1">
                  {Array.isArray(ord.items) && ord.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-zinc-800 dark:text-zinc-200 font-medium">
                      <span>{it.quantity || 1}x {it.name}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between font-mono">
                  <span>{ord.orderId}</span>
                  <span>{ord.servedAt ? new Date(ord.servedAt).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
