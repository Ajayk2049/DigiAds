'use client';

import React from 'react';
import { X } from 'lucide-react';
import { resolveMediaUrl } from '@/components/common/MediaResolver';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function CreativePreviewModal({
  isOpen,
  activeVideoUrl,
  selectedCampaign,
  onClose,
  onMediaPlayed
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] rounded-[24px] overflow-hidden shadow-2xl p-5 relative flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-outfit text-base font-bold text-foreground">Media Creative Preview</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full flex-1 max-h-[60vh] md:max-h-[68vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
          {activeVideoUrl ? (
            (() => {
              const mediaUrls = activeVideoUrl.split(',').map((s) => s.trim()).filter(Boolean);
              const firstUrl = mediaUrls[0] || '';
              const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');

              if (isVideo) {
                return (
                  <video
                    key={firstUrl}
                    src={resolveMediaUrl(firstUrl)}
                    controls
                    className="w-full max-h-[60vh] md:max-h-[65vh] object-contain bg-black rounded-xl"
                    onPlay={() => {
                      if (selectedCampaign && onMediaPlayed) {
                        onMediaPlayed(selectedCampaign.bookingId);
                      }
                    }}
                  />
                );
              }

              return (
                <div className="w-full flex justify-center items-center gap-4 py-4">
                  {mediaUrls.map((rawUrl, idx) => {
                    const resolvedUrl = resolveMediaUrl(rawUrl);
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="bg-black/80 rounded-xl border border-border/40 shadow-lg p-3 min-w-[200px] min-h-[160px] flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolvedUrl}
                            alt={`Creative ${idx + 1}`}
                            style={{
                              maxWidth: mediaUrls.length > 1 ? '260px' : '400px',
                              maxHeight: '320px',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                            onLoad={() => {
                              if (selectedCampaign && onMediaPlayed) {
                                onMediaPlayed(selectedCampaign.bookingId);
                              }
                            }}
                            onError={(e) => {
                              const base = API_BASE.split('/api/v1')[0];
                              if (rawUrl.includes('/uploads/')) {
                                const sub = rawUrl.split('/uploads/')[1];
                                const fallbackUrl = `${base}/uploads/${sub}`;
                                if (e.target.src !== fallbackUrl) {
                                  e.target.src = fallbackUrl;
                                }
                              }
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 mt-2">
                          {mediaUrls.length > 1 ? (idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)') : 'Image'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground font-semibold text-xs">
              No media URL provided
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
