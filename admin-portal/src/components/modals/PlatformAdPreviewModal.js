'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { resolveMediaUrl } from '@/components/common/MediaResolver';

export default function PlatformAdPreviewModal({
  previewPlatformAd,
  onClose
}) {
  if (!previewPlatformAd) return null;

  const isVideo =
    previewPlatformAd.mediaType === 'video' ||
    (previewPlatformAd.mediaUrl || '').endsWith('.mp4') ||
    (previewPlatformAd.mediaUrl || '').endsWith('.webm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
              <span>{previewPlatformAd.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                {previewPlatformAd.adId}
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Type: <span className="font-bold text-foreground uppercase">{previewPlatformAd.type}</span> | Duration:{' '}
              <span className="font-bold text-foreground">{previewPlatformAd.durationSeconds}s</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden bg-black/60 border border-border flex items-center justify-center min-h-[260px] max-h-[400px]">
          {isVideo ? (
            <video
              src={resolveMediaUrl(previewPlatformAd.mediaUrl)}
              controls
              autoPlay
              loop
              className="max-h-[380px] w-auto max-w-full rounded-lg"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolveMediaUrl(previewPlatformAd.mediaUrl)}
              alt={previewPlatformAd.title}
              className="max-h-[380px] w-auto max-w-full object-contain rounded-lg"
            />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </div>
  );
}
