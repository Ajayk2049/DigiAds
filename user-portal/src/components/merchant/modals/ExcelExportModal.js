import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useUIStore } from '@/stores/useUIStore';

export default function ExcelExportModal(props) {
  const payment = usePaymentStore();
  const order = useOrderStore();
  const outlet = useOutletStore();
  const ui = useUIStore();

  const isOpen = props.isOpen ?? payment.showExportModal;
  const onClose = props.onClose ?? (() => payment.setShowExportModal(false));
  const orders = props.orders ?? order.orders;
  const paymentOrders = props.paymentOrders ?? order.paymentOrders;
  const applications = props.applications ?? outlet.applications;
  const activeOrderVenueTab = props.activeOrderVenueTab ?? order.activeOrderVenueTab;
  const activeBillConfig = props.activeBillConfig ?? order.activeBillConfig;
  const showToast = props.showToast ?? ui.showToast;

  const [exportPreset, setExportPreset] = useState('today');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Sync date ranges with preset
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (exportPreset === 'today') {
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (exportPreset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (exportPreset === '15d') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (exportPreset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    }
  }, [exportPreset, isOpen]);

  if (!isOpen) return null;

  const currentVenueApp = applications.find(app => app._id === activeOrderVenueTab) || applications.find(app => app.status === 'approved');
  const venueName = currentVenueApp?.outletName || 'Venue';

  const getMatchingOrders = () => {
    if (!exportStartDate || !exportEndDate) return [];
    const sMs = new Date(`${exportStartDate}T00:00:00.000`).getTime();
    const eMs = new Date(`${exportEndDate}T23:59:59.999`).getTime();

    return [...paymentOrders, ...orders].filter(ord => {
      if (ord.hostApplicationId && currentVenueApp && ord.hostApplicationId !== currentVenueApp._id) return false;
      const isZeroEmpty = (!ord.items || ord.items.length === 0) && (ord.totalAmount || 0) === 0;
      if (isZeroEmpty) return false;
      const ordTime = new Date(ord.createdAt || ord.updatedAt || 0).getTime();
      return ordTime >= sMs && ordTime <= eMs;
    });
  };

  const matchingOrders = getMatchingOrders();

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      showToast?.('Please select a valid date range for export', 'error');
      return;
    }

    if (matchingOrders.length === 0) {
      showToast?.('No transaction orders found for the selected date range', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'DigiAds Platform';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Payment History');

      // Title Banner Row (Merged A1:L1)
      worksheet.mergeCells('A1:L1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `${venueName.toUpperCase()} — PAYMENT & TRANSACTION HISTORY`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0069A8' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // Subtitle Date Range Row (Merged A2:L2)
      worksheet.mergeCells('A2:L2');
      const subtitleCell = worksheet.getCell('A2');
      const formattedStart = new Date(exportStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const formattedEnd = new Date(exportEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      subtitleCell.value = `Report Period: ${formattedStart} to ${formattedEnd}  |  Generated On: ${new Date().toLocaleString('en-IN')}`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      worksheet.getRow(3).height = 10;

      const headers = [
        'Sl. No.',
        'Date & Time',
        'Order ID',
        'Type / Location',
        'Items Summary',
        'Payment Mode',
        'Subtotal (₹)',
        'CGST (₹)',
        'SGST (₹)',
        'Service Tax (₹)',
        'Round Off (₹)',
        'Grand Total (₹)'
      ];

      const headerRow = worksheet.getRow(4);
      headerRow.values = headers;
      headerRow.height = 24;

      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      const billCfg = currentVenueApp?.billConfig || activeBillConfig || {};
      const cgstPct = typeof billCfg.cgstPercent === 'number' ? billCfg.cgstPercent : 2.5;
      const sgstPct = typeof billCfg.sgstPercent === 'number' ? billCfg.sgstPercent : 2.5;
      const serviceTaxPct = typeof billCfg.serviceTaxPercent === 'number' ? billCfg.serviceTaxPercent : 0;
      const totalTaxPct = cgstPct + sgstPct + serviceTaxPct;
      const enableAutoRoundOff = billCfg.enableAutoRoundOff !== false;

      let totalSubtotalSum = 0;
      let totalCgstSum = 0;
      let totalSgstSum = 0;
      let totalServiceTaxSum = 0;
      let totalRoundOffSum = 0;
      let totalGrandTotalSum = 0;

      matchingOrders.forEach((ord, index) => {
        const rowNum = index + 5;
        const ordDate = new Date(ord.createdAt || ord.updatedAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const itemsText = (ord.items || []).map(i => `${i.name}${i.isPacked ? ' (PACK)' : ''} (x${i.quantity})`).join(', ');

        let subtotal = 0;
        let cgst = 0;
        let sgst = 0;
        let serviceTax = 0;
        let roundOff = 0;
        let grandTotal = (ord.totalAmount || 0) / 100;

        if (typeof ord.subtotalAmount === 'number' && ord.subtotalAmount > 0) {
          subtotal = ord.subtotalAmount / 100;
          cgst = (ord.cgstAmount || 0) / 100;
          sgst = (ord.sgstAmount || 0) / 100;
          serviceTax = (ord.serviceTaxAmount || 0) / 100;
          roundOff = (ord.roundOffAmount || 0) / 100;
        } else {
          if (ord.items && ord.items.length > 0) {
            subtotal = ord.items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0) / 100;
          } else {
            subtotal = grandTotal / (1 + (totalTaxPct / 100));
          }

          const effectiveCgstPct = typeof ord.cgstPercent === 'number' ? ord.cgstPercent : cgstPct;
          const effectiveSgstPct = typeof ord.sgstPercent === 'number' ? ord.sgstPercent : sgstPct;
          const effectiveServiceTaxPct = typeof ord.serviceTaxPercent === 'number' ? ord.serviceTaxPercent : serviceTaxPct;

          cgst = ord.isGstExempt ? 0 : subtotal * (effectiveCgstPct / 100);
          sgst = ord.isGstExempt ? 0 : subtotal * (effectiveSgstPct / 100);
          serviceTax = ord.isServiceTaxExempt ? 0 : subtotal * (effectiveServiceTaxPct / 100);
          const rawTotal = subtotal + cgst + sgst + serviceTax;

          if (grandTotal > 0) {
            roundOff = Math.max(0, grandTotal - rawTotal);
          } else {
            grandTotal = enableAutoRoundOff ? Math.ceil(rawTotal) : rawTotal;
            roundOff = grandTotal - rawTotal;
          }
        }

        totalSubtotalSum += subtotal;
        totalCgstSum += cgst;
        totalSgstSum += sgst;
        totalServiceTaxSum += serviceTax;
        totalRoundOffSum += roundOff;
        totalGrandTotalSum += grandTotal;

        const row = worksheet.getRow(rowNum);
        row.values = [
          index + 1,
          ordDate,
          ord.orderId,
          ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`,
          itemsText,
          ord.paymentType || 'UPI',
          subtotal,
          cgst,
          sgst,
          serviceTax,
          roundOff,
          grandTotal
        ];
        row.height = 20;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          if (colNumber === 1 || colNumber === 3 || colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber >= 7) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '₹#,##0.00';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      const summaryRowNum = matchingOrders.length + 5;
      const summaryRow = worksheet.getRow(summaryRowNum);
      summaryRow.values = [
        '',
        'TOTAL SUMMARY',
        `${matchingOrders.length} Orders`,
        '',
        '',
        '',
        totalSubtotalSum,
        totalCgstSum,
        totalSgstSum,
        totalServiceTaxSum,
        totalRoundOffSum,
        totalGrandTotalSum
      ];
      summaryRow.height = 25;

      summaryRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = {
          top: { style: 'medium', color: { argb: '0F172A' } },
          bottom: { style: 'double', color: { argb: '0F172A' } }
        };
        if (colNumber >= 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹#,##0.00';
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      worksheet.columns = [
        { width: 8 },
        { width: 22 },
        { width: 16 },
        { width: 18 },
        { width: 35 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
        { width: 16 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const cleanVenueStr = venueName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanVenueStr}_Payment_History_${exportStartDate}_to_${exportEndDate}.xlsx`;

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      showToast?.(`Exported ${matchingOrders.length} payment records to Excel!`, 'success');
      onClose();
    } catch (err) {
      console.error('Excel Export Error:', err);
      showToast?.('Failed to export payment history to Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[180] p-4 animate-fade-in exclude-uppercase">
      <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 relative flex flex-col space-y-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border-b border-border/40 pb-3">
          <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
            <Download className="w-5 h-5 text-emerald-500" />
            <span>Export Payment History (.xlsx)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
            Generate styled Excel reports with custom date range filtering for venue transactions.
          </p>
        </div>

        {/* Range Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground block">Select Date Range Shortcut:</label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '15d', label: '15 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExportPreset(item.id)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${exportPreset === item.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">From Date:</label>
            <input
              type="date"
              value={exportStartDate}
              disabled={exportPreset !== 'custom'}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">To Date:</label>
            <input
              type="date"
              value={exportEndDate}
              disabled={exportPreset !== 'custom'}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
            />
          </div>
        </div>

        {/* Matching Records Count Preview */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground">Matching Transactions:</span>
          <span className="font-mono font-bold text-emerald-500">
            {matchingOrders.length} Orders Found
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-border/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5 uppercase"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
