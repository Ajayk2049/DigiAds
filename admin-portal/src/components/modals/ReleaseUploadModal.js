'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';

export default function ReleaseUploadModal({
  isOpen,
  releaseForm,
  setReleaseForm,
  uploadingRelease = false,
  onUpload,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-5"
      >
        <div className="flex justify-between items-center border-b border-border/50 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-emerald-500" />
            <h3 className="font-outfit text-base font-bold text-foreground">Publish OTA App Release</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onUpload} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Target Application</label>
            <select
              value={releaseForm.appType}
              onChange={(e) => setReleaseForm({ ...releaseForm, appType: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
            >
              <option value="TABLET_APP">Tabletop Tablet App (3:4)</option>
              <option value="SCREEN_APP">Wall Display Screen App (16:9)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Version Name (Semver)</label>
              <input
                type="text"
                required
                placeholder="1.0.1"
                value={releaseForm.versionName}
                onChange={(e) => setReleaseForm({ ...releaseForm, versionName: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1">Version Code (Build #)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="2"
                value={releaseForm.versionCode}
                onChange={(e) => setReleaseForm({ ...releaseForm, versionCode: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Release APK File</label>
            <input
              type="file"
              required
              accept=".apk"
              onChange={(e) => setReleaseForm({ ...releaseForm, file: e.target.files[0] })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-muted-foreground mb-1">Release Notes</label>
            <textarea
              rows="3"
              placeholder="Bug fixes, performance improvements, thermal printer receipt fixes..."
              value={releaseForm.releaseNotes}
              onChange={(e) => setReleaseForm({ ...releaseForm, releaseNotes: e.target.value })}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isMandatory"
              checked={releaseForm.isMandatory}
              onChange={(e) => setReleaseForm({ ...releaseForm, isMandatory: e.target.checked })}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isMandatory" className="text-xs text-foreground cursor-pointer font-bold">
              Mandatory Update (Forces installation on next idle standby)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingRelease}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md disabled:opacity-50 flex items-center space-x-1.5"
            >
              {uploadingRelease ? 'Publishing APK...' : 'Upload & Publish Release'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
