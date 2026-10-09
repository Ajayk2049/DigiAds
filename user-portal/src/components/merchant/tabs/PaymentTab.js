'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Calendar, Download, FileText, Lock, Search, Loader2, Bell, Printer, ChevronLeft, ChevronRight, Receipt, CreditCard, IndianRupee } from 'lucide-react';
import VenueSubscriptionBills from './VenueSubscriptionBills';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

const getLocalDateString = (d = new Date()) => {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PaymentTab(props) {
  const payment = usePaymentStore();
  const order = useOrderStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;

  const paymentPagination = order.paymentPagination || { page: 1, limit: 40, total: 0, totalPages: 1 };

  const paymentCustomDate = props.paymentCustomDate ?? payment.paymentCustomDate;
  const setPaymentCustomDate = props.setPaymentCustomDate ?? payment.setPaymentCustomDate;
  const setExportPreset = props.setExportPreset ?? payment.setExportPreset;
  const setShowExportModal = props.setShowExportModal ?? payment.setShowExportModal;
  const selectedOutletId = props.selectedOutletId ?? outlet.selectedOutletId;
  const fetchBillConfig = props.fetchBillConfig ?? ((appId) => payment.fetchBillConfig(token, appId, outlet.applications));
  const setShowConfigureBillModal = props.setShowConfigureBillModal ?? payment.setShowConfigureBillModal;
  const setConfirmPasswordInput = props.setConfirmPasswordInput ?? payment.setConfirmPasswordInput;
  const setPasswordVerifyError = props.setPasswordVerifyError ?? payment.setPasswordVerifyError;
  const setShowPasswordModal = props.setShowPasswordModal ?? payment.setShowPasswordModal;
  const isSearchingPayments = props.isSearchingPayments ?? payment.isSearchingPayments;
  const setIsSearchingPayments = props.setIsSearchingPayments ?? payment.setIsSearchingPayments;
  const paymentSearchInput = props.paymentSearchInput ?? payment.paymentSearchInput;
  const setPaymentSearchInput = props.setPaymentSearchInput ?? payment.setPaymentSearchInput;
  const setDebouncedSearchQuery = props.setDebouncedSearchQuery ?? payment.setDebouncedSearchQuery;
  const openPrintBillModal = props.openPrintBillModal ?? ((ord) => order.openPrintBillModal(ord, selectedOutletId, token));

  const [activeSubTab, setActiveSubTab] = useState('orders'); // 'orders' | 'bills'

  const searchAbortControllerRef = useRef(null);

  // 1. Debounce search input changes by 300ms to avoid request spamming
  useEffect(() => {
    if (!paymentSearchInput.trim()) {
      setDebouncedSearchQuery('');
      setIsSearchingPayments(false);
      return;
    }

    setIsSearchingPayments(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(paymentSearchInput);
      setIsSearchingPayments(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [paymentSearchInput, setDebouncedSearchQuery, setIsSearchingPayments]);

  // 2. Fetch payment orders from backend when calendar date picker, selected outlet, or debounced search query changes
  useEffect(() => {
    if (!token) return;

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const queryParams = {};
    if (selectedOutletId) queryParams.hostApplicationId = selectedOutletId;

    const q = (payment.debouncedSearchQuery || '').trim();
    if (q) {
      queryParams.search = q;
    } else if (paymentCustomDate) {
      queryParams.startDate = paymentCustomDate;
      queryParams.endDate = paymentCustomDate;
    }

    setIsSearchingPayments(true);
    const fetcher = order.fetchPaymentOrders || order.fetchLiveOrders;
    fetcher(token, queryParams, controller.signal).finally(() => {
      setIsSearchingPayments(false);
    });

    return () => {
      controller.abort();
    };
  }, [token, selectedOutletId, paymentCustomDate, payment.debouncedSearchQuery, setIsSearchingPayments]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (paymentPagination.totalPages || 1)) return;
    order.setPaymentPage?.(newPage);
    const queryParams = { page: newPage, limit: 40 };
    if (selectedOutletId) queryParams.hostApplicationId = selectedOutletId;
    const q = (payment.debouncedSearchQuery || '').trim();
    if (q) {
      queryParams.search = q;
    } else if (paymentCustomDate) {
      queryParams.startDate = paymentCustomDate;
      queryParams.endDate = paymentCustomDate;
    }
    setIsSearchingPayments(true);
    const fetcher = order.fetchPaymentOrders || order.fetchLiveOrders;
    fetcher(token, queryParams).finally(() => {
      setIsSearchingPayments(false);
    });
  };

  // Compute sorted & filtered payment orders internally if not provided via props
  const computedOrders = useMemo(() => {
    if (props.sortedAndFilteredPaymentOrders) return props.sortedAndFilteredPaymentOrders;

    const sorted = [...order.paymentOrders].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    const activeQuery = (paymentSearchInput || payment.debouncedSearchQuery || '').trim();
    const isSearching = !!activeQuery;

    return sorted.filter(ord => {
      const ordDate = new Date(ord.createdAt || ord.updatedAt || Date.now());

      if (!isSearching && paymentCustomDate) {
        const targetDateStr = getLocalDateString(ordDate);
        if (targetDateStr !== paymentCustomDate) return false;
      }

      if (isSearching) {
        const q = activeQuery.toLowerCase();
        const orderIdMatch = (ord.orderId || '').toLowerCase().includes(q);
        const tableMatch = (ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? 'takeout' : `table ${ord.tableNumber}`).toLowerCase().includes(q);
        const paymentTypeMatch = (ord.paymentType || 'UPI').toLowerCase().includes(q);
        const amountMatch = (ord.totalAmount ? (ord.totalAmount / 100).toFixed(2) : '').includes(q) ||
          (ord.totalAmount ? (ord.totalAmount / 100).toString() : '').includes(q) ||
          (ord.totalAmount ? ord.totalAmount.toString() : '').includes(q);
        const itemsMatch = (ord.items || []).some(item => (item.name || '').toLowerCase().includes(q));
        const formattedDateStr = ordDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).toLowerCase();
        const dateMatch = formattedDateStr.includes(q);

        if (!orderIdMatch && !tableMatch && !paymentTypeMatch && !amountMatch && !itemsMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [props.sortedAndFilteredPaymentOrders, order.paymentOrders, paymentCustomDate, paymentSearchInput, payment.debouncedSearchQuery]);

  const sortedAndFilteredPaymentOrders = props.sortedAndFilteredPaymentOrders ?? computedOrders;

  return (
    <div className="animate-fade-in w-full">
      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 mb-6 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Customer POS Orders</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('bills')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'bills'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>DigiAds Subscription Bills</span>
        </button>
      </div>

      {activeSubTab === 'bills' ? (
        <VenueSubscriptionBills />
      ) : (
        <>
          {/* Header row */}
          <div className="flex justify-between items-center mb-6 border-b border-border/40 pb-4 flex-wrap gap-4">
            <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
              PAYMENT HISTORY
            </h1>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Standalone Calendar Date Picker */}
          <div
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input[type="date"]');
              if (input && typeof input.showPicker === 'function') {
                try { input.showPicker(); } catch (err) { }
              } else if (input) {
                input.focus();
              }
            }}
            className="flex items-center space-x-2 bg-card hover:bg-muted/50 border border-border/40 rounded-xl px-3.5 py-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Calendar className="w-4 h-4 text-primary shrink-0 pointer-events-none" />
            <input
              type="date"
              value={paymentCustomDate}
              onChange={(e) => setPaymentCustomDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer py-1"
            />
          </div>

          <button
            onClick={() => {
              setExportPreset('today');
              setShowExportModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Payments</span>
          </button>

          <button
            onClick={() => {
              if (selectedOutletId && fetchBillConfig) {
                fetchBillConfig(selectedOutletId);
              }
              setShowConfigureBillModal(true);
            }}
            className="bg-[#0069a8] hover:bg-[#0069a8] border border-border/40 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1.5"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Configure Bill</span>
          </button>

          <button
            onClick={() => {
              setConfirmPasswordInput('');
              setPasswordVerifyError('');
              setShowPasswordModal(true);
            }}
            className="bg-[#0069a8] hover:bg-[#005b94] text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
          >
            <Lock className="w-4 h-4" />
            <span>Configure UPI</span>
          </button>

          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm">
            {isSearchingPayments ? (
              <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
            ) : (
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
            <input
              type="text"
              placeholder="Search amount, table, dish, UPI, date, ID..."
              value={paymentSearchInput}
              onChange={(e) => setPaymentSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
            {paymentSearchInput && (
              <button
                onClick={() => {
                  setPaymentSearchInput('');
                  setDebouncedSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment orders table */}
      {sortedAndFilteredPaymentOrders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl w-full">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No completed payment orders found</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust search parameters or date filters to locate specific transaction records.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredPaymentOrders.map((ord, idx) => {
                const ordDateObj = new Date(ord.createdAt || ord.updatedAt || Date.now());
                const formattedDateTime = ordDateObj.toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <tr key={ord.orderId || idx} className="border-b border-border/60 hover:bg-muted/15 transition-colors">
                    <td className="py-4 px-4 text-center font-bold text-muted-foreground text-xs">
                      {((paymentPagination.page || 1) - 1) * 40 + idx + 1}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`font-black px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap shadow-sm inline-block ${ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                        }`}>
                        {ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-foreground text-xs">
                      {ord.orderId}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1 font-semibold text-foreground">
                        {ord.items && ord.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="text-xs">
                            <div>{item.name}{item.isPacked && !item.name?.includes('(PACK)') ? ' [PACK]' : ''} &nbsp;&nbsp; <span className="text-muted-foreground">x &nbsp;{item.quantity}</span></div>
                            {item.customization ? (
                              <div className="text-[10px] text-primary/80 italic pl-2">↳ {item.customization}</div>
                            ) : null}
                          </div>
                        ))}
                        <div className="w-16 border-t-2 border-border/50 my-1.5"></div>
                        <div className="text-xs font-bold text-foreground">
                          Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="w-fit text-xs font-black uppercase px-3.5 py-2 rounded-xl flex items-center border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm">
                        <span className="w-2 h-2 rounded-full mr-2 shrink-0 bg-emerald-500" />
                        Paid {ord.paymentType ? `(${ord.paymentType})` : ''}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-muted-foreground text-xs whitespace-nowrap">
                      {formattedDateTime}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openPrintBillModal(ord)}
                        className="bg-card hover:bg-muted text-foreground border border-border/40 text-xs font-black uppercase px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 cursor-pointer transition-all shadow-md whitespace-nowrap tracking-wide"
                        title="Print Thermal Bill"
                      >
                        <Printer className="w-4 h-4 text-primary" />
                        <span>Print Bill</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Fastify Pagination Controls (40 orders per page) */}
          {(paymentPagination.totalPages > 1 || (paymentPagination.total || 0) > 40) && (
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-card/20 rounded-b-2xl mt-2 flex-wrap gap-3">
              <div className="text-xs text-muted-foreground font-semibold">
                Showing <span className="font-bold text-foreground">{((paymentPagination.page || 1) - 1) * 40 + 1}</span> to <span className="font-bold text-foreground">{Math.min((paymentPagination.page || 1) * 40, paymentPagination.total || sortedAndFilteredPaymentOrders.length)}</span> of <span className="font-bold text-foreground">{paymentPagination.total || sortedAndFilteredPaymentOrders.length}</span> completed orders (40 / page)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePageChange((paymentPagination.page || 1) - 1)}
                  disabled={(paymentPagination.page || 1) <= 1}
                  className="p-2 rounded-xl bg-card border border-border/40 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold text-foreground px-2">
                  Page {paymentPagination.page || 1} of {paymentPagination.totalPages || 1}
                </div>
                <button
                  type="button"
                  onClick={() => handlePageChange((paymentPagination.page || 1) + 1)}
                  disabled={(paymentPagination.page || 1) >= (paymentPagination.totalPages || 1)}
                  className="p-2 rounded-xl bg-card border border-border/40 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
