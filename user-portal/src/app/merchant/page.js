'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import useModalDismiss from '@/hooks/useModalDismiss';

// Zustand Domain Stores
import {
  useUIStore,
  useAuthStore,
  useOutletStore,
  useOrderStore,
  useMenuStore,
  usePaymentStore,
  usePromoStore
} from '@/stores';

// Layout Component
import MerchantHeader from '@/components/merchant/layout/MerchantHeader';

// Feature Tabs (Loaded Dynamically on demand)
const DashboardTab = dynamic(() => import('@/components/merchant/tabs/DashboardTab'), { ssr: false });
const ApplicationsTab = dynamic(() => import('@/components/merchant/tabs/ApplicationsTab'), { ssr: false });
const MyApplicationsTab = dynamic(() => import('@/components/merchant/tabs/MyApplicationsTab'), { ssr: false });
const DevicesTab = dynamic(() => import('@/components/merchant/tabs/DevicesTab'), { ssr: false });
const MenuTab = dynamic(() => import('@/components/merchant/tabs/MenuTab'), { ssr: false });
const OrdersTab = dynamic(() => import('@/components/merchant/tabs/OrdersTab'), { ssr: false });
const PromosTab = dynamic(() => import('@/components/merchant/tabs/PromosTab'), { ssr: false });
const PaymentTab = dynamic(() => import('@/components/merchant/tabs/PaymentTab'), { ssr: false });

// Modals (Loaded Dynamically on demand)
const ItemEditorModal = dynamic(() => import('@/components/merchant/modals/ItemEditorModal'), { ssr: false });
const ManageCategoriesModal = dynamic(() => import('@/components/merchant/modals/ManageCategoriesModal'), { ssr: false });
const ManageShiftsModal = dynamic(() => import('@/components/merchant/modals/ManageShiftsModal'), { ssr: false });
const PasswordModal = dynamic(() => import('@/components/merchant/modals/PasswordModal'), { ssr: false });
const UpiConfigModal = dynamic(() => import('@/components/merchant/modals/UpiConfigModal'), { ssr: false });
const GetMoreDevicesModal = dynamic(() => import('@/components/merchant/modals/GetMoreDevicesModal'), { ssr: false });
const EditApplicationModal = dynamic(() => import('@/components/merchant/modals/EditApplicationModal'), { ssr: false });
const BillConfigModal = dynamic(() => import('@/components/merchant/modals/BillConfigModal'), { ssr: false });
const PrintBillModal = dynamic(() => import('@/components/merchant/modals/PrintBillModal'), { ssr: false });
const ExcelExportModal = dynamic(() => import('@/components/merchant/modals/ExcelExportModal'), { ssr: false });
const TakeoutOrderModal = dynamic(() => import('@/components/merchant/modals/TakeoutOrderModal'), { ssr: false });
const ModeChangeModal = dynamic(() => import('@/components/merchant/modals/ModeChangeModal'), { ssr: false });

export default function MerchantDashboard() {
  const router = useRouter();

  // Stores
  const ui = useUIStore();
  const auth = useAuthStore();
  const outlet = useOutletStore();
  const order = useOrderStore();
  const menu = useMenuStore();
  const payment = usePaymentStore();
  const promo = usePromoStore();

  const { token, activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = auth;
  const { selectedOutletId, applications, showGetMoreDevicesModal, setShowGetMoreDevicesModal, showEditApplicationModal, setShowEditApplicationModal } = outlet;

  // Universal Modal Dismissal (Esc key & Mobile gestures)
  useModalDismiss(showGetMoreDevicesModal, () => setShowGetMoreDevicesModal(false), 'get-devices');
  useModalDismiss(showEditApplicationModal, () => setShowEditApplicationModal(false), 'edit-venue');
  useModalDismiss(payment.showConfigureBillModal, () => payment.setShowConfigureBillModal(false), 'configure-bill');
  useModalDismiss(payment.showExportModal, () => payment.setShowExportModal(false), 'export-modal');
  useModalDismiss(order.showPrintBillModal, () => order.setShowPrintBillModal(false), 'print-bill');
  useModalDismiss(order.showTakeoutModal, () => order.setShowTakeoutModal(false), 'takeout-modal');
  useModalDismiss(promo.showModeChangeModal, () => promo.setShowModeChangeModal(false), 'mode-change');
  useModalDismiss(menu.isMenuModalOpen, () => menu.setIsMenuModalOpen(false), 'menu-item-modal');
  useModalDismiss(menu.isCategoryModalOpen, () => menu.closeCategoryModal(), 'category-modal');
  useModalDismiss(menu.isShiftModalOpen, () => menu.setIsShiftModalOpen(false), 'manage-shifts');
  useModalDismiss(payment.showPasswordModal, () => payment.setShowPasswordModal(false), 'password-modal');
  useModalDismiss(payment.showUpiModal, () => payment.setShowUpiModal(false), 'upi-modal');
  useModalDismiss(mobileMenuOpen, () => setMobileMenuOpen(false), 'mobile-nav-drawer');

  // 1. Initial Authentication & Data Hydration
  useEffect(() => {
    const isAuthed = auth.hydrateAuth(router);
    if (!isAuthed) return;

    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      outlet.fetchApplications(currentToken, (tab) => setActiveTab(tab));
      outlet.fetchDevices(currentToken);
      order.fetchLiveOrders(currentToken);
      order.connectWebSocket(currentToken, () => outlet.fetchDevices(currentToken));
    }

    return () => {
      order.disconnectWebSocket();
    };
  }, [router]);

  // 2. React to selectedOutletId shifts
  useEffect(() => {
    if (!token || !selectedOutletId) return;

    menu.fetchMenu(token, selectedOutletId);
    payment.fetchBillConfig(token, selectedOutletId, applications);
    payment.fetchPaymentConfig(token, selectedOutletId);
    promo.fetchHostPromos(token, selectedOutletId);
    outlet.fetchVenueAnalytics(token, outlet.analyticsDays, selectedOutletId);
  }, [token, selectedOutletId]);

  // 3. Tab-specific lazy refreshes
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'payment' && selectedOutletId) {
      payment.fetchPaymentConfig(token, selectedOutletId);
    }
    if (activeTab === 'promos' && selectedOutletId) {
      promo.fetchHostPromos(token, selectedOutletId);
    }
    if (activeTab === 'dashboard') {
      outlet.fetchVenueAnalytics(token, outlet.analyticsDays, selectedOutletId);
    }
  }, [activeTab, token, selectedOutletId]);

  // Warn user if navigating away during active ad uploads
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (promo.isStreamingPromos) {
        e.preventDefault();
        e.returnValue = 'Active promo upload in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [promo.isStreamingPromos]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">
      {/* Universal Merchant Header */}
      <MerchantHeader />

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'applications' && <ApplicationsTab />}
        {activeTab === 'my-applications' && <MyApplicationsTab />}
        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'promos' && <PromosTab />}
        {activeTab === 'payment' && <PaymentTab />}
      </main>

      {/* Modals Mounted On Demand */}
      <ItemEditorModal />
      <ManageCategoriesModal />
      <ManageShiftsModal />
      <PasswordModal />
      <UpiConfigModal />
      <GetMoreDevicesModal />
      <EditApplicationModal />
      <BillConfigModal />
      <PrintBillModal />
      <ExcelExportModal />
      <TakeoutOrderModal />
      <ModeChangeModal />

      {/* Global Toast Feedback */}
      {ui.toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center space-x-3 border px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-2 duration-300 ${
          ui.toast.type === 'success'
            ? 'bg-emerald-600 dark:bg-emerald-700 border-emerald-700 text-white'
            : 'bg-red-600 dark:bg-red-700 border-red-700 text-white'
        }`}>
          {ui.toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <div className="text-xs font-bold pr-4">
            {ui.toast.message}
          </div>
          <button
            onClick={ui.clearToast}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              ui.toast.type === 'success'
                ? 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                : 'text-red-100 hover:bg-red-700 hover:text-white'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
