import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';

export default function VideoResolutionModal() {
  const {
    videoResolutionWarning,
    setVideoResolutionWarning,
    clearSelectedVideoFile,
    showToast
  } = useAdvertiserStore();

  if (!videoResolutionWarning) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-card border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-scale-up">
        <div className="flex items-center space-x-3 pb-3 border-b border-border/50">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground">
              Video Resolution & Orientation Advisory
            </h3>
            <p className="text-xs text-muted-foreground font-semibold">
              Detected quality check for commercial display
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/40 text-xs font-semibold">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Uploaded Resolution:</span>
            <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              {videoResolutionWarning.width} × {videoResolutionWarning.height} px
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-border/30">
            <span className="text-muted-foreground">Recommended Standard:</span>
            <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {videoResolutionWarning.recommended}
            </span>
          </div>

          {videoResolutionWarning.isLowRes && (
            <div className="pt-2 border-t border-border/30 text-amber-600 dark:text-amber-400">
              ⚠️ <strong className="font-bold">Low Resolution Notice:</strong> Videos below 720p may appear blurry or pixelated when displayed on high-definition commercial screens.
            </div>
          )}

          {videoResolutionWarning.isOrientationMismatch && videoResolutionWarning.mismatchDesc && (
            <div className="pt-2 border-t border-border/30 text-amber-600 dark:text-amber-400">
              📐 <strong className="font-bold">Orientation Notice:</strong> {videoResolutionWarning.mismatchDesc}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
          You can proceed with this video, but for optimal visual impact we recommend uploading a Full HD 1080p creative.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              clearSelectedVideoFile();
              setVideoResolutionWarning(null);
            }}
            className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer border border-border transition-colors"
          >
            Change Video
          </button>
          <button
            type="button"
            onClick={() => {
              setVideoResolutionWarning(null);
              showToast('info', 'Video retained! Click "Upload Ad" when you are ready.');
            }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
