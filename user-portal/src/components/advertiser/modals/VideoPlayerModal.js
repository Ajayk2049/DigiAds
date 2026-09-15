import React from 'react';
import { useAdvertiserStore } from '@/stores';

export default function VideoPlayerModal() {
  const { previewVideoUrl, setPreviewVideoUrl } = useAdvertiserStore();

  if (!previewVideoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-card border border-border/40 p-4 rounded-2xl shadow-2xl relative flex flex-col space-y-4">
        <div className="flex justify-between items-center border-b border-border/40 pb-3">
          <h3 className="font-outfit text-sm font-bold text-foreground">Campaign Video Preview</h3>
          <button
            onClick={() => setPreviewVideoUrl('')}
            className="p-1 hover:bg-muted border border-border/40 rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold w-6 h-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <video
            src={previewVideoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
