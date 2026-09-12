'use client';

import React from 'react';
import { Building, Clock, ShoppingBag, Bell, Receipt, CheckCircle } from 'lucide-react';
import { useOrderStore } from '@/stores/useOrderStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useMenuStore } from '@/stores/useMenuStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function OrdersTab(props) {
  const order = useOrderStore();
  const outlet = useOutletStore();
  const menu = useMenuStore();
  const auth = useAuthStore();
  const token = auth.token;

  const approvedOutlets = props.approvedOutlets ?? (typeof outlet.getApprovedOutlets === 'function' ? outlet.getApprovedOutlets() : (outlet.applications || []).filter(a => a.status === 'approved' && a.requestTablet));
  const applications = props.applications ?? outlet.applications;
  const activeShift = props.activeShift ?? menu.activeShift;
  const setTakeoutCart = props.setTakeoutCart ?? order.setTakeoutCart;
  const setTakeoutActiveCategory = props.setTakeoutActiveCategory ?? order.setTakeoutActiveCategory;
  const menuCategories = props.menuCategories ?? menu.menuCategories;
  const setShowTakeoutModal = props.setShowTakeoutModal ?? order.setShowTakeoutModal;
  const orders = props.orders ?? order.orders;
  const activeOrderVenueTab = props.activeOrderVenueTab ?? order.activeOrderVenueTab;
  const toggleGstExemption = props.toggleGstExemption ?? ((orderId, removeGst) => order.toggleGstExemption(token, orderId, removeGst));
  const toggleServiceTaxExemption = props.toggleServiceTaxExemption ?? ((orderId, removeTax) => order.toggleServiceTaxExemption(token, orderId, removeTax));
  const activeBillConfig = props.activeBillConfig ?? order.activeBillConfig;
  const updateOrderStatus = props.updateOrderStatus ?? ((orderId, status) => order.updateOrderStatus(token, orderId, status));
  const serviceWaiter = props.serviceWaiter ?? ((orderId) => order.serviceWaiter(token, orderId));
  const confirmingPaymentOrderId = props.confirmingPaymentOrderId ?? order.confirmingPaymentOrderId;
  const setConfirmingPaymentOrderId = props.setConfirmingPaymentOrderId ?? order.setConfirmingPaymentOrderId;
  const markPaymentReceived = props.markPaymentReceived ?? ((orderId, type) => order.markPaymentReceived(token, orderId, type));
  const closeTable = props.closeTable ?? ((orderId) => order.closeTable(token, orderId));

  if (approvedOutlets.length === 0) {
    return (
      <div className="animate-fade-in w-full">
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Approved Venue Outlets</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Approved host application venues supporting tablet devices will appear here automatically.</p>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(ord => ord.hostApplicationId === activeOrderVenueTab);

  const getStatusRank = (status) => {
    if (status === 'placed') return 1;
    if (status === 'cooking') return 2;
    if (status === 'served') return 3;
    return 4;
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const rankA = getStatusRank(a.orderStatus);
    const rankB = getStatusRank(b.orderStatus);
    if (rankA !== rankB) return rankA - rankB;

    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return timeA - timeB;
  });

  return (
    <div className="animate-fade-in w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b border-border/40 pb-4 gap-3 sm:gap-4">
        {/* Top Row on Mobile: Outlet Name + Live Status */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <h1 className="font-outfit text-xl sm:text-2xl font-black text-foreground uppercase tracking-wider truncate">
            {applications.find(app => app.status === 'approved')?.outletName || 'VENUE'}
          </h1>

          {/* Live Status Pill */}
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg shrink-0 sm:hidden">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </div>
        </div>

        {/* Actions & Menu Status Row */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg shrink-0">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Active Menu: <strong className="text-foreground">{activeShift}</strong></span>
          </div>

          <button
            onClick={() => {
              setTakeoutCart([]);
              setTakeoutActiveCategory(menuCategories[0] || 'Starters');
              setShowTakeoutModal(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-3.5 py-2 rounded-lg text-[11px] sm:text-xs flex items-center space-x-1.5 cursor-pointer shadow-md tracking-wider uppercase transition-all whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>+ Pickup Order</span>
          </button>

          {/* Live Status Pill for Desktop/Tablet */}
          <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </div>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">Waiting for live orders...</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">When customers place orders at dining tables or counter pickups, they will pop up here instantly.</p>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="pb-3 pr-2">Table / Type</th>
                <th className="pb-3 pr-2">Order ID</th>
                <th className="pb-3 pr-2 min-w-[180px]">Items</th>
                <th className="pb-3 pr-2">Amount</th>
                <th className="pb-3 pr-2">Status</th>
                <th className="pb-3 pr-2">Requests</th>
                <th className="pb-3 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((ord) => (
                <tr key={ord.orderId} className="hover:bg-muted/10">
                  <td className="py-4 pr-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        {ord.orderStatus === 'placed' && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        )}
                        <span className={`font-black px-3.5 py-1.5 rounded-xl text-sm whitespace-nowrap shadow-sm ${ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                          }`}>
                          {ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-2 font-mono font-bold text-foreground text-xs">
                    {ord.orderId}
                  </td>
                  <td className="py-4 pr-2 min-w-[180px] max-w-[260px]">
                    <div className="space-y-1 font-semibold text-foreground">
                      <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="text-xs flex flex-col space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-foreground break-words leading-tight" title={item.name}>
                                {item.name}{item.isPacked && !item.name?.includes('(PACK)') ? ' [PACK]' : ''}
                              </span>
                              <span className="text-muted-foreground shrink-0 font-mono text-[11px] mt-0.5">x {item.quantity}</span>
                            </div>
                            {item.customization ? (
                              <span className="text-[10px] text-primary/90 font-medium italic break-words leading-tight" title={item.customization}>
                                ↳ {item.customization}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 pr-2">
                    <div className="flex flex-col space-y-1.5 min-w-[120px]">
                      <div className="text-sm font-black font-mono text-foreground">
                        ₹{(ord.totalAmount / 100).toFixed(2)}
                      </div>
                      {/* GST Exemption Button */}
                      {ord.isGstExempt ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            No GST
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGstExemption(ord.orderId, false)}
                            className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                            title="Restore GST calculation"
                          >
                            Restore
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleGstExemption(ord.orderId, true)}
                          className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-all w-fit cursor-pointer flex items-center space-x-1"
                          title="Remove GST for items with GST-adjusted prices (Chai, Samosa, etc.)"
                        >
                          <span>Remove GST</span>
                        </button>
                      )}

                      {/* Service Tax Exemption Button */}
                      {(ord.serviceTaxPercent > 0 || ord.serviceTaxAmount > 0 || ord.isServiceTaxExempt || (activeBillConfig?.serviceTaxPercent > 0)) && (
                        ord.isServiceTaxExempt ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                              No Serv Tax
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleServiceTaxExemption(ord.orderId, false)}
                              className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                              title="Restore Service Tax calculation"
                            >
                              Restore
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleServiceTaxExemption(ord.orderId, true)}
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded-lg transition-all w-fit cursor-pointer flex items-center space-x-1"
                            title="Remove Service Tax from order"
                          >
                            <span>Remove Serv Tax</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>

                  <td className="py-4 pr-2">
                    <select
                      value={ord.orderStatus}
                      disabled={ord.orderStatus === 'served' || ord.orderStatus === 'cancelled'}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(ord.orderId, e.target.value);
                      }}
                      className={`text-xs font-black uppercase px-3.5 py-2.5 rounded-xl border focus:outline-none w-fit shadow-sm tracking-wide ${ord.orderStatus === 'placed'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 cursor-pointer'
                        : ord.orderStatus === 'cooking'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 cursor-pointer'
                          : ord.orderStatus === 'served'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-not-allowed opacity-90'
                            : ord.orderStatus === 'cancelled'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 cursor-not-allowed opacity-90'
                              : 'bg-muted-foreground/15 text-muted-foreground border-border/30'
                        }`}
                    >
                      {ord.orderStatus === 'placed' && (
                        <option value="placed" className="bg-card text-foreground">Placed</option>
                      )}
                      {(ord.orderStatus === 'placed' || ord.orderStatus === 'cooking') && (
                        <option value="cooking" className="bg-card text-foreground">Accepted & Preparing</option>
                      )}
                      <option value="served" className="bg-card text-foreground">Served</option>
                      {(ord.orderStatus === 'placed' || ord.orderStatus === 'cancelled') && (
                        <option value="cancelled" className="bg-card text-foreground text-red-500 font-bold">Cancel order</option>
                      )}
                    </select>
                  </td>
                  <td className="py-4 pr-2">
                    {ord.waiterCallStatus === 'pending' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          serviceWaiter(ord.orderId);
                        }}
                        title="Click to acknowledge request"
                        className="group inline-flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/40 text-xs font-black px-3 py-2 rounded-xl shadow-sm transition-all duration-150 select-none cursor-pointer shrink-0 animate-pulse"
                        style={{ animationDuration: '1.2s' }}
                      >
                        {ord.waiterCallOption?.toLowerCase().includes('bill') ? (
                          <Receipt className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400 animate-bounce" />
                        )}
                        <span>
                          {ord.waiterCallOption || 'Assistance'}
                          {ord.waiterCallCount > 1 ? ` x${ord.waiterCallCount}` : ''}
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 ml-0.5 text-red-600/70 dark:text-red-400/70 group-hover:text-red-600 transition-colors shrink-0" />
                      </button>
                    ) : ord.waiterCallStatus === 'serviced' ? (
                      <div className="inline-flex items-center gap-1 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit shrink-0 select-none">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span>Serviced</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 font-semibold px-2">-</span>
                    )}
                  </td>
                  <td className="py-4 pr-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                      {confirmingPaymentOrderId === ord.orderId ? (
                        <div className="flex items-center space-x-2 animate-fade-in whitespace-nowrap bg-muted/40 p-1.5 rounded-xl border border-border/40 shadow-sm" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-black text-foreground uppercase px-1">Via:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markPaymentReceived(ord.orderId, 'CASH');
                              setConfirmingPaymentOrderId(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
                          >
                            <span>💵 Cash</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markPaymentReceived(ord.orderId, 'UPI');
                              setConfirmingPaymentOrderId(null);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
                          >
                            <span>📱 UPI</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingPaymentOrderId(null);
                            }}
                            className="bg-muted hover:bg-muted/80 text-foreground font-bold px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border border-border/40 uppercase"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' || ord.tableStatus === 'close_table') ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingPaymentOrderId(ord.orderId);
                          }}
                          className="bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-black uppercase px-4 py-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm w-fit shrink-0 tracking-wide"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shrink-0 animate-ping" />
                          Mark As Received
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTable(ord.orderId);
                          }}
                          disabled={ord.orderStatus !== 'served' && (ord.items && ord.items.length > 0)}
                          className={`text-xs font-black uppercase px-4 py-2.5 rounded-xl border transition-all shadow-sm shrink-0 w-fit cursor-pointer tracking-wide ${
                            (ord.orderStatus === 'served' || (!ord.items || ord.items.length === 0))
                              ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20'
                              : 'bg-muted text-muted-foreground border-border/40 opacity-50 cursor-not-allowed'
                            }`}
                        >
                          Clear Table
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
