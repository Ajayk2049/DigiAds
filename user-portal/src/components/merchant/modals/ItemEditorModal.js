'use client';

import React, { useRef } from 'react';
import { X, Star, Clock, UtensilsCrossed, Pencil, Trash2, Sliders, Plus } from 'lucide-react';
import { resolveMediaUrl, getCategoryName } from '../common/constants';
import { useMenuStore } from '@/stores/useMenuStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOutletStore } from '@/stores/useOutletStore';

export default function ItemEditorModal(props) {
  const menu = useMenuStore();
  const auth = useAuthStore();
  const outlet = useOutletStore();
  const localFileInputRef = useRef(null);

  const isOpen = props.isOpen ?? menu.isMenuModalOpen;
  const onClose = props.onClose ?? (() => menu.setIsMenuModalOpen(false));
  const editingItemIndex = props.editingItemIndex ?? menu.editingItemIndex;
  const modalForm = props.modalForm ?? menu.modalForm;
  const setModalForm = props.setModalForm ?? menu.setModalForm;
  const menuCategories = props.menuCategories ?? menu.menuCategories;
  const menuShifts = props.menuShifts ?? menu.menuShifts;
  const selectedMenuShift = props.selectedMenuShift ?? menu.selectedMenuShift;
  const activeShift = props.activeShift ?? menu.activeShift;
  const zoomFactor = props.zoomFactor ?? menu.zoomFactor;
  const setZoomFactor = props.setZoomFactor ?? menu.setZoomFactor;
  const imageTab = props.imageTab ?? menu.imageTab;
  const setImageTab = props.setImageTab ?? menu.setImageTab;
  const fileInputRef = props.fileInputRef ?? localFileInputRef;
  const handleModalImageUpload = props.handleModalImageUpload ?? ((e) => menu.handleModalImageUpload(e, auth.token, props.outletId ?? outlet.selectedOutletId));
  const handleSaveModalItem = props.handleSaveModalItem ?? menu.handleSaveModalItem;

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
      <div className="w-full max-w-2xl bg-card border border-border/40 p-5 md:p-6 rounded-2xl shadow-2xl relative text-foreground max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-outfit text-md font-bold uppercase tracking-wider mb-5 text-foreground">
          {editingItemIndex === -1 ? 'Create Food Catalog Item' : 'Edit Food Catalog Item'}
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                required
                placeholder="Name of item"
                value={modalForm.name || ''}
                onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              {(() => {
                const hasDirectVariant = (modalForm.customizations || []).some(g => g.pricingType === 'direct' && (g.options || []).length > 0);
                return (
                  <div>
                    {hasDirectVariant && (
                      <div className="flex items-center justify-between pb-1 px-1">
                        <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center space-x-1">
                          <span>★ Card Display Price (from Default Size)</span>
                        </span>
                      </div>
                    )}
                    <input
                      type="text"
                      required
                      placeholder={hasDirectVariant ? "Card Display Price (₹)" : "Price (₹)"}
                      value={modalForm.price || ''}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d.]/g, '');
                        setModalForm(prev => {
                          const updated = { ...prev, price: cleaned };
                          if ((prev.customizations || []).some(g => g.pricingType === 'direct')) {
                            const cust = prev.customizations.map(g => {
                              if (g.pricingType !== 'direct') return g;
                              const opts = (g.options || []).map(o => {
                                if (o.isDefault) {
                                  return { ...o, extraPrice: cleaned };
                                }
                                return o;
                              });
                              return { ...g, options: opts };
                            });
                            updated.customizations = cust;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full bg-background dark:bg-black/20 border ${hasDirectVariant ? 'border-amber-400/50 focus:ring-amber-500' : 'border-input focus:ring-primary'} rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:border-transparent transition-all`}
                    />
                  </div>
                );
              })()}
            </div>

            <div>
              <textarea
                placeholder="Brief description about the dish..."
                value={modalForm.description || ''}
                onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-20 bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <select
                value={modalForm.category || ''}
                onChange={(e) => setModalForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer"
              >
                {menuCategories.map(cat => {
                  const cName = getCategoryName(cat);
                  return (
                    <option key={cName} value={cName} className="bg-card text-foreground">
                      {cName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="modalItemAvailable"
                checked={modalForm.isAvailable}
                onChange={(e) => setModalForm(prev => ({ ...prev, isAvailable: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary cursor-pointer border border-input"
              />
              <label htmlFor="modalItemAvailable" className="text-xs font-bold text-foreground cursor-pointer uppercase select-none">
                Available for Ordering
              </label>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="modalItemPopular"
                checked={modalForm.isPopular}
                onChange={(e) => setModalForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer border border-input"
              />
              <label htmlFor="modalItemPopular" className="text-xs font-bold text-foreground cursor-pointer uppercase select-none flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline mr-1" />
                <span>Feature in Popular Section</span>
              </label>
            </div>

            {/* Shift Assignment Section */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="modalItemAllShifts"
                  checked={modalForm.isAllShifts === true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setModalForm(prev => ({
                      ...prev,
                      isAllShifts: checked,
                      shifts: checked ? [] : (prev.shifts && prev.shifts.length > 0 ? prev.shifts : [selectedMenuShift || activeShift || 'Breakfast'])
                    }));
                  }}
                  className="w-4 h-4 rounded accent-primary cursor-pointer border border-input"
                />
                <label htmlFor="modalItemAllShifts" className="text-xs font-bold text-foreground cursor-pointer uppercase select-none flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-primary inline mr-1" />
                  <span>Available in All Shifts (All-Day)</span>
                </label>
              </div>

              {!modalForm.isAllShifts && (
                <div className="pl-6 space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Select Specific Shifts:</span>
                  <div className="flex flex-wrap gap-2">
                    {menuShifts.map((shift) => {
                      const isSelected = Array.isArray(modalForm.shifts) && modalForm.shifts.includes(shift);
                      return (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => {
                            setModalForm(prev => {
                              const currentShifts = Array.isArray(prev.shifts) ? [...prev.shifts] : [];
                              const nextShifts = currentShifts.includes(shift)
                                ? currentShifts.filter(s => s !== shift)
                                : [...currentShifts, shift];
                              return { ...prev, shifts: nextShifts.length > 0 ? nextShifts : [shift] };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary shadow-sm'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{shift}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Image Upload & Food Preference */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="relative w-full h-36 overflow-hidden rounded-xl border border-border/40 bg-muted/30 dark:bg-black/40 flex items-center justify-center shrink-0">
                {modalForm.imageUrl ? (
                  <div className="w-full h-full overflow-hidden">
                    <img
                      src={resolveMediaUrl(modalForm.imageUrl)}
                      alt="Preview"
                      style={{ transform: `scale(${zoomFactor / 100})` }}
                      className="w-full h-full object-cover transition-transform"
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-xs p-3 font-semibold uppercase">
                    <UtensilsCrossed className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-foreground/70">No Cover Photo</span>
                  </div>
                )}

                {/* Pencil and Delete overlay */}
                <div className="absolute top-2 right-2 flex space-x-1.5 bg-black/50 backdrop-blur-sm p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:text-primary text-white transition-colors"
                    title="Edit Image"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {modalForm.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this cover image?")) {
                          setModalForm(prev => ({ ...prev, imageUrl: '' }));
                        }
                      }}
                      className="p-1 hover:text-destructive text-white transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Tab Navigation */}
              <div className="border-b border-border/40">
                <div className="flex space-x-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`pb-1.5 border-b-2 transition-all uppercase ${imageTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('url')}
                    className={`pb-1.5 border-b-2 transition-all uppercase ${imageTab === 'url' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Direct URL Link
                  </button>
                </div>
              </div>

              {/* Upload Inputs */}
              <div className="min-h-[40px] flex items-center">
                {imageTab === 'upload' ? (
                  <div className="w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleModalImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-background hover:bg-muted border border-input rounded-xl py-2 text-xs font-semibold text-foreground transition-all cursor-pointer text-center uppercase"
                    >
                      Choose Cover Image
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={modalForm.imageUrl?.startsWith('http') ? modalForm.imageUrl : (imageTab === 'url' ? (modalForm.imageUrl?.startsWith('/') ? '' : modalForm.imageUrl) : '')}
                    onChange={(e) => setModalForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                  />
                )}
              </div>

              {/* Zoom Factor Slider */}
              {modalForm.imageUrl && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Zoom Factor</span>
                    <span className="text-primary">{zoomFactor}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="200"
                    value={zoomFactor}
                    onChange={(e) => setZoomFactor(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}

              {/* Dietary Preference Selector */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Food Preference</span>
                <div className="flex items-center space-x-6">
                  {/* Veg Radio Option */}
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="modalIsVeg"
                      checked={modalForm.isVeg === true}
                      onChange={() => setModalForm(prev => ({ ...prev, isVeg: true }))}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                    <div className="w-5 h-5 border-2 border-emerald-600 rounded flex items-center justify-center bg-emerald-500/10 shrink-0">
                      <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Veg</span>
                  </label>

                  {/* Non-Veg Radio Option */}
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="modalIsVeg"
                      checked={modalForm.isVeg === false}
                      onChange={() => setModalForm(prev => ({ ...prev, isVeg: false }))}
                      className="w-4 h-4 accent-red-500 cursor-pointer"
                    />
                    <div className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center bg-red-500/10 shrink-0">
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-red-600" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Non-Veg</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customisation Options Section */}
        <div className="mt-6 pt-5 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Customisation Options & Add-ons</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Add custom choices for this dish (e.g. Portion Size, Sweetener, Extra toppings).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setModalForm(prev => ({
                  ...prev,
                  customizations: [
                    ...(prev.customizations || []),
                    { title: '', pricingType: 'addon', isMultiple: false, isRequired: false, options: [{ name: '', extraPrice: '0', isDefault: false }] }
                  ]
                }));
              }}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Group</span>
            </button>
          </div>

          {(!modalForm.customizations || modalForm.customizations.length === 0) ? (
            <div className="p-3.5 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center text-xs text-muted-foreground">
              No customisations configured. Customers will order this dish directly without extra options.
            </div>
          ) : (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {modalForm.customizations.map((group, gIdx) => {
                const isDirect = group.pricingType === 'direct';
                return (
                  <div key={gIdx} className="p-3.5 rounded-xl border border-border/50 bg-muted/20 dark:bg-black/20 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder={isDirect ? "Group Title (e.g., Pack Size, Portion)" : "Group Title (e.g., Milk Choice, Toppings)"}
                          value={group.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalForm(prev => {
                              const cust = [...prev.customizations];
                              cust[gIdx] = { ...cust[gIdx], title: val };
                              return { ...prev, customizations: cust };
                            });
                          }}
                          className="w-full bg-background dark:bg-black/40 border border-input rounded-lg px-3 py-1.5 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      {/* Pricing Type Toggle */}
                      <div className="flex items-center bg-background dark:bg-black/40 p-0.5 rounded-lg border border-input text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setModalForm(prev => {
                              const cust = [...prev.customizations];
                              cust[gIdx] = { ...cust[gIdx], pricingType: 'addon', isMultiple: false, isRequired: false };
                              return { ...prev, customizations: cust };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${!isDirect ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          +₹ Add-on
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalForm(prev => {
                              const cust = [...prev.customizations];
                              const opts = (cust[gIdx].options || []).map((o, idx) => ({
                                ...o,
                                isDefault: idx === 0
                              }));
                              cust[gIdx] = { ...cust[gIdx], pricingType: 'direct', isMultiple: false, isRequired: Boolean(cust[gIdx].isRequired), options: opts };
                              return { ...prev, customizations: cust };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${isDirect ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          ₹ Direct Price (Size/Pack)
                        </button>
                      </div>

                      <div className="flex items-center space-x-3">
                        {!isDirect ? (
                          <>
                            <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={group.isMultiple}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setModalForm(prev => {
                                    const cust = [...prev.customizations];
                                    cust[gIdx] = { ...cust[gIdx], isMultiple: val };
                                    return { ...prev, customizations: cust };
                                  });
                                }}
                                className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              />
                              <span className="text-[11px] text-muted-foreground">Multi-select</span>
                            </label>

                            <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer select-none bg-background dark:bg-black/30 border border-input rounded-lg px-2.5 py-1">
                              <input
                                type="checkbox"
                                checked={group.isRequired}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setModalForm(prev => {
                                    const cust = [...prev.customizations];
                                    cust[gIdx] = { ...cust[gIdx], isRequired: val };
                                    return { ...prev, customizations: cust };
                                  });
                                }}
                                className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              />
                              <span className={`text-[11px] font-bold ${group.isRequired ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {group.isRequired ? "Mandatory Popup (CUSTOMISE button)" : "1-Tap ADD (Default Price)"}
                              </span>
                            </label>
                          </>
                        ) : (
                          <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer select-none bg-background dark:bg-black/30 border border-input rounded-lg px-2.5 py-1">
                            <input
                              type="checkbox"
                              checked={Boolean(group.isRequired)}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setModalForm(prev => {
                                  const cust = [...prev.customizations];
                                  cust[gIdx] = { ...cust[gIdx], isRequired: val };
                                  return { ...prev, customizations: cust };
                                });
                              }}
                              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                            />
                            <span className={`text-[11px] font-bold ${group.isRequired ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {group.isRequired ? "Mandatory Popup (CUSTOMISE button)" : "1-Tap ADD (Default Size)"}
                            </span>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setModalForm(prev => ({
                              ...prev,
                              customizations: prev.customizations.filter((_, idx) => idx !== gIdx)
                            }));
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Remove Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Group Options */}
                    <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>{isDirect ? "Pack Sizes / Variants (Direct Retail Price)" : "Options & Extra Pricing"}</span>
                        {isDirect && <span className="text-amber-500 lowercase font-normal italic">★ Click star to set default / card price</span>}
                      </div>

                      {group.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center space-x-2">
                          {isDirect && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalForm(prev => {
                                  const cust = [...prev.customizations];
                                  const opts = cust[gIdx].options.map((o, idx) => ({
                                    ...o,
                                    isDefault: idx === oIdx
                                  }));
                                  cust[gIdx] = { ...cust[gIdx], options: opts };
                                  const newCardPrice = opts[oIdx].extraPrice;
                                  return {
                                    ...prev,
                                    price: newCardPrice || prev.price,
                                    customizations: cust
                                  };
                                });
                              }}
                              className={`p-1 rounded-md transition-all cursor-pointer ${opt.isDefault ? 'text-amber-400 bg-amber-500/15 border border-amber-400/30' : 'text-muted-foreground hover:text-foreground'}`}
                              title={opt.isDefault ? "Default / Featured Card Price" : "Click to set as Default Card Price"}
                            >
                              ★
                            </button>
                          )}
                          <input
                            type="text"
                            placeholder={isDirect ? "Variant name (e.g. 100 Gm, 600 Gm)" : "Option name (e.g. Regular / With Sugar)"}
                            value={opt.name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setModalForm(prev => {
                                const cust = [...prev.customizations];
                                const opts = [...cust[gIdx].options];
                                opts[oIdx] = { ...opts[oIdx], name: val };
                                cust[gIdx] = { ...cust[gIdx], options: opts };
                                return { ...prev, customizations: cust };
                              });
                            }}
                            className="flex-1 bg-background dark:bg-black/30 border border-input rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                          />
                          <div className="w-28 flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground font-mono">{isDirect ? '₹' : '+₹'}</span>
                            <input
                              type="text"
                              placeholder="0"
                              value={opt.extraPrice || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^\d.]/g, '');
                                setModalForm(prev => {
                                  const cust = [...prev.customizations];
                                  const opts = [...cust[gIdx].options];
                                  opts[oIdx] = { ...opts[oIdx], extraPrice: val };
                                  cust[gIdx] = { ...cust[gIdx], options: opts };
                                  const updatedForm = { ...prev, customizations: cust };
                                  if (isDirect && opts[oIdx].isDefault) {
                                    updatedForm.price = val;
                                  }
                                  return updatedForm;
                                });
                              }}
                              className="w-full bg-background dark:bg-black/30 border border-input rounded-lg px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setModalForm(prev => {
                                const cust = [...prev.customizations];
                                const opts = cust[gIdx].options.filter((_, idx) => idx !== oIdx);
                                cust[gIdx] = { ...cust[gIdx], options: opts };
                                return { ...prev, customizations: cust };
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Remove Option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setModalForm(prev => {
                            const cust = [...prev.customizations];
                            const opts = [...cust[gIdx].options, { name: '', extraPrice: '0', isDefault: false }];
                            cust[gIdx] = { ...cust[gIdx], options: opts };
                            return { ...prev, customizations: cust };
                          });
                        }}
                        className="text-[11px] text-primary hover:underline font-bold flex items-center space-x-1 cursor-pointer pt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border/40 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer uppercase"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveModalItem}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-xs cursor-pointer uppercase shadow-md"
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
}
