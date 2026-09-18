import React from 'react';

export default function KotReceipt({
  order,
  isPrintMode = false,
  overrideWidthFormat = '80mm'
}) {
  if (!order) return null;

  const items = order.items || [];
  const is58mm = overrideWidthFormat === '58mm';
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(order.createdAt || Date.now());
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  }, [order.createdAt]);

  return (
    <div
      id={isPrintMode ? 'kot-print-area' : undefined}
      className={`bg-white text-black font-mono select-none ${
        isPrintMode ? 'p-0 shadow-none border-0' : 'p-4 rounded-xl border border-border/40 shadow-lg'
      }`}
      style={{
        width: is58mm ? '58mm' : '80mm',
        maxWidth: is58mm ? '58mm' : '80mm',
        minHeight: '120px',
        boxSizing: 'border-box',
        color: '#000000',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Table & Order Metadata */}
      <div className="pb-1 border-b border-dashed border-black space-y-0.5">
        <div className="flex justify-between items-center">
          <span className={`font-black uppercase ${is58mm ? 'text-xs' : 'text-sm'}`}>
            {order.orderType === 'TAKEOUT' || order.tableNumber === 'TAKEOUT'
              ? '🛍️ TAKEOUT'
              : `TABLE: ${order.tableNumber}`}
          </span>
          <span className={`font-bold ${is58mm ? 'text-[10px]' : 'text-xs'}`}>
            ID: {order.orderId}
          </span>
        </div>
        {formattedDate && (
          <div className={`text-left text-black/80 ${is58mm ? 'text-[8px]' : 'text-[10px]'}`}>
            Time: {formattedDate}
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="py-1.5 border-b border-black flex justify-between font-bold text-[10px] tracking-wider uppercase">
        <span className="flex-1 text-left">ITEM</span>
        <span className="w-12 text-right">QTY</span>
      </div>

      {/* Items List */}
      <div className="py-2 space-y-2 border-b-2 border-dashed border-black">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col space-y-0.5">
            <div className="flex justify-between items-start gap-2">
              <span className={`font-bold text-left break-words leading-tight flex-1 ${is58mm ? 'text-[10px]' : 'text-xs'}`}>
                {item.name}
                {item.isPacked && !item.name?.includes('(PACK)') && ' [PACK]'}
              </span>
              <span className={`font-black text-right shrink-0 ${is58mm ? 'text-[11px]' : 'text-xs'}`}>
                x {item.quantity}
              </span>
            </div>
            {item.customization && (
              <span className={`text-left italic pl-2 text-black/85 break-words leading-tight ${is58mm ? 'text-[8.5px]' : 'text-[10px]'}`}>
                * {item.customization}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="pt-2 text-center">
        <p className={`font-black tracking-wider ${is58mm ? 'text-[10px]' : 'text-xs'}`}>
          TOTAL ITEMS: {totalQty}
        </p>
      </div>
    </div>
  );
}
