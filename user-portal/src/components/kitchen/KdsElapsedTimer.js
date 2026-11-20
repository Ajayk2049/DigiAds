'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function KdsElapsedTimer({ createdAt }) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const start = new Date(createdAt).getTime();

    const updateTimer = () => {
      const diffMs = Math.max(0, Date.now() - start);
      const totalSec = Math.floor(diffMs / 1000);
      setElapsedMinutes(Math.floor(totalSec / 60));
      setElapsedSeconds(totalSec % 60);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const pad = (n) => String(n).padStart(2, '0');

  // Color urgency hierarchy with adaptive theme contrast
  let badgeColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (elapsedMinutes >= 20) {
    badgeColor = 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/40 animate-pulse';
  } else if (elapsedMinutes >= 10) {
    badgeColor = 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${badgeColor}`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{pad(elapsedMinutes)}:{pad(elapsedSeconds)}</span>
    </span>
  );
}
