import React from 'react';
import { X, FileText, Trash2 } from 'lucide-react';
import ThermalReceipt from '../common/ThermalReceipt';
import { resolveMediaUrl } from '../common/constants';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function BillConfigModal(props) {
  const payment = usePaymentStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;
  const outletId = outlet.selectedOutletId;

  const isOpen = props.isOpen ?? payment.showConfigureBillModal;
  const onClose = props.onClose ?? (() => payment.setShowConfigureBillModal(false));
  const billForm = props.billForm ?? payment.billForm;
  const setBillForm = props.setBillForm ?? payment.setBillForm;
  const saving = props.saving ?? payment.billConfigSaving;
  const error = props.error ?? payment.billConfigError;
  const uploading = props.uploading ?? payment.billUploadingImage;
  const deleting = props.deleting ?? payment.billDeletingImage;

  const onSave = props.onSave ?? (() => payment.handleSaveBillConfig(token, outletId));
  const onUploadImage = props.onUploadImage ?? ((file, field) => payment.handleUploadBillImageFile(token, outletId, file, field));
  const onDeleteImage = props.onDeleteImage ?? ((field) => payment.handleDeleteBillImage(token, outletId, field));

  const hasChanges = React.useMemo(() => {
    if (!billForm) return false;
    const snap = payment.originalBillConfigSnapshot;
    if (!snap) return false;
    try {
      return JSON.stringify(billForm) !== snap;
    } catch {
      return false;
    }
  }, [billForm, payment.originalBillConfigSnapshot]);

  React.useEffect(() => {
    if (isOpen && billForm && !payment.originalBillConfigSnapshot) {
      payment.setOriginalBillConfigSnapshot?.(JSON.stringify(billForm));
    }
  }, [isOpen, billForm, payment.originalBillConfigSnapshot]);

  const handleClose = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm('You have unsaved bill configuration changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }
    onClose();
  };

  if (!isOpen || !billForm) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in exclude-uppercase">
      <div className="bg-card border border-border/40 rounded-2xl w-full max-w-5xl p-6 relative flex flex-col space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Configure Thermal Bill & Receipts</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">
            Customize 4-section layout, branding logo, venue contact info, CGST/SGST tax split, and custom QR images.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-bold text-left animate-fade-in">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Header Section */}
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
              <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                1. Venue Header & Branding
              </h4>

              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Header Logo Image</label>
                <div className="flex items-center space-x-3">
                  {billForm.logoUrl ? (
                    <img src={resolveMediaUrl(billForm.logoUrl)} alt="Logo" className="w-12 h-12 object-contain rounded-lg border bg-black/20 p-1 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20 text-[9px] font-bold shrink-0">
                      No Logo
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && onUploadImage) {
                        onUploadImage(e.target.files[0], 'logoUrl');
                      }
                    }}
                    disabled={uploading}
                    className="text-xs font-semibold text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {billForm.logoUrl && onDeleteImage && (
                    <button
                      type="button"
                      onClick={() => onDeleteImage('logoUrl')}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold border border-destructive/20 transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                      title="Delete header logo permanently from server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Logo</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Restaurant / Venue Name</label>
                  <input
                    type="text"
                    value={billForm.restaurantName || ''}
                    onChange={(e) => setBillForm({ ...billForm, restaurantName: e.target.value })}
                    placeholder="Empire Restaurant"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Bill Prefix</label>
                  <input
                    type="text"
                    value={billForm.billPrefix || ''}
                    onChange={(e) => setBillForm({ ...billForm, billPrefix: e.target.value })}
                    placeholder="INV"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Address Line 1</label>
                <input
                  type="text"
                  value={billForm.addressLine1 || ''}
                  onChange={(e) => setBillForm({ ...billForm, addressLine1: e.target.value })}
                  placeholder="161, MLA Layout, RT Nagar"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Address Line 2</label>
                  <input
                    type="text"
                    value={billForm.addressLine2 || ''}
                    onChange={(e) => setBillForm({ ...billForm, addressLine2: e.target.value })}
                    placeholder="Bangalore"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">City & ZIP Code</label>
                  <input
                    type="text"
                    value={billForm.cityZip || ''}
                    onChange={(e) => setBillForm({ ...billForm, cityZip: e.target.value })}
                    placeholder="Bangalore - 560032"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">GSTIN Number</label>
                  <input
                    type="text"
                    value={billForm.gstin || ''}
                    onChange={(e) => setBillForm({ ...billForm, gstin: e.target.value })}
                    placeholder="29AADCN9372N1ZM"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">FSSAI Number</label>
                  <input
                    type="text"
                    value={billForm.fssaiNo || ''}
                    onChange={(e) => setBillForm({ ...billForm, fssaiNo: e.target.value })}
                    placeholder="11223344556677"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={billForm.phone || ''}
                    onChange={(e) => setBillForm({ ...billForm, phone: e.target.value })}
                    placeholder="080-40414141"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Metadata & Toggles Section */}
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3">
              <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                2. Table & Customer Details Toggles
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billForm.showKOTNumbers !== false}
                    onChange={(e) => setBillForm({ ...billForm, showKOTNumbers: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span>Show KOT Nos</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billForm.showCovers !== false}
                    onChange={(e) => setBillForm({ ...billForm, showCovers: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span>Show Covers</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billForm.showCustomerDetail !== false}
                    onChange={(e) => setBillForm({ ...billForm, showCustomerDetail: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span>Customer Name/Phone</span>
                </label>
              </div>
            </div>

            {/* 3. Tax Rates & Calculations */}
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
              <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                3. Taxes & Calculation Rules
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">CGST (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={billForm.cgstPercent !== undefined && billForm.cgstPercent !== null ? billForm.cgstPercent : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setBillForm(prev => ({ ...prev, cgstPercent: '' }));
                        return;
                      }
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      const validVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                      setBillForm(prev => ({ ...prev, cgstPercent: validVal }));
                    }}
                    onBlur={() => {
                      if (billForm.cgstPercent === '' || isNaN(parseFloat(billForm.cgstPercent)) || parseFloat(billForm.cgstPercent) < 0) {
                        setBillForm(prev => ({ ...prev, cgstPercent: 0 }));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">SGST (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={billForm.sgstPercent !== undefined && billForm.sgstPercent !== null ? billForm.sgstPercent : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setBillForm(prev => ({ ...prev, sgstPercent: '' }));
                        return;
                      }
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      const validVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                      setBillForm(prev => ({ ...prev, sgstPercent: validVal }));
                    }}
                    onBlur={() => {
                      if (billForm.sgstPercent === '' || isNaN(parseFloat(billForm.sgstPercent)) || parseFloat(billForm.sgstPercent) < 0) {
                        setBillForm(prev => ({ ...prev, sgstPercent: 0 }));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Service Tax (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={billForm.serviceTaxPercent !== undefined && billForm.serviceTaxPercent !== null ? billForm.serviceTaxPercent : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setBillForm(prev => ({ ...prev, serviceTaxPercent: '' }));
                        return;
                      }
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      const validVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                      setBillForm(prev => ({ ...prev, serviceTaxPercent: validVal }));
                    }}
                    onBlur={() => {
                      if (billForm.serviceTaxPercent === '' || isNaN(parseFloat(billForm.serviceTaxPercent)) || parseFloat(billForm.serviceTaxPercent) < 0) {
                        setBillForm(prev => ({ ...prev, serviceTaxPercent: 0 }));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={billForm.enableAutoRoundOff !== false}
                  onChange={(e) => setBillForm({ ...billForm, enableAutoRoundOff: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span>Auto Round Off Paise (e.g. ₹817.05 + taxes → ₹858)</span>
              </label>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-[10px] text-muted-foreground font-bold uppercase block">Default Thermal Paper Format</label>
                <div className="flex items-center space-x-2 bg-background p-1 rounded-xl border border-input">
                  <button
                    type="button"
                    onClick={() => setBillForm({ ...billForm, billWidthFormat: '80mm' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${billForm.billWidthFormat !== '58mm'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    3-Inch (80mm POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillForm({ ...billForm, billWidthFormat: '58mm' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${billForm.billWidthFormat === '58mm'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    2-Inch (58mm Portable Roll)
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Custom Footer & QR Code Upload */}
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
              <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                4. Custom Footer & QR Code Upload
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Greeting Line</label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-primary">
                    <input
                      type="checkbox"
                      checked={billForm.showThankYouMessage !== false}
                      onChange={(e) => setBillForm({ ...billForm, showThankYouMessage: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    <span>Print Thank You Section</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={billForm.thankYouMessage || ''}
                  onChange={(e) => setBillForm({ ...billForm, thankYouMessage: e.target.value })}
                  disabled={billForm.showThankYouMessage === false}
                  placeholder="Thank You & Visit Again !"
                  className={`w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none ${billForm.showThankYouMessage === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">CRM Contact Name</label>
                  <input
                    type="text"
                    value={billForm.crmContactName || ''}
                    onChange={(e) => setBillForm({ ...billForm, crmContactName: e.target.value })}
                    placeholder="Mr. VAISHAG"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">CRM Phone</label>
                  <input
                    type="text"
                    value={billForm.crmContactPhone || ''}
                    onChange={(e) => setBillForm({ ...billForm, crmContactPhone: e.target.value })}
                    placeholder="9036888877"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Delivery Phone</label>
                  <input
                    type="text"
                    value={billForm.deliveryPhone || ''}
                    onChange={(e) => setBillForm({ ...billForm, deliveryPhone: e.target.value })}
                    placeholder="080 6965 6565"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Custom QR Code Image (UPI / Feedback)</label>
                <div className="flex items-center space-x-3">
                  {billForm.qrImageUrl ? (
                    <img src={resolveMediaUrl(billForm.qrImageUrl)} alt="QR" className="w-16 h-16 object-contain rounded-lg border bg-white p-1 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20 text-[9px] font-bold text-center shrink-0">
                      No QR Image
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && onUploadImage) {
                        onUploadImage(e.target.files[0], 'qrImageUrl');
                      }
                    }}
                    disabled={uploading}
                    className="text-xs font-semibold text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {billForm.qrImageUrl && onDeleteImage && (
                    <button
                      type="button"
                      onClick={() => onDeleteImage('qrImageUrl')}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold border border-destructive/20 transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                      title="Delete QR image permanently from server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Image</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">QR Caption Text</label>
                <input
                  type="text"
                  value={billForm.qrCaption || ''}
                  onChange={(e) => setBillForm({ ...billForm, qrCaption: e.target.value })}
                  placeholder="Scan this QR to pay / provide feedback"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Thermal Receipt Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Live Thermal Receipt Preview</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-bold">
                {billForm.billWidthFormat === '58mm' ? '2-Inch (58mm Portable)' : '3-Inch (80mm POS)'}
              </span>
            </div>

            {/* Paper Format Tab Switcher */}
            <div className="flex items-center space-x-2 bg-muted/40 p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setBillForm({ ...billForm, billWidthFormat: '80mm' })}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${billForm.billWidthFormat !== '58mm'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>📄 3-Inch (80mm POS)</span>
              </button>
              <button
                type="button"
                onClick={() => setBillForm({ ...billForm, billWidthFormat: '58mm' })}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${billForm.billWidthFormat === '58mm'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>📄 2-Inch (58mm Portable)</span>
              </button>
            </div>

            <div className="pt-1">
              <ThermalReceipt
                liveConfig={billForm}
                order={null}
                isPrintMode={false}
                overrideWidthFormat={billForm.billWidthFormat}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <div className="text-xs font-semibold">
            {hasChanges ? (
              <span className="text-amber-500 font-bold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                <span>Unsaved changes detected</span>
              </span>
            ) : (
              <span className="text-muted-foreground/60 text-[11px]">No changes detected</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || uploading || deleting || !hasChanges}
              className={`font-bold px-6 py-2.5 rounded-xl transition-all text-xs flex items-center space-x-2 ${
                saving || uploading || deleting || !hasChanges
                  ? 'bg-muted/50 border border-border/40 text-muted-foreground/50 cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer shadow-lg'
              }`}
            >
              <span>{saving ? 'Saving Configuration...' : 'Save Bill Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
