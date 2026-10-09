'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Receipt,
  QrCode,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Building,
  RefreshCw,
  Download
} from 'lucide-react';
import { config } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOutletStore } from '@/stores/useOutletStore';
import QrCodeView from '../common/QrCodeView';
import MerchantInvoiceModal from '../modals/MerchantInvoiceModal';
import { exportVenueInvoiceExcel } from '@/utils/exportVenueInvoiceExcel';

export default function VenueSubscriptionBills() {
  const token = useAuthStore((s) => s.token);
  const selectedOutletId = useOutletStore((s) => s.selectedOutletId);
  const applications = useOutletStore((s) => s.applications);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const effectiveOutletId = selectedOutletId || applications[0]?._id;
  const activeVenue = applications.find((a) => String(a._id) === String(effectiveOutletId));

  const fetchInvoices = useCallback(async () => {
    if (!effectiveOutletId || !token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${config.apiUrl}/host/venues/${effectiveOutletId}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setInvoices(res.data.invoices || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, [effectiveOutletId, token]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOpenDetail = (inv) => {
    setSelectedInvoice(inv);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Outlet context bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-primary" />
            <span className="font-outfit font-bold text-base text-foreground">
              {activeVenue?.outletName || 'Your Venue'} — Platform Bills
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Monthly service subscription statements, order commissions, and official payment QR codes issued by DigiAds.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInvoices}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Bills</span>
        </button>
      </div>

      {/* Bill List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground font-semibold">
          Loading subscription bills...
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/30 p-8 space-y-3">
          <Receipt className="w-10 h-10 text-muted-foreground/60 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No Bills Issued Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            DigiAds platform subscription bills for this outlet will appear here once generated for the current billing cycle.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {invoices.map((inv) => {
            const isPaid = inv.status === 'paid';
            const isOrderBased = inv.billingModel?.startsWith('order');

            return (
              <div
                key={inv._id}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Invoice Reference
                      </span>
                      <span className="font-mono font-black text-sm text-foreground">
                        {inv.invoiceNumber}
                      </span>
                    </div>

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

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" /> Period
                      </span>
                      <span className="font-medium text-foreground text-[11px]">
                        {new Date(inv.cycleStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {' - '}
                        {new Date(inv.cycleEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary" /> Plan Model
                      </span>
                      <span className="font-medium text-foreground text-[11px] capitalize">
                        {inv.billingModel?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Activity Summary Badge */}
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between px-1">
                    <span>
                      {isOrderBased ? (
                        <>Cycle Activity: <strong className="text-foreground">{inv.metrics?.totalOrdersCount || 0} Orders</strong></>
                      ) : (
                        <>Active Hardware: <strong className="text-foreground">{inv.metrics?.tabletCount || 0} Tablets</strong>, <strong className="text-foreground">{inv.metrics?.screenCount || 0} Screens</strong></>
                      )}
                    </span>
                    <span>Due: <strong className="text-foreground">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</strong></span>
                  </div>

                  {/* Pay QR Box (if unpaid) */}
                  {!isPaid && inv.upiDetails?.qrString && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                      <div className="shrink-0 bg-white p-1 rounded-lg border border-border/50">
                        <QrCodeView value={inv.upiDetails.qrString} size={70} />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-primary" />
                          <span>Pay ₹{inv.totalAmount?.toLocaleString('en-IN')} via UPI</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Scan with any UPI app to pay directly.
                        </p>
                        <span className="font-mono text-[10px] font-bold text-primary block truncate">
                          {inv.upiDetails.upiId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Total Bill
                    </span>
                    <span className="font-mono text-base font-black text-foreground">
                      ₹{inv.totalAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => exportVenueInvoiceExcel(inv)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground flex items-center space-x-1 transition-all cursor-pointer"
                      title="Download Excel statement"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(inv)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Viewer Modal */}
      <MerchantInvoiceModal
        invoice={selectedInvoice}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
