import axios from 'axios';
import { API_BASE } from '../../config';

export const createAuthSlice = (set, get) => ({
  theme: 'light',
  token: '',
  phone: '',
  name: '',
  roles: [],
  activeTab: 'bookings',
  mobileMenuOpen: false,
  userMenuOpen: false,
  roleActionLoading: false,

  // Toast System
  toasts: [],
  showToast: (type, message) => {
    const id = Date.now() + Math.random();
    set(state => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 5000);
  },
  dismissToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', next);
  },
  setToken: (token) => set({ token }),
  setPhone: (phone) => set({ phone }),
  setName: (name) => set({ name }),
  setRoles: (roles) => set({ roles }),
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    localStorage.setItem('advertiserActiveTab', tab);
  },
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setUserMenuOpen: (open) => set({ userMenuOpen: open }),

  hydrateAuth: (router) => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('theme') || 'light';
    set({ theme: storedTheme });
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const storedToken = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedPhone = localStorage.getItem('phone');
    const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]');

    if (!storedToken) {
      localStorage.clear();
      if (router) router.push('/login');
      return;
    }

    if (role !== 'advertiser') {
      if (storedRoles.includes('advertiser')) {
        axios.post(`${API_BASE}/auth/switch-role`, { role: 'advertiser' }, {
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
        return;
      }
      if (role === 'merchant') {
        if (router) router.push('/merchant');
      } else {
        localStorage.clear();
        if (router) router.push('/login');
      }
      return;
    }

    const savedTab = localStorage.getItem('advertiserActiveTab');
    if (savedTab) {
      set({ activeTab: savedTab });
    }

    set({
      token: storedToken,
      phone: storedPhone || '',
      name: localStorage.getItem('name') || '',
      roles: storedRoles
    });
  }
});
