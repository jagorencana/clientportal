import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PieChart, 
  Target, 
  Building2, 
  FileText, 
  Sparkles, 
  PhoneCall, 
  TrendingUp,
  Plane,
  ShieldCheck,
  CreditCard,
  Lock,
  KeyRound,
  CheckCircle2,
  Menu,
  MessageSquare,
  Zap,
  Sliders,
  Landmark
} from 'lucide-react';
import { PortalProvider, usePortal } from './context/PortalContext';
import { Navbar } from './components/Navbar';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { MasterBudgeting } from './components/MasterBudgeting';
import { GoalSinkingFund } from './components/GoalSinkingFund';
import { JagoPortfolio } from './components/JagoPortfolio';
import { WealthLedgerView } from './components/wealth-ledger/WealthLedgerView';
import { KprRestructuring } from './components/KprRestructuring';
import { TvmFutureGoalsEngine } from './components/TvmFutureGoalsEngine';
import { SmartTravelBudgetEngine } from './components/SmartTravelBudgetEngine';
import { ExecutiveReportPrint } from './components/ExecutiveReportPrint';
import { InitialDiagnosticReport } from './components/InitialDiagnosticReport';
import { AuthVerificationModal } from './components/AuthVerificationModal';
import { TanyaAdvisorModal } from './components/TanyaAdvisorModal';
import { DeliverablesModal } from './components/DeliverablesModal';
import { UpgradeModal } from './components/UpgradeModal';
import { SyncAuditModal } from './components/SyncAuditModal';
import { LoginView } from './components/auth/LoginView';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { EditNetWorthModal } from './components/EditNetWorthModal';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { VipLockOverlay } from './components/common/VipLockOverlay';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { VipSessionData } from './utils/security';
import { ClientProfile } from './types';
import { hasActiveAuditStored } from './utils/auditData';

function ClientPortalConsole() {
  const {
    authView,
    profile,
    userSession,
    currentUser,
    isVip,
    netWorthData,
    masterBudget,
    sinkingFunds,
    kprData,
    checklist30D,
    jagoPortfolio,
    user,
    portalData,
    metrics,
    budgetTotals,
    activeProfileKey,
    loadPresetProfile,
    updateMasterBudget,
    updateSinkingFunds,
    updateKprData,
    updateJagoPortfolio,
    toggleChecklistItem,
    syncTravelToSinkingFund,
    resetAllData,
    cloudSyncStatus,
    logout,
    updateProfile,
    baselineAudit,
    applyAuditData,
    vipDaysRemaining,
  } = usePortal();

  // Active Tab: 'overview' | 'tvm' | 'budgeting' | 'goals' | 'kpr' | 'travel' | 'report' | 'diagnostic' | 'executive_report'
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showEditNetWorthModal, setShowEditNetWorthModal] = useState(false);
  const [showSyncAuditModal, setShowSyncAuditModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<'checklist' | 'diagnostic' | 'sheet' | 'mfund' | null>(null);
  
  // Toast notifications for security gate
  const [authBanner, setAuthBanner] = useState<{ show: boolean; message: string } | null>(null);

  const isStarter = !isVip;

  // AUTH GATEWAY: Website WAJIB langsung merender layar login jika tidak ada sesi aktif
  if (authView === 'reset-password') {
    return <ResetPasswordView />;
  }

  if (authView === 'login' || !userSession) {
    return <LoginView />;
  }

  const isPlaceholder = (n?: string) => {
    if (!n) return true;
    const lower = n.toLowerCase().trim();
    return lower === 'vip demo' || lower === 'starter demo' || lower === 'demo' || lower === 'vip blueprint member' || lower === 'user' || lower === '';
  };

  const clientName = portalData?.profile?.name || portalData?.profile?.fullName || user?.name || user?.nama || currentUser?.nama || (!isPlaceholder(profile.name) ? profile.name : (!isPlaceholder(baselineAudit?.clientName) ? baselineAudit.clientName : 'Klien VIP'));
  const activeOrderId = user?.orderId || currentUser?.orderId || portalData?.profile?.id || profile.id || 'JR-VIP-CLIENT';

  const activeClientProfile: ClientProfile = {
    ...profile,
    name: clientName,
    email: user?.email || currentUser?.email || profile.email,
    id: activeOrderId,
    tier: user?.tier || currentUser?.tier || profile.tier,
  };

  const activeClient = activeClientProfile;
  const isVipUser = isVip || 
                    (activeClient?.tier as string) === 'VIP' || 
                    activeClient?.tier === 'BLUEPRINT_VIP' ||
                    (activeClient as any)?.statusAkses === 'VIP BLUEPRINT OS' || 
                    (activeClient as any)?.package?.includes('VIP');
  const calculatedMonthlySurplus = Math.max(0, budgetTotals.netSurplusOrDeficit) || 15511915;

  const handlePrintReport = () => {
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handlePaymentSuccess = (session: VipSessionData) => {
    updateProfile({
      name: session.name,
      email: session.email,
      phone: session.phone,
      tier: session.tier,
    });
    setAuthBanner({
      show: true,
      message: `Akses Lifetime Berhasil Diaktifkan! Selamat datang di Wealth OS.`,
    });
    setTimeout(() => setAuthBanner(null), 6000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col selection:bg-[#32A89C]/20 selection:text-[#0F1A24]">
      {/* Security Status Floating Toast */}
      {authBanner && authBanner.show && (
        <div className="no-print fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0F1A24] text-white px-4 py-2.5 rounded-full shadow-2xl border border-[#32A89C]/40 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-[#32A89C]" />
          <span>{authBanner.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        client={profile}
        onSwitchProfile={loadPresetProfile}
        activeProfileKey={activeProfileKey}
        onOpenAdvisorModal={() => setShowAdvisorModal(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenBookingModal={() => setShowBookingModal(true)}
        onOpenProfileModal={() => setShowUserProfileModal(true)}
        onLogout={logout}
        onPrintReport={handlePrintReport}
        onResetData={resetAllData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cloudSyncStatus={cloudSyncStatus}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
      />

      {/* Mobile Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfileModal={() => setShowUserProfileModal(true)}
        onPrintReport={handlePrintReport}
        onOpenBookingModal={() => setShowBookingModal(true)}
      />

      {/* Mobile Tab Switcher Bar (Sticky below navbar on small screens) */}
      <div className="no-print lg:hidden sticky top-[53px] z-30 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-[#EAE6DF] px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max p-1 bg-[#F4F0E8] rounded-xl border border-[#E5E0D8]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Diagnostik</span>
          </button>

          <button
            onClick={() => setActiveTab('tvm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'tvm'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#32A89C]" />
            TVM Goals
          </button>

          <button
            onClick={() => setActiveTab('budgeting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'budgeting'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Budgeting</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'goals'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Sinking Funds</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'portfolio'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Portfolio Planning</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>

          <button
            onClick={() => setActiveTab('wealth-ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'wealth-ledger' || activeTab === 'ledger'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Wealth Ledger</span>
            {isStarter ? (
              <Lock className="w-2.5 h-2.5 text-amber-700" />
            ) : (
              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                VIP
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('kpr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'kpr'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Advisory & KPR</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>

          <button
            onClick={() => setActiveTab('travel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'travel'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Travel</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-white text-slate-900 shadow-2xs border border-black/5'
                : 'text-slate-600'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report</span>
            {isStarter && <Lock className="w-2.5 h-2.5 text-amber-700" />}
          </button>
        </div>
      </div>

      {/* Main App Body with Bento Sidebar & Content Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        {/* Desktop Bento Console Sidebar */}
        <aside className="no-print hidden lg:flex w-64 border-r border-[#EAE6DF] bg-white/40 backdrop-blur-xs p-6 flex-col gap-1 shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">
            Main Console
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'overview'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'diagnostic'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === 'diagnostic' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Lembar Diagnostik Awal</span>
              <span className="text-[9px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded border border-[#32A89C]/20">
                {baselineAudit?.baselineScore ? `Audit (${baselineAudit.baselineScore})` : 'Audit Mandiri'}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tvm')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'tvm'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === 'tvm' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>TVM Future Goals</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('budgeting')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'budgeting'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <PieChart className={`w-4 h-4 ${activeTab === 'budgeting' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Master 4-Pos Budget</span>
              {isStarter ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'goals'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Target className={`w-4 h-4 ${activeTab === 'goals' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Sinking Funds</span>
              {isStarter ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'portfolio' || activeTab === 'portfolio-planning'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Sliders className={`w-4 h-4 ${activeTab === 'portfolio' || activeTab === 'portfolio-planning' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Portfolio Planning</span>
              {!isVipUser ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('wealth-ledger')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'wealth-ledger' || activeTab === 'ledger'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Landmark className={`w-4 h-4 ${activeTab === 'wealth-ledger' || activeTab === 'ledger' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Wealth Ledger</span>
              {!isVipUser ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('kpr')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'kpr'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeTab === 'kpr' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Advisory & KPR</span>
              {isStarter ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  VIP
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('travel')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'travel'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Plane className={`w-4 h-4 ${activeTab === 'travel' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Smart Travel Budget</span>
              {isStarter ? (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              ) : (
                <span className="text-[9px] font-black text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded border border-[#32A89C]/20">VIP</span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
              activeTab === 'report'
                ? 'bg-[#F4F0E8] text-[#0F1A24] shadow-2xs border border-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'report' ? 'text-[#32A89C]' : 'text-slate-500'}`} />
            <div className="flex items-center justify-between w-full">
              <span>Executive Report</span>
              {isStarter && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  VIP
                </span>
              )}
            </div>
          </button>

          {/* Quick Deliverable Shortcuts */}
          <div className="mt-4 pt-4 border-t border-[#EAE6DF]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
              VIP Deliverables
            </div>
            <div className="space-y-1">
              <button
                onClick={handlePrintReport}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-black/5 transition-all text-left cursor-pointer"
                title="Cetak Dokumen Resmi A4 PDF"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#32A89C]" />
                  Executive Report (PDF) [A4]
                </span>
                <span className="text-[9px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded border border-[#32A89C]/20">A4</span>
              </button>
              <button
                onClick={() => setActiveDeliverable('mfund')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 transition-all text-left cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#32A89C]" />
                  Panduan Portofolio M-Fund & SBN
                </span>
                {isStarter ? (
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                    <Lock className="w-2 h-2" />
                    VIP
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded">7.2%</span>
                )}
              </button>
            </div>
          </div>

          {/* Tier Status Bottom Card */}
          {isStarter ? (
            <div className="mt-auto p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm text-left space-y-2.5">
              <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                Akses Starter Pass (Rp 100k)
              </div>
              <p className="text-amber-950 text-xs leading-relaxed font-normal">
                Tingkatkan ke VIP Blueprint OS untuk membuka kunci Master Budget, Sinking Funds, KPR & Executive Report resmi.
              </p>
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full py-2.5 px-3 bg-[#0F1A24] hover:bg-[#1E293B] text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>⚡ Upgrade VIP (Rp 500.000)</span>
              </button>
            </div>
          ) : (
            <div className="mt-auto p-4 bg-[#0F1A24] rounded-2xl border border-black/10 shadow-sm text-left space-y-2.5">
              <div className="text-[10px] font-bold text-[#32A89C] uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#32A89C]" />
                VIP Advisory Active Pass
              </div>
              <p className="text-white text-xs leading-relaxed opacity-85 font-normal">
                {vipDaysRemaining > 0 
                  ? `Pendampingan 1-on-1 & Eksekusi Portofolio via WhatsApp Priority aktif (${vipDaysRemaining} Hari tersisa).`
                  : `Pendampingan 1-on-1 & Eksekusi Portofolio via WhatsApp Priority (Masa aktif 30 Hari telah selesai).`}
              </p>
              <a
                href={`https://wa.me/6281806988868?text=${encodeURIComponent(
                  `Halo Jago Rencana Wealth OS, saya klien VIP Blueprint (${profile.name} - ID: ${profile.id}) ingin konsultasi priority advisory.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-[#32A89C] hover:bg-[#25857B] text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 Chat Advisor Jago Rencana</span>
              </a>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <ExecutiveSummary
              client={activeClientProfile}
              metrics={metrics}
              budget={masterBudget}
              goals={sinkingFunds}
              actions={checklist30D}
              baselineAudit={baselineAudit}
              onToggleAction={toggleChecklistItem}
              onNavigateTab={setActiveTab}
              onOpenDeliverable={(type) => {
                if (type === 'diagnostic') {
                  setActiveTab('diagnostic');
                } else {
                  setActiveDeliverable(type);
                }
              }}
              onOpenAdvisorModal={() => setShowAdvisorModal(true)}
              onOpenEditNetWorth={() => setShowEditNetWorthModal(true)}
              onOpenSyncAuditModal={() => setShowSyncAuditModal(true)}
            />
          )}

          {activeTab === 'diagnostic' && (
            <InitialDiagnosticReport
              auditData={baselineAudit}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'tvm' && (
            <TvmFutureGoalsEngine
              onSyncToSinkingFund={syncTravelToSinkingFund}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'budgeting' && (
            <ErrorBoundary fallbackTitle="Gagal memuat modul Master 4-Pos Budget.">
              {isStarter ? (
                <VipLockOverlay
                  moduleTitle="Master 4-Pos Budgeting Engine"
                  moduleDescription="Akses modul alokasi Master 4-Pos Budget, aturan anti-lifestyle creep 50/30/20, dan simulator cashflow dinamis hanya tersedia di paket VIP Blueprint OS."
                  onUpgrade={() => setShowBookingModal(true)}
                  onNavigateToTvm={() => setActiveTab('tvm')}
                  onNavigateToOverview={() => setActiveTab('overview')}
                >
                  <MasterBudgeting
                    budget={masterBudget}
                    goals={sinkingFunds}
                    onUpdateBudget={updateMasterBudget}
                    onNavigateToGoals={() => setActiveTab('goals')}
                    onNavigateToPortfolio={() => setActiveTab('portfolio')}
                  />
                </VipLockOverlay>
              ) : (
                <MasterBudgeting
                  budget={masterBudget}
                  goals={sinkingFunds}
                  onUpdateBudget={updateMasterBudget}
                  onNavigateToGoals={() => setActiveTab('goals')}
                  onNavigateToPortfolio={() => setActiveTab('portfolio')}
                />
              )}
            </ErrorBoundary>
          )}

          {activeTab === 'goals' && (
            isStarter ? (
              <VipLockOverlay
                moduleTitle="Sinking Funds Multi-Goal Planner"
                moduleDescription="Akses modul perencanaan multi-sinking funds, simulasi timeline dana darurat, dan alokasi instrumen kas produktif hanya tersedia di paket VIP Blueprint OS."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <GoalSinkingFund
                  goals={sinkingFunds}
                  budget={masterBudget}
                  onUpdateGoals={updateSinkingFunds}
                  onNavigateToBudgeting={() => setActiveTab('budgeting')}
                  onNavigateTab={setActiveTab}
                />
              </VipLockOverlay>
            ) : (
              <GoalSinkingFund
                goals={sinkingFunds}
                budget={masterBudget}
                onUpdateGoals={updateSinkingFunds}
                onNavigateToBudgeting={() => setActiveTab('budgeting')}
                onNavigateTab={setActiveTab}
              />
            )
          )}

          {(activeTab === 'portfolio' || activeTab === 'portfolio-planning') && (
            !isVipUser ? (
              <VipLockOverlay
                moduleTitle="Portfolio Planning (Interactive Wealth Engine)"
                moduleDescription="Fitur Eksklusif VIP Wealth Blueprint OS. Buka kunci simulasi alokasi portofolio institusional, compounding multi-aset, dan proyeksi passive income."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <JagoPortfolio
                  portfolio={jagoPortfolio}
                  surplusCashflow={Math.max(0, budgetTotals.netSurplusOrDeficit)}
                  auditInvestmentAssets={netWorthData.investasi}
                  onUpdatePortfolio={updateJagoPortfolio}
                  onNavigateToAdvisory={() => setActiveTab('kpr')}
                />
              </VipLockOverlay>
            ) : (
              <JagoPortfolio
                portfolio={jagoPortfolio}
                surplusCashflow={Math.max(0, budgetTotals.netSurplusOrDeficit)}
                auditInvestmentAssets={netWorthData.investasi}
                onUpdatePortfolio={updateJagoPortfolio}
                onNavigateToAdvisory={() => setActiveTab('kpr')}
              />
            )
          )}

          {(activeTab === 'wealth-ledger' || activeTab === 'ledger') && (
            !isVipUser ? (
              <VipLockOverlay
                moduleTitle="Wealth Ledger (Buku Besar Multi-Aset)"
                moduleDescription="Fitur Eksklusif VIP Wealth Blueprint OS. Akses buku besar kekayaan riil multi-rekening, multi-mata uang, dan pencatatan mutasi kas komprehensif."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <WealthLedgerView
                  currentUserEmail={activeClient?.email}
                  clientName={activeClient?.name}
                  monthlySurplusCapacity={calculatedMonthlySurplus}
                />
              </VipLockOverlay>
            ) : (
              <WealthLedgerView
                currentUserEmail={activeClient?.email}
                clientName={activeClient?.name}
                monthlySurplusCapacity={calculatedMonthlySurplus}
              />
            )
          )}

          {activeTab === 'kpr' && (
            isStarter ? (
              <VipLockOverlay
                moduleTitle="Simulator Restrukturisasi KPR & Utang"
                moduleDescription="Akses modul simulator suku bunga floating, strategi percepatan pelunasan KPR, dan perbandingan sinking fund M-Fund 7.2% hanya tersedia di paket VIP Blueprint OS."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <KprRestructuring
                  kpr={kprData}
                  onUpdateKpr={updateKprData}
                  onOpenAdvisorModal={() => setShowAdvisorModal(true)}
                  onOpenDeliverable={setActiveDeliverable}
                />
              </VipLockOverlay>
            ) : (
              <KprRestructuring
                kpr={kprData}
                onUpdateKpr={updateKprData}
                onOpenAdvisorModal={() => setShowAdvisorModal(true)}
                onOpenDeliverable={setActiveDeliverable}
              />
            )
          )}

          {activeTab === 'travel' && (
            isStarter ? (
              <VipLockOverlay
                moduleTitle="Smart Travel Budget Engine"
                moduleDescription="Akses modul kalkulasi biaya liburan multi-kota, multi-currency converter, dan sinkronisasi otomatis ke sinking fund hanya tersedia di paket VIP Blueprint OS."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <SmartTravelBudgetEngine
                  onSyncToSinkingFund={syncTravelToSinkingFund}
                  existingTravelGoals={sinkingFunds.filter((g) => g.category === 'travel')}
                  onNavigateTab={setActiveTab}
                />
              </VipLockOverlay>
            ) : (
              <SmartTravelBudgetEngine
                onSyncToSinkingFund={syncTravelToSinkingFund}
                existingTravelGoals={sinkingFunds.filter((g) => g.category === 'travel')}
                onNavigateTab={setActiveTab}
              />
            )
          )}

          {(activeTab === 'report' || activeTab === 'executive_report') && (
            isStarter ? (
              <VipLockOverlay
                moduleTitle="Executive Report (A4 Print / PDF)"
                moduleDescription="Akses cetak dokumen Executive Advisory Report format A4 profesional dengan ringkasan diagnosa, rasio likuiditas, dan rencana aksi hanya tersedia di paket VIP Blueprint OS."
                onUpgrade={() => setShowBookingModal(true)}
                onNavigateToTvm={() => setActiveTab('tvm')}
                onNavigateToOverview={() => setActiveTab('overview')}
              >
                <ExecutiveReportPrint
                  client={activeClientProfile}
                  budget={masterBudget}
                  goals={sinkingFunds}
                  kpr={kprData}
                  actions={checklist30D}
                  metrics={metrics}
                />
              </VipLockOverlay>
            ) : (
              <ExecutiveReportPrint
                client={activeClientProfile}
                budget={masterBudget}
                goals={sinkingFunds}
                kpr={kprData}
                actions={checklist30D}
                metrics={metrics}
              />
            )
          )}
        </main>
      </div>

      {/* Footer (Hidden during Print) */}
      <footer className="no-print border-t border-[#EAE6DF] bg-[#FAF8F5] py-6 px-4 sm:px-8 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#32A89C]" />
            <span className="font-bold text-slate-900">Jago Rencana</span>
            <span>• Independent Wealth Advisory & Financial Planning Platform</span>
          </div>
          <p className="text-[11px]">
            Sesi konsultasi diasuh oleh Tim Wealth Advisor Independen. Transaksi terenkripsi server-side.
          </p>
        </div>
      </footer>

      {/* Floating Action (Mobile Friendly) */}
      <div className="no-print fixed bottom-5 right-5 z-40 sm:hidden flex items-center gap-2">
        <button
          onClick={() => setShowBookingModal(true)}
          className="h-12 px-4 rounded-full bg-[#32A89C] text-white shadow-xl flex items-center gap-1.5 text-xs font-bold border border-white/20 cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Reservasi</span>
        </button>
      </div>

      {/* Modals */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onOpenBookingModal={() => setShowBookingModal(true)}
      />

      <EditNetWorthModal
        isOpen={showEditNetWorthModal}
        onClose={() => setShowEditNetWorthModal(false)}
      />

      <AuthVerificationModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        client={profile}
        onUpdateClient={(updated) => updateProfile(updated)}
        onOpenBookingModal={() => setShowBookingModal(true)}
      />

      <TanyaAdvisorModal
        isOpen={showAdvisorModal}
        onClose={() => setShowAdvisorModal(false)}
        client={profile}
      />

      <DeliverablesModal
        type={activeDeliverable}
        onClose={() => setActiveDeliverable(null)}
        client={profile}
        onOpenBookingModal={() => setShowBookingModal(true)}
      />

      <UpgradeModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        defaultName={activeClientProfile.name}
        defaultEmail={activeClientProfile.email}
        defaultPhone={activeClientProfile.phone}
        onUpgradeSuccess={handlePaymentSuccess}
      />

      <SyncAuditModal
        isOpen={showSyncAuditModal}
        onClose={() => setShowSyncAuditModal(false)}
        onSyncSuccess={(audit) => {
          applyAuditData(audit);
          setAuthBanner({
            show: true,
            message: `Data audit ${audit.clientName || 'klien'} berhasil disinkronkan!`,
          });
          setTimeout(() => setAuthBanner(null), 4000);
        }}
        currentIdentifier={userSession?.email || ''}
      />
    </div>
  );
}

export default function App() {
  return (
    <PortalProvider>
      <ClientPortalConsole />
    </PortalProvider>
  );
}
