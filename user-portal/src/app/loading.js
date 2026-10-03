import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 antialiased">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground animate-pulse">
          Loading portal workspace...
        </p>
      </div>
    </div>
  );
}
