'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function UserEditModal({
  editingUser,
  userForm,
  setUserForm,
  onClose,
  onSave
}) {
  if (!editingUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
          <h3 className="font-outfit text-base font-bold text-foreground">Edit User Properties</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Full Name</label>
            <input
              type="text"
              required
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Contact Phone</label>
            <input
              type="text"
              required
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Email Address</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
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
              className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
