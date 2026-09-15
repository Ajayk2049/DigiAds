import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  ListVideo,
  Plus,
  Sun,
  Moon,
  X,
  Menu as MenuIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { config } from '@/config';
import { useAdvertiserStore } from '@/stores';

export default function AdvertiserHeader() {
  const router = useRouter();
  const userMenuRef = useRef(null);

  const {
    theme,
    toggleTheme,
    token,
    phone,
    name,
    roles,
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    userMenuOpen,
    setUserMenuOpen,
    roleActionLoading,
    bookings,
    activeUploadBooking,
    showToast
  } = useAdvertiserStore();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userMenuOpen, setUserMenuOpen]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleSwitchRole = async (targetRole) => {
    useAdvertiserStore.setState({ roleActionLoading: true });
    try {
      const res = await axios.post(`${config.apiUrl}/auth/switch-role`, { role: targetRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', res.data.data.user.role);
      localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
      router.push(targetRole === 'merchant' ? '/merchant' : '/advertiser');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to switch role.');
    } finally {
      useAdvertiserStore.setState({ roleActionLoading: false });
    }
  };

  return (
    <>
      <header className="border-b border-border/40 bg-card px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <img src="/digiads-icon.svg" alt="DigiAds Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" />
          <span className="font-outfit text-sm sm:text-md font-bold text-foreground brandLogo truncate">Advertiser Portal</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1.5 md:space-x-2">
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('bookings');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ListVideo className={`w-3.5 h-3.5 fill-current ${activeTab === 'bookings' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">My Campaigns</span>
          </button>
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('new-booking');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'new-booking'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Plus className={`w-3.5 h-3.5 fill-current ${activeTab === 'new-booking' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">Book Ad Spot</span>
          </button>
        </nav>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Desktop Theme toggle */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer items-center justify-center shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 fill-current" /> : <Moon className="w-4 h-4 text-indigo-500 fill-current" />}
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
              {userMenuOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border/40 shadow-lg py-1.5 z-40 animate-fade-in text-xs font-semibold">
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-[10px] text-muted-foreground leading-none">Logged in as</p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate">{name || phone}</p>
                </div>

                {bookings.length > 0 && roles.includes('merchant') && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSwitchRole('merchant');
                      }}
                      disabled={roleActionLoading}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <RefreshCw className={`w-4 h-4 text-indigo-500 ${roleActionLoading ? 'animate-spin' : ''}`} />
                      <span>Switch to Host</span>
                    </button>
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-destructive font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5 fill-current" />
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
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('bookings');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ListVideo className={`w-4 h-4 ${activeTab === 'bookings' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span>My Campaigns</span>
          </button>
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('new-booking');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'new-booking'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Plus className={`w-4 h-4 ${activeTab === 'new-booking' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span>Book Ad Spot</span>
          </button>

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
