import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Calendar, 
  Video, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  PiggyBank, 
  Building2, 
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Plane,
  AlertCircle,
  Coins,
  Activity,
  Edit3,
  CloudDownload
} from 'lucide-react';
import { ClientProfile, FinancialHealthMetrics, ActionItem, SinkingFundGoal, BudgetState } from '../types';
import { formatRupiah, calculateTotals, calculateProgress, auditFinancialPyramid } from '../utils/calculations';
import { M_FUND_INFO } from '../data/initialData';
import { HomepageAuditData } from '../utils/auditData';
import { usePortal } from '../context/PortalContext';
import { resolveDisplayHealthScore } from '../utils/healthScoreCalculator';
import confetti from 'canvas-confetti';

interface ExecutiveSummaryProps {
  client: ClientProfile;
  metrics: FinancialHealthMetrics;
  budget: BudgetState;
  goals: SinkingFundGoal[];
  actions: ActionItem[];
  baselineAudit?: HomepageAuditData;
  onToggleAction: (actionId: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenDeliverable: (type: 'checklist' | 'diagnostic' | 'sheet' | 'mfund') => void;
  onOpenAdvisorModal: () => void;
  onOpenEditNetWorth?: () => void;
  onOpenSyncAuditModal?: () => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  client,
  metrics,
  budget,
  goals,
  actions,
  baselineAudit,
  onToggleAction,
  onNavigateTab,
  onOpenDeliverable,
  onOpenAdvisorModal,
  onOpenEditNetWorth,
  onOpenSyncAuditModal,
}) => {
  const { netWorthData, portfolioAssets, totalPortofolioRiil } = usePortal();
  const totals = calculateTotals(budget, goals);
  
  // Logika Sinkronisasi Reactive Net Worth Riil
  const realPortfolioTotal = useMemo(() => {
    if (portfolioAssets && portfolioAssets.length > 0) {
      return portfolioAssets.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
    }
    return totalPortofolioRiil || Number(netWorthData.investasi || 0);
  }, [portfolioAssets, totalPortofolioRiil, netWorthData.investasi]);

  const realTotalLiabilitas = useMemo(() => {
    return Number((netWorthData as any).kpr || netWorthData.liabilitasKPR || 0) + Number(netWorthData.utangLain || 0);
  }, [netWorthData]);

  const realTotalAset = useMemo(() => {
    return Number(netWorthData.kasLikuid || 0) + realPortfolioTotal + Number(netWorthData.asetFisik || 0);
  }, [netWorthData.kasLikuid, realPortfolioTotal, netWorthData.asetFisik]);

  const realNetWorthTotal = useMemo(() => {
    return realTotalAset - realTotalLiabilitas;
  }, [realTotalAset, realTotalLiabilitas]);
  
  // 3-Tier Financial Pyramid Audit Engine
  const pyramidAudit = useMemo(() => {
    return auditFinancialPyramid(budget, metrics.totalLiquidAssets);
  }, [budget, metrics.totalLiquidAssets]);

  // Dynamic Countdown Timer
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 4,
    hours: 8,
    minutes: 45,
    seconds: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const completedActionsCount = actions.filter(a => a.completed).length;

  const handleActionClick = (id: string, currentlyCompleted: boolean) => {
    onToggleAction(id);
    if (!currentlyCompleted) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#32A89C', '#0F1A24', '#E5A93C'],
      });
    }
  };

  const { hasUserOptimized, portalData, user } = usePortal();

  const isPlaceholder = (n?: string) => {
    if (!n) return true;
    const lower = n.toLowerCase().trim();
    return lower === 'vip demo' || lower === 'starter demo' || lower === 'demo' || lower === 'vip blueprint member' || lower === 'user' || lower === '';
  };

  const clientName = portalData?.profile?.name || portalData?.profile?.fullName || user?.name || user?.nama || (!isPlaceholder(client.name) ? client.name : (!isPlaceholder(baselineAudit?.clientName) ? baselineAudit.clientName : "Klien VIP"));
  const orderId = user?.orderId || portalData?.profile?.id || client?.id || "JR-VIP-CLIENT";
  const baselineScore = baselineAudit?.baselineScore ?? 0;
  const baselineStatus = baselineAudit?.baselineStatus ?? 'Belum Diaudit';

  // Live Score Logic:
  // If the user has not yet optimized or saved changes in Master 4-Pos Budget / Net Worth,
  // Live Score equals Baseline Score (no premature or fake score jumps).
  const displayHealth = resolveDisplayHealthScore(metrics, baselineAudit, hasUserOptimized);
  const effectiveLiveScore = displayHealth.score;
  const effectiveLiveStatus = displayHealth.status;
  const effectiveLiveColor = displayHealth.color;
  const pointDiff = displayHealth.pointDiff;

  // SVG Circular Meter Gauge calculation
  const circleSize = 130;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (effectiveLiveScore / 100) * circumference;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* Top Welcome & Summary Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Verified Client Portal
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">
              ID: {orderId}
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Baseline Audit: {baselineScore}/100
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Selamat Datang, {clientName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Diagnostik kekayaan real-time, audit piramida finansial institusional, serta alokasi cashflow presisi 4-Pos yang terhubung langsung dengan target masa depan Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenSyncAuditModal && (
            <button
              id="header-sync-audit-btn"
              type="button"
              onClick={onOpenSyncAuditModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#32A89C]/30 text-[#1D6E66] text-xs font-bold shadow-2xs transition-all hover:border-[#32A89C] cursor-pointer"
              title="Sinkronkan data audit dari Google Apps Script"
            >
              <CloudDownload className="w-3.5 h-3.5 text-[#32A89C]" />
              <span>Sinkronkan Data Audit</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#E5E0D8]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Sesi Aktif: Jago Rencana Private Wealth</span>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
        {/* Bento Tile 1: Financial Health Score Gauge (Span 4) */}
        <div className="md:col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Diagnostik Kesehatan Finansial
              </span>
              <span 
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${effectiveLiveColor}15`, color: effectiveLiveColor }}
              >
                {effectiveLiveStatus}
              </span>
            </div>

            {/* Clean 2-Column CSS Grid - Tanpa Overlap */}
            <div className="mb-3.5 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {/* Kolom 1 (Baseline) */}
              <div className="flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  SKOR AWAL
                </span>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <span className="font-extrabold text-lg text-slate-800 leading-none">
                    {baselineScore}
                  </span>
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md inline-block whitespace-nowrap">
                    {baselineStatus}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                  Baseline audit awal
                </span>
              </div>

              {/* Kolom 2 (Live Reactive) */}
              <div className="flex flex-col justify-between border-l border-slate-200 pl-2.5">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  SKOR TERKINI
                </span>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <span className="font-extrabold text-lg text-emerald-700 leading-none">
                    {effectiveLiveScore}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block whitespace-nowrap">
                    Real-Time
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                  Skor Terkini (Setelah Optimasi)
                </span>
              </div>
            </div>

            {/* Dynamic Performance Badge */}
            <div className="flex justify-center mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                !hasUserOptimized
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : pointDiff > 0 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : pointDiff < 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {!hasUserOptimized ? (
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {!hasUserOptimized
                    ? 'Belum Ada Optimasi • Mulai Atur di Master 4-Pos Budget'
                    : pointDiff > 0 
                    ? `+${pointDiff} Poin Peningkatan Performa Finansial` 
                    : pointDiff === 0 
                    ? 'Sesuai Baseline Audit (+0 Poin)' 
                    : `${pointDiff} Poin Selisih Performa`}
                </span>
              </span>
            </div>

            {/* Circular Gauge Graphic */}
            <div className="flex flex-col items-center justify-center my-3 relative">
              <svg width={circleSize} height={circleSize} className="transform -rotate-90">
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#F4F0E8"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke={effectiveLiveColor}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                  {effectiveLiveScore}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Score (100)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 text-center mt-1 leading-relaxed">
              {!hasUserOptimized
                ? 'Skor saat ini masih menggunakan diagnosa awal audit homepage. Silakan sesuaikan Master 4-Pos Budget atau perbarui aset untuk mengakselerasi skor finansial Anda.'
                : effectiveLiveScore >= 80 
                ? 'Struktur cashflow & rasio solvabilitas Anda sangat prima. Fokus pada akselerasi sinking fund & efisiensi bunga KPR.'
                : effectiveLiveScore >= 65
                ? 'Fondasi keuangan sehat, namun perlu optimalisasi pos utang KPR dan alokasi dana darurat pasar uang.'
                : 'Diperlukan restrukturisasi segera pada beban cicilan dan pos pengeluaran gaya hidup.'}
            </p>

            <button
              onClick={() => onNavigateTab('diagnostic')}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Buka Lembar Diagnostik Awal Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#32A89C]" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E0D8] grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E5E0D8]">
              <span className="text-[10px] text-slate-500 block">Kas Bersih Bulanan</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(totals.freeCashflow, true)}</span>
            </div>
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E5E0D8]">
              <span className="text-[10px] text-slate-500 block">Status Sinking Fund</span>
              <span className={`font-bold tabular-nums ${totals.isDeficit ? 'text-[#E11D48]' : 'text-[#1D6E66]'}`}>
                {totals.isDeficit ? 'Defisit' : 'On Track'}
              </span>
            </div>
          </div>
        </div>

        {/* Bento Tile 2: Estimated Net Worth Banner (Span 8) */}
        <div className="md:col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estimasi Total Kekayaan Bersih (Reactive Net Worth)
              </span>
              <div className="flex items-center gap-2">
                {onOpenEditNetWorth && (
                  <button
                    onClick={onOpenEditNetWorth}
                    className="h-7 px-3 rounded-full bg-[#FAF8F5] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Perbarui data saldo kas likuid, investasi, dan liabilitas"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#32A89C]" />
                    <span>✏️ Edit Aset & Liabilitas</span>
                  </button>
                )}
                <span className="text-[11px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#32A89C]" />
                  Real-time Kalkulasi
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 my-2">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tabular-nums tracking-tight">
                {formatRupiah(realNetWorthTotal, true)}
              </span>
              <span className="text-xs text-slate-500">
                Total Aset Riil ({formatRupiah(realTotalAset, true)}) dikurangi Total Liabilitas ({formatRupiah(realTotalLiabilitas, true)})
              </span>
            </div>

            {/* Asset Breakdown Ribbon */}
            <div className="mt-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Aset Kas Likuid</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {formatRupiah(Number(netWorthData.kasLikuid || 0), true)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span>Portofolio Investasi</span>
                  {portfolioAssets && portfolioAssets.length > 0 && (
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">Auto</span>
                  )}
                </span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  {formatRupiah(realPortfolioTotal, true)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Aset Fisik/Properti</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {formatRupiah(Number(netWorthData.asetFisik || 0), true)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Liabilitas</span>
                <span className="text-sm font-bold text-[#E11D48] tabular-nums">
                  {formatRupiah(realTotalLiabilitas, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Bento Columns: 3 Reactive KPIs */}
          <div className="mt-6 pt-5 border-t border-[#E5E0D8] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* KPI 1: Saving Rate */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Saving & Invest Rate
                </span>
                <PiggyBank className="w-4 h-4 text-[#32A89C]" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                  {metrics.savingRate}%
                </span>
                <span className={`text-[11px] font-bold ${metrics.savingRate >= 20 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                  {metrics.savingRate >= 20 ? 'Optimal (≥20%)' : 'Perlu Up (<20%)'}
                </span>
              </div>
              <div className="w-full bg-[#E5E0D8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    metrics.savingRate >= 20 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.savingRate / 40) * 100)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: DSR */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Debt Ratio (DSR)
                </span>
                <Building2 className="w-4 h-4 text-slate-700" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                  {metrics.debtServiceRatio}%
                </span>
                <span className={`text-[11px] font-bold ${
                  metrics.debtServiceRatio <= 30 
                    ? 'text-[#10B981]' 
                    : metrics.debtServiceRatio <= 35 
                    ? 'text-[#F59E0B]' 
                    : 'text-[#EF4444]'
                }`}>
                  {metrics.debtServiceRatio <= 30 
                    ? 'Ideal (≤30%)' 
                    : metrics.debtServiceRatio <= 35 
                    ? 'Waspada' 
                    : 'Bahaya (>35%)'}
                </span>
              </div>
              <div className="w-full bg-[#E5E0D8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    metrics.debtServiceRatio <= 30 
                      ? 'bg-[#10B981]' 
                      : metrics.debtServiceRatio <= 35 
                      ? 'bg-[#F59E0B]' 
                      : 'bg-[#EF4444]'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.debtServiceRatio / 50) * 100)}%` }}
                />
              </div>
            </div>

            {/* KPI 3: Kapasitas Dana Darurat */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Dana Darurat
                </span>
                <ShieldCheck className="w-4 h-4 text-[#1D6E66]" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                  {metrics.emergencyFundMonths} bln
                </span>
                <span className={`text-[11px] font-bold ${
                  metrics.emergencyFundMonths >= 6 
                    ? 'text-[#10B981]' 
                    : metrics.emergencyFundMonths >= 3 
                    ? 'text-[#1D6E66]' 
                    : 'text-[#EF4444]'
                }`}>
                  {metrics.emergencyFundMonths >= 6 
                    ? 'Sangat Aman (≥6)' 
                    : metrics.emergencyFundMonths >= 3 
                    ? 'Cukup (3-6 bln)' 
                    : 'Rentan (<3 bln)'}
                </span>
              </div>
              <div className="w-full bg-[#E5E0D8] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    metrics.emergencyFundMonths >= 6 
                      ? 'bg-[#10B981]' 
                      : metrics.emergencyFundMonths >= 3 
                      ? 'bg-[#1D6E66]' 
                      : 'bg-[#EF4444]'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.emergencyFundMonths / 6) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIT PIRAMIDA PERENCANAAN KEUANGAN (3-TIER AUDIT ENGINE MODULE) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E0D8] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#32A89C]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Audit Piramida Perencanaan Keuangan (3-Tier Engine)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi hierarki ketahanan finansial: Lapis 1 Proteksi, Lapis 2 Likuiditas Darurat, Lapis 3 Efisiensi Kas.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-3 py-1 rounded-full border border-[#32A89C]/20 self-start sm:self-auto">
            Institutional Standard Review
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Lapis 1: Fondasi Proteksi */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Lapis 1 • Fondasi Proteksi
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${pyramidAudit.tier1Protection.statusColor}15`, color: pyramidAudit.tier1Protection.statusColor }}
                >
                  {pyramidAudit.tier1Protection.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className={`w-5 h-5 ${pyramidAudit.tier1Protection.covered ? 'text-[#10B981]' : 'text-[#EF4444]'}`} />
                <span className="font-extrabold text-sm text-slate-900">
                  {pyramidAudit.tier1Protection.covered ? 'Asuransi / BPJS Aktif' : 'Tanpa Pos Asuransi'}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {pyramidAudit.tier1Protection.description}
              </p>

              {pyramidAudit.tier1Protection.detectedItems.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded-lg border border-[#E5E0D8] text-[11px] text-slate-700 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Pos Teridentifikasi:</span>
                  {pyramidAudit.tier1Protection.detectedItems.map((item, idx) => (
                    <div key={idx} className="font-semibold truncate">• {item}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigateTab('budgeting')}
                className="text-[#32A89C] font-bold hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Edit di Master Budget</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Lapis 2: Dana Darurat */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Lapis 2 • Likuiditas Darurat
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${pyramidAudit.tier2EmergencyFund.statusColor}15`, color: pyramidAudit.tier2EmergencyFund.statusColor }}
                >
                  {pyramidAudit.tier2EmergencyFund.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {pyramidAudit.tier2EmergencyFund.months} Bulan
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({formatRupiah(pyramidAudit.tier2EmergencyFund.amount, true)})
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {pyramidAudit.tier2EmergencyFund.description}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                  <span>Target Buffer 6 Bulan</span>
                  <span>{Math.min(100, Math.round((pyramidAudit.tier2EmergencyFund.months / 6) * 100))}%</span>
                </div>
                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#E5E0D8]">
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ 
                      width: `${Math.min(100, (pyramidAudit.tier2EmergencyFund.months / 6) * 100)}%`,
                      backgroundColor: pyramidAudit.tier2EmergencyFund.statusColor
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Biaya Hidup: {formatRupiah(pyramidAudit.tier2EmergencyFund.monthlyBurn, true)}/bln</span>
            </div>
          </div>

          {/* Lapis 3: Cash Drag & M-Fund Allocator */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Lapis 3 • Cash Drag Allocator
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${pyramidAudit.tier3CashDrag.statusColor}15`, color: pyramidAudit.tier3CashDrag.statusColor }}
                >
                  {pyramidAudit.tier3CashDrag.status}
                </span>
              </div>

              {pyramidAudit.tier3CashDrag.hasCashDrag ? (
                <div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-black text-[#D97706] tabular-nums">
                      {formatRupiah(pyramidAudit.tier3CashDrag.idleCash, true)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">menganggur</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Kas berlebih di tabungan bank (bunga 0%). Alokasikan ke <strong className="text-slate-800">M-Fund (7.2% p.a.)</strong> untuk potensi return pasif <strong className="text-[#1D6E66]">+{formatRupiah(pyramidAudit.tier3CashDrag.annualPassiveIncomePotential, true)}/tahun</strong>.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mt-1 text-[#10B981]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-extrabold text-sm text-slate-900">Alokasi Kas Sangat Efisien</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Seluruh kas likuid difungsikan sebagai buffer dana darurat aktif tanpa kelebihan saldo mengendap di rekening bunga 0%.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between">
              <button
                onClick={() => onOpenDeliverable('mfund')}
                className="text-xs font-bold text-[#32A89C] hover:text-[#25857B] flex items-center gap-1"
              >
                <span>Panduan M-Fund</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-2 py-0.5 rounded">
                Yield 7.2% Bebas Pajak
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Row 3 (Sinking Fund Progress & Priority Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Bento Tile 4: Sinking Fund Progress (Span 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sinking Fund Progress
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('travel')}
                  className="text-[11px] font-bold text-[#1D6E66] hover:text-[#16564F] flex items-center gap-1 bg-[#E8F7F5] px-2 py-0.5 rounded-md border border-[#32A89C]/20 transition-all"
                  title="Buka Smart Travel Budgeting Engine"
                >
                  <Plane className="w-3 h-3 text-[#32A89C]" />
                  <span>✈️ Travel</span>
                </button>
                <button
                  onClick={() => onNavigateTab('goals')}
                  className="text-[11px] font-bold text-[#32A89C] hover:underline"
                >
                  Kelola Semua
                </button>
              </div>
            </div>

            <div className="space-y-3.5 mt-2">
              {goals.map((goal) => {
                const progress = calculateProgress(goal.currentSavings, goal.targetAmount);
                return (
                  <div key={goal.id} className="space-y-1.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[160px]" title={goal.title}>
                        {goal.title}
                      </span>
                      <span className="font-bold text-[#1D6E66] tabular-nums">
                        {progress.label}
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E0D8] h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#32A89C] rounded-full transition-all duration-700"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Target: {formatRupiah(goal.targetAmount, true)}</span>
                      <span>Tenor: {goal.tenorMonths} bln</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between text-xs text-slate-500">
            <span>Total Kebutuhan Bulanan:</span>
            <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(totals.totalSinkingFundNeed, true)}/bln</span>
          </div>
        </div>

        {/* Bento Tile 5: Priority Actions (Span 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8] mb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Priority Actions (30-Day Checklist)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Langkah prioritas implementasi rekomendasi keuangan.
                </p>
              </div>
              <span className="text-xs font-bold text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-1 rounded-full border border-[#32A89C]/20">
                {completedActionsCount}/{actions.length} Selesai
              </span>
            </div>

            {/* Action Items List */}
            <div className="divide-y divide-[#E5E0D8]">
              {actions.map((act) => (
                <div
                  key={act.id}
                  onClick={() => handleActionClick(act.id, act.completed)}
                  className="py-3 flex items-start gap-3 cursor-pointer hover:bg-[#FAF8F5] -mx-2 px-2 rounded-xl transition-colors group"
                >
                  <button 
                    type="button" 
                    className="mt-0.5 text-slate-400 group-hover:text-[#32A89C] transition-colors shrink-0"
                  >
                    {act.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#32A89C] fill-[#E8F7F5]" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs sm:text-sm font-bold ${act.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {act.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4F0E8] text-slate-600">
                        {act.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        act.priority.includes('Segera') ? 'bg-[#FFE4E6] text-[#E11D48]' : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {act.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      💡 <span className="font-semibold text-slate-700">Dampak:</span> {act.impactText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between">
            <button
              onClick={() => onOpenDeliverable('checklist')}
              className="text-xs font-bold text-[#32A89C] hover:text-[#25857B] flex items-center gap-1"
            >
              <span>Download Versi Cetak</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">Diupdate berkala dalam Wealth OS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
