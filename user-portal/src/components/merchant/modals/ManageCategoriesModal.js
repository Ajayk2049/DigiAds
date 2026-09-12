'use client';

import React from 'react';
import { X, Settings, Star, Check, Pencil, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { renderCategoryIcon, getCategoryName, getCategoryIconKey, CATEGORY_ICON_PACK } from '../common/constants';
import { useMenuStore } from '@/stores/useMenuStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ManageCategoriesModal(props) {
  const menu = useMenuStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;
  const outletId = outlet.selectedOutletId;

  const isOpen = props.isOpen ?? menu.isCategoryModalOpen;
  const onClose = props.onClose ?? menu.closeCategoryModal;
  const draftPopularCategory = props.draftPopularCategory ?? menu.draftPopularCategory;
  const setDraftPopularCategory = props.setDraftPopularCategory ?? menu.setDraftPopularCategory;
  const editingPopularName = props.editingPopularName ?? menu.editingPopularName;
  const setEditingPopularName = props.setEditingPopularName ?? menu.setEditingPopularName;
  const editingPopularValue = props.editingPopularValue ?? menu.editingPopularValue;
  const setEditingPopularValue = props.setEditingPopularValue ?? menu.setEditingPopularValue;
  const openIconPickerIndex = props.openIconPickerIndex ?? menu.openIconPickerIndex;
  const setOpenIconPickerIndex = props.setOpenIconPickerIndex ?? menu.setOpenIconPickerIndex;
  const draftMenuItems = props.draftMenuItems ?? menu.draftMenuItems;
  const draftCategories = props.draftCategories ?? menu.draftCategories;
  const editingCategoryIndex = props.editingCategoryIndex ?? menu.editingCategoryIndex;
  const editingCategoryValue = props.editingCategoryValue ?? menu.editingCategoryValue;
  const setEditingCategoryValue = props.setEditingCategoryValue ?? menu.setEditingCategoryValue;
  const newCategoryIcon = props.newCategoryIcon ?? menu.newCategoryIcon;
  const newCategoryName = props.newCategoryName ?? menu.newCategoryName;
  const setNewCategoryName = props.setNewCategoryName ?? menu.setNewCategoryName;
  const hasCategoryChanges = props.hasCategoryChanges ?? (typeof menu.hasCategoryChanges === 'function' ? menu.hasCategoryChanges() : false);
  const isSavingCategories = props.isSavingCategories ?? menu.isSavingCategories;
  const handleSaveEditDraftCategory = props.handleSaveEditDraftCategory ?? menu.handleSaveEditDraftCategory;
  const handleCancelEditCategory = props.handleCancelEditCategory ?? menu.handleCancelEditCategory;
  const handleMoveDraftCategory = props.handleMoveDraftCategory ?? menu.handleMoveDraftCategory;
  const handleStartEditCategory = props.handleStartEditCategory ?? menu.handleStartEditCategory;
  const handleDeleteDraftCategory = props.handleDeleteDraftCategory ?? menu.handleDeleteDraftCategory;
  const handleAddDraftCategory = props.handleAddDraftCategory ?? menu.handleAddDraftCategory;
  const handleSaveModalCategories = props.handleSaveModalCategories ?? (() => menu.handleSaveModalCategories(token, outletId));
  const handleSelectCategoryIcon = props.handleSelectCategoryIcon ?? menu.handleSelectCategoryIcon;

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="flex items-start justify-center space-x-4 max-w-5xl w-full my-auto">
        {/* Main Category Modal */}
        <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 border-b border-border/40 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-outfit text-md font-bold tracking-tight">Manage Menu Categories</h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Click icon to change, edit names, reorder, and save when done.</p>
            </div>
          </div>

          {/* Featured Section (Category #1 on Tablets) */}
          <div className="space-y-1.5 bg-muted/20 border border-border/40 p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500 inline mr-1" />
                  Featured Section
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold">
                  (Tablet Kiosk #1)
                </span>
              </div>
              <span className="text-[9px] text-muted-foreground font-semibold">
                Shows all items marked with ★ Star
              </span>
            </div>

            <div
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                editingPopularName
                  ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                  : openIconPickerIndex === 'popular'
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-card border-border/40 hover:border-border/70'
              }`}
            >
              {editingPopularName ? (
                <div className="flex items-center space-x-2 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenIconPickerIndex(openIconPickerIndex === 'popular' ? null : 'popular')}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                      openIconPickerIndex === 'popular'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/30'
                        : 'border-border/60 bg-muted/40 hover:bg-muted text-foreground hover:border-amber-500/50'
                    }`}
                    title="Change featured section icon"
                  >
                    {renderCategoryIcon(draftPopularCategory?.icon || 'star', 14)}
                  </button>
                  <input
                    type="text"
                    autoFocus
                    value={editingPopularValue}
                    onChange={(e) => setEditingPopularValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingPopularValue?.trim()) {
                          setDraftPopularCategory(prev => ({ ...prev, name: editingPopularValue.trim() }));
                        }
                        setEditingPopularName(false);
                      }
                      if (e.key === 'Escape') setEditingPopularName(false);
                    }}
                    className="flex-1 bg-background border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Section name (e.g. Popular, Bestsellers)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingPopularValue?.trim()) {
                        setDraftPopularCategory(prev => ({ ...prev, name: editingPopularValue.trim() }));
                      }
                      setEditingPopularName(false);
                    }}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                    title="Apply rename"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPopularName(false)}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => setOpenIconPickerIndex(openIconPickerIndex === 'popular' ? null : 'popular')}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                        openIconPickerIndex === 'popular'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/30'
                          : 'border-border/60 bg-muted/40 hover:bg-muted text-foreground hover:border-amber-500/50'
                      }`}
                      title={`Change icon for "${draftPopularCategory?.name || 'Popular'}"`}
                    >
                      {renderCategoryIcon(draftPopularCategory?.icon || 'star', 14)}
                    </button>
                    <span className="text-xs font-black text-foreground truncate">
                      {draftPopularCategory?.name || 'Popular'}
                    </span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                      ★ Starred ({draftMenuItems.filter(i => i.isPopular).length})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPopularValue(draftPopularCategory?.name || 'Popular');
                        setEditingPopularName(true);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                      title="Rename featured section"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* List of categories */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Food Categories
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {draftCategories.map((cat, index) => {
              const isEditing = editingCategoryIndex === index;
              const isFirst = index === 0;
              const isLast = index === draftCategories.length - 1;
              const catName = getCategoryName(cat);
              const catIcon = getCategoryIconKey(cat);
              const itemCount = draftMenuItems.filter(i => (i.category || '').toLowerCase() === catName.toLowerCase()).length;
              const isPickerActive = openIconPickerIndex === index;

              return (
                <div
                  key={`${catName}-${index}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isEditing
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/30'
                      : isPickerActive
                      ? 'bg-primary/5 border-primary/40'
                      : 'bg-muted/20 border-border/30 hover:border-border/60'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center space-x-2 w-full">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0 w-5">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenIconPickerIndex(openIconPickerIndex === index ? null : index)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                          isPickerActive
                            ? 'border-primary bg-primary/15 text-primary ring-2 ring-primary/30'
                            : 'border-border/60 bg-muted/40 hover:bg-muted text-foreground hover:border-primary/50'
                        }`}
                        title={`Change icon for "${catName}"`}
                      >
                        {renderCategoryIcon(catIcon, 14)}
                      </button>
                      <input
                        type="text"
                        autoFocus
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditDraftCategory(index);
                          if (e.key === 'Escape') handleCancelEditCategory();
                        }}
                        className="flex-1 bg-background border border-primary/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Category name"
                      />
                      <button
                        onClick={() => handleSaveEditDraftCategory(index)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                        title="Apply rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleCancelEditCategory}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0 w-5">
                          #{index + 1}
                        </span>
                        {/* Small Icon Button directly to the right of #1, #2 */}
                        <button
                          type="button"
                          onClick={() => setOpenIconPickerIndex(openIconPickerIndex === index ? null : index)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                            isPickerActive
                              ? 'border-primary bg-primary/15 text-primary ring-2 ring-primary/30'
                              : 'border-border/60 bg-muted/40 hover:bg-muted text-foreground hover:border-primary/50'
                          }`}
                          title={`Change icon for "${catName}"`}
                        >
                          {renderCategoryIcon(catIcon, 14)}
                        </button>
                        <span className="text-xs font-bold text-foreground truncate">{catName}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/40 border border-border/20 shrink-0">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveDraftCategory(index, -1)}
                          disabled={isFirst}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveDraftCategory(index, 1)}
                          disabled={isLast}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Rename / Edit */}
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(index, cat)}
                          className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                          title={`Rename category "${catName}"`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftCategory(index)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                          title={`Delete category "${catName}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new category form */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Add New Category</span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setOpenIconPickerIndex(openIconPickerIndex === 'new' ? null : 'new')}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                  openIconPickerIndex === 'new'
                    ? 'border-primary bg-primary/15 text-primary ring-2 ring-primary/30'
                    : 'border-border/60 bg-muted/40 hover:bg-muted text-foreground hover:border-primary/50'
                }`}
                title="Choose icon for new category"
              >
                {renderCategoryIcon(newCategoryIcon, 16)}
              </button>
              <input
                type="text"
                placeholder="Category Name (e.g. Soup)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDraftCategory();
                  }
                }}
                className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handleAddDraftCategory}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all shadow-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModalCategories}
              disabled={!hasCategoryChanges || isSavingCategories}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md ${
                !hasCategoryChanges || isSavingCategories
                  ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground pointer-events-none'
                  : 'bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer glow-hover'
              }`}
            >
              {isSavingCategories ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Categories...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Categories</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Side-Docked Windows-Emoji-Style Icon Selector Flyout */}
        {openIconPickerIndex !== null && (
          <div className="w-80 bg-card border border-border/60 p-4 rounded-2xl shadow-2xl animate-fade-in shrink-0 space-y-3 relative">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-foreground">
                  Category Icons
                </h4>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {openIconPickerIndex === 'popular'
                    ? `Select icon for "${draftPopularCategory?.name || 'Popular'}"`
                    : openIconPickerIndex === 'new'
                    ? 'Select icon for new category'
                    : `Select icon for "${getCategoryName(draftCategories[openIconPickerIndex])}"`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenIconPickerIndex(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                title="Close icon selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Monochrome Icon Grid */}
            <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {CATEGORY_ICON_PACK.map((item) => {
                const IconComp = item.icon;
                const currentSelectedKey = openIconPickerIndex === 'popular'
                  ? (draftPopularCategory?.icon || 'star')
                  : openIconPickerIndex === 'new'
                  ? newCategoryIcon
                  : getCategoryIconKey(draftCategories[openIconPickerIndex]);
                const isSelected = (currentSelectedKey || '').toLowerCase() === item.key.toLowerCase();

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectCategoryIcon(openIconPickerIndex, item.key)}
                    title={item.label}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                        : 'bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/30 hover:border-border/60'
                    }`}
                  >
                    <IconComp className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
