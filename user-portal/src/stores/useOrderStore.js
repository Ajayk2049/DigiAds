import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';
import { useUIStore } from './useUIStore';

const getApiBase = () => config.apiUrl;
const getWsBase = () => config.wsUrl;

let ws = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let isExplicitlyDisconnected = false;

export const useOrderStore = create((set, get) => ({
  orders: [],
  paymentOrders: [],
  activeOrderVenueTab: typeof window !== 'undefined' ? localStorage.getItem('activeOrderVenueTab') || '' : '',
  unreadOrderVenues: new Set(),
  wsConnected: false,

  // Printing Modal State
  showPrintBillModal: false,
  printingOrder: null,
  activeBillConfig: null,
  selectedPrintWidth: '80mm',

  // Payment Confirmation State
  confirmingPaymentOrderId: null,

  // Takeout Order Modal State
  showTakeoutModal: false,
  takeoutActiveCategory: 'Starters',
  takeoutCart: [],
  isSubmittingTakeout: false,

  // Setters
  setActiveOrderVenueTab: (tab) => {
    set({ activeOrderVenueTab: tab });
    if (typeof window !== 'undefined') localStorage.setItem('activeOrderVenueTab', tab);
    set(state => {
      const next = new Set(state.unreadOrderVenues);
      next.delete(tab);
      return { unreadOrderVenues: next };
    });
  },
  setShowPrintBillModal: (show) => set({ showPrintBillModal: show }),
  setPrintingOrder: (order) => set({ printingOrder: order }),
  setActiveBillConfig: (cfg) => set({ activeBillConfig: cfg }),
  setSelectedPrintWidth: (w) => set({ selectedPrintWidth: w }),
  setConfirmingPaymentOrderId: (id) => set({ confirmingPaymentOrderId: id }),

  setShowTakeoutModal: (show) => set({ showTakeoutModal: show }),
  setTakeoutActiveCategory: (cat) => set({ takeoutActiveCategory: cat }),
  setTakeoutCart: (cart) => set({
    takeoutCart: typeof cart === 'function' ? cart(get().takeoutCart) : cart
  }),

  // Actions
  fetchLiveOrders: async (token, queryParams = {}, signal = null) => {
    if (!token) return;
    try {
      const params = { limit: 1000, ...queryParams };
      const res = await axios.get(`${getApiBase()}/host/orders`, {
        params,
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });
      const allOrders = res.data.data || [];
      const completed = allOrders.filter(
        ord => ord.paymentStatus === 'completed' && ((ord.totalAmount || 0) > 0 || (ord.items && ord.items.length > 0))
      );
      const live = allOrders.filter(
        ord => ord.tableStatus !== 'completed' && ord.tableStatus !== 'completed_acked' && ord.orderStatus !== 'cancelled'
      );
      set({ paymentOrders: completed, orders: live });
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      console.error('fetchLiveOrders error:', err);
    }
  },

  connectWebSocket: (token, onDeviceStatusChanged) => {
    if (!token || typeof window === 'undefined') return;

    isExplicitlyDisconnected = false;
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const wsBase = getWsBase();
    const wsUrl = `${wsBase}/ws/orders?token=${encodeURIComponent(token)}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
        set({ wsConnected: true });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.event === 'new_order' ||
            data.event === 'order_update' ||
            data.event === 'table_session' ||
            data.event === 'waiter_call' ||
            data.event === 'waiter_serviced'
          ) {
            get().fetchLiveOrders(token);
            if (data.event === 'new_order' && data.data?.hostApplicationId) {
              if (data.data.hostApplicationId !== get().activeOrderVenueTab) {
                set(state => {
                  const next = new Set(state.unreadOrderVenues);
                  next.add(data.data.hostApplicationId);
                  return { unreadOrderVenues: next };
                });
              }
            }
          } else if (data.event === 'device_status_changed') {
            if (onDeviceStatusChanged) onDeviceStatusChanged();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        set({ wsConnected: false });
        if (isExplicitlyDisconnected) return;
        reconnectAttempts++;
        const baseDelay = Math.min(30000, 2000 * Math.pow(1.5, Math.min(reconnectAttempts, 6)));
        const jitter = Math.floor(Math.random() * 1500);
        const delay = baseDelay + jitter;
        reconnectTimer = setTimeout(() => {
          if (!isExplicitlyDisconnected) {
            get().connectWebSocket(token, onDeviceStatusChanged);
          }
        }, delay);

      };

      ws.onerror = () => {
        // Clean error suppression to avoid terminal log pollution
      };
    } catch (err) {
      reconnectAttempts++;
      const delay = Math.min(30000, 3000 * Math.pow(1.5, Math.min(reconnectAttempts, 6)));
      reconnectTimer = setTimeout(() => {
        if (!isExplicitlyDisconnected) {
          get().connectWebSocket(token, onDeviceStatusChanged);
        }
      }, delay);
    }
  },

  disconnectWebSocket: () => {
    isExplicitlyDisconnected = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
    set({ wsConnected: false });
  },

  updateOrderStatus: async (token, orderId, newStatus) => {
    try {
      await axios.post(`${getApiBase()}/host/orders/update-status`, { orderId, orderStatus: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
    } catch (err) {
      console.error('updateOrderStatus error:', err);
    }
  },

  confirmOrder: async (token, orderId) => {
    try {
      await axios.post(`${getApiBase()}/host/orders/confirm`, { orderId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
    } catch (err) {
      console.error('confirmOrder error:', err);
    }
  },

  closeTable: async (token, orderId) => {
    const { showToast } = useUIStore.getState();
    try {
      await axios.post(`${getApiBase()}/host/orders/close-table`, { orderId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to close table.';
      if (msg.includes('UPI ID') || msg.includes('UPI')) {
        showToast('No UPI Account Configured', 'error');
      } else {
        showToast(msg, 'error');
      }
    }
  },

  markPaymentReceived: async (token, orderId, paymentType = 'CASH') => {
    try {
      await axios.post(`${getApiBase()}/host/orders/payment-received`, { orderId, paymentType }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
      if (typeof window !== 'undefined') {
        try {
          const { useOutletStore } = require('./useOutletStore');
          useOutletStore.getState().fetchVenueAnalytics(token, useOutletStore.getState().analyticsDays);
        } catch (e) {}
      }
    } catch (err) {
      console.error('markPaymentReceived error:', err);
    }
  },

  serviceWaiter: async (token, orderId) => {
    try {
      await axios.post(`${getApiBase()}/host/orders/service-waiter`, { orderId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
    } catch (err) {
      console.error('serviceWaiter error:', err);
    }
  },

  toggleGstExemption: async (token, orderId, removeGst) => {
    const { showToast } = useUIStore.getState();
    try {
      await axios.post(`${getApiBase()}/host/orders/toggle-gst`, { orderId, removeGst }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
      showToast(removeGst ? 'GST removed from order' : 'GST restored on order', 'success');
    } catch (err) {
      console.error('toggleGstExemption error:', err);
      showToast('Failed to update order GST', 'error');
    }
  },

  toggleServiceTaxExemption: async (token, orderId, removeServiceTax) => {
    const { showToast } = useUIStore.getState();
    try {
      await axios.post(`${getApiBase()}/host/orders/toggle-service-tax`, { orderId, removeServiceTax }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchLiveOrders(token);
      showToast(removeServiceTax ? 'Service Tax removed from order' : 'Service Tax restored on order', 'success');
    } catch (err) {
      console.error('toggleServiceTaxExemption error:', err);
      showToast('Failed to update Service Tax', 'error');
    }
  },

  submitTakeoutOrder: async (token, cart, targetAppId) => {
    if (!targetAppId || !cart || cart.length === 0) return;
    set({ isSubmittingTakeout: true });
    try {
      const itemsPayload = cart.map(cItem => ({
        itemId: cItem.item.itemId || cItem.item._id,
        name: cItem.item.name,
        quantity: cItem.quantity,
        price: Number(cItem.item.price || 0)
      }));

      await axios.post(`${getApiBase()}/host/orders/takeout`, {
        hostApplicationId: targetAppId,
        items: itemsPayload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({ showTakeoutModal: false, takeoutCart: [] });
      get().fetchLiveOrders(token);
    } catch (err) {
      console.error('submitTakeoutOrder error:', err);
    } finally {
      set({ isSubmittingTakeout: false });
    }
  },

  openPrintBillModal: async (order, targetAppId, token) => {
    set({ printingOrder: order });
    if (targetAppId && token) {
      try {
        const res = await axios.get(`${getApiBase()}/host/bill-config/${targetAppId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.data) {
          set({
            activeBillConfig: res.data.data,
            selectedPrintWidth: res.data.data.billWidthFormat || '80mm'
          });
        }
      } catch (err) {
        console.error('fetchBillConfig error in openPrintBillModal:', err);
      }
    }
    set({ showPrintBillModal: true });
  }
}));
