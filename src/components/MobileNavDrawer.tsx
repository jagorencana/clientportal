import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  PieChart, 
  Target, 
  TrendingUp, 
  Building2, 
  Plane, 
  FileText, 
  MessageSquare, 
  LogOut, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  ExternalLink,
  Lock,
  Zap,
  Sliders,
  Landmark
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfileModal: () => void;
  onPrintReport: () => void;
  onOpenBookingModal?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenProfileModal,
  onPrintReport,
  onOpenBookingModal,
}) => {
  const { profile, portalData, user, currentUser, isVip, logout, vipDaysRemaining } = usePortal();

  if (!isOpen) return null;

  const isStarter = !isVip;
  const clientName = portalData?.profile?.name || portalData?.profile?.fullName || user?.name || user?.nama || currentUser?.name || currentUser?.nama || profile.name || "Klien VIP";
  const displayEmail = user?.email || currentUser?.email || profile.email || '';
  const displayId = user?.orderId || portalData?.profile?.id || currentUser?.orderId || profile.id || "JR-VIP-CLIENT";
  const avatarInitial = clientName.trim().charAt(0).toUpperCase() || 'V';

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview & Audit Piramida', icon: LayoutDashboard, isLocked: false, isVipModule: false },
    { id: 'diagnostic', label: 'Lembar Diagnostik Awal', icon: ShieldCheck, isLocked: false, isVipModule: false },
    { id: 'tvm', label: 'TVM Future Goals', icon: TrendingUp, isLocked: false, isVipModule: false },
    { id: 'budgeting', label: 'Master Budgeting (4-Pos)', icon: PieChart, isLocked: isStarter, isVipModule: true },
    { id: 'goals', label: 'Sinking Funds & Alokasi', icon: Target, isLocked: isStarter, isVipModule: true },
    { id: 'portfolio', label: 'Portfolio Planning', icon: Sliders, isLocked: isStarter, isVipModule: true },
    { id: 'wealth-ledger', label: 'Wealth Ledger', icon: Landmark, isLocked: isStarter, isVipModule: true },
    { id: 'kpr', label: 'Advisory & KPR', icon: Building2, isLocked: isStarter, isVipModule: true },
    { id: 'travel', label: 'Smart Travel Budget Engine', icon: Plane, isLocked: isStarter, isVipModule: true },
    { id: 'report', label: 'Executive Report (A4 PDF)', icon: FileText, isLocked: isStarter, isVipModule: true },
  ];

  const handleSelectTab = (tabId: string) => {
    if (tabId === 'report' && !isStarter) {
      onPrintReport();
    } else {
      setActiveTab(tabId);
    }
    onClose();
  };

  const whatsappSupportUrl = `https://wa.me/6281806988868?text=${encodeURIComponent(
    `Halo Jago Rencana Wealth OS, saya klien ${isStarter ? 'Starter Pass' : 'VIP Blueprint'} (${clientName} - ID: ${displayId}) ingin konsultasi priority advisory.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col justify-between p-5 overflow-y-auto animate-in slide-in-from-left duration-250">
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D8]">
            <div className="flex items-center">
              <img 
                src="/logo-jr.png" 
                alt="Jago Rencana" 
                className="h-9 w-auto object-contain shrink-0" 
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-[#FAF8F5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Card */}
          <div className="my-4 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D8]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#0F1A24] text-white flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                {avatarInitial}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{clientName}</p>
                <p className="text-[10px] text-slate-500 truncate">{displayEmail}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DF]">
              {isStarter ? (
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 bg-white px-2 py-0.5 rounded-md border border-[#D5CEBF]">
                  ⚪ STARTER PASS
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider text-[#1D6E66] bg-[#E8F7F5] px-2 py-0.5 rounded-md border border-[#32A89C]/30">
                  🟢 VIP BLUEPRINT OS
                </span>
              )}
              <button
                onClick={() => {
                  onClose();
                  onOpenProfileModal();
                }}
                className="text-[11px] font-bold text-[#32A89C] hover:underline"
              >
                Profil Akun
              </button>
            </div>
          </div>

          {/* Upgrade Banner for Starter */}
          {isStarter && onOpenBookingModal && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                <span>Buka Seluruh Fitur VIP</span>
              </div>
              <p className="text-[11px] text-amber-900 mt-1 leading-snug">
                Upgrade ke VIP Blueprint (Rp 500.000) untuk akses Master Budget, Sinking Funds & KPR.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenBookingModal();
                }}
                className="mt-2 w-full py-1.5 px-3 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>⚡ Upgrade ke VIP (Rp 500.000)</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Modul Perencanaan
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'wealth-ledger' && activeTab === 'ledger');
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0F1A24] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-[#FAF8F5] hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#32A89C]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.isLocked ? (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>VIP</span>
                      </span>
                    ) : item.isVipModule ? (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        VIP
                      </span>
                    ) : null}
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#32A89C]' : 'text-slate-300'}`} />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-[#E5E0D8] space-y-2">
          {vipDaysRemaining > 0 ? (
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-[#E8F7F5] hover:bg-[#D4EFEA] border border-[#32A89C]/30 text-[#1D6E66] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#32A89C]" />
              <span>Priority WA ({vipDaysRemaining} Hari)</span>
              <ExternalLink className="w-3 h-3 text-[#32A89C]/70" />
            </a>
          ) : (
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>Priority WA (Selesai)</span>
              <ExternalLink className="w-3 h-3 text-amber-600/70" />
            </a>
          )}

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all border border-rose-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
