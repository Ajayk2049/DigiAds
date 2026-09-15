import React from 'react';
import { XCircle, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';

export default function AdvertiserToast() {
  const { toasts, dismissToast } = useAdvertiserStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start space-x-3 p-3.5 rounded-xl border animate-fade-in text-xs font-semibold select-none ${
            toast.type === 'error'
              ? 'bg-rose-600 dark:bg-rose-500 border-rose-400/40 text-white shadow-[0_6px_20px_rgba(244,63,94,0.3)] dark:shadow-[0_8px_30px_rgba(244,63,94,0.5)]'
              : toast.type === 'success'
                ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-400/40 text-white shadow-[0_6px_20px_rgba(16,185,129,0.3)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.5)]'
                : 'bg-[#0069a8] border-blue-400/40 text-white shadow-[0_6px_20px_rgba(0,105,168,0.3)] dark:shadow-[0_8px_30px_rgba(0,105,168,0.5)]'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' && <XCircle className="w-4 h-4 text-white" />}
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-white" />}
            {toast.type === 'info' && <AlertCircle className="w-4 h-4 text-white" />}
          </div>
          <p className="flex-1 leading-relaxed text-white font-bold">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
