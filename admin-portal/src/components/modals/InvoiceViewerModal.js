'use client';

import React, { useState } from 'react';
import { X, Download, Copy, Check, QrCode, Building, Calendar, ShieldCheck } from 'lucide-react';
import QrCodeView from '@/components/common/QrCodeView';
import { toast } from 'sonner';
import { exportVenueInvoiceExcel } from '@/utils/exportVenueInvoiceExcel';
import useModalDismiss from '@/hooks/useModalDismiss';

export default function InvoiceViewerModal({ invoice, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useModalDismiss(isOpen && Boolean(invoice), onClose, 'invoice-viewer-modal');

  if (!isOpen || !invoice) return null;

  const handleCopyUpi = () => {
    if (invoice.upiDetails?.upiId) {
      navigator.clipboard.writeText(invoice.upiDetails.upiId);
      setCopied(true);
      toast.success('UPI ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportVenueInvoiceExcel(invoice);
      toast.success('Excel statement downloaded successfully');
    } catch {
      toast.error('Failed to export Excel statement');
    } finally {
      setIsExporting(false);
    }
  };

  const isPaid = invoice.status === 'paid';
  const isOrderBased = invoice.billingModel === 'order_percentage' || invoice.billingModel === 'order_flat';
  const totalOrders = invoice.metrics?.totalOrdersCount ?? (invoice.ordersBreakdown?.length || 0);
  let orderValueRupees = 0;
  if (invoice.metrics?.totalOrdersValuePaise) {
    orderValueRupees = Math.round(invoice.metrics.totalOrdersValuePaise / 100);
  } else if (invoice.ordersBreakdown?.length) {
    orderValueRupees = invoice.ordersBreakdown.reduce((sum, ord) => sum + (ord.orderValueRupees || 0), 0);
  }

  let rateDisplay = '';
  if (invoice.billingModel === 'order_percentage') {
    const pct = invoice.rateConfig?.orderPercentageRate ?? invoice.items?.[0]?.rate ?? 0;
    rateDisplay = `${pct}%`;
  } else if (invoice.billingModel === 'order_flat') {
    const flat = invoice.rateConfig?.flatPerOrderRate ?? invoice.items?.[0]?.rate ?? 0;
    rateDisplay = `₹${Number(flat).toFixed(2)}/order`;
  } else {
    rateDisplay = `₹${Number(invoice.items?.[0]?.rate || 0).toLocaleString('en-IN')}`;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center space-x-2">
            <span className="font-outfit font-bold text-base text-foreground">
              Tax Invoice — {invoice.invoiceNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isPaid
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {isPaid ? 'Paid' : 'Issued'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="Download Excel spreadsheet with order breakdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-foreground bg-background">
          {/* Header Strip */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
            <div>
              <div className="font-outfit text-2xl font-black text-primary tracking-tight">
                Digi<span className="text-accent">Ads</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium pt-1">
                AIBotInk Private Limited • Tabletop Ordering & Ad Network
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs font-mono font-bold text-muted-foreground uppercase">
                Invoice Number
              </div>
              <div className="text-lg font-mono font-black text-foreground">
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block mb-1 flex items-center gap-1.5">
                <Building className="w-3 h-3 text-primary" /> Billed To (Venue)
              </span>
              <div className="text-sm font-bold text-foreground">{invoice.outletName}</div>
              <div className="text-muted-foreground">Mode: <span className="font-bold uppercase text-foreground">{invoice.adMode} Ads</span></div>
              <div className="text-muted-foreground">Billing Model: <span className="font-semibold text-foreground">{invoice.billingModel?.replace('_', ' ')}</span></div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5 text-left sm:text-right">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block mb-1 flex items-center sm:justify-end gap-1.5">
                <Calendar className="w-3 h-3 text-primary" /> Billing Period
              </span>
              <div className="font-semibold text-foreground">
                {new Date(invoice.cycleStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(invoice.cycleEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-muted-foreground">
                Issue Date: <span className="font-medium text-foreground">{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="text-muted-foreground">
                Due Date: <span className="font-bold text-foreground">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Plan, Rate, QR & Total Payable (Merged Unified Section) */}
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            {/* Plan / Breakdown Table */}
            {isOrderBased ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3.5 pl-5">Total Orders</th>
                    <th className="p-3.5 text-right">Order Value</th>
                    <th className="p-3.5 text-right">Rate</th>
                    <th className="p-3.5 pr-5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3.5 pl-5 font-mono font-bold text-foreground">
                      {totalOrders} Orders
                    </td>
                    <td className="p-3.5 text-right font-mono text-foreground">
                      ₹{orderValueRupees.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-mono text-foreground font-semibold">
                      {rateDisplay}
                    </td>
                    <td className="p-3.5 pr-5 text-right font-mono font-bold text-foreground">
                      ₹{Number(invoice.subtotal || invoice.totalAmount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3.5 pl-5">Hardware Item</th>
                    <th className="p-3.5 text-center">Device Count</th>
                    <th className="p-3.5 text-right">Rate</th>
                    <th className="p-3.5 pr-5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-3.5 pl-5 font-semibold text-foreground">{item.description}</td>
                      <td className="p-3.5 text-center text-muted-foreground">{item.quantity} Units</td>
                      <td className="p-3.5 text-right font-mono text-muted-foreground">
                        ₹{Number(item.rate).toLocaleString('en-IN')}/unit
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold text-foreground">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Merged Footer: QR Code (Left) + Total Payable (Right) */}
            <div className="border-t border-border bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Payment QR Box */}
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="shrink-0 bg-white p-1 rounded-xl border border-border shadow-sm">
                  <QrCodeView value={invoice.upiDetails?.qrString} size={90} />
                </div>
                <div className="space-y-1 text-left min-w-0">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-primary" />
                    <span>Scan & Pay via UPI</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Scan with GPay, PhonePe, Paytm or any UPI app
                  </p>
                  <div className="inline-flex items-center gap-1.5 pt-0.5 max-w-full">
                    <span className="font-mono text-[11px] font-bold text-foreground bg-background px-2 py-0.5 rounded-lg border border-border truncate">
                      {invoice.upiDetails?.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Payee: <strong className="text-foreground">{invoice.upiDetails?.payeeName || 'AIBotInk Pvt Ltd'}</strong>
                  </div>
                </div>
              </div>

              {/* Total Payable Summary */}
              <div className="w-full sm:w-auto sm:text-right space-y-1.5 border-t sm:border-t-0 border-border/60 pt-3 sm:pt-0">
                <div className="flex sm:justify-end items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{Number(invoice.subtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex sm:justify-end items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span>Taxes / GST:</span>
                    <span className="font-mono font-semibold text-foreground">
                      ₹{Number(invoice.taxAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex sm:justify-end items-baseline justify-between gap-4 border-t border-border/80 pt-1.5">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Total Payable</span>
                  <span className="text-2xl font-mono font-black text-primary">
                    ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Paid on {new Date(invoice.paidAt || Date.now()).toLocaleDateString('en-IN')}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Due by <strong className="text-foreground font-semibold">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
