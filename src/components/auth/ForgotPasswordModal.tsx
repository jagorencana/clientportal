import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  ShieldCheck,
  Loader2,
  KeyRound
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onNavigateToReset?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onNavigateToReset
}) => {
  const { forgotPassword, setAuthView } = usePortal();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail.trim());
      setStatus('idle');
      setMessage('');
      setReceivedOtp(null);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Masukkan alamat email klien terdaftar yang valid.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setStatus('success');
        setMessage(res.message || 'Instruksi reset password dan kode verifikasi telah dikirim.');
        if (res.otp) {
          setReceivedOtp(res.otp);
        }
      } else {
        setStatus('error');
        setMessage(res.message || 'Email tidak ditemukan di sistem. Pastikan menggunakan email terdaftar.');
      }
    } catch {
      setStatus('error');
      setMessage('Gagal menghubungi server. Silakan hubungi admin via WhatsApp untuk bantuan langsung.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetPage = () => {
    onClose();
    if (onNavigateToReset) {
      onNavigateToReset();
    } else {
      setAuthView('reset-password');
    }
  };

  const whatsappEmergencyUrl = `https://wa.me/6281806988868?text=${encodeURIComponent(
    'Halo Tim Support Jago Rencana, saya mengalami kendala lupa password portal VIP.'
  )}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-2xl relative font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/20 flex items-center justify-center mb-3 shadow-xs">
            <KeyRound className="w-6 h-6 text-[#32A89C]" />
          </div>
          <h2 className="text-xl font-bold text-[#0F1A24] tracking-tight mb-1">
            Lupa Password Portal
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Masukkan email klien terdaftar untuk menerima instruksi reset dan kode verifikasi akses VIP.
          </p>
        </div>

        {/* Success Banner */}
        {status === 'success' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Instruksi Terkirim</p>
                  <p className="mt-0.5 text-emerald-800 leading-relaxed">{message}</p>
                  {receivedOtp && (
                    <div className="mt-2.5 p-2 bg-white rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Kode Verifikasi Sementara</span>
                      <span className="text-base font-mono font-bold tracking-widest text-[#0F1A24]">{receivedOtp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenResetPage}
              className="w-full py-3 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Formulir Reset Password</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Permintaan Gagal</p>
                  <p className="mt-0.5 font-normal text-rose-700">{message}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email Klien Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim Instruksi...</span>
                </div>
              ) : (
                <>
                  <span>Kirim Instruksi Reset</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Emergency WhatsApp Help */}
        <div className="mt-6 pt-4 border-t border-dashed border-[#E5E0D8] text-center">
          <p className="text-[11px] text-slate-500 font-medium mb-2">
            Butuh bantuan darurat atau lupa email terdaftar?
          </p>
          <a
            href={whatsappEmergencyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hubungi Admin via WhatsApp</span>
          </a>
          <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3 text-[#32A89C]" />
            <span>Dukungan Verifikasi Manual 24/7 Tim Jago Rencana</span>
          </div>
        </div>
      </div>
    </div>
  );
};
