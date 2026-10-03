import { create } from 'zustand';
import { toast } from 'sonner';

export const useUIStore = create((set) => ({
  toast: null,
  showToast: (message, type = 'success') => {
    if (type === 'error' || type === 'danger') {
      toast.error(message);
    } else if (type === 'warning') {
      toast.warning(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  },
  clearToast: () => {
    toast.dismiss();
  },
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
