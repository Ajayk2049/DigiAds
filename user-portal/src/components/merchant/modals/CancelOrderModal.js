'use client';

import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function CancelOrderModal({ order, onConfirm, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const isTakeout = order.isTakeout || order.tableNumber === 'TAKEOUT' || order.orderType === 'TAKEOUT';
  const tableLabel = isTakeout ? 'Takeout' : `Table ${order.tableNumber}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground">Cancel Order?</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Please confirm cancellation</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
          <p>
            Are you sure you want to cancel order <span className="font-mono font-bold text-foreground">{order.orderId}</span> for{' '}
            <span className="font-bold text-foreground">{tableLabel}</span>?
          </p>
          <p className="text-[11px] text-red-500/90 font-medium">
            This will mark the order as cancelled and clear it from active dining.
          </p>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer border border-border/40"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-red-500/20 flex items-center justify-center space-x-1.5"
          >
            <span>Cancel Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}
