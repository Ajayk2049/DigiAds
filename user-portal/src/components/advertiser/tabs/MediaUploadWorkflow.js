import React, { useEffect, useRef } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Sparkles,
  Check,
  Video,
  Trash2,
  Upload
} from 'lucide-react';
import { useAdvertiserStore } from '@/stores';
import { resolveMediaUrl } from '../utils/mediaUtils';

export default function MediaUploadWorkflow() {
  const {
    activeUploadBooking,
    uploadSuccessMsg,
    uploadAdCategory,
    setUploadAdCategory,
    customAdCategory,
    setCustomAdCategory,
    uploading,
    uploadProgress,
    selectedVideoFile,
    localVideoPreviewUrl,
    handleVideoFileSelect,
    clearSelectedVideoFile,
    handleFileUpload,
    selectedImageFiles,
    localImagePreviewUrls,
    handleImageFileSelect,
    removeSelectedImageFile,
    handleImageUpload,
    mediaUrl,
    setMediaTypeTab,
    dismissActiveUploadBooking
  } = useAdvertiserStore();

  const lastBookingIdRef = useRef(null);

  const isUploadCategoryValid = Boolean(
    uploadAdCategory && (uploadAdCategory !== 'Other' || customAdCategory.trim().length > 0)
  );

  useEffect(() => {
    if (!activeUploadBooking) return;

    const currentBookingId = activeUploadBooking._id || activeUploadBooking.bookingId;
    const isNewBooking = currentBookingId && currentBookingId !== lastBookingIdRef.current;

    if (activeUploadBooking.mediaType === 'image') {
      setMediaTypeTab('images');
    } else if (activeUploadBooking.mediaType === 'video') {
      setMediaTypeTab('videos');
    }

    const standardCategories = ['Electronics', 'RealEstate', 'Automotive', 'Beverages', 'Fashion', 'Finance', 'Entertainment'];
    const cat = activeUploadBooking.adCategory?.trim() || '';

    if (isNewBooking) {
      lastBookingIdRef.current = currentBookingId;
      if (cat && standardCategories.includes(cat)) {
        setUploadAdCategory(cat);
        setCustomAdCategory('');
      } else if (cat && cat !== 'Other') {
        setUploadAdCategory('Other');
        setCustomAdCategory(cat);
      } else if (!uploadAdCategory) {
        // Only reset to empty if user hasn't already chosen a category
        setUploadAdCategory('');
        setCustomAdCategory('');
      }
    } else if (cat && !uploadAdCategory) {
      if (standardCategories.includes(cat)) {
        setUploadAdCategory(cat);
        setCustomAdCategory('');
      } else if (cat !== 'Other') {
        setUploadAdCategory('Other');
        setCustomAdCategory(cat);
      }
    }
  }, [activeUploadBooking, setMediaTypeTab, setUploadAdCategory, setCustomAdCategory, uploadAdCategory]);

  if (!activeUploadBooking) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ACTIVE PAID CAMPAIGN MEDIA UPLOAD PANEL */}
      <div className="border-b border-border/40 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-outfit text-2xl font-black text-foreground">Upload Media Creative</h1>
          </div>
          <p className="text-muted-foreground text-xs font-semibold">
            Payment Confirmed for Booking #{activeUploadBooking._id?.slice(-8).toUpperCase()}. You must upload your ad video or image creative below before booking additional spots.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissActiveUploadBooking}
          className="self-start sm:self-auto text-xs font-bold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl border border-border/70 hover:bg-muted/50 transition-all cursor-pointer whitespace-nowrap shadow-sm"
        >
          Book Another Spot →
        </button>
      </div>

      {/* Scheduled Processing Notification Banner */}
      {uploadSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start space-x-3 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Upload Status</p>
            <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed">{uploadSuccessMsg}</p>
          </div>
        </div>
      )}

      {/* Media Specifications & Content Policy Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium space-y-3 text-foreground">
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-[11px] tracking-wider">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Media Specs & Content Policy ({activeUploadBooking.deviceType === 'tablet' ? 'Tablet Kiosk 9:16' : 'Digital Wall Screen 16:9'})</span>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed pl-6 space-y-1 font-semibold">
          <p>• <strong>Aspect Ratio</strong>: {activeUploadBooking.deviceType === 'tablet' ? 'Portrait 10:16 / 9:16 (Vertical)' : 'Landscape 16:9 (Horizontal Widescreen)'}</p>
          <p>• <strong>Video Format</strong>: Up to <strong>{activeUploadBooking?.maxVideoLengthSeconds || 60} seconds</strong> (MP4 / WEBM formats)</p>
          <p>• <strong>Image Format</strong>: Up to <strong>2 Images</strong> (Front & Back switching creatives)</p>
          <p>• <strong>Preferred Resolution</strong>: <strong>{activeUploadBooking.deviceType === 'tablet' ? '800 × 1280 px' : '1920 × 1080 px Full HD'}</strong></p>
        </div>
        <div className="pt-2.5 border-t border-blue-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold space-y-1 pl-6">
          <p>⚠️ <strong>Prohibited Content Policy</strong>: Restaurants, rival dining venues, fast-food chains (Dominos, KFC), and food truck ads are strictly prohibited on dining kiosks. Misclassified ads will be rejected during manual admin review.</p>
        </div>
      </div>

      {/* Modern Media Creative Type Header Badge */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Creative Format</label>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-sm flex items-center space-x-1.5 ${
            activeUploadBooking?.mediaType === 'image'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
          }`}>
            {activeUploadBooking?.mediaType === 'image' ? (
              <span>🖼️ Paid Format: Static Image Ad</span>
            ) : (
              <span>🎬 Paid Format: Dynamic Video Ad ({activeUploadBooking?.maxVideoLengthSeconds || 30}s Plan)</span>
            )}
          </span>
        </div>

        {/* MANDATORY POST-PAYMENT AD CATEGORY SELECTOR */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 shadow-md space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>1. Select Ad Category / Industry <span className="text-destructive">*</span></span>
              </span>
              {isUploadCategoryValid && (
                <span className="text-emerald-500 font-extrabold text-[10px] uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center space-x-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Category Selected</span>
                </span>
              )}
            </label>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              Select your brand category to unlock creative file upload and kiosk schedule optimization.
            </p>

            <select
              value={uploadAdCategory}
              onChange={(e) => setUploadAdCategory(e.target.value)}
              disabled={uploading}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="" disabled>-- Choose your category --</option>
              <option value="Electronics">Electronics & Gadgets</option>
              <option value="RealEstate">Real Estate & Housing</option>
              <option value="Automotive">Automotive & Vehicles</option>
              <option value="Beverages">Beverages & Soft Drinks</option>
              <option value="Fashion">Fashion & Apparel</option>
              <option value="Finance">Finance & Banking</option>
              <option value="Entertainment">Entertainment & Media</option>
              <option value="Other">Other / Custom Industry...</option>
            </select>
          </div>

          {uploadAdCategory === 'Other' && (
            <div className="pt-2 animate-fade-in space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>Define Custom Category / Industry Name <span className="text-destructive">*</span></span>
                {customAdCategory.trim().length > 0 && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Defined</span>
                )}
              </label>
              <input
                type="text"
                placeholder="e.g. Healthcare & Clinics, Education & Coaching, Gym & Fitness, Legal Consulting..."
                value={customAdCategory}
                onChange={(e) => setCustomAdCategory(e.target.value)}
                disabled={uploading}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* MEDIA UPLOAD SECTION (LOCKED UNTIL CATEGORY IS SPECIFIED) */}
        {!isUploadCategoryValid ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2 animate-fade-in">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto opacity-80" />
            <h4 className="font-outfit text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              2. Creative Upload Locked
            </h4>
            <p className="text-xs text-foreground/90 max-w-md mx-auto font-medium">
              Please choose your <strong>Ad Category</strong> above {uploadAdCategory === 'Other' ? '(and type your custom category name)' : ''} to unlock media file selection and upload.
            </p>
          </div>
        ) : activeUploadBooking?.mediaType !== 'image' ? (
          <div className="space-y-4">
            {/* Step 1: File selection target */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 rounded-2xl p-6 cursor-pointer transition-all text-center bg-card/10 group">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm font-bold text-foreground">
                {selectedVideoFile ? `Selected: ${selectedVideoFile.name}` : 'Click to select ad video file (.mp4, .webm)'}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Maximum paid plan limit: {activeUploadBooking?.maxVideoLengthSeconds || 60}s</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Step 2: Instant Client-Side Browser Preview Box */}
            {localVideoPreviewUrl && !mediaUrl && (
              <div className="p-4 rounded-xl border border-primary/40 bg-muted/20 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Browser Media Preview (Not Uploaded Yet)</p>
                  <button
                    type="button"
                    onClick={clearSelectedVideoFile}
                    disabled={uploading}
                    className="text-xs text-destructive hover:underline font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Change Video</span>
                  </button>
                </div>
                <div className={`mx-auto w-full max-w-[260px] rounded-xl border border-border/40 bg-black overflow-hidden relative shadow-md ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                  <video src={localVideoPreviewUrl} controls className="w-full h-full object-contain" />
                </div>

                {uploading && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Uploading payload to server staging...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${uploadProgress === 100 ? 'bg-primary animate-pulse w-full' : 'bg-primary'}`}
                        style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-amber-500 font-semibold flex items-center justify-center pt-1">
                      ⚠️ Upload in progress. Please do not refresh or close this tab!
                    </p>
                  </div>
                )}

                {!uploading && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleFileUpload}
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Ad</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Final Uploaded Media Confirmation Box */}
            {mediaUrl && (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Final Uploaded Video Asset</p>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">Staged & Scheduled</span>
                </div>
                <div className={`mx-auto w-full max-w-[260px] rounded-xl border border-border/40 bg-black overflow-hidden relative shadow-md ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                  <video src={resolveMediaUrl(mediaUrl)} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: File selection target box */}
            {selectedImageFiles.length < 2 && !mediaUrl && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5 rounded-2xl p-6 cursor-pointer transition-all text-center bg-card/10 group">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  Click to select image file {selectedImageFiles.length + 1}/2 (.png, .jpg, .webp)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}

            {/* Step 2: Instant Client-Side Browser Preview Box */}
            {localImagePreviewUrls.length > 0 && !mediaUrl && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-muted/20 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Browser Media Preview (Not Uploaded Yet)</p>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    {localImagePreviewUrls.length}/2 Images Selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {localImagePreviewUrls.map((blobUrl, idx) => (
                    <div key={idx} className="border border-border/40 rounded-xl overflow-hidden bg-muted/20 p-2.5 space-y-2 relative">
                      <div className={`w-full rounded-lg bg-black overflow-hidden relative shadow-sm ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                        <img src={blobUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{idx === 0 ? 'Front Creative' : 'Back Creative'}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedImageFile(idx)}
                          disabled={uploading}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {uploading && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Optimizing & uploading images...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${uploadProgress === 100 ? 'bg-primary animate-pulse w-full' : 'bg-primary'}`}
                        style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-amber-500 font-semibold flex items-center justify-center pt-1">
                      ⚠️ Upload in progress. Please do not refresh or close this tab!
                    </p>
                  </div>
                )}

                {!uploading && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Ad</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Final Uploaded Media Confirmation Box */}
            {(mediaUrl || activeUploadBooking?.mediaUrl) && (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Final Uploaded & Optimized Images</p>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">Optimized & Saved</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {((activeUploadBooking?.mediaUrl || mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean)).map((imgItem, idx) => (
                    <div key={idx} className="border border-border/40 rounded-xl overflow-hidden bg-muted/20 p-2.5 space-y-2">
                      <div className={`w-full rounded-lg bg-black overflow-hidden relative shadow-sm ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                        <img src={resolveMediaUrl(imgItem)} alt={`Creative ${idx + 1}`} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{idx === 0 ? 'Front Creative (Image 1)' : 'Back Creative (Image 2)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
