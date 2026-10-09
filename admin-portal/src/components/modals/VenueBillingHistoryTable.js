'use client';

import React from 'react';
import { Eye, Check } from 'lucide-react';

export default function VenueBillingHistoryTable({
  invoices = [],
  invoicesLoading = false,
  onViewInvoice,
  handleMarkPaid
}) {
  if (invoicesLoading) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        Loading invoice history...
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">
        No invoices generated for this venue yet. Switch to &quot;Generate Bill&quot; to issue the first invoice.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
          <tr>
            <th className="p-3">Invoice #</th>
            <th className="p-3">Billing Period</th>
            <th className="p-3">Model</th>
            <th className="p-3 text-right">Amount</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {invoices.map((inv) => (
            <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 font-mono font-bold text-foreground">
                {inv.invoiceNumber}
              </td>
              <td className="p-3 text-muted-foreground">
                {new Date(inv.cycleStartDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short'
                })}
                {' - '}
                {new Date(inv.cycleEndDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="p-3 text-muted-foreground capitalize">
                {inv.billingModel?.replace('_', ' ')}
              </td>
              <td className="p-3 text-right font-mono font-bold text-foreground">
                ₹{inv.totalAmount?.toLocaleString('en-IN')}
              </td>
              <td className="p-3 text-center">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    inv.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {inv.status === 'paid' ? 'Paid' : 'Issued'}
                </span>
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => onViewInvoice && onViewInvoice(inv)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center space-x-1 cursor-pointer transition-colors"
                    title="View bill details & orders statement"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Details</span>
                  </button>
                  {inv.status !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid && handleMarkPaid(inv._id)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                      title="Mark as Paid"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark Paid</span>
                    </button>
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
