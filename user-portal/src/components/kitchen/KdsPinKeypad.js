'use client';

import React, { useState, useEffect } from 'react';
import { Delete, ChefHat, Moon, Sun } from 'lucide-react';

export default function KdsPinKeypad({ onSubmit, loading, error }) {
  const [pin, setPin] = useState('');
  const [stationName, setStationName] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        onSubmit(nextPin, stationName.trim() || 'Kitchen Station');
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  // Support typing on physical or virtual keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If user is focused on the stationName text input, let input handle its own keys
      if (e.target && e.target.tagName === 'INPUT') return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, stationName]);

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-card border border-border rounded-xl shadow-2xl space-y-6 animate-scale-in relative">
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-input transition-colors cursor-pointer"
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0069a8]" />}
      </button>

      {/* Header */}
      <div className="text-center space-y-1.5 pt-1">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
          <ChefHat className="w-6 h-6 text-[#0069a8]" />
        </div>
        <h2 className="font-outfit text-xl font-bold text-foreground">Kitchen Display Login</h2>
        <p className="text-xs text-muted-foreground">Enter your 6-digit venue kitchen PIN</p>
      </div>

      {/* Station Name Input with Token-Based Theme Styling */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Station Name</label>
        <input
          type="text"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          placeholder="e.g. Main Kitchen, Grill Station"
          className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Circular PIN Boxes (No redundant text box with placeholder dots) */}
      <div className="space-y-2">
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PIN Code</span>
        </div>
        <div className="flex justify-center items-center space-x-3.5 py-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                  filled
                    ? 'bg-primary border-primary scale-110 shadow-md'
                    : 'bg-muted/30 border-input'
                }`}
              >
                {filled && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(String(digit))}
            disabled={loading}
            className="h-12 rounded-lg bg-card hover:bg-muted/70 active:bg-primary/20 text-foreground font-mono text-lg font-bold border border-input transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          disabled={loading || pin.length === 0}
          className="h-12 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground text-xs font-bold border border-input uppercase cursor-pointer disabled:opacity-30"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="h-12 rounded-lg bg-card hover:bg-muted/70 active:bg-primary/20 text-foreground font-mono text-lg font-bold border border-input transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={loading || pin.length === 0}
          className="h-12 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground flex items-center justify-center border border-input cursor-pointer disabled:opacity-30"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <p className="text-center text-xs text-muted-foreground font-semibold animate-pulse">
          Connecting to venue...
        </p>
      )}
    </div>
  );
}
