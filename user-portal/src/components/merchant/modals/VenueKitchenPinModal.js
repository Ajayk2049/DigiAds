'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Key, RefreshCw, Copy, Check, Tv, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOutletStore } from '@/stores/useOutletStore';

export default function VenueKitchenPinModal() {
  const { token } = useAuthStore();
  const { showKitchenPinModal, activeKitchenVenue, closeKitchenPinModal } = useOutletStore();

  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [pin, setPin] = useState(null);
  const [activeStations, setActiveStations] = useState([]);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const venueId = activeKitchenVenue?._id;

  useEffect(() => {
    if (!showKitchenPinModal || !venueId) return;

    let mounted = true;
    setLoading(true);
    axios.get(`${config.apiUrl}/host/venues/${venueId}/kitchen-config`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!mounted) return;
        setPin(res.data.kitchenConfig?.pin || null);
        setActiveStations(res.data.kitchenConfig?.activeStations || []);
      })
      .catch(err => {
        toast.error('Failed to load kitchen settings');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [showKitchenPinModal, venueId, token]);

  if (!showKitchenPinModal || !activeKitchenVenue) return null;

  const handleGenerateOrRotate = async () => {
    setRotating(true);
    try {
      const res = await axios.post(`${config.apiUrl}/host/venues/${venueId}/kitchen-pin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPin(res.data.pin);
      setActiveStations(res.data.activeStations || []);
      toast.success(pin ? 'Kitchen PIN rotated successfully' : 'Kitchen PIN generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rotate PIN');
    } finally {
      setRotating(false);
    }
  };

  const handleRevokeStation = async (stationId) => {
    if (!confirm('Revoke access for this kitchen station? It will immediately disconnect.')) return;
    setRevokingId(stationId);
    try {
      const res = await axios.delete(`${config.apiUrl}/host/venues/${venueId}/kitchen-stations/${stationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveStations(res.data.activeStations || []);
      toast.success('Station revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke station');
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  const kdsUrl = typeof window !== 'undefined' ? `${window.location.origin}/kitchen` : '/kitchen';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-card">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Tv className="w-5 h-5 text-[#0069a8]" />
            </div>
            <div>
              <h3 className="font-outfit text-base font-bold text-foreground">Kitchen Display Settings</h3>
              <p className="text-xs text-muted-foreground">{activeKitchenVenue.outletName || activeKitchenVenue.businessName}</p>
            </div>
          </div>
          <button onClick={closeKitchenPinModal} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-foreground">
          {/* PIN Card */}
          <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Access PIN</span>
              <button
                onClick={handleGenerateOrRotate}
                disabled={rotating}
                className="flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
                <span>{pin ? 'Rotate PIN' : 'Generate PIN'}</span>
              </button>
            </div>

            {loading ? (
              <div className="py-4 text-center text-muted-foreground font-medium">Loading PIN details...</div>
            ) : pin ? (
              <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border">
                <div className="font-mono text-2xl font-black tracking-widest text-[#0069a8]">
                  {pin.slice(0, 3)}-{pin.slice(3)}
                </div>
                <button
                  onClick={() => copyText(pin, 'pin')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border cursor-pointer"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-muted-foreground text-xs font-medium">No PIN has been generated yet for this venue.</p>
                <button
                  onClick={handleGenerateOrRotate}
                  disabled={rotating}
                  className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90"
                >
                  Generate First PIN
                </button>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Chefs enter this 6-digit PIN on the Kitchen Display tablet or screen. Each login attempt prompts an admin approval modal before granting access.
            </p>
          </div>

          {/* Station URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Kitchen Display URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={kdsUrl}
                className="w-full bg-card px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground select-all"
              />
              <button
                onClick={() => copyText(kdsUrl, 'url')}
                className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border shrink-0 font-medium"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Connected Stations */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Authorized Active Stations</span>
            {activeStations.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
                No active kitchen stations connected.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
                {activeStations.map(station => (
                  <div key={station.stationId} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground text-xs">{station.stationName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {station.ip} • Approved {station.approvedAt ? new Date(station.approvedAt).toLocaleDateString() : 'Active'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeStation(station.stationId)}
                      disabled={revokingId === station.stationId}
                      className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Revoke Station Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-card">
          <button
            onClick={closeKitchenPinModal}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
