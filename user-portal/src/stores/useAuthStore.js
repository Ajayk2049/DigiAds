import { create } from 'zustand';
import axios from 'axios';
import { config, API_BASE } from '../config';

export const useAuthStore = create((set, get) => ({
  token: '',
  phone: '',
  name: '',
  roles: [],
  role: '',
  theme: 'light',
  activeTab: 'applications',
  mobileMenuOpen: false,
  userMenuOpen: false,
  roleActionLoading: false,

  setToken: (token) => set({ token }),
  setActiveTab: (activeTab) => {
    set({ activeTab });
    if (typeof window !== 'undefined') {
      localStorage.setItem('merchantActiveTab', activeTab);
    }
  },
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setUserMenuOpen: (userMenuOpen) => set({ userMenuOpen }),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  hydrateAuth: (router) => {
    if (typeof window === 'undefined') return false;

    const storedToken = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedPhone = localStorage.getItem('phone');
    const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]');
    const storedTheme = localStorage.getItem('theme') || 'light';
    const savedTab = localStorage.getItem('merchantActiveTab') || 'applications';

    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!storedToken) {
      localStorage.clear();
      if (router) router.push('/login');
      return false;
    }

    if (role !== 'merchant') {
      if (storedRoles.includes('merchant')) {
        axios.post(`${API_BASE}/auth/switch-role`, { role: 'merchant' }, {
          headers: { Authorization: `Bearer ${storedToken}` }
        }).then(res => {
          localStorage.setItem('token', res.data.data.token);
          localStorage.setItem('role', res.data.data.user.role);
          localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
          window.location.reload();
        }).catch(err => {
          console.error('Role auto-switch failed:', err);
          localStorage.clear();
          if (router) router.push('/login');
        });
        return false;
      }
      if (role === 'advertiser') {
        if (router) router.push('/advertiser');
      } else {
        localStorage.clear();
        if (router) router.push('/login');
      }
      return false;
    }

    set({
      token: storedToken,
      phone: storedPhone || '',
      name: localStorage.getItem('name') || '',
      roles: storedRoles,
      role: role || '',
      theme: storedTheme,
      activeTab: savedTab
    });

    return true;
  },

  handleSwitchRole: async (targetRole, router) => {
    const { token } = get();
    if (!token) return;
    set({ roleActionLoading: true });
    try {
      const res = await axios.post(`${API_BASE}/auth/switch-role`, { role: targetRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('role', res.data.data.user.role);
        localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
        if (targetRole === 'advertiser') {
          if (router) router.push('/advertiser');
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('handleSwitchRole error:', err);
    } finally {
      set({ roleActionLoading: false });
    }
  },

  handleLogout: (router) => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    if (router) router.push('/login');
  }
}));
