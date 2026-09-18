'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function UserDeleteModal({
  deletingUser,
  adminDeletePassword,
  setAdminDeletePassword,
  onClose,
  onConfirmDelete
}) {
  if (!deletingUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span>Delete User Account</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close delete modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onConfirmDelete} className="space-y-4">
          <p className="text-xs text-muted-foreground font-semibold">
            Are you sure you want to permanently delete user account{' '}
            <span className="font-bold text-foreground">{deletingUser.name || deletingUser.phone}</span>?
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Administrator Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter admin password to confirm"
              value={adminDeletePassword}
              onChange={(e) => setAdminDeletePassword(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-destructive text-white font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
            >
              Confirm Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
