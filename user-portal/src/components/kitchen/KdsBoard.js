'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize, RotateCcw, LogOut, Radio, ChefHat, Moon, Sun } from 'lucide-react';
import KdsTicketCard from './KdsTicketCard';
import KdsRecallDrawer from './KdsRecallDrawer';
import { kdsAudio } from './KdsAudioService';

export default function KdsBoard({
  venueName,
  stationName,
  orders,
  wsConnected,
  onUpdateStatus,
  onLogout,
  token
}) {
  const [isMuted, setIsMuted] = useState(kdsAudio.isMuted());
  const [showRecall, setShowRecall] = useState(false);
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

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    kdsAudio.setMuted(next);
    if (!next) kdsAudio.playNewOrderChime();
  };

  const handleTestAudio = () => {
    kdsAudio.init();
    kdsAudio.playNewOrderChime();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans select-none">
      {/* Top Action Bar */}
      <header className="h-16 px-4 sm:px-6 bg-card border-b border-border flex items-center justify-between shrink-0 shadow-sm">
        {/* Left: Venue & Station Info */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ChefHat className="w-5 h-5 text-[#0069a8]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-outfit text-base font-bold text-foreground leading-tight">{venueName || 'Kitchen'}</h1>
              {stationName && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {stationName}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] text-muted-foreground font-medium">
                {wsConnected ? 'Live Real-Time Sync' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Orders Counter */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border">
          <span className="text-xs font-semibold text-muted-foreground">Active Tickets:</span>
          <span className="font-mono text-sm font-black text-[#0069a8]">{orders.length}</span>
        </div>

        {/* Right: Station Controls */}
        <div className="flex items-center space-x-2">
          {/* Audio Mute & Test */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg border border-border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-card text-foreground hover:bg-muted'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#0069a8]" />}
          </button>

          <button
            onClick={handleTestAudio}
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border cursor-pointer"
          >
            Test Chime
          </button>

          {/* Recall Drawer */}
          <button
            onClick={() => setShowRecall(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border flex items-center space-x-1.5 cursor-pointer"
            title="Recall Served Orders"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Recall</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0069a8]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-border hover:border-rose-500/30 cursor-pointer"
            title="Disconnect Station"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Ticket Grid Rail */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground/50">
              <ChefHat className="w-8 h-8 text-[#0069a8] opacity-60" />
            </div>
            <h2 className="font-outfit text-lg font-bold text-foreground">All Caught Up!</h2>
            <p className="text-xs text-muted-foreground max-w-sm">
              No active food tickets waiting in the queue. New tabletop kiosk and takeout orders will chime and appear here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orders.map(order => (
              <KdsTicketCard
                key={order.orderId}
                order={order}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </main>

      {/* Recall Drawer */}
      <KdsRecallDrawer
        isOpen={showRecall}
        onClose={() => setShowRecall(false)}
        token={token}
      />
    </div>
  );
}
