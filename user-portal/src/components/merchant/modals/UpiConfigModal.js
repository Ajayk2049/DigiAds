import React, { useState } from 'react';
import { X, QrCode, Plus, Trash2 } from 'lucide-react';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useOutletStore } from '@/stores/useOutletStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function UpiConfigModal(props) {
  const payment = usePaymentStore();
  const outlet = useOutletStore();
  const auth = useAuthStore();
  const token = auth.token;
  const outletId = outlet.selectedOutletId;

  const isOpen = props.isOpen ?? payment.showUpiModal;
  const onClose = props.onClose ?? (() => payment.setShowUpiModal(false));
  const paymentConfig = props.paymentConfig ?? payment.paymentConfig;
  const savedUpiList = props.savedUpiList ?? payment.savedUpiList;
  const onSaveNewUpi = props.onSaveNewUpi ?? ((upi, name) => payment.handleSaveNewUpi(outletId, upi, name));
  const onSelectActiveUpi = props.onSelectActiveUpi ?? ((upiItemOrId, payeeName) => payment.handleSelectActiveUpi(token, outletId, upiItemOrId, payeeName));
  const settingDefaultUpiId = props.settingDefaultUpiId ?? payment.settingDefaultUpiId;
  const onDeleteUpi = props.onDeleteUpi ?? ((upiId) => payment.handleDeleteUpi(token, outletId, upiId));
  const onUploadQr = props.onUploadQr ?? ((fileOrEvent, cb) => payment.handleQrCodeUpload(fileOrEvent, token, cb));
  const isUploadingQr = props.isUploadingQr ?? payment.isUploadingQr;
  const onVerifyUpi = props.onVerifyUpi ?? payment.handleVerifyUpi;
  const isVerifyingUpi = props.isVerifyingUpi ?? payment.isVerifyingUpi;

  const tempUpiInput = props.tempUpiInput ?? payment.tempUpiInput;
  const setTempUpiInput = props.setTempUpiInput ?? payment.setTempUpiInput;
  const tempPayeeName = props.tempPayeeName ?? payment.tempPayeeName;
  const setTempPayeeName = props.setTempPayeeName ?? payment.setTempPayeeName;
  const isUpiVerified = props.isUpiVerified ?? payment.isUpiVerified;
  const setIsUpiVerified = props.setIsUpiVerified ?? payment.setIsUpiVerified;
  const modalError = props.modalError ?? payment.modalError;
  const setModalError = props.setModalError ?? payment.setModalError;
  const modalInfo = props.modalInfo ?? payment.modalInfo;
  const setModalInfo = props.setModalInfo ?? payment.setModalInfo;

  if (!isOpen) return null;


  const handleClose = () => {
    setTempUpiInput('');
    setTempPayeeName('');
    setIsUpiVerified(false);
    setModalError('');
    setModalInfo('');
    onClose();
  };

  const handleVerify = async () => {
    if (!tempUpiInput.includes('@')) {
      setModalError('Please enter a valid UPI ID format (e.g. name@bank)');
      return;
    }
    setModalError('');
    setModalInfo('');
    if (onVerifyUpi) {
      try {
        const res = await onVerifyUpi(tempUpiInput);
        if (res && res.payeeName && !tempPayeeName) {
          setTempPayeeName(res.payeeName);
        }
        setIsUpiVerified(true);
        setModalInfo('UPI ID verified successfully!');
      } catch (err) {
        setModalError(err?.message || 'UPI verification failed. Please check the ID.');
        setIsUpiVerified(false);
      }
    } else {
      setIsUpiVerified(true);
      setModalInfo('UPI ID format validated.');
    }
  };

  const handleSave = () => {
    if (!isUpiVerified || !tempUpiInput) return;
    onSaveNewUpi(tempUpiInput, tempPayeeName);
    setTempUpiInput('');
    setTempPayeeName('');
    setIsUpiVerified(false);
    setModalInfo('UPI ID saved to list.');
  };

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (onUploadQr) {
      onUploadQr(e, (detectedUpi, detectedName) => {
        if (detectedUpi) {
          setTempUpiInput(detectedUpi);
          if (detectedName) setTempPayeeName(detectedName);
          setIsUpiVerified(true);
          setModalInfo(`QR Code decoded successfully: ${detectedUpi}`);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className="bg-card border border-border/40 rounded-2xl w-full p-6 relative flex flex-col space-y-4 shadow-2xl overflow-y-auto"
        style={{ maxWidth: '85%', maxHeight: '80%' }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="font-outfit text-md font-bold text-foreground">Configure UPI Payments</h3>
          <p className="text-[11px] text-muted-foreground mt-1 font-semibold">Upload your UPI QR code or enter details manually.</p>
        </div>

        {/* Notification messages */}
        {modalError && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-[10px] text-destructive font-bold text-left animate-fade-in">
            {modalError}
          </div>
        )}
        {modalInfo && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-left animate-fade-in">
            {modalInfo}
          </div>
        )}

        {/* Side-by-side layout container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: QR Upload & Manual Entry */}
          <div className="flex flex-col space-y-4 md:col-span-5">
            {/* QR Code Upload Zone */}
            <div className="border border-dashed border-border/60 rounded-xl p-3 bg-muted/20 flex flex-col items-center justify-center text-center space-y-1 relative transition-all hover:bg-muted/30 cursor-pointer min-h-[90px]">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploadingQr}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
              />
              <div className="flex items-center justify-center space-x-2 pointer-events-none z-10">
                <QrCode className="w-5 h-5 text-[#0069a8] opacity-70 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-foreground">
                  {isUploadingQr ? 'Scanning QR Code...' : 'Upload UPI QR Code Image'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground pointer-events-none z-10">
                Upload a screenshot or photo of your UPI QR code
              </span>
            </div>

            {/* Manual Entry & Save */}
            <div className="flex flex-col space-y-3 pt-1">
              <div className="space-y-3">
                <div className="flex space-x-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">UPI ID</label>
                    <input
                      type="text"
                      placeholder="enter upi id (e.g. name@bank)"
                      value={tempUpiInput}
                      onChange={(e) => {
                        setTempUpiInput(e.target.value);
                        setIsUpiVerified(false);
                        setModalError('');
                        setModalInfo('');
                      }}
                      className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifyingUpi || !tempUpiInput.includes('@')}
                    className="bg-[#0069a8]/10 hover:bg-[#0069a8]/20 disabled:opacity-50 text-[#0069a8] border border-[#0069a8]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer h-[34px] flex items-center justify-center shrink-0 min-w-[70px]"
                  >
                    {isVerifyingUpi ? (
                      <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Payee Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="enter payee name (e.g. Shop Name)"
                    value={tempPayeeName}
                    onChange={(e) => setTempPayeeName(e.target.value)}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!isUpiVerified}
                className="w-full bg-[#0069a8] hover:bg-[#005b94] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Save UPI ID</span>
              </button>
            </div>
          </div>

          {/* Right Column: Saved list */}
          <div className="border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6 flex flex-col min-h-0 md:col-span-7">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Saved UPI IDs</h4>

            {savedUpiList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No saved UPI IDs found. Add one above.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[150px] max-h-72">
                {savedUpiList.map((item, idx) => {
                  const isActive = paymentConfig.upiId === item.upiId;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${isActive
                        ? 'bg-primary/5 border-[#0069a8] shadow-sm'
                        : 'bg-background hover:bg-muted border-border/40'
                        }`}
                    >
                      <div className="flex flex-col space-y-0.5 text-left min-w-0 flex-1 mr-4">
                        <span className={`text-xs font-mono font-bold truncate ${isActive ? 'text-[#0069a8]' : 'text-foreground'}`} title={item.upiId}>
                          {item.upiId}
                        </span>
                        {item.payeeName && (
                          <span className="text-[10px] text-muted-foreground font-semibold truncate" title={item.payeeName}>
                            Name: {item.payeeName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {isActive ? (
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg uppercase tracking-wider select-none">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectActiveUpi(item.upiId, item.payeeName);
                            }}
                            disabled={settingDefaultUpiId === item.upiId}
                            className="text-[9px] font-black text-[#0069a8] bg-[#0069a8]/10 hover:bg-[#0069a8]/20 border border-[#0069a8]/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-50 flex items-center space-x-1"
                          >
                            {settingDefaultUpiId === item.upiId ? (
                              <>
                                <span className="w-2.5 h-2.5 border-2 border-[#0069a8] border-t-transparent rounded-full animate-spin inline-block" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <span>Make Default</span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUpi(item.upiId);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                          title="Delete UPI"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
