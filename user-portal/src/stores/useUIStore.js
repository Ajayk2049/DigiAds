import { create } from 'zustand';

let toastTimeout = null;

export const useUIStore = create((set) => ({
  toast: null,
  showToast: (message, type = 'success') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: { message, type } });
    toastTimeout = setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },
  clearToast: () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: null });
  },
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
