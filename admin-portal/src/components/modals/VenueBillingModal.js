'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { X, FileText, History, Building } from 'lucide-react';
import { config } from '@/config';
import { useAdminStore } from '@/stores/useAdminStore';
import VenueBillingCreateForm from './VenueBillingCreateForm';
import VenueBillingHistoryTable from './VenueBillingHistoryTable';

export default function VenueBillingModal({
  venue,
  isOpen,
  onClose,
  onViewInvoice
}) {
  const token = useAdminStore((s) => s.token);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'

  // Default dates: 1st of current month to today
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [cycleStartDate, setCycleStartDate] = useState(firstDay);
  const [cycleEndDate, setCycleEndDate] = useState(today);
  const [dueDate, setDueDate] = useState(due);

  const isOpenAds = venue?.adMode === 'open' && venue?.allowOpenAds !== false;

  const [billingModel, setBillingModel] = useState('device_based'); // 'device_based' | 'order_flat' | 'order_percentage'
  const [rateConfig, setRateConfig] = useState({
    tabletRate: isOpenAds ? 499 : 899,
    screenRate: 999,
    flatPerOrderRate: isOpenAds ? 2.5 : 5.0,
    orderPercentageRate: isOpenAds ? 1.5 : 3.0
  });

  const [upiId, setUpiId] = useState('digiadspay@hdfcbank');
  const [payeeName, setPayeeName] = useState('DigiAds Media Private Limited');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Fetch past invoices
  const fetchInvoices = useCallback(async () => {
    if (!venue?._id || !token) return;
    try {
      setInvoicesLoading(true);
      const res = await axios.get(`${config.apiUrl}/admin/venues/${venue._id}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
      }
    } catch {
      // Handled silently
    } finally {
      setInvoicesLoading(false);
    }
  }, [venue?._id, token]);

  // Preview calculation
  const handlePreview = useCallback(async () => {
    if (!venue?._id || !token || !cycleStartDate || !cycleEndDate) return;
    try {
      setPreviewLoading(true);
      const res = await axios.post(
        `${config.apiUrl}/admin/venues/${venue._id}/invoices/preview`,
        {
          cycleStartDate,
          cycleEndDate,
          billingModel,
          rateConfig
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPreview(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to calculate billing preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [venue?._id, token, cycleStartDate, cycleEndDate, billingModel, rateConfig]);

  useEffect(() => {
    if (isOpen && venue?._id) {
      fetchInvoices();
      handlePreview();
    }
  }, [isOpen, venue?._id, fetchInvoices, handlePreview]);

  // Generate and save invoice
  const handleGenerateInvoice = async () => {
    if (!upiId.trim()) {
      toast.error('Please enter a valid receiver UPI ID');
      return;
    }
    try {
      setCreateLoading(true);
      const res = await axios.post(
        `${config.apiUrl}/admin/venues/${venue._id}/invoices`,
        {
          cycleStartDate,
          cycleEndDate,
          dueDate,
          billingModel,
          rateConfig,
          upiId: upiId.trim(),
          payeeName: payeeName.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(`Invoice ${res.data.invoice.invoiceNumber} generated successfully!`);
        fetchInvoices();
        if (onViewInvoice) {
          onViewInvoice(res.data.invoice);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setCreateLoading(false);
    }
  };

  // Mark invoice as paid
  const handleMarkPaid = async (invId) => {
    try {
      const res = await axios.put(
        `${config.apiUrl}/admin/invoices/${invId}/status`,
        { status: 'paid' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success('Invoice marked as PAID');
        fetchInvoices();
      }
    } catch {
      toast.error('Failed to update invoice status');
    }
  };

  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2.5">
              <Building className="w-4 h-4 text-primary" />
              <h2 className="font-outfit font-bold text-lg text-foreground">
                Venue Billing & Subscription — {venue.outletName}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isOpenAds
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                }`}
              >
                {venue.adMode || 'open'} Ads Mode
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure billing cycle, choose subscription plan, and issue bill with pre-filled payment QR.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-6 border-b border-border bg-background">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generate Bill</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Past Invoices ({invoices.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'create' ? (
            <VenueBillingCreateForm
              cycleStartDate={cycleStartDate}
              setCycleStartDate={setCycleStartDate}
              cycleEndDate={cycleEndDate}
              setCycleEndDate={setCycleEndDate}
              dueDate={dueDate}
              setDueDate={setDueDate}
              billingModel={billingModel}
              setBillingModel={setBillingModel}
              rateConfig={rateConfig}
              setRateConfig={setRateConfig}
              upiId={upiId}
              setUpiId={setUpiId}
              payeeName={payeeName}
              setPayeeName={setPayeeName}
              preview={preview}
              previewLoading={previewLoading}
              handlePreview={handlePreview}
              createLoading={createLoading}
              handleGenerateInvoice={handleGenerateInvoice}
              onClose={onClose}
            />
          ) : (
            <VenueBillingHistoryTable
              invoices={invoices}
              invoicesLoading={invoicesLoading}
              onViewInvoice={onViewInvoice}
              handleMarkPaid={handleMarkPaid}
            />
          )}
        </div>
      </div>
    </div>
  );
}
