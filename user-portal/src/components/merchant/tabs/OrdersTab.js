'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Building, Bell } from 'lucide-react';

const PrintKotModal = dynamic(() => import('../modals/PrintKotModal'), { ssr: false });
const CancelOrderModal = dynamic(() => import('../modals/CancelOrderModal'), { ssr: false });

import { useOrderStore } from '@/stores/useOrderStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useMenuStore } from '@/stores/useMenuStore';
import { useAuthStore } from '@/stores/useAuthStore';

import OrdersHeader from '../orders/OrdersHeader';
import OrderTableRow from '../orders/OrderTableRow';

const getStatusRank = (status) => {
  if (status === 'placed') return 1;
  if (status === 'cooking') return 2;
  if (status === 'served') return 3;
  return 4;
};

export default function OrdersTab(props) {
  const order = useOrderStore();
  const outlet = useOutletStore();
  const menu = useMenuStore();
  const auth = useAuthStore();
  const token = auth.token;

  const approvedOutlets = props.approvedOutlets ?? (typeof outlet.getApprovedOutlets === 'function' ? outlet.getApprovedOutlets() : (outlet.applications || []).filter(a => a.status === 'approved' && a.requestTablet));
  const applications = props.applications ?? outlet.applications;
  const activeShift = props.activeShift ?? menu.activeShift;
  const setTakeoutCart = props.setTakeoutCart ?? order.setTakeoutCart;
  const setTakeoutActiveCategory = props.setTakeoutActiveCategory ?? order.setTakeoutActiveCategory;
  const menuCategories = props.menuCategories ?? menu.menuCategories;
  const setShowTakeoutModal = props.setShowTakeoutModal ?? order.setShowTakeoutModal;
  const orders = props.orders ?? order.orders;
  const activeOrderVenueTab = props.activeOrderVenueTab ?? order.activeOrderVenueTab;
  const toggleGstExemption = props.toggleGstExemption ?? ((orderId, removeGst) => order.toggleGstExemption(token, orderId, removeGst));
  const toggleServiceTaxExemption = props.toggleServiceTaxExemption ?? ((orderId, removeTax) => order.toggleServiceTaxExemption(token, orderId, removeTax));
  const activeBillConfig = props.activeBillConfig ?? order.activeBillConfig;
  const updateOrderStatus = props.updateOrderStatus ?? ((orderId, status) => order.updateOrderStatus(token, orderId, status));
  const serviceWaiter = props.serviceWaiter ?? ((orderId) => order.serviceWaiter(token, orderId));
  const confirmingPaymentOrderId = props.confirmingPaymentOrderId ?? order.confirmingPaymentOrderId;
  const setConfirmingPaymentOrderId = props.setConfirmingPaymentOrderId ?? order.setConfirmingPaymentOrderId;
  const markPaymentReceived = props.markPaymentReceived ?? ((orderId, type) => order.markPaymentReceived(token, orderId, type));
  const closeTable = props.closeTable ?? ((orderId) => order.closeTable(token, orderId));

  const [kotOrder, setKotOrder] = React.useState(null);
  const [cancellingOrder, setCancellingOrder] = React.useState(null);

  const selectedOutletId = outlet.selectedOutletId;
  const activeVenueId = activeOrderVenueTab || selectedOutletId || approvedOutlets[0]?._id;

  // Auto-synchronize activeOrderVenueTab in order store if unset
  React.useEffect(() => {
    if (!activeOrderVenueTab && activeVenueId) {
      order.setActiveOrderVenueTab(activeVenueId);
    }
  }, [activeOrderVenueTab, activeVenueId, order]);

  // Auto-fetch active venue bill configuration so tax exemptions are instantly accessible
  React.useEffect(() => {
    if (activeVenueId && token && typeof order.fetchVenueBillConfig === 'function') {
      order.fetchVenueBillConfig(token, activeVenueId);
    }
  }, [activeVenueId, token, order]);

  // Unconditionally execute order filtering and sorting hooks (Rules of Hooks guarantee)
  const filteredOrders = React.useMemo(() => {
    return (orders || []).filter(ord => {
      if (!activeVenueId) return true;
      const ordVenueId = ord.hostApplicationId?._id || ord.hostApplicationId;
      return String(ordVenueId) === String(activeVenueId);
    });
  }, [orders, activeVenueId]);

  const sortedOrders = React.useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const rankA = getStatusRank(a.orderStatus);
      const rankB = getStatusRank(b.orderStatus);
      if (rankA !== rankB) return rankA - rankB;

      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeA - timeB;
    });
  }, [filteredOrders]);

  // Handle empty venue state after all hooks have executed
  if (!approvedOutlets || approvedOutlets.length === 0) {
    return (
      <div className="animate-fade-in w-full">
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Approved Venue Outlets</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">
            Approved host application venues supporting tablet devices will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full">
      <OrdersHeader
        applications={applications}
        activeVenueId={activeVenueId}
        approvedOutlets={approvedOutlets}
        orders={orders}
        activeShift={activeShift}
        onSelectVenue={(appId) => {
          order.setActiveOrderVenueTab(appId);
          outlet.setSelectedOutletId(appId);
        }}
        onOpenTakeoutModal={() => {
          setTakeoutCart([]);
          setTakeoutActiveCategory(menuCategories[0] || 'Starters');
          setShowTakeoutModal(true);
        }}
      />

      {sortedOrders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">Waiting for live orders...</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">
            When customers place orders at dining tables or counter pickups, they will pop up here instantly.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="pb-3 pr-2">Table / Type</th>
                <th className="pb-3 pr-2">Order ID</th>
                <th className="pb-3 pr-2 min-w-[180px]">Items</th>
                <th className="pb-3 pr-2">Amount</th>
                <th className="pb-3 pr-2">Status</th>
                <th className="pb-3 pr-2">Requests</th>
                <th className="pb-3 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((ord) => (
                <OrderTableRow
                  key={ord.orderId}
                  ord={ord}
                  applications={applications}
                  activeVenueId={activeVenueId}
                  activeBillConfig={activeBillConfig}
                  confirmingPaymentOrderId={confirmingPaymentOrderId}
                  onPrintKot={(targetOrd) => setKotOrder(targetOrd)}
                  onToggleGstExemption={toggleGstExemption}
                  onToggleServiceTaxExemption={toggleServiceTaxExemption}
                  onStatusChange={updateOrderStatus}
                  onRequestCancel={(targetOrd) => setCancellingOrder(targetOrd)}
                  onServiceWaiter={serviceWaiter}
                  onSetConfirmingPaymentOrderId={setConfirmingPaymentOrderId}
                  onMarkPaymentReceived={markPaymentReceived}
                  onCloseTable={closeTable}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kotOrder && (
        <PrintKotModal
          isOpen={Boolean(kotOrder)}
          order={kotOrder}
          onClose={() => setKotOrder(null)}
        />
      )}

      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirm={() => {
            const ordToCancel = cancellingOrder;
            setCancellingOrder(null);
            updateOrderStatus(ordToCancel.orderId, 'cancelled');
          }}
        />
      )}
    </div>
  );
}
