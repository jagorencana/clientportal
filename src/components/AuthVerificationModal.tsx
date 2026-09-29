import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Copy, 
  AlertCircle,
  ExternalLink,
  Zap,
  UserCheck
} from 'lucide-react';
import { ClientProfile } from '../types';
import { 
  verifyTokenStatus, 
  saveVipSession, 
  clearVipSession,
  sanitizeText,
  KNOWN_VIP_TOKENS,
  VipSessionData
} from '../utils/security';

interface AuthVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
  onUpdateClient: (updated: Partial<ClientProfile>) => void;
  onOpenBookingModal: () => void;
}

export const AuthVerificationModal: React.FC<AuthVerificationModalProps> = ({
  isOpen,
  onClose,
  client,
  onUpdateClient,
  onOpenBookingModal,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyToken = (tokenToVerify?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = tokenToVerify || tokenInput;
    const result = verifyTokenStatus(token);

    if (result.valid && result.data) {
      saveVipSession(result.data);
      onUpdateClient({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        tier: result.data.tier,
      });
      setSuccessMessage(`Akses Terverifikasi: Selamat datang, ${result.data.name}!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMessage(result.reason || 'Token tidak valid. Silakan periksa kembali.');
    }
  };

  const handleDemoLogin = (key: string) => {
    setTokenInput(key);
    handleVerifyToken(key);
  };

  const handleLogout = () => {
    clearVipSession();
    onUpdateClient({
      tier: 'STARTER',
    });
    setSuccessMessage('Sesi berhasil di-reset.');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-2xl max-w-lg w-full text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1A24] text-white flex items-center justify-center font-black text-xs">
              <Lock className="w-4 h-4 text-[#32A89C]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Verifikasi Akses Akun & Lisensi
              </h3>
              <p className="text-xs text-slate-500">
                Verifikasi token aktivasi (Lifetime Access Pass)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Active Status Indicator */}
        <div className="mt-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E0D8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${client.tier === 'BLUEPRINT_VIP' ? 'bg-[#32A89C]' : 'bg-[#E5A93C]'}`} />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Sesi Klien Aktif
              </span>
              <span className="text-xs font-bold text-slate-900">{client.name}</span>
            </div>
          </div>
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
            client.tier === 'BLUEPRINT_VIP'
              ? 'bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/30'
              : 'bg-[#FEF3C7] text-[#92400E]'
          }`}>
            {client.tier === 'BLUEPRINT_VIP' ? 'LIFETIME VIP ACTIVE' : 'STARTER TIER'}
          </span>
        </div>

        {/* Token Input Form */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Masukkan Token Akses / Magic Link Key
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Contoh: JR-VIP-9942-8812-LIFETIME"
                value={tokenInput}
                onChange={(e) => setTokenInput(sanitizeText(e.target.value))}
                className="h-11 w-full pl-10 pr-4 rounded-xl bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-xs font-mono text-slate-900 outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#FFE4E6] border border-[#FDA4AF] rounded-xl flex items-center gap-2 text-xs font-bold text-[#E11D48]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#E8F7F5] border border-[#32A89C]/30 rounded-xl flex items-center gap-2 text-xs font-bold text-[#1D6E66]">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleVerifyToken()}
            className="w-full h-11 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-[#32A89C]" />
            <span>Verifikasi & Aktifkan Sesi Lifetime</span>
          </button>
        </div>

        {/* Quick Demo Token Selector */}
        <div className="mt-5 pt-4 border-t border-[#E5E0D8]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Pilih Profil Demo VIP (Simulasi Akun Terverifikasi):
          </span>
          <div className="space-y-1.5">
            {Object.entries(KNOWN_VIP_TOKENS).slice(0, 2).map(([key, info]) => (
              <button
                key={key}
                onClick={() => handleDemoLogin(key)}
                className="w-full p-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F4F0E8] border border-[#E5E0D8] text-left flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{info.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{key}</span>
                </div>
                <span className="text-[10px] font-extrabold text-[#1D6E66] bg-[#E8F7F5] px-2 py-0.5 rounded border border-[#32A89C]/20">
                  Gunakan
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Haven't got a token? Link to Upgrade Modal */}
        <div className="mt-5 pt-4 border-t border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Belum memiliki token akses permanen?
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenBookingModal();
            }}
            className="text-xs font-bold text-[#1D6E66] hover:text-[#25857B] bg-[#E8F7F5] px-3.5 py-2 rounded-xl border border-[#32A89C]/30 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Reservasi Private Advisory (Rp 500k)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
