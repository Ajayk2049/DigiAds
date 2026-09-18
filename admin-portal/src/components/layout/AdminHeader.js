'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  X,
  Bell
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';
import { NAV_ITEMS } from './AdminSidebar';

export default function AdminHeader({ onSelectHost, onOpenHostModal, onSelectCampaign, onOpenCampaignModal }) {
  const activeTab = useAdminStore((s) => s.activeTab);
  const searchQuery = useAdminStore((s) => s.searchQuery);
  const setSearchQuery = useAdminStore((s) => s.setSearchQuery);
  const setMobileMenuOpen = useAdminStore((s) => s.setMobileMenuOpen);
  const hosts = useAdminStore((s) => s.hosts);
  const campaigns = useAdminStore((s) => s.campaigns);

  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);
  const notificationsRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('adminReadNotifications');
      if (stored) setReadNotifications(JSON.parse(stored));
    } catch (e) {}
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationsList = () => {
    const list = [];
    hosts.filter((h) => h.status === 'pending').forEach((app) => {
      list.push({
        id: `host_${app._id}`,
        title: 'New Venue Application',
        description: `Outlet: ${app.outletName} (${app.city})`,
        type: 'host',
        target: app,
        time: new Date(app.createdAt)
      });
    });

    campaigns.filter((c) => c.paymentStatus === 'completed' && c.approvalStatus === 'pending').forEach((booking) => {
      list.push({
        id: `campaign_${booking.bookingId}`,
        title: 'New Ad Campaign',
        description: `Campaign ${booking.bookingId} - ${booking.outletId?.outletName || 'Outlet'}`,
        type: 'campaign',
        target: booking,
        time: new Date(booking.createdAt)
      });
    });

    const now = new Date();
    campaigns.filter((c) => c.paymentStatus === 'completed' && c.approvalStatus === 'approved').forEach((booking) => {
      const expiryDate = new Date(booking.createdAt);
      expiryDate.setDate(expiryDate.getDate() + (booking.adDurationDays || 0));
      if (expiryDate < now) {
        list.push({
          id: `expired_${booking.bookingId}`,
          title: 'Expired Ad Subscription',
          description: `Campaign ${booking.bookingId} — ${booking.outletId?.outletName || 'Venue'}`,
          type: 'expired',
          target: booking,
          time: expiryDate
        });
      }
    });

    return list.sort((a, b) => b.time - a.time);
  };

  const notificationsList = getNotificationsList();
  const unreadNotificationsCount = notificationsList.filter((n) => !readNotifications.includes(n.id)).length;

  const markAllNotificationsAsRead = () => {
    const allIds = notificationsList.map((n) => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('adminReadNotifications', JSON.stringify(allIds));
  };

  const handleNotificationClick = (item) => {
    if (!readNotifications.includes(item.id)) {
      const updated = [...readNotifications, item.id];
      setReadNotifications(updated);
      localStorage.setItem('adminReadNotifications', JSON.stringify(updated));
    }

    if (item.type === 'host') {
      if (onSelectHost) onSelectHost(item.target);
      if (onOpenHostModal) onOpenHostModal();
    } else if (item.type === 'campaign' || item.type === 'expired') {
      if (onSelectCampaign) onSelectCampaign(item.target);
      if (onOpenCampaignModal) onOpenCampaignModal();
    }
    setShowNotifications(false);
  };

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Dashboard';

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 md:hidden hover:bg-muted border border-border rounded-xl text-muted-foreground cursor-pointer"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-outfit text-base font-bold text-foreground">
          {activeLabel}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global Search Bar (Direct Table & Panel Filtering) */}
        <div className="relative hidden sm:block w-72 lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search venues, campaigns, users, devices, phone, IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground relative transition-colors duration-200 cursor-pointer"
            title="Notifications feed"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 space-y-3"
              >
                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h4 className="font-outfit text-xs font-bold text-foreground">Notifications Alert Feed</h4>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1 text-xs">
                  {notificationsList.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground text-xs font-semibold">No active notifications</p>
                  ) : (
                    notificationsList.map((item) => {
                      const isUnread = !readNotifications.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3 rounded-xl border transition-colors duration-200 cursor-pointer ${
                            isUnread
                              ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                              : 'bg-background/40 border-border/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-foreground">{item.title}</span>
                            <span className="text-[9px] text-muted-foreground font-medium">{item.time.toLocaleDateString()}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
