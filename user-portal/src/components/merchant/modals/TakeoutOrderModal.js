import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Clock, Plus } from 'lucide-react';
import { getCategoryName, getCategoryIconKey, renderCategoryIcon } from '../common/constants';
import { useOrderStore } from '@/stores/useOrderStore';
import { useMenuStore } from '@/stores/useMenuStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function TakeoutOrderModal(props) {
  const order = useOrderStore();
  const menu = useMenuStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;

  const isOpen = props.isOpen ?? order.showTakeoutModal;
  const onClose = props.onClose ?? (() => order.setShowTakeoutModal(false));
  const menuShifts = props.menuShifts ?? menu.menuShifts;
  const activeShift = props.activeShift ?? menu.activeShift;
  const menuCategories = props.menuCategories ?? menu.menuCategories;
  const menuItems = props.menuItems ?? menu.menuItems;
  const applications = props.applications ?? outlet.applications;
  const activeOrderVenueTab = props.activeOrderVenueTab ?? order.activeOrderVenueTab;
  const selectedOutletId = props.selectedOutletId ?? outlet.selectedOutletId;
  const approvedOutlets = props.approvedOutlets ?? (typeof outlet.getApprovedOutlets === 'function' ? outlet.getApprovedOutlets() : (outlet.applications || []).filter(a => a.status === 'approved' && a.requestTablet));
  const isSubmitting = props.isSubmitting ?? order.isSubmittingTakeout;

  const onSubmitOrder = props.onSubmitOrder ?? ((cart) => {
    const targetAppId = activeOrderVenueTab || selectedOutletId || (approvedOutlets[0] ? approvedOutlets[0]._id : null);
    return order.submitTakeoutOrder(token, cart, targetAppId);
  });

  const [takeoutActiveShift, setTakeoutActiveShift] = useState(activeShift || 'All');
  const [takeoutActiveCategory, setTakeoutActiveCategory] = useState('');
  const [takeoutCart, setTakeoutCart] = useState([]);

  useEffect(() => {
    if (activeShift) {
      setTakeoutActiveShift(activeShift);
    }
  }, [activeShift]);

  useEffect(() => {
    if (menuCategories && menuCategories.length > 0 && !takeoutActiveCategory) {
      setTakeoutActiveCategory(getCategoryName(menuCategories[0]));
    }
  }, [menuCategories, takeoutActiveCategory]);

  if (!isOpen) return null;

  const handleClose = () => {
    setTakeoutCart([]);
    onClose();
  };

  const targetAppId = activeOrderVenueTab || selectedOutletId || (approvedOutlets[0] ? approvedOutlets[0]._id : null);
  const currentApp = applications.find(a => a._id === targetAppId) || approvedOutlets[0] || {};
  const activeVenueBillConfig = currentApp.billConfig || {};

  const subtotalPaise = takeoutCart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const subtotalRs = subtotalPaise / 100;
  const cgstPct = typeof activeVenueBillConfig.cgstPercent === 'number' ? activeVenueBillConfig.cgstPercent : 2.5;
  const sgstPct = typeof activeVenueBillConfig.sgstPercent === 'number' ? activeVenueBillConfig.sgstPercent : 2.5;
  const serviceTaxPct = typeof activeVenueBillConfig.serviceTaxPercent === 'number' ? activeVenueBillConfig.serviceTaxPercent : 0;
  const gstRate = cgstPct + sgstPct;
  const gstRs = subtotalRs * (gstRate / 100);
  const serviceTaxRs = subtotalRs * (serviceTaxPct / 100);
  const rawTotal = subtotalRs + gstRs + serviceTaxRs;
  const finalTotalRs = activeVenueBillConfig.enableAutoRoundOff !== false ? Math.ceil(rawTotal) : rawTotal;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[180] p-4 animate-fade-in exclude-uppercase">
      <div className="bg-card border border-border/40 rounded-2xl w-full max-w-4xl p-6 relative flex flex-col space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border-b border-border/40 pb-3">
          <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>Create Pickup / Takeout Order</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
            Browse category-wise venue items, add quantities, and place direct counter pickup orders.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Menu Categories & Items */}
          <div className="lg:col-span-7 space-y-4">
            {/* Takeout Shift Switcher Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/30">
              <span className="text-[10px] text-muted-foreground font-bold uppercase shrink-0 mr-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Shift:</span>
              </span>
              {menuShifts.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setTakeoutActiveShift(shift)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                    takeoutActiveShift === shift
                      ? 'bg-[#0069a8] text-white shadow-sm ring-1 ring-[#0069a8]'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{shift}</span>
                  {shift === activeShift && (
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white">Live</span>
                  )}
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {menuCategories.map((cat) => {
                const cName = getCategoryName(cat);
                const cIcon = getCategoryIconKey(cat);
                const isSelected = takeoutActiveCategory.toLowerCase() === cName.toLowerCase();
                return (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => setTakeoutActiveCategory(cName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {renderCategoryIcon(cIcon, 13)}
                    <span>{cName}</span>
                  </button>
                );
              })}
            </div>

            {/* Items List */}
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {menuItems
                .filter(i => {
                  const matchesCat = (i.category || '').toLowerCase() === takeoutActiveCategory.toLowerCase();
                  if (!matchesCat) return false;
                  if (i.isAvailable === false) return false;
                  if (i.isAllShifts === true) return true;
                  if (Array.isArray(i.shifts) && i.shifts.length > 0) {
                    return i.shifts.includes(takeoutActiveShift);
                  }
                  return true;
                })
                .map((item) => {
                  const cartEntry = takeoutCart.find(c => (c.item.itemId || c.item._id) === (item.itemId || item._id));
                  const qty = cartEntry ? cartEntry.quantity : 0;

                  return (
                    <div
                      key={item.itemId || item._id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3 pr-2">
                        <span className="font-extrabold text-xs text-foreground uppercase tracking-tight">{item.name}</span>
                        <span className="font-mono text-xs font-bold text-primary">₹{((item.price || 0) / 100).toFixed(2)}</span>
                      </div>

                      <div className="shrink-0">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => setTakeoutCart([...takeoutCart, { item, quantity: 1 }])}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 uppercase"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2 bg-muted px-2 py-1 rounded-lg border border-border/40">
                            <button
                              type="button"
                              onClick={() => {
                                if (qty <= 1) {
                                  setTakeoutCart(takeoutCart.filter(c => (c.item.itemId || c.item._id) !== (item.itemId || item._id)));
                                } else {
                                  setTakeoutCart(takeoutCart.map(c => (c.item.itemId || c.item._id) === (item.itemId || item._id) ? { ...c, quantity: c.quantity - 1 } : c));
                                }
                              }}
                              className="w-5 h-5 flex items-center justify-center text-foreground font-bold hover:bg-background rounded transition-colors cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-foreground px-1">{qty}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setTakeoutCart(takeoutCart.map(c => (c.item.itemId || c.item._id) === (item.itemId || item._id) ? { ...c, quantity: c.quantity + 1 } : c));
                              }}
                              className="w-5 h-5 flex items-center justify-center text-foreground font-bold hover:bg-background rounded transition-colors cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Live Pickup Cart */}
          <div className="lg:col-span-5 border-l border-border/40 pl-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                Pickup Order Summary
              </h4>

              {takeoutCart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-bold">No items added to pickup cart</p>
                  <p className="text-[10px]">Select items from menu categories on the left.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {takeoutCart.map((cEntry, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-muted/20 rounded-lg border border-border/30">
                      <div>
                        <p className="font-bold text-foreground">{cEntry.item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">₹{((cEntry.item.price || 0) / 100).toFixed(2)} x {cEntry.quantity}</p>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        ₹{(((cEntry.item.price || 0) * cEntry.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {takeoutCart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/40">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotalRs.toFixed(2)}</span>
                  </div>
                  {gstRate > 0 && (
                    <div className="flex justify-between font-semibold text-muted-foreground">
                      <span>GST ({gstRate.toFixed(1)}%):</span>
                      <span className="font-mono">₹{gstRs.toFixed(2)}</span>
                    </div>
                  )}
                  {serviceTaxPct > 0 && (
                    <div className="flex justify-between font-semibold text-muted-foreground">
                      <span>Service Tax ({serviceTaxPct}%):</span>
                      <span className="font-mono">₹{serviceTaxRs.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-foreground pt-1 border-t border-border/40">
                    <span>Total Order Value:</span>
                    <span className="font-mono text-primary">₹{finalTotalRs.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSubmitOrder(takeoutCart)}
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2 uppercase tracking-wider"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isSubmitting ? 'Placing Order...' : 'Place Pickup Order'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
