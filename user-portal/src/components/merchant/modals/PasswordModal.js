import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function PasswordModal(props) {
  const payment = usePaymentStore();
  const auth = useAuthStore();
  const token = auth.token;

  const isOpen = props.isOpen ?? payment.showPasswordModal;
  const onClose = props.onClose ?? (() => payment.setShowPasswordModal(false));
  const isVerifying = props.isVerifying ?? payment.isVerifyingPassword;
  const error = props.error ?? payment.passwordVerifyError;
  const onVerify = props.onVerify ?? ((pwd) => payment.handleVerifyPasswordSubmit(pwd, token));

  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    onVerify(password);
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
      <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-5">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground">Security Verification</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Confirm account password to configure payout details</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-bold text-left animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Account Password</label>
            <input
              type="password"
              required
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 bg-[#0069a8] hover:bg-[#005b94] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-md flex items-center justify-center space-x-2"
            >
              {isVerifying ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Confirm & Continue</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isVerifying}
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
