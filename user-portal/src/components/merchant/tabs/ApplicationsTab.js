'use client';

import React from 'react';
import { Lock, Send } from 'lucide-react';
import LocationPicker from '../../LocationPicker';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ApplicationsTab(props) {
  const outlet = useOutletStore();
  const auth = useAuthStore();

  const form = props.form ?? outlet.form;
  const setForm = props.setForm ?? outlet.setForm;
  const zipError = props.zipError ?? outlet.zipError;
  const detectingGps = props.detectingGps ?? outlet.detectingGps;
  const loading = props.loading ?? outlet.applyLoading;

  const handleHostApply = props.handleHostApply ?? ((e) => outlet.handleHostApply(e, auth.token));
  const handleZipCodeChange = props.handleZipCodeChange ?? outlet.handleZipCodeChange;
  const handleDetectGps = props.handleDetectGps ?? outlet.handleDetectGps;
  const handlePhoneChange = props.handlePhoneChange ?? outlet.handlePhoneChange;
  const handleQuantityChange = props.handleQuantityChange ?? outlet.handleQuantityChange;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Host Applications</h1>
      <p className="text-muted-foreground text-xs font-semibold mb-8">Submit forms to host new tablet or screen devices at your restaurant.</p>

      {/* Submission Form */}
      <div className="p-6 rounded-2xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)]">
        <h3 className="font-outfit text-md font-bold text-foreground mb-6">Device Application Form</h3>
        <form onSubmit={handleHostApply} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                required
                placeholder="Outlet Name"
                value={form.outletName || ''}
                onChange={(e) => setForm({ ...form, outletName: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div>
              <input
                type="text"
                required
                placeholder="Contact Person Name"
                value={form.contactPerson || ''}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <textarea
              required
              placeholder="Outlet Description"
              value={form.outletDescription || ''}
              onChange={(e) => setForm({ ...form, outletDescription: e.target.value })}
              className="w-full h-24 bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                required
                placeholder="Door / Shop No"
                value={form.doorNo || ''}
                onChange={(e) => setForm({ ...form, doorNo: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="text"
                required
                placeholder="Street / Location"
                value={form.street || ''}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                required
                placeholder="ZIP Code"
                value={form.zipCode || ''}
                onChange={(e) => handleZipCodeChange(e.target.value)}
                className={`w-full bg-background border ${zipError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'} rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:border-transparent transition-all`}
              />
              {zipError && (
                <p className="text-[10px] text-destructive font-semibold mt-1.5 ml-1">{zipError}</p>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                placeholder="City (Auto-filled)"
                value={form.city || ''}
                className="w-full bg-muted/40 border border-input rounded-xl pl-4 pr-9 py-3 text-xs font-semibold text-foreground focus:outline-none cursor-not-allowed select-none transition-all placeholder:text-muted-foreground/70"
              />
              <span className="absolute right-3 top-3.5 text-muted-foreground/60" title="Auto-filled from PIN Code">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                placeholder="State (Auto-filled)"
                value={form.state || ''}
                className="w-full bg-muted/40 border border-input rounded-xl pl-4 pr-9 py-3 text-xs font-semibold text-foreground focus:outline-none cursor-not-allowed select-none transition-all placeholder:text-muted-foreground/70"
              />
              <span className="absolute right-3 top-3.5 text-muted-foreground/60" title="Auto-filled from PIN Code">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Storefront GPS & Map Verification */}
          <LocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={({ latitude, longitude }) => setForm(prev => ({ ...prev, latitude, longitude }))}
            onDetectGps={handleDetectGps}
            isDetectingGps={detectingGps}
            addressHint={`${form.doorNo || ''} ${form.street || ''}, ${form.city || ''}`}
            title="Storefront GPS & Map Placement"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="tel"
                required
                placeholder="Phone"
                value={form.phone || ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Multi-Device selection space */}
          <div className="space-y-3 border-t border-border/60 pt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Devices to Host</span>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Tablet Checkbox and qty */}
              <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requestTablet || false}
                    onChange={(e) => setForm({ ...form, requestTablet: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Tabletop Ordering Tablet</span>
                </label>
                {form.requestTablet && (
                  <input
                    type="text"
                    required
                    placeholder="Quantity of Tablets"
                    value={form.tabletQuantity || ''}
                    onChange={(e) => handleQuantityChange('tabletQuantity', e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                )}
              </div>

              {/* Screen Checkbox and qty */}
              <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requestScreen || false}
                    onChange={(e) => setForm({ ...form, requestScreen: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Large Wall Display Screen</span>
                </label>
                {form.requestScreen && (
                  <input
                    type="text"
                    required
                    placeholder="Quantity of Screens"
                    value={form.screenQuantity || ''}
                    onChange={(e) => handleQuantityChange('screenQuantity', e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Venue Ad Mode Choice Section */}
          <div className="space-y-3 border-t border-border/60 pt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Current Venue Ad Mode</span>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  form.allowOpenAds !== false
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {form.allowOpenAds !== false ? 'OPEN ADS MODE' : 'CLOSED / PRIVATE MODE'}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  {form.allowOpenAds !== false
                    ? 'Third-party brand advertisements enabled.'
                    : 'Exclusive venue promos only. Third-party brand ads disabled.'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground italic font-semibold">
                To request a mode transition, click &quot;Request Mode Change&quot; under In-House Venue Promos.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg glow-hover cursor-pointer mt-4"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Submitting...' : 'Submit Host Application'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
