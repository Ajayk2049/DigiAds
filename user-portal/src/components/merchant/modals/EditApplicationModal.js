import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, X, Lock } from 'lucide-react';
import LocationPicker from '../../LocationPicker';
import { normalizeAndMatchState, normalizeCity } from '../common/constants';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';

export default function EditApplicationModal(props) {
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const ui = useUIStore();
  const token = auth.token;

  const isOpen = props.isOpen ?? outlet.showEditApplicationModal;
  const onClose = props.onClose ?? (() => outlet.setShowEditApplicationModal(false));
  const application = props.application ?? (outlet.applications.find(a => a._id === outlet.editingApplicationId) || outlet.applications[0]);
  const loading = props.loading ?? outlet.editAppLoading;
  const error = props.error ?? outlet.editAppError;
  const showToast = props.showToast ?? ui.showToast;
  const onSave = props.onSave ?? (async (updatedForm) => {
    outlet.setEditAppForm(updatedForm);
    await outlet.saveEditedApplication(token);
  });

  const [form, setForm] = useState({
    outletName: '',
    outletDescription: '',
    doorNo: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    allowOpenAds: true,
    adMode: 'open'
  });

  const [zipError, setZipError] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (application) {
      setForm({
        outletName: application.outletName || '',
        outletDescription: application.outletDescription || '',
        doorNo: application.doorNo || '',
        street: application.street || '',
        city: application.city || '',
        state: application.state || '',
        zipCode: application.zipCode || '',
        contactPerson: application.contactPerson || '',
        phone: application.phone || '',
        email: application.email || '',
        latitude: application.latitude || null,
        longitude: application.longitude || null,
        allowOpenAds: application.allowOpenAds !== false,
        adMode: application.adMode || (application.allowOpenAds === false ? 'closed' : 'open')
      });
      setZipError('');
      setLocalError('');
    }
  }, [application, isOpen]);

  if (!isOpen) return null;

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setForm(prev => ({ ...prev, phone: cleaned }));
    }
  };

  const handleZipCodeChange = async (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 6) return;
    setForm(prev => ({ ...prev, zipCode: cleaned }));

    if (cleaned.length < 6) {
      setZipError('');
    }

    if (cleaned.length === 6) {
      try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (response?.data?.[0]?.Status === 'Success') {
          const postOffices = response.data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const { State, District } = postOffices[0];
            const matchedState = normalizeAndMatchState(State);
            const normalizedDistrict = normalizeCity(District || '');
            setForm(prev => ({
              ...prev,
              state: matchedState,
              city: normalizedDistrict || prev.city
            }));
            setZipError('');
          } else {
            setZipError('Wrong pincode');
          }
        } else {
          setZipError('Wrong pincode');
        }
      } catch (err) {
        console.error('Failed to auto-populate location details from pincode:', err);
        setZipError('Wrong pincode');
      }
    }
  };

  const handleDetectGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast?.('Geolocation is not supported by your browser', 'error');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setDetectingGps(false);
        showToast?.(`📍 Exact Store GPS Detected: ${lat}, ${lng}`, 'success');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setDetectingGps(false);
        showToast?.('Unable to detect location. Please check browser location permissions.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (form.phone.length !== 10) {
      setLocalError('Mobile number must be exactly 10 digits');
      return;
    }
    if (form.zipCode.length !== 6) {
      setLocalError('ZIP code must be exactly 6 digits');
      return;
    }
    if (zipError) {
      setLocalError('Please resolve the wrong pincode error before saving');
      return;
    }

    onSave(form);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-outfit text-md font-bold tracking-tight text-foreground">Edit Venue & Application Details</h3>
              <p className="text-[11px] text-muted-foreground font-semibold">Update contact person, mobile number, address or outlet details.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-foreground">
          {displayError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold">
              {displayError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Outlet Name</label>
              <input
                type="text"
                required
                placeholder="Outlet Name"
                value={form.outletName}
                onChange={(e) => setForm({ ...form, outletName: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Contact Person Name</label>
              <input
                type="text"
                required
                placeholder="Contact Person Name"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Outlet Description</label>
            <textarea
              required
              placeholder="Outlet Description"
              value={form.outletDescription}
              onChange={(e) => setForm({ ...form, outletDescription: e.target.value })}
              className="w-full h-20 bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Door / Shop No</label>
              <input
                type="text"
                required
                placeholder="Door / Shop No"
                value={form.doorNo}
                onChange={(e) => setForm({ ...form, doorNo: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Street / Location</label>
              <input
                type="text"
                required
                placeholder="Street / Location"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">ZIP Code</label>
              <input
                type="text"
                required
                placeholder="ZIP Code"
                value={form.zipCode}
                onChange={(e) => handleZipCodeChange(e.target.value)}
                className={`w-full bg-background border ${zipError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'} rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 transition-all`}
              />
              {zipError && (
                <p className="text-[10px] text-destructive font-semibold mt-1.5 ml-1">{zipError}</p>
              )}
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">City</label>
                <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Auto-filled
                </span>
              </div>
              <input
                type="text"
                readOnly
                placeholder="City (Auto-filled from PIN)"
                value={form.city}
                className="w-full bg-muted/40 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none cursor-not-allowed select-none transition-all"
              />
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">State</label>
                <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Auto-filled
                </span>
              </div>
              <input
                type="text"
                readOnly
                placeholder="State (Auto-filled from PIN)"
                value={form.state}
                className="w-full bg-muted/40 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none cursor-not-allowed select-none transition-all"
              />
            </div>
          </div>

          {/* Storefront GPS & Map Verification */}
          <LocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={({ latitude, longitude }) => setForm(prev => ({ ...prev, latitude, longitude }))}
            onDetectGps={handleDetectGps}
            isDetectingGps={detectingGps}
            addressHint={`${form.doorNo} ${form.street}, ${form.city}`}
            title="Storefront GPS & Map Placement"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Venue Ad Mode Choice Section */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Venue Ad Mode & Service Plan</span>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Open Ads Mode Option */}
              <div
                onClick={() => setForm({ ...form, allowOpenAds: true, adMode: 'open' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${form.allowOpenAds !== false
                  ? 'bg-blue-500/10 border-blue-500/80 shadow-md ring-1 ring-blue-500/50'
                  : 'bg-background/50 border-border/40 hover:border-border'
                  }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <input
                    type="radio"
                    name="editAdMode"
                    checked={form.allowOpenAds !== false}
                    onChange={() => setForm({ ...form, allowOpenAds: true, adMode: 'open' })}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Open Ads Mode</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                  Accept third-party brand advertisements on kiosk screens. Qualifies your venue for discounted/free hardware & SaaS platform tier.
                </p>
              </div>

              {/* Closed / Private Mode Option */}
              <div
                onClick={() => setForm({ ...form, allowOpenAds: false, adMode: 'closed' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${form.allowOpenAds === false
                  ? 'bg-purple-500/10 border-purple-500/80 shadow-md ring-1 ring-purple-500/50'
                  : 'bg-background/50 border-border/40 hover:border-border'
                  }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <input
                    type="radio"
                    name="editAdMode"
                    checked={form.allowOpenAds === false}
                    onChange={() => setForm({ ...form, allowOpenAds: false, adMode: 'closed' })}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Closed / Private Mode</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                  Exclusive internal venue usage only (digital menu & in-house promos). Excludes third-party ads (Private SaaS Tier).
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-border/40">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
