import React, { useRef, useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Cloud
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginView: React.FC = () => {
  const { login, setAuthView, loginNotice, setLoginNotice } = usePortal();
  
  const [email, setEmail] = useState('');
  const [passwordOrToken, setPasswordOrToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const loginRequestInFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRequestInFlight.current) return;

    loginRequestInFlight.current = true;
    setErrorMessage(null);
    if (setLoginNotice) {
      setLoginNotice(null);
    }
    setLoading(true);

    try {
      const res = await login(email, passwordOrToken);
      if (res.success) {
        // Aplikasi tidak memakai router eksternal; history URL diselaraskan
        // segera setelah context menulis sesi dan membuka portal.
        window.history.replaceState(null, '', '/dashboard');
        return;
      }

      setErrorMessage(res.message || 'Password atau Kode Akses akun Anda salah.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Terjadi kendala koneksi saat autentikasi.');
    } finally {
      loginRequestInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between relative overflow-hidden font-sans text-slate-800">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E8F7F5] blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[#F4EDE2] blur-3xl" />
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

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#32A89C]" />
            Portal Client VIP
          </span>
        </div>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 border border-[#E5E0D8] shadow-[0_12px_40px_rgba(0,0,0,0.06)] font-sans">
          {/* Card Header */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/20 flex items-center justify-center mb-4 shadow-sm">
              <Lock className="w-7 h-7 text-[#32A89C]" />
            </div>
            <h1 className="text-2xl font-black text-[#0F1A24] tracking-tight mb-1.5">
              Client Portal VIP
            </h1>
            <p className="text-sm text-slate-500 max-w-xs mx-auto font-normal">
              Akses konsol perencanaan kekayaan terpadu dan lembar kerja finansial Anda.
            </p>
          </div>

          {/* Success Notice (e.g. from Reset Password) */}
          {loginNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sukses</p>
                <p className="mt-0.5 font-normal">{loginNotice}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Gagal Autentikasi</p>
                <p className="mt-0.5 font-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password / VIP Token Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Password / Kode Akses VIP
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-[#32A89C] hover:text-[#25857B] font-medium transition-colors cursor-pointer"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordOrToken}
                  onChange={(e) => setPasswordOrToken(e.target.value)}
                  placeholder="Masukkan Password atau Token VIP"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] focus:border-[#32A89C] focus:bg-white focus:outline-none text-sm font-normal text-slate-900 placeholder:text-slate-400 transition-all font-sans"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-5 rounded-2xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer font-sans"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                <>
                  <span>Masuk ke Portal VIP</span>
                  <ArrowRight className="w-4 h-4 text-[#32A89C] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Secure Token Info */}
          <div className="mt-6 pt-5 border-t border-[#E5E0D8] text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#32A89C]" />
              Privasi Terjaga • Tersimpan Otomatis
            </p>
          </div>

          {/* Official Contact Info */}
          <div className="mt-4 pt-3 border-t border-dashed border-[#EAE6DF] text-center">
            <p className="text-[11px] text-slate-500 font-medium mb-1.5">
              Butuh bantuan login atau konsultasi?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <a
                href="https://wa.me/6281806988868?text=Halo%20Admin%20Jago%20Rencana%2C%20saya%20membutuhkan%20bantuan%20akses%20Client%20Portal%20VIP."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#1D6E66] hover:text-[#144f49] font-medium transition-colors"
              >
                <span>WhatsApp: +62 818-0698-8868</span>
              </a>
              <span className="text-slate-300">•</span>
              <a
                href="mailto:jagorencana@gmail.com"
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <span>Email: jagorencana@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Security Badges */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400 font-sans">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-500 text-xs">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#32A89C]" />
            Privasi & Data Terenkripsi
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#32A89C]" />
            Advisory Independen & Bebas Konflik
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-[#32A89C]" />
            Data Tersimpan Otomatis
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          © 2026 Jago Rencana Platform. All rights reserved.
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
        onNavigateToReset={() => {
          setShowForgotModal(false);
          setAuthView('reset-password');
        }}
      />
    </div>
  );
};
