import React, { useState } from 'react';
import { Tablet, X } from 'lucide-react';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function GetMoreDevicesModal(props) {
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;

  const currentApp = outlet.applications.find(a => a._id === outlet.selectedOutletId);
  const isOpen = props.isOpen ?? outlet.showGetMoreDevicesModal;
  const onClose = props.onClose ?? (() => outlet.setShowGetMoreDevicesModal(false));
  const outletName = props.outletName ?? (currentApp?.outletName || currentApp?.businessName || 'Venue');
  const loading = props.loading ?? outlet.reqDeviceLoading;
  const error = props.error ?? outlet.reqDeviceError;
  const onSubmit = props.onSubmit ?? ((deviceData) => outlet.submitRequestMoreDevices(token, deviceData));

  const [requestTablet, setRequestTablet] = useState(false);
  const [tabletQuantity, setTabletQuantity] = useState('');
  const [requestScreen, setRequestScreen] = useState(false);
  const [screenQuantity, setScreenQuantity] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestTablet && !requestScreen) {
      setLocalError('Please select at least one device type (Tablet or Screen).');
      return;
    }
    if (requestTablet && (!tabletQuantity || parseInt(tabletQuantity, 10) < 1)) {
      setLocalError('Please enter a valid quantity for tablets.');
      return;
    }
    if (requestScreen && (!screenQuantity || parseInt(screenQuantity, 10) < 1)) {
      setLocalError('Please enter a valid quantity for screens.');
      return;
    }
    setLocalError('');
    onSubmit({
      requestTablet,
      tabletQuantity: parseInt(tabletQuantity, 10) || 0,
      requestScreen,
      screenQuantity: parseInt(screenQuantity, 10) || 0
    });
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Tablet className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-outfit text-md font-bold tracking-tight text-foreground">Request More Devices</h3>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 font-bold">
              For Venue: {outletName || 'Select Venue'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-foreground">
          {displayError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold">
              {displayError}
            </div>
          )}

          <div className="space-y-3 border-t border-border/60 pt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Devices to Request</span>

            <div className="grid grid-cols-1 gap-4">
              {/* Tablet Checkbox and qty */}
              <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestTablet}
                    onChange={(e) => setRequestTablet(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Tabletop Ordering Tablet</span>
                </label>
                {requestTablet && (
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Quantity of Tablets"
                    value={tabletQuantity}
                    onChange={(e) => setTabletQuantity(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                )}
              </div>

              {/* Screen Checkbox and qty */}
              <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestScreen}
                    onChange={(e) => setRequestScreen(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Large Wall Display Screen</span>
                </label>
                {requestScreen && (
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Quantity of Screens"
                    value={screenQuantity}
                    onChange={(e) => setScreenQuantity(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
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
