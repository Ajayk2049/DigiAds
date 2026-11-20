'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { config } from '@/config';
import KdsPinKeypad from '@/components/kitchen/KdsPinKeypad';
import KdsWaitingRadar from '@/components/kitchen/KdsWaitingRadar';
import KdsBoard from '@/components/kitchen/KdsBoard';
import { kdsAudio } from '@/components/kitchen/KdsAudioService';

export default function KitchenPage() {
  const [token, setToken] = useState(null);
  const [venueName, setVenueName] = useState('');
  const [stationName, setStationName] = useState('');
  const [pendingReqId, setPendingReqId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const wsRef = useRef(null);
  const wakeLockRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const isExplicitLogoutRef = useRef(false);

  // 1. Initial LocalStorage Hydration & WakeLock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('kds_token');
    const savedVenue = localStorage.getItem('kds_venue_name') || '';
    const savedStation = localStorage.getItem('kds_station_name') || '';
    const savedPendingReq = localStorage.getItem('kds_pending_req_id');

    if (savedToken) {
      setToken(savedToken);
      setVenueName(savedVenue);
      setStationName(savedStation);
    } else if (savedPendingReq) {
      setPendingReqId(savedPendingReq);
      setVenueName(savedVenue);
      setStationName(savedStation);
    }

    // Keep screen awake for kitchen prep lines
    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (_) {}
    };
    acquireWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquireWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // 2. Pending Approval Polling & WebSocket Listener
  useEffect(() => {
    if (!pendingReqId || token) return;

    let pollInterval = null;
    const checkStatus = async () => {
      try {
        const res = await axios.get(`${config.apiUrl}/kds/auth/status/${pendingReqId}`);
        if (res.data?.status === 'approved') {
          const approvedToken = res.data.token;
          const vName = res.data.venueName || venueName;
          localStorage.setItem('kds_token', approvedToken);
          localStorage.setItem('kds_venue_name', vName);
          localStorage.removeItem('kds_pending_req_id');

          setToken(approvedToken);
          setVenueName(vName);
          setPendingReqId(null);
          kdsAudio.playWelcomeChime();
          toast.success('Station connection approved!');
        } else if (res.data?.status === 'rejected') {
          localStorage.removeItem('kds_pending_req_id');
          setPendingReqId(null);
          setAuthError('Connection request was rejected by venue manager.');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          localStorage.removeItem('kds_pending_req_id');
          setPendingReqId(null);
          setAuthError('Approval request expired. Please enter PIN again.');
        }
      }
    };

    pollInterval = setInterval(checkStatus, 3000);
    checkStatus();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pendingReqId, token, venueName]);

  // 3. Fetch Orders Helper
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${config.apiUrl}/kds/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data?.data || []);
    } catch (_) {}
  }, [token]);

  // 4. Resilient WebSocket Connection Manager with Auto-Reconnect & Ping
  const connectWebSocket = useCallback(() => {
    if (!token || isExplicitLogoutRef.current) return;

    const wsUrl = config.wsUrl ? `${config.wsUrl}/ws/kitchen?token=${token}` : null;
    if (!wsUrl) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Reconnecting');
        }
      } catch (_) {}
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        fetchOrders();

        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ event: 'ping' })); } catch (_) {}
          }
        }, 20000);
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }

        if (!isExplicitLogoutRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, 2500);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
        try { ws.close(); } catch (_) {}
      };

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.event === 'pong') return;

          if (payload.event === 'new_order' && payload.data) {
            setOrders(prev => {
              if (prev.some(o => o.orderId === payload.data.orderId)) return prev;
              return [...prev, payload.data];
            });
            kdsAudio.playNewOrderChime();
            toast.info(`New order received! Table ${payload.data.tableNumber || 'Takeout'}`);
          } else if (payload.event === 'order_update' && payload.data) {
            setOrders(prev => {
              const updated = payload.data;
              if (['served', 'cancelled', 'completed'].includes(updated.orderStatus)) {
                return prev.filter(o => o.orderId !== updated.orderId);
              }
              return prev.map(o => o.orderId === updated.orderId ? { ...o, ...updated } : o);
            });
          }
        } catch (_) {}
      };
    } catch (_) {
      setWsConnected(false);
      if (!isExplicitLogoutRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    }
  }, [token, fetchOrders]);

  // 5. Connect and Listen to Tab Visibility / Window Focus for Instant Re-sync
  useEffect(() => {
    if (!token) return;

    isExplicitLogoutRef.current = false;
    connectWebSocket();

    const handleActiveResume = () => {
      if (document.visibilityState === 'visible') {
        // Tab resumed from background: immediately restore WebSocket and fetch tickets
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        } else {
          fetchOrders();
        }
      }
    };

    document.addEventListener('visibilitychange', handleActiveResume);
    window.addEventListener('focus', handleActiveResume);
    window.addEventListener('online', handleActiveResume);

    return () => {
      document.removeEventListener('visibilitychange', handleActiveResume);
      window.removeEventListener('focus', handleActiveResume);
      window.removeEventListener('online', handleActiveResume);

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        try { wsRef.current.close(1000, 'Unmount'); } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [token, connectWebSocket, fetchOrders]);

  // 6. Submit PIN Handler
  const handleSubmitPin = async (rawPin, stName) => {
    setLoading(true);
    setAuthError('');
    try {
      kdsAudio.init(); // User gesture unlocks browser Web Audio autoplay
      const res = await axios.post(`${config.apiUrl}/kds/auth/request-access`, {
        pin: rawPin,
        stationName: stName
      });

      const { requestId, venueName: vName } = res.data;
      localStorage.setItem('kds_pending_req_id', requestId);
      localStorage.setItem('kds_venue_name', vName || '');
      localStorage.setItem('kds_station_name', stName);

      setPendingReqId(requestId);
      setVenueName(vName || '');
      setStationName(stName);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Invalid PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Update Order Status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${config.apiUrl}/kds/orders/${orderId}/status`,
        { orderStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(prev => {
        if (['served', 'cancelled'].includes(newStatus)) return prev.filter(o => o.orderId !== orderId);
        return prev.map(o => o.orderId === orderId ? { ...o, orderStatus: newStatus } : o);
      });
      toast.success(
        newStatus === 'served' ? 'Order marked ready & served!' :
        newStatus === 'cancelled' ? 'Order rejected and cancelled' :
        'Order marked preparing'
      );
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  // 8. Logout / Disconnect Station
  const handleLogout = (forced = false) => {
    if (!forced && !confirm('Disconnect this kitchen display station? You will need manager approval to reconnect.')) return;
    isExplicitLogoutRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    if (wsRef.current) {
      try { wsRef.current.close(1000, 'Logout'); } catch (_) {}
      wsRef.current = null;
    }
    localStorage.removeItem('kds_token');
    localStorage.removeItem('kds_pending_req_id');
    setToken(null);
    setPendingReqId(null);
    setOrders([]);
    setWsConnected(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center">
      {!token && !pendingReqId && (
        <div className="p-4">
          <KdsPinKeypad onSubmit={handleSubmitPin} loading={loading} error={authError} />
        </div>
      )}

      {!token && pendingReqId && (
        <div className="p-4">
          <KdsWaitingRadar
            venueName={venueName}
            stationName={stationName}
            onCancel={() => {
              localStorage.removeItem('kds_pending_req_id');
              setPendingReqId(null);
            }}
          />
        </div>
      )}

      {token && (
        <KdsBoard
          venueName={venueName}
          stationName={stationName}
          orders={orders}
          wsConnected={wsConnected}
          onUpdateStatus={handleUpdateStatus}
          onLogout={handleLogout}
          token={token}
        />
      )}
    </div>
  );
}
