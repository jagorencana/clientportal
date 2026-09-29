import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Printer, 
  Sparkles, 
  ChevronDown, 
  Check, 
  Download,
  KeyRound, 
  CreditCard, 
  RotateCcw, 
  ExternalLink,
  Menu,
  Cloud,
  CloudCheck,
  RefreshCw,
  User,
  LogOut,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { ClientProfile, ClientTier, CloudSyncStatus } from '../types';
import { usePortal } from '../context/PortalContext';

interface NavbarProps {
  client: ClientProfile;
  onSwitchProfile: (profileKey: string) => void;
  activeProfileKey: string;
  onOpenAdvisorModal: () => void;
  onOpenAuthModal: () => void;
  onOpenBookingModal: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  onPrintReport: () => void;
  onResetData?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cloudSyncStatus: CloudSyncStatus;
  onToggleMobileNav: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  client,
  onSwitchProfile,
  activeProfileKey,
  onOpenAdvisorModal,
  onOpenAuthModal,
  onOpenBookingModal,
  onOpenProfileModal,
  onLogout,
  onPrintReport,
  onResetData,
  activeTab,
  setActiveTab,
  cloudSyncStatus,
  onToggleMobileNav,
}) => {
  const { currentUser, user, portalData, isVip: contextIsVip, baselineAudit, vipDaysRemaining } = usePortal();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const daysRemaining = vipDaysRemaining;

  const isVip = Boolean(
    (user?.tier || currentUser?.tier || client?.tier) &&
    String(user?.tier || currentUser?.tier || client?.tier).toUpperCase().includes("VIP")
  );

  const isPlaceholder = (n?: string) => {
    if (!n) return true;
    const lower = n.toLowerCase().trim();
    return lower === 'vip demo' || lower === 'starter demo' || lower === 'demo' || lower === 'vip blueprint member' || lower === 'user' || lower === '';
  };

  const clientName = portalData?.profile?.name || portalData?.profile?.fullName || user?.name || user?.nama || currentUser?.nama || (!isPlaceholder(client?.name) ? client?.name : (!isPlaceholder(baselineAudit?.clientName) ? baselineAudit.clientName : "Klien VIP"));
  const displayEmail = user?.email || currentUser?.email || client?.email || '';
  const displayId = user?.orderId || currentUser?.orderId || portalData?.profile?.id || client?.id || "JR-VIP-CLIENT";
  const avatarInitial = clientName.trim().charAt(0).toUpperCase() || 'V';
  const nickname = clientName.trim().split(' ')[0] || 'Klien';

  const getTierBadge = () => {
    if (isVip) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] text-[10px] font-black tracking-wider uppercase shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          🟢 VIP BLUEPRINT OS
        </span>
      );
    }
    
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black tracking-wider uppercase shadow-2xs">
          ⚪ STARTER PASS
        </span>
        <button
          onClick={onOpenBookingModal || (() => window.open('https://wa.me/6281806988868?text=Halo%20Admin%2C%20saya%20ingin%20upgrade%20ke%20VIP%20Blueprint', '_blank'))}
          className="inline-flex items-center gap-1 text-[11px] font-black text-slate-900 hover:text-white bg-amber-400 hover:bg-slate-900 px-2.5 py-0.5 rounded-full border border-amber-300 transition-all cursor-pointer shadow-2xs"
          title="Tingkatkan ke VIP Blueprint OS (Rp 500.000)"
        >
          <span>⚡ Upgrade ke VIP (Rp 500.000)</span>
        </button>
      </div>
    );
  };

  const getCloudSyncBadge = () => {
    switch (cloudSyncStatus) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold shadow-2xs">
            <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin" />
            <span className="hidden sm:inline">Menyimpan...</span>
            <span className="sm:hidden">Sync...</span>
          </span>
        );
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">☁️ Tersimpan</span>
            <span className="sm:hidden">☁️ Saved</span>
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] text-slate-600 text-[11px] font-semibold">
            <span>💾 Disimpan Lokal</span>
          </span>
        );
    }
  };

  const whatsappSupportUrl = `https://wa.me/6281806988868?text=${encodeURIComponent(
    `Halo Jago Rencana Wealth OS, saya klien ${isVip ? 'VIP Blueprint' : 'Starter Pass'} (${clientName} - ID: ${displayId}) ingin konsultasi priority advisory.`
  )}`;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EAE6DF] py-2.5 px-4 sm:px-8 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Left: Mobile Menu Button & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger Drawer Button (Mobile only) */}
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-[#EAE6DF] focus:outline-none transition-colors"
            title="Buka Navigasi Modul"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo inside dashboard: No navigation function to prevent disruption */}
          <div 
            className="flex items-center text-left select-none cursor-default py-0.5"
            title="Jago Rencana VIP Client Portal"
          >
            <img 
              src="/logo-jr.png" 
              alt="Jago Rencana" 
              className="h-9 sm:h-11 w-auto object-contain shrink-0 pointer-events-none" 
            />
          </div>
          
          <div className="hidden lg:flex ml-2">
            {getTierBadge()}
          </div>
        </div>

        {/* Center / Right Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Auto-Save Status Badge */}
          {getCloudSyncBadge()}

          {/* Dynamic WA Advisory Countdown Button */}
          {daysRemaining > 0 ? (
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex h-9 px-3.5 rounded-full bg-[#E8F7F5] hover:bg-[#D4EFEA] border border-[#32A89C]/30 text-[#1D6E66] font-bold text-xs shadow-2xs transition-all items-center gap-1.5"
              title="Akses Konsultasi Langsung via WhatsApp Advisory"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#32A89C]" />
              <span>Priority WA ({daysRemaining} Hari)</span>
              <ExternalLink className="w-3 h-3 text-[#32A89C]/70" />
            </a>
          ) : (
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex h-9 px-3.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs shadow-2xs transition-all items-center gap-1.5"
              title="Masa aktif pendampingan VIP 30 Hari telah selesai. Hubungi Advisor untuk perpanjangan."
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>Priority WA (Selesai)</span>
              <ExternalLink className="w-3 h-3 text-amber-600/70" />
            </a>
          )}

          {/* Download / Print Executive Report Button */}
          <button
            onClick={onPrintReport}
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            title="Cetak atau Simpan Dokumen A4 PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#32A89C]" />
            <span className="hidden sm:inline">Executive Report (PDF)</span>
            <span className="sm:hidden text-[11px]">PDF</span>
          </button>

          {/* Client Profile Avatar & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 pl-1.5 pr-2 sm:pr-2.5 rounded-full bg-white border border-[#E5E0D8] hover:border-[#D5CEBF] shadow-2xs transition-all text-left"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0F1A24] text-white flex items-center justify-center text-xs font-bold uppercase">
                {clientName.trim().charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-slate-900 max-w-[120px] truncate">
                {nickname}
              </span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl p-4 border border-[#E5E0D8] shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-start justify-between pb-3 border-b border-[#E5E0D8]">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{clientName}</p>
                    <p className="text-xs text-slate-500">{displayEmail}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">ID: {displayId}</p>
                  </div>
                </div>

                <div className="py-2.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenProfileModal();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold text-slate-800 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#32A89C]" />
                      <span>Profil Akun Klien</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">Edit</span>
                  </button>

                  <div className="flex items-center justify-between px-2 py-1.5">
                    {getTierBadge()}
                  </div>
                </div>

                <div className="mt-2 pt-2.5 border-t border-[#E5E0D8] space-y-1.5">
                  <a
                    href={whatsappSupportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full h-8.5 rounded-xl bg-[#E8F7F5] hover:bg-[#D3F0EC] text-[#1D6E66] border border-[#32A89C]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#32A89C]" />
                    Hubungi Priority WhatsApp
                  </a>

                  {onResetData && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onResetData();
                      }}
                      className="w-full h-8.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F0E8] text-slate-600 hover:text-slate-900 border border-[#E5E0D8] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset Data Sesi
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full h-8.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    Keluar (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
