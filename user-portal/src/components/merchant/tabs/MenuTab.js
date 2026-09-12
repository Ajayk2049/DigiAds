'use client';

import React from 'react';
import { Clock, Sparkles, Settings, Plus, ChevronUp, ChevronDown, Pencil, Star, Trash2, UtensilsCrossed, Building } from 'lucide-react';
import { getCategoryName, getCategoryIconKey, renderCategoryIcon, resolveMediaUrl } from '../common/constants';
import { useMenuStore } from '@/stores/useMenuStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function MenuTab(props) {
  const menu = useMenuStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();

  const approvedOutlets = props.approvedOutlets ?? (typeof outlet.getApprovedOutlets === 'function' ? outlet.getApprovedOutlets() : (outlet.applications || []).filter(a => a.status === 'approved' && a.requestTablet));
  const selectedOutletId = outlet.selectedOutletId;
  const token = auth.token;

  const selectedMenuShift = props.selectedMenuShift ?? menu.selectedMenuShift;
  const setSelectedMenuShift = props.setSelectedMenuShift ?? menu.setSelectedMenuShift;
  const menuShifts = props.menuShifts ?? menu.menuShifts;
  const activeShift = props.activeShift ?? menu.activeShift;
  const handleSwitchShift = props.handleSwitchShift ?? ((shift) => menu.handleSwitchShift(token, selectedOutletId, shift));
  const switchingShift = props.switchingShift ?? menu.switchingShift;
  const setIsShiftModalOpen = props.setIsShiftModalOpen ?? menu.setIsShiftModalOpen;
  const openCategoryModal = props.openCategoryModal ?? menu.openCategoryModal;
  const addMenuItem = props.addMenuItem ?? menu.openCreateModal;
  const handleSaveMenu = props.handleSaveMenu ?? (() => menu.handleSaveMenu(token, selectedOutletId));
  const hasMenuChanges = props.hasMenuChanges ?? menu.hasMenuChanges;
  const menuCategories = props.menuCategories ?? menu.menuCategories;
  const menuItems = props.menuItems ?? menu.menuItems;
  const handleMoveMainCategory = props.handleMoveMainCategory ?? menu.handleMoveMainCategory;
  const openCreateModal = props.openCreateModal ?? menu.openCreateModal;
  const togglePopular = props.togglePopular ?? menu.togglePopular;
  const openEditModal = props.openEditModal ?? menu.openEditModal;
  const removeMenuItem = props.removeMenuItem ?? menu.removeMenuItem;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-outfit text-2xl font-black text-foreground mb-1">Food Items Catalog</h1>
          <p className="text-muted-foreground text-xs font-semibold">Design and manage shifting digital ordering menus displayed on tabletop tablets.</p>
        </div>
        {approvedOutlets.length > 0 && (
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Shift Selector Dropdown */}
            <div className="flex items-center space-x-2 bg-card border border-border/40 px-3 py-1.5 rounded-xl shadow-sm">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Shift:</span>
              <select
                value={selectedMenuShift}
                onChange={(e) => setSelectedMenuShift(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {menuShifts.map((shift) => (
                  <option key={shift} value={shift} className="bg-card text-foreground">
                    {shift} {shift === activeShift ? '● (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Switch Active Live Shift Action Button */}
            {selectedMenuShift === activeShift ? (
              <button
                type="button"
                disabled
                className="bg-muted text-muted-foreground border border-border/40 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 cursor-not-allowed opacity-80 shadow-sm"
                title="This shift is currently live on all customer tablet kiosks"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>● Active Live Shift</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSwitchShift(selectedMenuShift)}
                disabled={switchingShift}
                className="bg-[#0069a8] hover:bg-[#005a91] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                {switchingShift ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Switch to {selectedMenuShift} Menu</span>
                  </>
                )}
              </button>
            )}

            {/* Manage Shifts */}
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Manage Shifts</span>
            </button>

            {/* Manage Categories */}
            <button
              onClick={() => openCategoryModal()}
              className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Manage Categories</span>
            </button>

            {/* Add Item */}
            <button
              onClick={addMenuItem}
              className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>

            {/* Save Menu */}
            <button
              onClick={handleSaveMenu}
              disabled={!(typeof hasMenuChanges === 'function' ? hasMenuChanges() : hasMenuChanges)}
              className="bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer glow-hover"
            >
              Save Menu
            </button>
          </div>
        )}
      </div>

      {approvedOutlets.length > 0 ? (
        <div className="space-y-12">
          {menuCategories.map((category, catIndex) => {
            const catName = getCategoryName(category);
            const catIconKey = getCategoryIconKey(category);
            const items = menuItems.filter(item => {
              const matchesCat = (item.category || '').toLowerCase() === catName.toLowerCase();
              if (!matchesCat) return false;
              if (item.isAllShifts === true) return true;
              if (Array.isArray(item.shifts) && item.shifts.length > 0) {
                return item.shifts.includes(selectedMenuShift);
              }
              return true;
            });
            return (
              <div key={`${catName}-${catIndex}`} className="space-y-4">
                <div className="flex items-center space-x-3 bg-muted/20 dark:bg-muted/5 border border-border/40 px-4 py-3 rounded-xl shadow-sm">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                    {renderCategoryIcon(catIconKey, 16)}
                  </span>
                  <h3 className="font-outfit text-base md:text-lg font-black text-foreground tracking-widest uppercase">{catName}</h3>
                  <span className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/10 border border-border/20">
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>

                  {/* Quick Category Reordering & Rename */}
                  <div className="ml-auto flex items-center space-x-1">
                    <button
                      onClick={() => handleMoveMainCategory(catIndex, -1)}
                      disabled={catIndex === 0}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                      title="Move category up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveMainCategory(catIndex, 1)}
                      disabled={catIndex === menuCategories.length - 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                      title="Move category down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openCategoryModal(catIndex, catName)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                      title={`Rename category "${catName}"`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* CREATE NEW Card */}
                  <div
                    onClick={() => openCreateModal(catName)}
                    className="border border-dashed border-border/60 hover:border-primary/80 bg-card/5 hover:bg-card/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center mb-4 group-hover:border-primary/80 group-hover:bg-primary/5 transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-outfit text-xs font-bold text-foreground tracking-wide group-hover:text-primary transition-colors">CREATE NEW</span>
                    <span className="text-[10px] text-muted-foreground mt-2 max-w-[150px] leading-relaxed font-semibold">
                      Add food item to dynamic {catName.toLowerCase()} menu
                    </span>
                  </div>

                  {/* Items in this category */}
                  {items.map((item) => {
                    const originalIndex = menuItems.findIndex(i => i.itemId === item.itemId);
                    return (
                      <div
                        key={item.itemId}
                        className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 group"
                      >
                        {/* Overlay Edit/Delete/Star Controls */}
                        <div className="absolute top-6 right-6 z-10 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePopular(originalIndex);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${item.isPopular
                              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                              : 'bg-white dark:bg-black hover:bg-muted border-border/40 text-muted-foreground'
                              }`}
                            title={item.isPopular ? "Remove from Popular section" : "Add to Popular section"}
                          >
                            <Star className={`w-4 h-4 ${item.isPopular ? 'fill-white' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item, originalIndex);
                            }}
                            className="p-1.5 bg-white dark:bg-black hover:bg-muted border border-border/40 rounded-lg text-foreground transition-all cursor-pointer shadow-sm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMenuItem(originalIndex);
                            }}
                            className="p-1.5 bg-red-600 hover:bg-red-700 border border-red-500/20 rounded-lg text-white transition-all cursor-pointer shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div
                          onClick={() => openEditModal(item, originalIndex)}
                          className="cursor-pointer flex-1 flex flex-col"
                        >
                          <div className="relative w-full h-40 overflow-hidden rounded-xl bg-muted/10 mb-4 shrink-0 border border-border/20">
                            {item.isPopular && (
                              <div className="absolute top-2 left-2 z-10 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md">
                                <Star className="w-3 h-3 fill-white" />
                                <span>POPULAR</span>
                              </div>
                            )}
                            {item.imageUrl ? (
                              <img
                                src={resolveMediaUrl(item.imageUrl)}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-foreground font-bold uppercase p-4 text-center">
                                <UtensilsCrossed className="w-8 h-8 mb-2 opacity-40" />
                                No Image
                              </div>
                            )}
                          </div>

                          <h4 className="font-outfit text-xs font-black text-foreground uppercase tracking-wider mb-2 line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-3 mb-4 h-12 leading-relaxed font-semibold">{item.description || 'No description.'}</p>
                        </div>

                        <button
                          onClick={() => openEditModal(item, originalIndex)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl text-center text-xs tracking-wider transition-colors mt-auto shadow-md"
                        >
                          ₹{(item.price / 100).toFixed(2)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Approved Outlets Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">You need an approved host application before you can start designing menus for kiosks.</p>
        </div>
      )}
    </div>
  );
}
