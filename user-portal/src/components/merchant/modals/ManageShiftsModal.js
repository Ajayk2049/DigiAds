import React, { useState } from 'react';
import { Clock, Trash2, X } from 'lucide-react';
import { useMenuStore } from '@/stores/useMenuStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';

export default function ManageShiftsModal(props) {
  const menu = useMenuStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const ui = useUIStore();
  const token = auth.token;
  const outletId = outlet.selectedOutletId;

  const isOpen = props.isOpen ?? menu.isShiftModalOpen;
  const onClose = props.onClose ?? (() => menu.setIsShiftModalOpen(false));
  const menuShifts = props.menuShifts ?? menu.menuShifts;
  const activeShift = props.activeShift ?? menu.activeShift;
  const showToast = props.showToast ?? ui.showToast;
  const onSaveShifts = props.onSaveShifts ?? ((updatedShifts) => menu.handleSaveShifts(token, outletId, updatedShifts));

  const [newShiftName, setNewShiftName] = useState('');

  if (!isOpen) return null;

  const handleAddShift = () => {
    const trimmed = newShiftName.trim();
    if (!trimmed) return;
    if (menuShifts.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast?.('Shift with this name already exists!', 'error');
      return;
    }
    const updated = [...menuShifts, trimmed];
    onSaveShifts(updated);
    setNewShiftName('');
  };

  const handleDeleteShift = (shift) => {
    if (menuShifts.length <= 1) {
      showToast?.('You must keep at least 1 menu shift.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${shift}" shift? Items assigned to this shift will remain in database.`)) {
      const updated = menuShifts.filter(s => s !== shift);
      onSaveShifts(updated);
    }
  };

  const handleClose = () => {
    setNewShiftName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
      <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 border-b border-border/40 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-outfit text-md font-bold tracking-tight text-foreground">Manage Menu Shifts</h3>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Configure shifts (e.g. Breakfast, Lunch, Snacks, Dinner).</p>
          </div>
        </div>

        {/* List of Shifts */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {menuShifts.map((shift, idx) => {
            const isLive = shift === activeShift;
            return (
              <div key={shift} className="flex justify-between items-center p-2.5 rounded-xl bg-muted/20 border border-border/20 text-xs font-bold">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-muted-foreground">#{idx + 1}</span>
                  <span className="text-foreground">{shift}</span>
                  {isLive && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-white shadow-sm">
                      ● Live
                    </span>
                  )}
                </div>
                {!isLive && (
                  <button
                    onClick={() => handleDeleteShift(shift)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                    title={`Delete shift ${shift}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new shift form */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Add New Shift</span>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Shift Name (e.g. Late Night)"
              value={newShiftName}
              onChange={(e) => setNewShiftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddShift();
                }
              }}
              className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              onClick={handleAddShift}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all shadow-sm"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleClose}
            className="px-5 py-2 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
