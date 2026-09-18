'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function LoginView() {
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useAdminStore((s) => s.loginForm);
  const loginLoading = useAdminStore((s) => s.loginLoading);
  const loginError = useAdminStore((s) => s.loginError);
  const handleLogin = useAdminStore((s) => s.handleLogin);
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);

  const identifier = loginForm.phone || loginForm.identifier || '';

  const handleIdentifierChange = (val) => {
    useAdminStore.setState((state) => ({
      loginForm: { ...state.loginForm, phone: val, identifier: val }
    }));
  };

  const handlePasswordChange = (val) => {
    useAdminStore.setState((state) => ({
      loginForm: { ...state.loginForm, password: val }
    }));
  };

  const isPhoneFormat = !identifier.includes('@') && /^\d+$/.test(identifier.replace(/[\s-+]/g, ''));

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card/40 backdrop-blur-xl border border-border/80 rounded-[32px] p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-900 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-outfit text-2xl font-black tracking-tight text-foreground">DigiAds Admin</h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Enterprise Management Portal</p>
        </div>

        {loginError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
              Email or 10-Digit Mobile Number
            </label>
            <div className="relative">
              {isPhoneFormat ? (
                <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-primary" />
              ) : (
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
              )}
              <input
                type="text"
                required
                placeholder="admin@digiads.com or 9876543210"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                className="w-full bg-card border border-border/80 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground shadow-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={loginForm.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full bg-card border border-border/80 rounded-xl pl-10 pr-10 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground shadow-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 rounded-xl transition-colors duration-200 shadow-lg shadow-primary/20 cursor-pointer text-xs mt-2 disabled:opacity-50 min-h-[44px]"
          >
            {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-center flex justify-between items-center text-[10px] text-muted-foreground font-medium">
          <span>DigiAds By AibotInk</span>
          <button onClick={toggleTheme} className="hover:text-foreground flex items-center gap-1 cursor-pointer">
            {theme === 'dark' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-blue-500" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
