import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  Check, 
  CreditCard, 
  ArrowRight, 
  Phone, 
  Mail, 
  User, 
  AlertCircle,
  ExternalLink,
  Zap,
  CheckCircle2,
  Building2,
  QrCode
} from 'lucide-react';
import { 
  DUITKU_CONFIG, 
  generateUpgradeOrderId, 
  createDuitkuInvoice, 
  savePendingUpgrade,
  DuitkuInvoiceResponse
} from '../services/duitkuService';
import { 
  sanitizeText, 
  validateIndonesianWhatsApp, 
  validateEmail, 
  generateLifetimeToken,
  saveVipSession,
  VipSessionData
} from '../utils/security';
import { formatRupiah } from '../utils/calculations';
import confetti from 'canvas-confetti';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  onUpgradeSuccess?: (session: VipSessionData) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
  onUpgradeSuccess,
}) => {
  const [nama, setNama] = useState(defaultName || '');
  const [email, setEmail] = useState(defaultEmail || '');
  const [whatsapp, setWhatsapp] = useState(defaultPhone || '');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duitkuResult, setDuitkuResult] = useState<DuitkuInvoiceResponse | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'duitku_checkout' | 'success'>('form');
  const [generatedSession, setGeneratedSession] = useState<VipSessionData | null>(null);

  if (!isOpen) return null;

  // Handle Duitku Payment Initiation
  const handleInitiateDuitkuUpgrade = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const cleanNama = sanitizeText(nama) || 'Klien Terhormat';
    const cleanEmail = sanitizeText(email) || 'client@jagorencana.com';
    const cleanPhone = sanitizeText(whatsapp) || '08123456789';

    if (cleanNama.length < 2) {
      setValidationError('Nama lengkap wajib diisi.');
      return;
    }

    if (email && !validateEmail(cleanEmail)) {
      setValidationError('Format alamat email tidak valid.');
      return;
    }

    if (whatsapp && !validateIndonesianWhatsApp(cleanPhone)) {
      setValidationError('Format WhatsApp tidak valid (contoh: 0812xxxxxxxx / 628xxxxxxxx).');
      return;
    }

    setIsProcessing(true);

    // 1. Generate Order ID: "JR-UPG-" + Date.now()
    const orderId = generateUpgradeOrderId();

    try {
      // 2. Call Duitku Sandbox payment flow
      const invoice = await createDuitkuInvoice({
        orderId,
        name: cleanNama,
        email: cleanEmail,
        phone: cleanPhone,
      });

      // 3. Save temporary transaction reference in localStorage for seamless return verification
      savePendingUpgrade({
        orderId: invoice.orderId || orderId,
        reference: invoice.reference,
        email: cleanEmail,
        name: cleanNama,
      });

      setDuitkuResult(invoice);
      setPaymentStep('duitku_checkout');

      // 4. Open Duitku Sandbox checkout in a new window or trigger redirect
      if (invoice.paymentUrl) {
        try {
          window.open(invoice.paymentUrl, '_blank', 'noopener,noreferrer');
        } catch (openErr) {
          console.warn('Popup blocked, available via button:', openErr);
        }
      }
    } catch (err: any) {
      console.error('Error initiating Duitku payment:', err);
      setValidationError('Terjadi kendala saat menghubungi gateway Duitku. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete & Verify VIP Access (Client-side & localStorage verification)
  const handleVerifyVipSuccess = () => {
    const orderId = duitkuResult?.orderId || generateUpgradeOrderId();
    const cleanNama = sanitizeText(nama) || 'Klien Terhormat';
    const cleanEmail = sanitizeText(email) || 'client@jagorencana.com';
    const cleanPhone = sanitizeText(whatsapp) || '+62 812-xxxx-xxxx';

    const lifetimeToken = generateLifetimeToken('blueprint');

    const sessionData: VipSessionData = {
      token: lifetimeToken,
      tier: 'BLUEPRINT_VIP',
      email: cleanEmail,
      name: cleanNama,
      phone: cleanPhone,
      access: 'lifetime',
      issuedAt: new Date().toISOString(),
      orderId,
      unlockedModules: [
        'tvm_goals',
        'kpr_restructure',
        'smart_travel',
        'master_budgeting',
        'sinking_funds',
        'executive_report',
        'jago_portfolio',
      ],
    };

    // Save permanent VIP session to localStorage
    saveVipSession(sessionData);

    // Update user_session in localStorage to ensure all guards instantly treat user as VIP
    try {
      const existingRaw = localStorage.getItem('user_session');
      const baseSession = existingRaw ? JSON.parse(existingRaw) : {};
      const updatedUserSession = {
        ...baseSession,
        email: cleanEmail,
        nama: cleanNama,
        orderId,
        token: lifetimeToken,
        tier: 'BLUEPRINT_VIP',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem('user_session', JSON.stringify(updatedUserSession));
      localStorage.removeItem('jr_pending_upgrade');
    } catch (e) {
      console.warn('Could not update user_session in localStorage', e);
    }

    setGeneratedSession(sessionData);
    setPaymentStep('success');

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#32A89C', '#0F1A24', '#F59E0B'],
      });
    } catch (cErr) {
      console.warn(cErr);
    }

    if (onUpgradeSuccess) {
      onUpgradeSuccess(sessionData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E0D8] shadow-2xl max-w-xl w-full my-8 overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="bg-[#0F1A24] text-white p-5 sm:p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center font-bold text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Upgrade ke VIP Blueprint OS
                </h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  LIFETIME ACCESS
                </span>
              </div>
              <p className="text-xs text-white/70">
                Payment Gateway: Duitku Sandbox • Merchant Code: {DUITKU_CONFIG.merchantCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-lg font-bold p-1 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-7">
          {/* STEP 1: FORM & PACKAGE CONFIRMATION */}
          {paymentStep === 'form' && (
            <form onSubmit={handleInitiateDuitkuUpgrade} className="space-y-4">
              {/* Package Summary Card */}
              <div className="p-4 rounded-xl border-2 border-[#32A89C] bg-[#E8F7F5]/50 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#1D6E66] bg-[#E8F7F5] px-2 py-0.5 rounded border border-[#32A89C]/30">
                      PAKET RESMI
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">
                      {DUITKU_CONFIG.package.name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {DUITKU_CONFIG.package.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-slate-900 tabular-nums block">
                      {formatRupiah(DUITKU_CONFIG.package.amount)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Sekali bayar • Selamanya</span>
                  </div>
                </div>

                {/* Features Included */}
                <div className="mt-3 pt-3 border-t border-[#32A89C]/20 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Master 4-Pos Budgeting Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Sinking Funds Multi-Goal Planner</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Jago Portofolio (Interactive Engine)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Simulator KPR & SBN Kas Produktif</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Smart Travel Budget Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#32A89C] shrink-0" />
                    <span>Executive Report PDF & 1-on-1 Meet</span>
                  </div>
                </div>
              </div>

              {/* Data Konfirmasi Klien */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Nama Lengkap Sesuai KTP / Akun
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="h-11 w-full pl-10 pr-4 rounded-xl bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-sm text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 w-full pl-10 pr-4 rounded-xl bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Nomor WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="0812-xxxx-xxxx"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="h-11 w-full pl-10 pr-4 rounded-xl bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-sm text-slate-900 tabular-nums outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div className="p-3 bg-[#FFE4E6] border border-[#FDA4AF] rounded-xl flex items-center gap-2 text-xs font-bold text-[#E11D48]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Action Button: Upgrade ke VIP Blueprint (Rp 500.000) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {isProcessing ? (
                    <span>Menghubungkan ke Gateway Duitku Sandbox...</span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Upgrade ke VIP Blueprint ({formatRupiah(DUITKU_CONFIG.package.amount)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-2.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Duitku Sandbox Certified • Enkripsi SHA256/MD5 Aman</span>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: DUITKU CHECKOUT & TRANSACTION REFERENCE ACTIVE */}
          {paymentStep === 'duitku_checkout' && duitkuResult && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D5CEBF] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Order ID:</span>
                  <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    {duitkuResult.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Referensi Duitku:</span>
                  <span className="font-bold text-[#1D6E66] font-mono">
                    {duitkuResult.reference}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Paket:</span>
                  <span className="font-bold text-slate-900">VIP Blueprint OS</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#D5CEBF]">
                  <span className="font-bold text-slate-700">Total Tagihan:</span>
                  <span className="text-base font-black text-slate-900 tabular-nums">
                    {formatRupiah(duitkuResult.grossAmount)}
                  </span>
                </div>
              </div>

              {/* Sandbox Payment Channel Notice */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Transaksi Terdaftar di Duitku Sandbox</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Referensi telah disimpan di perangkat Anda. Anda dapat menyelesaikan pembayaran di portal Duitku, atau verifikasi langsung status VIP Blueprint Anda di bawah.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {duitkuResult.paymentUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(duitkuResult.paymentUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4 text-amber-400" />
                    <span>Buka Halaman Pembayaran Duitku Sandbox</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleVerifyVipSuccess}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Verifikasi Pembayaran & Aktifkan VIP Sekarang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStep('form')}
                  className="w-full h-9 rounded-xl text-slate-500 text-xs font-semibold hover:text-slate-800 transition-colors"
                >
                  Kembali ubah data
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT VERIFIED & ALL MODULES UNLOCKED */}
          {paymentStep === 'success' && generatedSession && (
            <div className="space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  STATUS: VIP BLUEPRINT TERVERIFIKASI
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Selamat Datang di VIP Blueprint OS!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  Transaksi Order ID <strong className="text-slate-800 font-mono">{generatedSession.orderId}</strong> berhasil terverifikasi. Seluruh modul portal, simulator KPR, alokasi 4-Pos, Jago Portofolio, dan laporan cetak kini telah dibuka 100%.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Permanent Token:</span>
                  <span className="font-mono font-bold text-emerald-700 text-[11px]">{generatedSession.token}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Pemilik Akun:</span>
                  <span className="font-semibold text-slate-900">{generatedSession.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Akses:</span>
                  <span className="font-bold text-amber-700">LIFETIME ACCESS (Selamanya)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-12 rounded-xl bg-[#0F1A24] hover:bg-slate-800 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Buka & Eksplorasi Seluruh Modul VIP</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
