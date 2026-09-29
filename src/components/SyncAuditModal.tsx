import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CloudDownload, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { 
  fetchLatestAuditFromCloud, 
  HomepageAuditData, 
  DEFAULT_BASELINE_AUDIT, 
  saveHomepageAuditData 
} from '../utils/auditData';

interface SyncAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: (audit: HomepageAuditData) => void;
  currentIdentifier?: string;
}

export const SyncAuditModal: React.FC<SyncAuditModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  currentIdentifier = '',
}) => {
  const [identifier, setIdentifier] = useState(currentIdentifier);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = identifier.trim();
    if (!clean || clean.length < 3) {
      setErrorMessage('Silakan masukkan nomor WhatsApp (contoh: 081288776655) atau Email yang valid.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchLatestAuditFromCloud(clean);
      if (res.success && res.data) {
        setSuccessMessage(res.message || 'Data audit berhasil dimuat!');
        setTimeout(() => {
          onSyncSuccess(res.data!);
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.message || 'Data audit belum ditemukan di Google Cloud. Silakan periksa kembali nomor/email Anda.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat menghubungi database cloud.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="sync-audit-modal"
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-2xl relative overflow-hidden"
      >
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8F7F5] rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Close Button */}
        <button
          id="close-sync-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/30 flex items-center justify-center shrink-0 shadow-xs">
            <CloudDownload className="w-6 h-6 text-[#32A89C]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F7F5] text-[#1D6E66] text-[11px] font-bold mb-1">
              <Sparkles className="w-3 h-3 text-[#32A89C]" />
              Data Continuity Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Sinkronkan Data Audit Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Masukkan No. WhatsApp atau Email yang Anda gunakan saat mengisi audit di Beranda Jago Rencana untuk memuat otomatis profil neraca kas Anda.
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Data Belum Ditemukan</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Sinkronisasi Berhasil</p>
              <p className="mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleFetchAudit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              No. WhatsApp / Email Terdaftar
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
                <Phone className="w-4 h-4" />
                <span className="text-slate-300">/</span>
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="audit-identifier-input"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 081288776655 atau klien@email.com"
                className="w-full pl-16 pr-4 py-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-semibold text-slate-900 transition-all shadow-inner"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Sistem akan memanggil Google Apps Script: <code className="text-slate-600 font-mono text-[10px]">?action=get_latest_audit&identifier=...</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              id="fetch-audit-submit-btn"
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-5 rounded-2xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#32A89C]" />
                  <span>Menghubungi Cloud...</span>
                </>
              ) : (
                <>
                  <span>Tarik Data Audit Sekarang</span>
                  <ArrowRight className="w-4 h-4 text-[#32A89C]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Helper Actions */}
        <div className="mt-5 pt-4 border-t border-[#E5E0D8] flex items-center justify-end text-xs">
          <button
            id="skip-sync-btn"
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Tutup & Lanjutkan
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#32A89C]" />
          <span>Terenkripsi & Otomatis Disimpan ke Penyimpanan Browser Anda</span>
        </div>
      </div>
    </div>
  );
};
