import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

export const ResetPasswordView: React.FC = () => {
  const { forgotPassword, resetPassword, setAuthView, setLoginNotice } = usePortal();

  // 1. Initial email state: dynamic from URL query (?email=...) or empty string
  const [email, setEmail] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam && emailParam.includes('@')) {
          return emailParam.trim();
        }
      }
    } catch {
      // Ignore
    }
    return '';
  });

  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestOtpLoading, setRequestOtpLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Masukkan email terdaftar yang valid terlebih dahulu.');
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequestOtpLoading(true);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        if (res.otp) {
          setOtpToken(res.otp);
        }
        setOtpSentNotice(res.message || `Kode OTP / Instruksi reset telah dikirimkan ke email ${email}.`);
        setTimeout(() => setOtpSentNotice(null), 10000);
      } else {
        setErrorMessage(res.message || 'Gagal mengirim instruksi reset password. Pastikan email Anda terdaftar.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat meminta kode OTP.');
    } finally {
      setRequestOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpToken || otpToken.trim().length === 0) {
      setErrorMessage('Masukkan Kode OTP atau Token Reset yang telah dikirimkan ke email Anda.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(email, otpToken, newPassword);
      if (res.success) {
        const successMsg = 'Password berhasil diperbarui! Silakan masuk dengan password baru Anda.';
        setSuccessMessage(successMsg);
        setLoginNotice(successMsg);
        setTimeout(() => {
          setAuthView('login');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Gagal mengatur ulang password. Periksa kode OTP atau coba lagi.');
      }
    } catch {
      setErrorMessage('Terjadi kendala sistem saat reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between relative overflow-hidden font-sans text-slate-800">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E8F7F5] blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-96 h-96 rounded-full bg-[#F4EDE2] blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <a
            href="https://jago-rencana-web.pages.dev/"
            target="_self"
            className="flex items-center group focus:outline-none transition-opacity hover:opacity-85"
            title="Kembali ke Beranda Jago Rencana"
          >
            <img 
              src="/logo-jr.png" 
              alt="Jago Rencana" 
              className="h-10 md:h-12 w-auto object-contain shrink-0" 
            />
          </a>
        </div>

        <button
          onClick={() => setAuthView('login')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E0D8] text-xs font-bold text-slate-700 hover:bg-[#F4F0E8] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Login</span>
        </button>
      </header>

      {/* Main Form Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 border border-[#E5E0D8] shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/20 flex items-center justify-center mb-4 shadow-sm">
              <KeyRound className="w-7 h-7 text-[#32A89C]" />
            </div>
            <h1 className="text-2xl font-black text-[#0F1A24] tracking-tight mb-1.5">
              Reset Password Portal VIP
            </h1>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Verifikasi email terdaftar dan atur password baru akun Anda.
            </p>
          </div>

          {/* OTP Sent Notification */}
          {otpSentNotice && (
            <div className="mb-4 p-3 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#32A89C] shrink-0" />
              <p className="font-semibold">{otpSentNotice}</p>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-bold">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
                  placeholder="nama@email.com"
                />
              </div>
            </div>

            {/* OTP Code with Request Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">
                  Kode OTP / Token Reset
                </label>
                <button
                  type="button"
                  disabled={requestOtpLoading}
                  onClick={handleRequestOtp}
                  className="text-xs text-[#32A89C] hover:text-[#25857B] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {requestOtpLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[#32A89C]/30 border-t-[#32A89C] rounded-full animate-spin" />
                      <span>Mengirim OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Kirim Kode OTP</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otpToken}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    setOtpToken(digitsOnly);
                  }}
                  placeholder="Masukkan 6 digit angka OTP"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans tracking-wider"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Password Baru (Min. 6 Karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-5 rounded-2xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer font-sans"
            >
              {loading ? (
                <span>Menyimpan Password...</span>
              ) : (
                <span>Simpan Password</span>
              )}
            </button>
          </form>

          {/* Back to Login Button */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setAuthView('login')}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Sudah ingat password Anda? <span className="text-[#32A89C] font-semibold">Masuk di sini</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400 font-sans">
        <p>© 2026 Jago Rencana Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};
