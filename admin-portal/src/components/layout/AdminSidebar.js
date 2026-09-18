'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  FileCheck,
  Building,
  Tv,
  Megaphone,
  Smartphone,
  RefreshCw,
  Users,
  Percent,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export const NAV_ITEMS = [
  { id: 'stats', label: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'requests', label: 'Requests', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'venues', label: 'Venues', icon: <Building className="w-4 h-4" /> },
  { id: 'advertisers', label: 'Advertisers', icon: <Tv className="w-4 h-4" /> },
  { id: 'platform_ads', label: 'Platform Ads', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'devices', label: 'Devices', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'ota', label: 'OTA Updates', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'rates', label: 'Ad Rates', icon: <Percent className="w-4 h-4" /> }
];

export default function AdminSidebar() {
  const activeTab = useAdminStore((s) => s.activeTab);
  const setActiveTab = useAdminStore((s) => s.setActiveTab);
  const sidebarCollapsed = useAdminStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAdminStore((s) => s.setSidebarCollapsed);
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const mobileMenuOpen = useAdminStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useAdminStore((s) => s.setMobileMenuOpen);
  const handleLogout = useAdminStore((s) => s.handleLogout);

  const hosts = useAdminStore((s) => s.hosts);
  const campaigns = useAdminStore((s) => s.campaigns);
  const deviceRequests = useAdminStore((s) => s.deviceRequests);

  const getTabBadgeCount = (tabId) => {
    if (tabId === 'requests') {
      const pendingHostsCount = hosts.filter((h) => h.status === 'pending').length;
      const pendingCampaignsCount = campaigns.filter(
        (c) =>
          c.paymentStatus === 'completed' &&
          c.approvalStatus === 'pending' &&
          c.mediaUrl &&
          c.mediaUrl.trim() !== '' &&
          (c.transcodeStatus === 'completed' || !c.transcodeStatus)
      ).length;
      const pendingDevicesCount = deviceRequests.filter((r) => r.status === 'pending').length;
      return pendingHostsCount + pendingCampaignsCount + pendingDevicesCount;
    }
    return 0;
  };

  const renderNavList = (isMobile = false) => (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const badgeCount = getTabBadgeCount(item.id);
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center py-2.5 text-xs font-bold transition-colors duration-200 cursor-pointer relative ${
              isActive
                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border-l-4 border-transparent'
            } ${sidebarCollapsed && !isMobile ? 'justify-center px-0' : 'px-3 space-x-2.5'}`}
            title={item.label}
            aria-label={item.label}
          >
            <div className="shrink-0 relative">{item.icon}</div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex-1 flex items-center justify-between min-w-0">
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                  {item.label}
                </motion.span>
                {badgeCount > 0 && (
                  <span className="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm pointer-events-none select-none">
                    {badgeCount}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Side Navigation Bar */}
      <aside
        className={`bg-card border-r border-border py-4 px-0 flex flex-col justify-between hidden md:flex transition-all duration-300 h-screen sticky top-0 shrink-0 select-none ${
          sidebarCollapsed ? 'w-14' : 'w-44'
        }`}
      >
        <div>
          <div className={`flex items-center mb-6 ${sidebarCollapsed ? 'justify-center' : 'px-3 space-x-2'}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="relative group w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all duration-300 hover:bg-muted/50"
              aria-label="Toggle Sidebar"
            >
              <div className="transition-all duration-300 transform group-hover:scale-0 group-hover:opacity-0 flex items-center justify-center">
                <img src="/digiads-icon.svg" alt="DigiAds Logo" className="w-6 h-6 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-white" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white" />
                )}
              </div>
            </button>

            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-outfit text-sm font-bold tracking-tight brandLogo truncate"
              >
                Digi<span className="text-primary">Ads</span>
              </motion.span>
            )}
          </div>

          {renderNavList(false)}
        </div>

        {/* Footer Sidebar Controls */}
        <div className="px-2 space-y-1.5 border-t border-border/50 pt-3">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : 'px-2.5 space-x-2.5'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            )}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2 rounded-lg text-xs font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : 'px-2.5 space-x-2.5'
            }`}
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              className="relative w-64 bg-card border-r border-border p-4 flex flex-col justify-between z-10 shadow-2xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center space-x-2">
                    <img src="/digiads-icon.svg" alt="DigiAds" className="w-6 h-6" />
                    <span className="font-outfit text-sm font-bold tracking-tight">
                      Digi<span className="text-primary">Ads</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {renderNavList(true)}
              </div>

              <div className="space-y-2 border-t border-border/50 pt-3">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer space-x-2.5"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-blue-500" />
                  )}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer space-x-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
