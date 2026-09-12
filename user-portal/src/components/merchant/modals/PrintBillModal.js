import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import ThermalReceipt from '../common/ThermalReceipt';
import { useOrderStore } from '@/stores/useOrderStore';
import { usePaymentStore } from '@/stores/usePaymentStore';

export default function PrintBillModal(props) {
  const order = useOrderStore();
  const payment = usePaymentStore();

  const isOpen = props.isOpen ?? (order.showPrintBillModal && !!order.printingOrder);
  const onClose = props.onClose ?? (() => order.setShowPrintBillModal(false));
  const printingOrder = props.printingOrder ?? order.printingOrder;
  const billConfig = props.billConfig ?? order.activeBillConfig;
  const billForm = props.billForm ?? payment.billForm;

  const [selectedPrintWidth, setSelectedPrintWidth] = useState('80mm');

  if (!isOpen || !printingOrder) return null;

  const liveConfig = printingOrder?.billConfigSnapshot || billConfig || billForm || {};

  return (
    <>
      {/* Modal Preview UI */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in exclude-uppercase">
        <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 relative flex flex-col space-y-4 shadow-2xl max-h-[95vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-between items-center pr-8 border-b border-border/40 pb-3">
            <div>
              <h3 className="font-outfit text-base font-black text-foreground flex items-center space-x-2">
                <Printer className="w-4 h-4 text-primary" />
                <span>Print Customer Bill</span>
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5">Order ID: {printingOrder.orderId}</p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md tracking-wider uppercase"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>

          {/* Paper Format Segmented Tab Bar */}
          <div className="flex items-center justify-center space-x-2 bg-muted/40 p-1 rounded-xl border border-border/40 my-1">
            <button
              type="button"
              onClick={() => setSelectedPrintWidth('80mm')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${selectedPrintWidth === '80mm'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span>📄 3-Inch (80mm POS)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPrintWidth('58mm')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${selectedPrintWidth === '58mm'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span>📄 2-Inch (58mm Portable)</span>
            </button>
          </div>

          {/* On-screen Preview */}
          <div className="py-2 flex justify-center">
            <ThermalReceipt
              liveConfig={liveConfig}
              order={printingOrder}
              isPrintMode={false}
              overrideWidthFormat={selectedPrintWidth}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Body Portal for Window.print() */}
      {typeof document !== 'undefined' && createPortal(
        <div id="thermal-print-portal">
          <style>{`
            @media print {
              @page {
                size: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} auto;
                margin: 0mm !important;
              }
              html, body {
                width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
              }
              body > *:not(#thermal-print-portal) {
                display: none !important;
              }
              #thermal-print-portal {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              #thermal-print-area {
                width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                margin: 0 !important;
                padding: ${selectedPrintWidth === '58mm' ? '1.5mm 1mm' : '2mm 1mm'} !important;
                box-sizing: border-box !important;
                font-family: 'Courier New', Courier, monospace !important;
                font-size: ${selectedPrintWidth === '58mm' ? '8px' : '10px'} !important;
                line-height: 1.15 !important;
                color: #000000 !important;
                background: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>
          <ThermalReceipt
            liveConfig={liveConfig}
            order={printingOrder}
            isPrintMode={true}
            overrideWidthFormat={selectedPrintWidth}
          />
        </div>,
        document.body
      )}
    </>
  );
}
