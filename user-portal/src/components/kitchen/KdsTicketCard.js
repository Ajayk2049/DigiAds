'use client';

import React, { useState } from 'react';
import { ChefHat, Check, Package, XCircle, AlertTriangle } from 'lucide-react';
import KdsElapsedTimer from './KdsElapsedTimer';

export default function KdsTicketCard({ order, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!order) return null;

  const isCooking = order.orderStatus === 'cooking';
  const isTakeout = order.orderType === 'TAKEOUT';

  const handleAction = async (newStatus) => {
    setUpdating(true);
    try {
      await onUpdateStatus(order.orderId, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  // Determine border and accent by elapsed time
  const start = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  const elapsedMinutes = Math.floor((Date.now() - start) / 60000);
  let cardBorder = 'border-border/80';
  if (elapsedMinutes >= 20) {
    cardBorder = 'border-rose-500/70 shadow-rose-950/20';
  } else if (elapsedMinutes >= 10) {
    cardBorder = 'border-amber-500/60 shadow-amber-950/20';
  } else {
    cardBorder = 'border-emerald-500/40';
  }

  return (
    <div className={`relative bg-card text-foreground border-2 ${cardBorder} rounded-xl shadow-lg flex flex-col justify-between overflow-hidden transition-all duration-200 select-none min-h-[300px]`}>
      {/* Reject Confirmation Overlay */}
      {showRejectConfirm && (
        <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm p-4 flex flex-col justify-center items-center text-center space-y-3 rounded-xl border-2 border-rose-500 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-outfit text-sm font-bold text-foreground">Reject / Cancel Order?</h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Are you sure you want to cancel the order for <span className="text-foreground font-bold">{isTakeout ? 'Takeout' : `Table ${order.tableNumber || '-'}`}</span> ({order.orderId})?
            </p>
          </div>
          <div className="flex items-center space-x-2 w-full pt-1">
            <button
              type="button"
              onClick={() => setShowRejectConfirm(false)}
              disabled={updating}
              className="flex-1 py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border cursor-pointer transition-colors"
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRejectConfirm(false);
                handleAction('cancelled');
              }}
              disabled={updating}
              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
            >
              {updating ? 'Cancelling...' : 'Yes, Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3.5 bg-muted/40 dark:bg-muted/20 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Table text with adaptive contrast: dark text in light mode, white text in dark mode */}
          <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider shadow-sm ${
            isTakeout
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700/60'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
          }`}>
            {isTakeout ? 'Takeout' : `Table ${order.tableNumber || '-'}`}
          </span>
          {/* Full Order ID */}
          <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 font-bold tracking-wide">
            {order.orderId}
          </span>
        </div>
        <KdsElapsedTimer createdAt={order.createdAt} />
      </div>

      {/* Special Instructions Banner */}
      {order.specialInstructions && (
        <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          Note: {order.specialInstructions}
        </div>
      )}

      {/* Items List */}
      <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto max-h-[320px]">
        {Array.isArray(order.items) && order.items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between text-xs py-1 border-b border-border/30 last:border-none">
            <div className="flex items-start space-x-2.5 pr-2">
              {/* Quantity badge: black on light gray in light mode, white on zinc in dark mode */}
              <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shrink-0 shadow-sm">
                {item.quantity || 1}x
              </span>
              <div>
                {/* Food Item Name: dark in light mode, pure white in dark mode */}
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight block">
                  {item.name}
                </span>
                {item.customization && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 italic block mt-0.5">
                    {item.customization}
                  </span>
                )}
              </div>
            </div>
            {item.isPacked && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold shrink-0">
                <Package className="w-2.5 h-2.5" />
                <span>PACK</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Action Footer: Green Action & Red Reject */}
      <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center space-x-2">
        {/* Red Reject Button with Confirmation */}
        <button
          type="button"
          onClick={() => setShowRejectConfirm(true)}
          disabled={updating}
          className="py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow disabled:opacity-50 shrink-0"
          title="Reject / Cancel Order"
        >
          <XCircle className="w-4 h-4" />
          <span>Reject</span>
        </button>

        {/* Green Primary Action Button */}
        {!isCooking ? (
          <button
            type="button"
            onClick={() => handleAction('cooking')}
            disabled={updating}
            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow disabled:opacity-50"
          >
            <ChefHat className="w-4 h-4" />
            <span>{updating ? 'Updating...' : 'Start Preparing'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleAction('served')}
            disabled={updating}
            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{updating ? 'Completing...' : 'Mark Ready / Served'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
