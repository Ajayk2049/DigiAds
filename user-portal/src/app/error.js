'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Redact potential sensitive tokens from error logging per Rule 15.9
    const safeMessage = error?.message || 'An unexpected client error occurred';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[UserPortal ErrorBoundary]:', safeMessage);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-card border border-border/60 rounded-xl p-8 shadow-xl flex flex-col items-center text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-bold text-foreground">
            Something went wrong
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The application encountered an unexpected error while rendering this page. You can try refreshing or returning to the dashboard.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => { window.location.href = '/merchant'; }}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-secondary text-secondary-foreground border border-border/40 text-xs font-semibold rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
