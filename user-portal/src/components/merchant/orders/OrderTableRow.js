'use client';

import React from 'react';
import { Printer, Bell, Receipt, CheckCircle } from 'lucide-react';

export default function OrderTableRow({
  ord,
  applications = [],
  activeVenueId,
  activeBillConfig,
  confirmingPaymentOrderId,
  onPrintKot,
  onToggleGstExemption,
  onToggleServiceTaxExemption,
  onStatusChange,
  onRequestCancel,
  onServiceWaiter,
  onSetConfirmingPaymentOrderId,
  onMarkPaymentReceived,
  onCloseTable
}) {
  const isTakeout = ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT';

  // Compute effective bill config for service tax calculation
  const venueApp = (applications || []).find(a => String(a._id) === String(ord.hostApplicationId || activeVenueId));
  const effBillConfig = ord.billConfigSnapshot || venueApp?.billConfig || activeBillConfig || {};
  const effTaxPct = Number(effBillConfig?.serviceTaxPercent || 0);
  const showServTax = ord.serviceTaxPercent > 0 || ord.serviceTaxAmount > 0 || ord.isServiceTaxExempt || effTaxPct > 0;

  const hasItems = Array.isArray(ord.items) && ord.items.length > 0;

  return (
    <tr className="hover:bg-muted/10">
      {/* Table / Type */}
      <td className="py-4 pr-2">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            {ord.orderStatus === 'placed' && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
            <span
              className={`font-black px-3.5 py-1.5 rounded-xl text-sm whitespace-nowrap shadow-sm ${
                isTakeout
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20'
              }`}
            >
              {isTakeout ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`}
            </span>
          </div>
        </div>
      </td>

      {/* Order ID & KOT Print Action */}
      <td className="py-4 pr-2 font-mono font-bold text-foreground text-xs align-top">
        <div className="flex flex-col items-start gap-1.5">
          <span>{ord.orderId}</span>
          {hasItems && (
            <button
              type="button"
              onClick={() => onPrintKot?.(ord)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer transition-all shrink-0 active:scale-95"
              title="Print Kitchen Order Ticket"
            >
              <Printer className="w-3 h-3" />
              <span>PRINT KOT</span>
            </button>
          )}
        </div>
      </td>

      {/* Items Scrollable List */}
      <td className="py-4 pr-2 min-w-[180px] max-w-[260px]">
        {hasItems ? (
          <div className="space-y-1 font-semibold text-foreground">
            <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {ord.items?.map((item, idx) => (
                <div key={idx} className="text-xs flex flex-col space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground break-words leading-tight" title={item.name}>
                      {item.name}{item.isPacked && !item.name?.includes('(PACK)') ? ' [PACK]' : ''}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px] mt-0.5">x {item.quantity}</span>
                  </div>
                  {item.customization ? (
                    <span className="text-[10px] text-primary/90 font-medium italic break-words leading-tight" title={item.customization}>
                      ↳ {item.customization}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-semibold px-2 text-sm">-</span>
        )}
      </td>

      {/* Amount & Tax Exemptions */}
      <td className="py-4 pr-2">
        {hasItems ? (
          <div className="flex flex-col space-y-1.5 min-w-[120px]">
            <div className="text-sm font-black font-mono text-foreground">
              ₹{((ord.totalAmount || 0) / 100).toFixed(2)}
            </div>

            {/* GST Exemption Button */}
            {ord.isGstExempt ? (
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  No GST
                </span>
                <button
                  type="button"
                  onClick={() => onToggleGstExemption?.(ord.orderId, false)}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                  title="Restore GST calculation"
                >
                  Restore
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onToggleGstExemption?.(ord.orderId, true)}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-all w-fit cursor-pointer flex items-center space-x-1"
                title="Remove GST for items with GST-adjusted prices (Chai, Samosa, etc.)"
              >
                <span>Remove GST</span>
              </button>
            )}

            {/* Service Tax Exemption Button */}
            {showServTax && (
              ord.isServiceTaxExempt ? (
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                    No Serv Tax
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleServiceTaxExemption?.(ord.orderId, false)}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                    title="Restore Service Tax calculation"
                  >
                    Restore
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleServiceTaxExemption?.(ord.orderId, true)}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded-lg transition-all w-fit cursor-pointer flex items-center space-x-1"
                  title="Remove Service Tax from order"
                >
                  <span>Remove Serv Tax</span>
                </button>
              )
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-semibold px-2 text-sm">-</span>
        )}
      </td>

      {/* Status Selector */}
      <td className="py-4 pr-2">
        {hasItems ? (
          <select
            value={ord.orderStatus}
            disabled={ord.orderStatus === 'served' || ord.orderStatus === 'cancelled'}
            onChange={(e) => {
              e.stopPropagation();
              const val = e.target.value;
              if (val === 'cancelled') {
                onRequestCancel?.(ord);
              } else {
                onStatusChange?.(ord.orderId, val);
              }
            }}
            className={`text-xs font-black uppercase px-3.5 py-2.5 rounded-xl border focus:outline-none w-fit shadow-sm tracking-wide ${
              ord.orderStatus === 'placed'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 cursor-pointer'
                : ord.orderStatus === 'cooking'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 cursor-pointer'
                  : ord.orderStatus === 'served'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-not-allowed opacity-90'
                    : ord.orderStatus === 'cancelled'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 cursor-not-allowed opacity-90'
                      : 'bg-muted-foreground/15 text-muted-foreground border-border/30'
            }`}
          >
            {ord.orderStatus === 'placed' && (
              <option value="placed" className="bg-card text-foreground">Placed</option>
            )}
            {(ord.orderStatus === 'placed' || ord.orderStatus === 'cooking') && (
              <option value="cooking" className="bg-card text-foreground">Accepted & Preparing</option>
            )}
            <option value="served" className="bg-card text-foreground">Served</option>
            {(ord.orderStatus === 'placed' || ord.orderStatus === 'cancelled') && (
              <option value="cancelled" className="bg-card text-foreground text-red-500 font-bold">Cancel order</option>
            )}
          </select>
        ) : (
          <span className="text-muted-foreground/40 font-semibold px-2 text-sm">-</span>
        )}
      </td>

      {/* Waiter / Assistance Requests */}
      <td className="py-4 pr-2">
        {ord.waiterCallStatus === 'pending' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onServiceWaiter?.(ord.orderId);
            }}
            title="Click to acknowledge request"
            className="group inline-flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/40 text-xs font-black px-3 py-2 rounded-xl shadow-sm transition-all duration-150 select-none cursor-pointer shrink-0 animate-pulse"
            style={{ animationDuration: '1.2s' }}
          >
            {ord.waiterCallOption?.toLowerCase().includes('bill') ? (
              <Receipt className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <Bell className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400 animate-bounce" />
            )}
            <span>
              {ord.waiterCallOption || 'Assistance'}
              {ord.waiterCallCount > 1 ? ` x${ord.waiterCallCount}` : ''}
            </span>
            <CheckCircle className="w-3.5 h-3.5 ml-0.5 text-red-600/70 dark:text-red-400/70 group-hover:text-red-600 transition-colors shrink-0" />
          </button>
        ) : ord.waiterCallStatus === 'serviced' ? (
          <div className="inline-flex items-center gap-1 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit shrink-0 select-none">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span>Serviced</span>
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-semibold px-2">-</span>
        )}
      </td>

      {/* Table Actions / Payment Confirmations */}
      <td className="py-4 pr-2">
        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
          {confirmingPaymentOrderId === ord.orderId ? (
            <div className="flex items-center space-x-2 animate-fade-in whitespace-nowrap bg-muted/40 p-1.5 rounded-xl border border-border/40 shadow-sm" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-black text-foreground uppercase px-1">Via:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPaymentReceived?.(ord.orderId, 'CASH');
                  onSetConfirmingPaymentOrderId?.(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
              >
                <span>💵 Cash</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPaymentReceived?.(ord.orderId, 'UPI');
                  onSetConfirmingPaymentOrderId?.(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
              >
                <span>📱 UPI</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetConfirmingPaymentOrderId?.(null);
                }}
                className="bg-muted hover:bg-muted/80 text-foreground font-bold px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border border-border/40 uppercase"
              >
                ✕
              </button>
            </div>
          ) : (isTakeout || ord.tableStatus === 'close_table') ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetConfirmingPaymentOrderId?.(ord.orderId);
              }}
              className="bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-black uppercase px-4 py-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm w-fit shrink-0 tracking-wide"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shrink-0 animate-ping" />
              Mark As Received
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTable?.(ord.orderId);
              }}
              disabled={ord.orderStatus !== 'served' && (ord.items && ord.items.length > 0)}
              className={`text-xs font-black uppercase px-4 py-2.5 rounded-xl border transition-all shadow-sm shrink-0 w-fit cursor-pointer tracking-wide ${
                (ord.orderStatus === 'served' || (!ord.items || ord.items.length === 0))
                  ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20'
                  : 'bg-muted text-muted-foreground border-border/40 opacity-50 cursor-not-allowed'
              }`}
            >
              Clear Table
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
