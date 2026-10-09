'use client';

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  QrCode
} from 'lucide-react';

export default function VenueBillingCreateForm({
  cycleStartDate,
  setCycleStartDate,
  cycleEndDate,
  setCycleEndDate,
  dueDate,
  setDueDate,
  billingModel,
  setBillingModel,
  rateConfig,
  setRateConfig,
  upiId,
  setUpiId,
  payeeName,
  setPayeeName,
  preview,
  previewLoading,
  handlePreview,
  createLoading,
  handleGenerateInvoice,
  onClose
}) {
  return (
    <div className="space-y-6">
      {/* 1. Receiver UPI Payment Details (Embedded in QR) */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-primary" />
          <span>Receiver UPI Payment Details (Embedded in QR)</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Destination UPI ID (VPA)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. merchant@okhdfcbank"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Payee Name</label>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g. Business Name"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* 2. Plan Model Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-foreground">Select Subscription Plan Model</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { id: 'device_based', label: '📱 Device-Based', desc: 'Rent per active tablet & screen' },
            { id: 'order_flat', label: '🧾 Flat ₹ per Order', desc: 'Fixed Rupees for each completed order' },
            { id: 'order_percentage', label: '📈 % on Orders', desc: 'Percentage cut of gross order volume' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setBillingModel(m.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                billingModel === m.id
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="font-bold text-xs text-foreground">{m.label}</div>
              <div className="text-[11px] text-muted-foreground pt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cycle Date Range */}
      <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Cycle Start Date
          </label>
          <input
            type="date"
            value={cycleStartDate}
            onChange={(e) => setCycleStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Cycle End Date
          </label>
          <input
            type="date"
            value={cycleEndDate}
            onChange={(e) => setCycleEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Payment Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      </div>

      {/* 4. Plan Rate Configuration */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
        <div className="text-xs font-bold text-foreground">Plan Rate Configuration</div>
        {billingModel === 'device_based' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Tablet Rate (₹/tablet/mo)</label>
              <input
                type="number"
                value={rateConfig.tabletRate}
                onChange={(e) => setRateConfig({ ...rateConfig, tabletRate: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Screen Rate (₹/screen/mo)</label>
              <input
                type="number"
                value={rateConfig.screenRate}
                onChange={(e) => setRateConfig({ ...rateConfig, screenRate: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>
        )}

        {billingModel === 'order_flat' && (
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Rate per Completed Order (₹)</label>
            <input
              type="number"
              step="0.5"
              value={rateConfig.flatPerOrderRate}
              onChange={(e) => setRateConfig({ ...rateConfig, flatPerOrderRate: Number(e.target.value) })}
              className="w-full sm:w-1/2 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>
        )}

        {billingModel === 'order_percentage' && (
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Percentage Cut on Gross Volume (%)</label>
            <input
              type="number"
              step="0.1"
              value={rateConfig.orderPercentageRate}
              onChange={(e) => setRateConfig({ ...rateConfig, orderPercentageRate: Number(e.target.value) })}
              className="w-full sm:w-1/2 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>
        )}
      </div>

      {/* 5. Live Calculation Preview (Tablets, Screens, Orders, and Total Bill) */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Live Calculation Preview</span>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>

        {preview && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
              <div className="p-2 rounded bg-background border border-border">
                <span className="text-[10px] uppercase block">Tablets:</span>
                <strong className="text-foreground text-sm">{preview.metrics.tabletCount}</strong>
              </div>
              <div className="p-2 rounded bg-background border border-border">
                <span className="text-[10px] uppercase block">Screens:</span>
                <strong className="text-foreground text-sm">{preview.metrics.screenCount}</strong>
              </div>
              <div className="p-2 rounded bg-background border border-border">
                <span className="text-[10px] uppercase block">Cycle Orders:</span>
                <strong className="text-foreground text-sm">{preview.metrics.totalOrdersCount}</strong>
              </div>
              <div className="p-2 rounded bg-background border border-border">
                <span className="text-[10px] uppercase block">Order Volume:</span>
                <strong className="text-foreground text-sm">
                  ₹{Math.round(preview.metrics.totalOrdersValuePaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="divide-y divide-border/60 border-t border-border pt-2">
              {preview.items?.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between text-muted-foreground">
                  <span>{it.description}</span>
                  <span className="font-semibold text-foreground">₹{it.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm font-extrabold text-foreground border-t border-border pt-2">
              <span>Total Amount to Bill:</span>
              <span className="text-lg text-primary font-mono">
                ₹{preview.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleGenerateInvoice}
          disabled={createLoading || !preview}
          className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{createLoading ? 'Generating...' : 'Generate & Issue Bill'}</span>
        </button>
      </div>
    </div>
  );
}
