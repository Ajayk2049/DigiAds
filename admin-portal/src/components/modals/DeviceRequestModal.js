'use client';

import React from 'react';
import { X, Check } from 'lucide-react';

export default function DeviceRequestModal({
  selectedDeviceReq,
  onClose,
  onReview
}) {
  if (!selectedDeviceReq) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              Device Hardware Request
            </span>
            <h3 className="font-outfit text-base font-bold text-foreground mt-2">
              {selectedDeviceReq.hostApplicationId?.outletName || 'Outlet Request'}
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Submitted on {new Date(selectedDeviceReq.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close device request modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase">Merchant Contact</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-muted-foreground block">Merchant Name</span>
                <p className="text-foreground font-bold">{selectedDeviceReq.userId?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground block">Phone</span>
                <p className="text-foreground font-mono font-bold">{selectedDeviceReq.userId?.phone}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase">Requested Hardware Specifications</span>
            <div className="space-y-1 font-bold text-foreground">
              {selectedDeviceReq.requestTablet && (
                <div className="flex justify-between items-center">
                  <span>Tablet Kiosk Display</span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">
                    Qty: {selectedDeviceReq.tabletQuantity}
                  </span>
                </div>
              )}
              {selectedDeviceReq.requestScreen && (
                <div className="flex justify-between items-center">
                  <span>Wall Display Screen</span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">
                    Qty: {selectedDeviceReq.screenQuantity}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-border/50 mt-4">
          {selectedDeviceReq.status === 'pending' && (
            <>
              <button
                onClick={() => onReview && onReview(selectedDeviceReq._id, 'approve')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Approve Request</span>
              </button>
              <button
                onClick={() => onReview && onReview(selectedDeviceReq._id, 'reject')}
                className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Reject Request</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
