import React from 'react';
import Link from 'next/link';
import { ShieldQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-card border border-border/60 rounded-xl p-8 shadow-xl flex flex-col items-center text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <ShieldQuestion className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-heading font-bold text-foreground">
            View Not Found
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requested admin view or route does not exist.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
