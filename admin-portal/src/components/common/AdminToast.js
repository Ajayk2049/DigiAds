'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function AdminToast() {
  const notifications = useAdminStore((s) => s.notifications);
  const dismissToast = (id) => {
    useAdminStore.setState((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] pointer-events-none flex flex-col space-y-2.5 max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {notifications.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start justify-between space-x-3 transition-all duration-300 ${
              toast.type === 'error' || toast.type === 'destructive'
                ? '!bg-red-600 !border-red-500 !text-white shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                : toast.type === 'warning'
                ? '!bg-amber-600 !border-amber-500 !text-white shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                : toast.type === 'info'
                ? '!bg-blue-600 !border-blue-500 !text-white shadow-[0_0_25px_rgba(59,130,246,0.4)]'
                : '!bg-emerald-600 !border-emerald-500 !text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
            }`}
          >
            <div className="flex items-start space-x-3 min-w-0">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' || toast.type === 'destructive' ? (
                  <XCircle className="w-5 h-5 !text-white" />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 !text-white" />
                ) : toast.type === 'info' ? (
                  <AlertCircle className="w-5 h-5 !text-white" />
                ) : (
                  <CheckCircle className="w-5 h-5 !text-white" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <h5 className="font-outfit text-xs font-black uppercase tracking-wider !text-white">
                  {toast.type === 'error' || toast.type === 'destructive'
                    ? 'System Error'
                    : toast.type === 'warning'
                    ? 'Warning Notice'
                    : toast.type === 'info'
                    ? 'System Info'
                    : 'Success'}
                </h5>
                <p className="text-xs font-semibold leading-relaxed break-words !text-white">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer !text-white shrink-0 mt-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4 !text-white" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
