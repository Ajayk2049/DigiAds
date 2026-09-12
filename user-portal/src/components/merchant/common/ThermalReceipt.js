import React from 'react';
import { resolveMediaUrl } from './constants';

export default function ThermalReceipt({
  liveConfig,
  order,
  isPrintMode = false,
  overrideWidthFormat = null
}) {
  const config = (order && order.billConfigSnapshot) ? order.billConfigSnapshot : liveConfig;

  const items = order?.items || [
    { name: 'Empire Special Porota', quantity: 2, price: 4900 },
    { name: 'Green Salad', quantity: 1, price: 7500 },
    { name: 'Chilly Chicken (Half)', quantity: 1, price: 26000 }
  ];

  const widthFormat = overrideWidthFormat || config?.billWidthFormat || '80mm';
  const is58mm = widthFormat === '58mm';

  let subtotal = 0;
  let cgstAmt = 0;
  let sgstAmt = 0;
  let serviceTaxAmt = 0;
  let roundOffDiff = 0;
  let roundedTotal = 0;
  let cgstRate = 0;
  let sgstRate = 0;
  let serviceTaxRate = 0;

  if (order && typeof order.subtotalAmount === 'number' && order.subtotalAmount > 0) {
    subtotal = order.subtotalAmount / 100;
    roundedTotal = (order.totalAmount || 0) / 100;

    if (order.isGstExempt) {
      cgstAmt = 0;
      sgstAmt = 0;
      cgstRate = 0;
      sgstRate = 0;
    } else {
      cgstAmt = (order.cgstAmount || 0) / 100;
      sgstAmt = (order.sgstAmount || 0) / 100;

      if (subtotal > 0) {
        cgstRate = typeof order.cgstPercent === 'number' ? order.cgstPercent : Number(((cgstAmt / subtotal) * 100).toFixed(2));
        sgstRate = typeof order.sgstPercent === 'number' ? order.sgstPercent : Number(((sgstAmt / subtotal) * 100).toFixed(2));
      }
    }

    if (order.isServiceTaxExempt) {
      serviceTaxAmt = 0;
      serviceTaxRate = 0;
    } else {
      serviceTaxAmt = (order.serviceTaxAmount || 0) / 100;
      if (subtotal > 0) {
        serviceTaxRate = typeof order.serviceTaxPercent === 'number' ? order.serviceTaxPercent : Number(((serviceTaxAmt / subtotal) * 100).toFixed(2));
      }
    }
    roundOffDiff = (order.roundOffAmount || 0) / 100;
  } else if (order && order.totalAmount) {
    const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    subtotal = subtotalPaise > 0 ? (subtotalPaise / 100) : (order.totalAmount / 100);
    roundedTotal = order.totalAmount / 100;

    const frozenCgstPct = order.billConfigSnapshot?.cgstPercent ?? order.cgstPercent;
    const frozenSgstPct = order.billConfigSnapshot?.sgstPercent ?? order.sgstPercent;
    const frozenServiceTaxPct = order.billConfigSnapshot?.serviceTaxPercent ?? order.serviceTaxPercent;

    if (typeof frozenCgstPct === 'number' || typeof frozenSgstPct === 'number' || typeof frozenServiceTaxPct === 'number') {
      cgstRate = frozenCgstPct || 0;
      sgstRate = frozenSgstPct || 0;
      serviceTaxRate = frozenServiceTaxPct || 0;
      cgstAmt = subtotal * (cgstRate / 100);
      sgstAmt = subtotal * (sgstRate / 100);
      serviceTaxAmt = subtotal * (serviceTaxRate / 100);
      const rawTotal = subtotal + cgstAmt + sgstAmt + serviceTaxAmt;
      const calcDiff = roundedTotal - rawTotal;
      roundOffDiff = (calcDiff >= 0 && calcDiff < 1.00) ? Math.round(calcDiff * 100) / 100 : 0;
    } else {
      const diff = Math.round((roundedTotal - subtotal) * 100) / 100;
      if (diff <= 0) {
        cgstRate = 0;
        sgstRate = 0;
        serviceTaxRate = 0;
        cgstAmt = 0;
        sgstAmt = 0;
        serviceTaxAmt = 0;
        roundOffDiff = 0;
      } else {
        cgstRate = typeof config?.cgstPercent === 'number' ? config.cgstPercent : 2.5;
        sgstRate = typeof config?.sgstPercent === 'number' ? config.sgstPercent : 2.5;
        serviceTaxRate = typeof config?.serviceTaxPercent === 'number' ? config.serviceTaxPercent : 0;
        cgstAmt = subtotal * (cgstRate / 100);
        sgstAmt = subtotal * (sgstRate / 100);
        serviceTaxAmt = subtotal * (serviceTaxRate / 100);
        const rawTotal = subtotal + cgstAmt + sgstAmt + serviceTaxAmt;
        const calcDiff = roundedTotal - rawTotal;
        roundOffDiff = (calcDiff >= 0 && calcDiff < 1.00) ? Math.round(calcDiff * 100) / 100 : 0;
      }
    }
  } else {
    const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    subtotal = subtotalPaise / 100;
    cgstRate = Math.max(0, typeof config?.cgstPercent === 'number' ? config.cgstPercent : (parseFloat(config?.cgstPercent) || 0));
    sgstRate = Math.max(0, typeof config?.sgstPercent === 'number' ? config.sgstPercent : (parseFloat(config?.sgstPercent) || 0));
    serviceTaxRate = Math.max(0, typeof config?.serviceTaxPercent === 'number' ? config.serviceTaxPercent : (parseFloat(config?.serviceTaxPercent) || 0));
    cgstAmt = Math.max(0, subtotal * (cgstRate / 100));
    sgstAmt = Math.max(0, subtotal * (sgstRate / 100));
    serviceTaxAmt = Math.max(0, subtotal * (serviceTaxRate / 100));
    const totalGstAmt = Math.max(0, cgstAmt + sgstAmt);
    const rawTotal = subtotal + totalGstAmt + serviceTaxAmt;

    roundedTotal = config?.enableAutoRoundOff !== false ? Math.ceil(rawTotal) : rawTotal;
    roundOffDiff = roundedTotal - rawTotal;
  }

  const totalGstAmt = Math.max(0, cgstAmt + sgstAmt);
  const absRoundOff = Math.abs(roundOffDiff);
  const roundOffStr = absRoundOff < 0.001 ? "0.00" : (roundOffDiff > 0 ? `+${roundOffDiff.toFixed(2)}` : roundOffDiff.toFixed(2));
  const paymentTypeStr = order?.paymentType || order?.paymentMethod || (order?.paymentStatus === 'completed' ? 'ONLINE / UPI' : 'CASH / PENDING');
  const orderTypeStr = (order?.orderType === 'TAKEOUT' || order?.tableNumber === 'TAKEOUT') ? 'TAKEOUT' : 'DINE';
  const orderIdStr = order?.orderId ? order.orderId : `${config?.billPrefix || 'INV'}-873`;
  const tableNumStr = order?.tableNumber !== undefined ? order.tableNumber : '17';
  const dateStr = order?.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : '2026-08-01';

  return (
    <div
      id={isPrintMode ? "thermal-print-area" : undefined}
      className={`bg-white text-black font-mono shadow-xl border border-gray-300 mx-auto leading-tight select-none ${is58mm ? 'text-[8px] p-1.5 w-full max-w-[195px] rounded-lg' : 'text-[9.5px] p-2 w-full max-w-[270px] rounded-xl'
        }`}
    >
      {/* Logo Section */}
      {config?.logoUrl && (
        <div className="flex justify-center mb-0">
          <img
            src={resolveMediaUrl(config.logoUrl)}
            alt="Logo"
            className={is58mm ? "max-h-12 w-auto max-w-[150px] object-contain mx-auto" : "max-h-16 w-auto max-w-[220px] object-contain mx-auto"}
          />
        </div>
      )}

      {/* Venue Header */}
      <div className="text-center leading-tight space-y-0 pt-0.5">
        <h3 className={`font-semibold uppercase tracking-tight ${is58mm ? 'text-base' : 'text-xl'}`}>{config?.restaurantName}</h3>
        {config?.addressLine1 && <p className={is58mm ? "text-[7.5px] text-gray-800" : "text-[9px] text-gray-800"}>{config.addressLine1}</p>}
        {(config?.addressLine2 || config?.cityZip) && (
          <p className={is58mm ? "text-[7.5px] text-gray-800" : "text-[9px] text-gray-800"}>
            {[config.addressLine2, config.cityZip].filter(Boolean).join(', ')}
          </p>
        )}
        {config?.gstin && <p className={is58mm ? "text-[7.5px] font-bold text-gray-900" : "text-[9px] font-bold text-gray-900"}>GSTIN: {config.gstin}</p>}
        {(config?.fssaiNo || config?.phone) && (
          <p className={is58mm ? "text-[7px] text-gray-800" : "text-[8.5px] text-gray-800"}>
            {[config.fssaiNo ? `FSSAI: ${config.fssaiNo}` : null, config.phone ? `Ph: ${config.phone}` : null].filter(Boolean).join(' | ')}
          </p>
        )}
      </div>

      <div className="border-b border-dashed border-gray-400 my-1" />

      {/* Order Metadata */}
      <div className={`space-y-0.5 ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
        <div className="flex justify-between font-bold text-gray-900">
          <span>ORDER #: {orderIdStr}</span>
          <span>TYPE: {orderTypeStr}</span>
        </div>
        {orderTypeStr !== 'TAKEOUT' && (
          <div>TABLE NUMBER: {tableNumStr}</div>
        )}
        <div className={`flex justify-between text-gray-700 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
          <span>BILL NO: {config?.billPrefix || 'INV'}-{order?.orderId ? order.orderId.slice(-5) : '13658'}</span>
          <span>DATE: {dateStr}</span>
        </div>
        {config?.showKOTNumbers && <div>KOTS: 101, 102</div>}
        {config?.showCovers && <div>COVERS: 1</div>}
        <div className="font-bold text-gray-900">PAYMENT TYPE: {paymentTypeStr}</div>
      </div>

      {config?.showCustomerDetail && (
        <>
          <div className="border-b border-dashed border-gray-400 my-1" />
          <div className={`space-y-0.5 ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
            <div className="font-bold text-gray-800">CUSTOMER DETAIL</div>
            <div>NAME: {order?.customer?.name || 'Customer'}</div>
            <div>MOBILE: {order?.customer?.mobile || ''}</div>
          </div>
        </>
      )}

      <div className="border-b border-dashed border-gray-400 my-1" />

      {/* Item Table Header */}
      <div className={`flex justify-between font-bold border-b border-gray-300 pb-0.5 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
        <span className={is58mm ? "w-4 shrink-0" : "w-5 shrink-0"}>NO.</span>
        <span className="flex-1 px-1">ITEM</span>
        <span className={is58mm ? "w-5 text-center shrink-0" : "w-7 text-center shrink-0"}>QTY</span>
        <span className={is58mm ? "w-10 text-right shrink-0" : "w-12 text-right shrink-0"}>AMT</span>
      </div>

      {/* Items */}
      <div className={`space-y-0.5 my-1 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <div className="flex justify-between items-start leading-tight">
              <span className={is58mm ? "w-4 shrink-0 font-semibold" : "w-5 shrink-0 font-semibold"}>{idx + 1}.</span>
              <span className="flex-1 px-1 font-bold text-gray-900 break-words pr-0.5">
                {item.name}{item.isPacked && !item.name?.includes('(PACK)') ? ' (PACK)' : ''}
              </span>
              <span className={is58mm ? "w-5 text-center shrink-0" : "w-7 text-center shrink-0"}>{item.quantity}</span>
              <span className={is58mm ? "w-10 text-right shrink-0" : "w-12 text-right shrink-0"}>{((item.price * item.quantity) / 100).toFixed(2)}</span>
            </div>
            {item.customization ? (
              <div className={`pl-5 text-gray-600 italic leading-tight ${is58mm ? 'text-[7px]' : 'text-[8px]'}`}>
                * {item.customization}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-gray-400 my-1" />

      {/* Item Summary & Totals */}
      <div className={`space-y-0.5 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
        <div className="flex justify-between font-bold text-gray-900">
          <span>SUB TOTAL:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {totalGstAmt > 0 && (
          <>
            <div className="flex justify-between text-gray-800">
              <span>GST ({(cgstRate + sgstRate).toFixed(1)}%):</span>
              <span>{totalGstAmt.toFixed(2)}</span>
            </div>
            {cgstRate > 0 && (
              <div className={`flex justify-between text-gray-700 pl-2 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
                <span>CGST @ {cgstRate}%:</span>
                <span>{cgstAmt.toFixed(2)}</span>
              </div>
            )}
            {sgstRate > 0 && (
              <div className={`flex justify-between text-gray-700 pl-2 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
                <span>SGST @ {sgstRate}%:</span>
                <span>{sgstAmt.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        {serviceTaxAmt > 0 && (
          <div className="flex justify-between text-gray-800">
            <span>SERVICE TAX ({serviceTaxRate}%):</span>
            <span>{serviceTaxAmt.toFixed(2)}</span>
          </div>
        )}
        {config?.enableAutoRoundOff !== false && absRoundOff >= 0.001 && (
          <div className="flex justify-between text-gray-800">
            <span>ROUND OFF:</span>
            <span>{roundOffStr}</span>
          </div>
        )}
        <div className={`flex justify-between font-extrabold pt-1 border-t-2 border-black text-gray-900 mt-1 ${is58mm ? 'text-[9.5px]' : 'text-[11px]'}`}>
          <span>TOTAL INVOICE VALUE:</span>
          <span>{roundedTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className={`flex justify-between ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
        <span>UNIQUE ITEMS: {items.length}</span>
        <span>TOTAL QTY: {items.reduce((sum, i) => sum + i.quantity, 0)}</span>
      </div>

      {/* Footer */}
      <div className="pt-2 mt-1 border-t border-dashed border-gray-400 flex items-center justify-between">
        <div className="flex-1 text-left pr-1.5 space-y-0.5">
          {config?.showThankYouMessage !== false && (
            <p className={`font-extrabold text-gray-900 leading-tight uppercase ${is58mm ? 'text-[9px]' : 'text-[10.5px]'}`}>{config?.thankYouMessage || 'THANK YOU & VISIT AGAIN !'}</p>
          )}

          {config?.showPoweredBy !== false && (config?.customWatermark !== undefined ? config.customWatermark : 'POWERED BY - DIGIADS') !== '' && (
            <p className={`text-gray-500 font-light uppercase ${is58mm ? 'text-[5.5px]' : 'text-[6.5px]'}`}>{config.customWatermark || 'POWERED BY - DIGIADS'}</p>
          )}

          {config?.crmContactPhone && (
            <p className={`text-gray-800 font-semibold uppercase ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>CRM {config.crmContactName || ''}: {config.crmContactPhone}</p>
          )}
          {config?.deliveryPhone && <p className={`text-gray-800 font-semibold uppercase ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>HOME DELIVERY: {config.deliveryPhone}</p>}
        </div>

        {config?.qrImageUrl && (
          <div className="shrink-0 flex flex-col items-center text-center pl-1">
            <img src={resolveMediaUrl(config.qrImageUrl)} alt="QR Code" className={is58mm ? "w-12 h-12 object-contain p-0.5 border bg-white rounded shadow-sm" : "w-16 h-16 object-contain p-0.5 border bg-white rounded shadow-sm"} />
            {config.qrCaption ? (
              <p className={`mt-0.5 font-bold text-gray-700 leading-tight uppercase ${is58mm ? 'text-[7px] max-w-[65px]' : 'text-[8px] max-w-[85px]'}`}>{config.qrCaption}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
