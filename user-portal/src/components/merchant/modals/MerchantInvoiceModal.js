'use client';

import React, { useState } from 'react';
import { X, Download, Copy, Check, QrCode, Building, Calendar, ShieldCheck } from 'lucide-react';
import QrCodeView from '../common/QrCodeView';
import { exportVenueInvoiceExcel } from '@/utils/exportVenueInvoiceExcel';

export default function MerchantInvoiceModal({ invoice, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleCopyUpi = () => {
    if (invoice.upiDetails?.upiId) {
      navigator.clipboard.writeText(invoice.upiDetails.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportVenueInvoiceExcel(invoice);
    } finally {
      setIsExporting(false);
    }
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center space-x-2">
            <span className="font-outfit font-bold text-base text-foreground">
              DigiAds Bill & Statement — {invoice.invoiceNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isPaid
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {isPaid ? 'Paid' : 'Unpaid / Due'}
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
                Digi<span className="text-foreground">Ads</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium pt-1">
                DigiAds Media Private Limited • Tabletop Ordering & Ad Network
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
          <div className="grid sm:grid-cols-2 gap-6 text-xs">
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

          {/* Line Items Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3">Plan / Description</th>
                  <th className="p-3 text-center">Qty / Count</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-semibold text-foreground">{item.description}</td>
                    <td className="p-3 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="p-3 text-right text-muted-foreground">₹{Number(item.rate).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-foreground">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Itemized Orders Breakdown (if order-based plan) */}
          {invoice.ordersBreakdown && invoice.ordersBreakdown.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/40 px-3.5 py-2.5 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-2">
                  <span>Itemized Orders Breakdown</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {invoice.ordersBreakdown.length} Orders
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Cycle Statement
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border sticky top-0">
                    <tr>
                      <th className="p-2.5 pl-3">Order ID</th>
                      <th className="p-2.5">Table / Service</th>
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5 text-right">Order Value</th>
                      <th className="p-2.5 pr-3 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                    {invoice.ordersBreakdown.map((ord, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 pl-3 font-bold text-foreground">{ord.orderId}</td>
                        <td className="p-2.5 text-muted-foreground font-sans">{ord.tableNumber || 'Takeout'}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(ord.orderDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2.5 text-right text-foreground">₹{ord.orderValueRupees?.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 pr-3 text-right font-bold text-primary">₹{Number(ord.commissionAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals & Payment Section */}
          <div className="grid sm:grid-cols-12 gap-6 items-center pt-2">
            {/* Scannable Payment QR Code */}
            <div className="sm:col-span-7 p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0">
                <QrCodeView value={invoice.upiDetails?.qrString} size={130} />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1">
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  <span>Scan & Pay via UPI</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Scan with GPay, PhonePe, Paytm, or any UPI app to settle this bill.
                </p>
                <div className="inline-flex items-center gap-1.5 pt-1">
                  <span className="font-mono text-xs font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                    {invoice.upiDetails?.upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  Payee: {invoice.upiDetails?.payeeName}
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="sm:col-span-5 space-y-2 text-right">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-semibold text-foreground">₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxes / GST:</span>
                  <span className="font-semibold text-foreground">₹{Number(invoice.taxAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-extrabold text-foreground border-t border-border pt-2">
                <span>Total Payable:</span>
                <span className="text-xl text-primary font-mono">
                  ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
              {isPaid && (
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Paid on {new Date(invoice.paidAt || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
