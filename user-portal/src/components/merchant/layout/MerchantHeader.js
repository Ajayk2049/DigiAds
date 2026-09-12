'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useOrderStore } from '@/stores/useOrderStore';
import {
  FileText as Form,
  LayoutDashboard,
  UtensilsCrossed,
  Megaphone,
  Salad,
  CreditCard,
  Sun,
  Moon,
  Menu as MenuIcon,
  X,
  ChevronDown,
  ChevronUp,
  MonitorSmartphone,
  Pencil,
  Tablet,
  RefreshCw,
  LogOut
} from 'lucide-react';

export default function MerchantHeader(props) {
  const router = useRouter();
  const internalUserMenuRef = useRef(null);

  const auth = useAuthStore();
  const outlet = useOutletStore();
  const order = useOrderStore();

  const applications = props.applications ?? outlet.applications;
  const hasApprovedVenue = props.hasApprovedVenue ?? (typeof outlet.getHasApprovedVenue === 'function' ? outlet.getHasApprovedVenue() : (outlet.applications || []).some(a => a.status === 'approved'));
  const activeTab = props.activeTab ?? auth.activeTab;
  const setActiveTab = props.setActiveTab ?? auth.setActiveTab;
  const token = props.token ?? auth.token;
  const orders = props.orders ?? order.orders;
  const toggleTheme = props.toggleTheme ?? auth.toggleTheme;
  const theme = props.theme ?? auth.theme;
  const mobileMenuOpen = props.mobileMenuOpen ?? auth.mobileMenuOpen;
  const setMobileMenuOpen = props.setMobileMenuOpen ?? auth.setMobileMenuOpen;
  const userMenuOpen = props.userMenuOpen ?? auth.userMenuOpen;
  const setUserMenuOpen = props.setUserMenuOpen ?? auth.setUserMenuOpen;
  const userMenuRef = props.userMenuRef ?? internalUserMenuRef;
  const name = props.name ?? auth.name;
  const phone = props.phone ?? auth.phone;
  const roles = props.roles ?? auth.roles;
  const roleActionLoading = props.roleActionLoading ?? auth.roleActionLoading;
  const handleSwitchRole = props.handleSwitchRole ?? ((r) => auth.handleSwitchRole(r, router));
  const handleLogout = props.handleLogout ?? (() => auth.handleLogout(router));
  const openEditApplicationModal = props.openEditApplicationModal ?? outlet.openEditApplicationModal;
  const setShowGetMoreDevicesModal = props.setShowGetMoreDevicesModal ?? outlet.setShowGetMoreDevicesModal;
  const setReqRequestTablet = props.setReqRequestTablet ?? outlet.setReqRequestTablet;
  const setReqTabletQuantity = props.setReqTabletQuantity ?? outlet.setReqTabletQuantity;
  const setReqRequestScreen = props.setReqRequestScreen ?? outlet.setReqRequestScreen;
  const setReqScreenQuantity = props.setReqScreenQuantity ?? outlet.setReqScreenQuantity;
  const setReqDeviceError = props.setReqDeviceError ?? outlet.setReqDeviceError;
  const fetchVenueAnalytics = props.fetchVenueAnalytics ?? outlet.fetchVenueAnalytics;
  const analyticsDays = props.analyticsDays ?? outlet.analyticsDays;


  return (
    <>
      <header className="border-b border-border/40 bg-card px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <img src="/digiads-icon.svg" alt="DigiAds Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
          <span className="font-outfit text-sm sm:text-md font-bold text-foreground brandLogo truncate">Merchant Portal</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1.5 md:space-x-2">
          {applications.length === 0 && !hasApprovedVenue && (
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Form className={`w-4 h-4 ${activeTab === 'applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className="hidden sm:inline">Host Applications</span>
            </button>
          )}
          {applications.length > 0 && !hasApprovedVenue && (
            <button
              onClick={() => setActiveTab('my-applications')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'my-applications'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Form className={`w-4 h-4 ${activeTab === 'my-applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className="hidden sm:inline">Your Applications</span>
            </button>
          )}
          {hasApprovedVenue && (
            <>
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  if (fetchVenueAnalytics) fetchVenueAnalytics(token, analyticsDays);
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-primary-foreground' : 'text-primary'}`} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              {applications.some(app => app.status === 'approved' && app.requestTablet) && (
                <>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'menu'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <UtensilsCrossed className={`w-4 h-4 ${activeTab === 'menu' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Menu Manager</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('promos')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'promos'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Megaphone className={`w-4 h-4 ${activeTab === 'promos' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Venue Promos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Salad className={`w-4 h-4 ${activeTab === 'orders' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Live Orders</span>
                    {orders.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-background shadow-md select-none pointer-events-none">
                        {orders.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                      activeTab === 'payment'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${activeTab === 'payment' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Payment History</span>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Desktop Theme toggle */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer items-center justify-center shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Mobile Hamburger Menu button */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setUserMenuOpen(false);
            }}
            className="md:hidden p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-sm"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-foreground" /> : <MenuIcon className="w-4 h-4 text-foreground" />}
          </button>

          {/* User profile dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl transition-all cursor-pointer shadow-sm select-none"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-black">
                {(name || phone || 'U')[0].toUpperCase()}
              </div>
              <span className="text-xs font-bold text-foreground max-w-[120px] truncate">{name || phone}</span>
              {userMenuOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-card border border-border/40 shadow-lg py-1.5 z-40 animate-fade-in text-xs font-semibold">
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-[10px] text-muted-foreground leading-none">Logged in as</p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate">{name || phone}</p>
                </div>

                {applications.length > 0 && !hasApprovedVenue && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveTab('my-applications');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Form className="w-4 h-4 text-[#0069a8]" />
                      <span>Your Applications</span>
                    </button>
                  </div>
                )}

                {applications.length > 0 && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveTab('devices');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <MonitorSmartphone className="w-4 h-4 text-emerald-500" />
                      <span>Devices</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        if (openEditApplicationModal) openEditApplicationModal(applications[0]);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                      <span>Edit Venue Details</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowGetMoreDevicesModal(true);
                        setReqRequestTablet(false);
                        setReqTabletQuantity('1');
                        setReqRequestScreen(false);
                        setReqScreenQuantity('1');
                        setReqDeviceError('');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Tablet className="w-4 h-4 text-blue-500" />
                      <span>Get More Devices</span>
                    </button>

                    {roles.includes('advertiser') && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          if (handleSwitchRole) handleSwitchRole('advertiser');
                        }}
                        disabled={roleActionLoading}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                      >
                        <RefreshCw className={`w-4 h-4 text-indigo-500 ${roleActionLoading ? 'animate-spin' : ''}`} />
                        <span>Switch to Advertiser</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (handleLogout) handleLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-destructive font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/40 bg-card/95 backdrop-blur-md px-4 py-3 space-y-1.5 shadow-md sticky top-[57px] z-20 animate-fade-in">
          {applications.length === 0 && !hasApprovedVenue && (
            <button
              onClick={() => {
                setActiveTab('applications');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Form className={`w-4 h-4 ${activeTab === 'applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span>Host Applications</span>
            </button>
          )}
          {applications.length > 0 && !hasApprovedVenue && (
            <button
              onClick={() => {
                setActiveTab('my-applications');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my-applications'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Form className={`w-4 h-4 ${activeTab === 'my-applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span>Your Applications</span>
            </button>
          )}
          {hasApprovedVenue && (
            <>
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  if (fetchVenueAnalytics) fetchVenueAnalytics(token, analyticsDays);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>Dashboard</span>
              </button>
              {applications.some(app => app.status === 'approved' && app.requestTablet) && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('menu');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'menu'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <UtensilsCrossed className={`w-4 h-4 ${activeTab === 'menu' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span>Menu Manager</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('promos');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'promos'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Megaphone className={`w-4 h-4 ${activeTab === 'promos' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span>Venue Promos</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('orders');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Salad className={`w-4 h-4 ${activeTab === 'orders' ? 'text-primary-foreground' : 'text-primary'}`} />
                      <span>Live Orders</span>
                    </div>
                    {orders.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-sm">
                        {orders.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('payment');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'payment'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${activeTab === 'payment' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span>Payment History</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Theme Toggle in Mobile Drawer */}
          <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between px-3 py-1.5">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              Appearance
            </span>
            <button
              onClick={toggleTheme}
              className="px-2.5 py-1 text-[11px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-all"
            >
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
