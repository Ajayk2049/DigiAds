import React from 'react';
import { Eye, X } from 'lucide-react';
import { config } from '@/config';
import { useAdvertiserStore } from '@/stores';
import { resolveMediaUrl } from '../utils/mediaUtils';

export default function MediaPreviewModal() {
  const { showMediaModal, setShowMediaModal, activeMediaUrl, setActiveMediaUrl } = useAdvertiserStore();

  if (!showMediaModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-border/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-outfit text-base font-bold text-foreground">Media Creative Preview</h3>
          </div>
          <button
            onClick={() => {
              setShowMediaModal(false);
              setActiveMediaUrl('');
            }}
            className="p-1.5 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex-1 max-h-[60vh] md:max-h-[68vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
          {activeMediaUrl ? (
            (() => {
              const mediaUrls = activeMediaUrl.split(',').map(s => s.trim()).filter(Boolean);
              const firstUrl = mediaUrls[0] || '';
              const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');

              if (isVideo) {
                return (
                  <video
                    key={firstUrl}
                    src={resolveMediaUrl(firstUrl)}
                    controls
                    className="w-full max-h-[60vh] md:max-h-[65vh] object-contain bg-black rounded-xl"
                  />
                );
              }

              // Render Image / Dual-Image Preview Grid (Matching Admin Panel Popup Exactly)
              return (
                <div className="w-full flex justify-center items-center gap-4 py-4 overflow-x-auto">
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
                            onError={(e) => {
                              console.error('Image load failed for URL:', resolvedUrl);
                              const base = config.apiUrl.split('/api/v1')[0];
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
                        <span className="text-[10px] font-extrabold text-slate-300 mt-2 uppercase tracking-wider">
                          {mediaUrls.length > 1 ? (idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)') : 'Image Asset'}
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
