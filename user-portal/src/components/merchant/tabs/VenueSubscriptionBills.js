'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Receipt,
  Eye,
  FileText,
  Building,
  RefreshCw
} from 'lucide-react';
import { config } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOutletStore } from '@/stores/useOutletStore';
import MerchantInvoiceModal from '../modals/MerchantInvoiceModal';

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
            Monthly service subscription statements, order commissions, and official payment records issued by DigiAds.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInvoices}
          disabled={loading}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Bills</span>
        </button>
      </div>

      {/* Bill Table or Empty State */}
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
        <div className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border/80 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 pl-5">Bill #</th>
                  <th className="p-3.5">Invoice Number</th>
                  <th className="p-3.5">Billing Cycle</th>
                  <th className="p-3.5">Plan Model</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {invoices.map((inv, index) => {
                  const isPaid = inv.status === 'paid';
                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(inv)}
                    >
                      <td className="p-3.5 pl-5 text-muted-foreground font-mono">
                        {index + 1}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(inv.cycleStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {' — '}
                        {new Date(inv.cycleEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3.5 text-foreground capitalize">
                        {inv.billingModel?.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-foreground">
                        ₹{inv.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div
                          className="flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(inv)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                            title="View statement & payment details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
