import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  TrendingDown,
  ShieldCheck,
  FileText,
  ArrowRight,
  Percent,
  RefreshCw,
  Printer,
  AlertTriangle,
  Sparkles,
  Sliders,
  DollarSign,
  PiggyBank,
  CheckCircle2,
  Info,
  Calendar,
  Clock,
  Landmark,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { KprSimulationState } from '../../types';
import { usePortal } from '../../context/PortalContext';
import { formatRupiah } from '../../utils/calculations';

// ============================================================================
// UTILITIES: AUTO-PARSER RUPIAH & VALIDASI ANTI-NAN
// ============================================================================
export const cleanNumber = (val: string | number | undefined | null): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatInputRupiah = (num: number): string => {
  if (!num && num !== 0) return '';
  return new Intl.NumberFormat('id-ID').format(num);
};

interface AdvisoryKprViewProps {
  kpr?: KprSimulationState;
  onUpdateKpr?: (newKpr: KprSimulationState) => void;
  onOpenAdvisorModal?: () => void;
  onOpenDeliverable?: (type: 'mfund') => void;
}

export const AdvisoryKprView: React.FC<AdvisoryKprViewProps> = ({
  kpr: propKpr,
  onUpdateKpr: propOnUpdateKpr,
  onOpenAdvisorModal,
  onOpenDeliverable,
}) => {
  const portalContext = usePortal();
  const contextKpr = portalContext?.kprData;
  const updateKprContext = portalContext?.updateKprData;
  const profile = portalContext?.profile;
  const netWorth = portalContext?.netWorthData;

  // Active KPR state source: prop priority, fallback to context, fallback to standard defaults
  const activeKpr = propKpr || contextKpr;

  // Pre-fill initial values
  const defaultLiquidCash = useMemo(() => {
    if (netWorth?.kasLikuid) return netWorth.kasLikuid;
    return 80000000;
  }, [netWorth?.kasLikuid]);

  // --------------------------------------------------------------------------
  // 1. STATE INPUT PARAMETER DENGAN AUTO-PARSER & ANTI-NAN
  // --------------------------------------------------------------------------
  // A. Acuan Makro BI & Suku Bunga
  const [biRate, setBiRate] = useState<number>(activeKpr?.biRate ?? 6.0);
  const [spreadBank, setSpreadBank] = useState<number>(activeKpr?.spreadBank ?? 4.5);

  // B. Data Pinjaman Riil
  const [sisaPokok, setSisaPokok] = useState<number>(activeKpr?.remainingLoanBalance ?? 500000000);
  const [bungaFixed, setBungaFixed] = useState<number>(activeKpr?.fixedInterestRate ?? 4.75);
  const [tenorTotal, setTenorTotal] = useState<number>(activeKpr?.originalTenorYears ?? 20);
  const [tenorBerjalan, setTenorBerjalan] = useState<number>(activeKpr?.tenorBerjalan ?? 68);
  const [cicilanFixed, setCicilanFixed] = useState<number>(activeKpr?.cicilanFixed ?? 4500000);

  // C. Rencana Intervensi & Eksekusi (Top-Up)
  const [danaLikuid, setDanaLikuid] = useState<number>(activeKpr?.danaLikuid ?? defaultLiquidCash);
  const [nabungBulanan, setNabungBulanan] = useState<number>(activeKpr?.nabungBulanan ?? 4000000);
  const [returnInvestasi, setReturnInvestasi] = useState<number>(activeKpr?.mFundReturnRate ?? 6.5);
  const [targetTopUp, setTargetTopUp] = useState<number>(activeKpr?.lumpSumExtraPayment ?? 100000000);
  const [penaltiPersen, setPenaltiPersen] = useState<number>(activeKpr?.penaltiPersen ?? 3);
  const [opsiRestrukturisasi, setOpsiRestrukturisasi] = useState<'potong_tenor' | 'turunkan_cicilan'>(
    activeKpr?.opsiRestrukturisasi ?? 'potong_tenor'
  );

  // Status notifikasi simpan
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Display Only: Floating Rate = BI Rate + Spread Bank
  const floatingRate = useMemo(() => {
    return parseFloat((biRate + spreadBank).toFixed(2));
  }, [biRate, spreadBank]);

  // Display Only: Sisa Tenor = Math.max(1, (Tenor Total * 12) - Tenor Berjalan)
  const sisaTenorBulan = useMemo(() => {
    return Math.max(1, Math.round(tenorTotal * 12) - tenorBerjalan);
  }, [tenorTotal, tenorBerjalan]);

  // --------------------------------------------------------------------------
  // 2. ENGINE KALKULASI AMORTISASI & PMT MATEMATIKA FINANSIAL (ZERO DIVISION GUARD)
  // --------------------------------------------------------------------------
  const calculations = useMemo(() => {
    const r = (floatingRate / 100) / 12;
    const n = sisaTenorBulan;

    // Estimasi Cicilan Floating Masa Mandiri (Formula Anuitas Perbankan):
    // Cicilan Floating = Math.round((r * Sisa Pokok) / (1 - Math.pow(1 + r, -n)))
    let cicilanFloating = 0;
    if (r > 0 && n > 0) {
      const denominator = 1 - Math.pow(1 + r, -n);
      cicilanFloating = denominator !== 0 ? Math.round((r * sisaPokok) / denominator) : Math.round(sisaPokok / n);
    } else if (n > 0) {
      cicilanFloating = Math.round(sisaPokok / n);
    }

    // Lonjakan Cicilan (Floating Spike)
    const floatingSpike = Math.max(0, cicilanFloating - cicilanFixed);

    // Total Beban Bunga Status Quo Terbuang = (Cicilan Floating * n) - Sisa Pokok
    const totalBebanBungaStatusQuo = Math.max(0, (cicilanFloating * n) - sisaPokok);

    // Kalkulasi Efektivitas Top-Up
    const biayaPenalti = Math.round(targetTopUp * (penaltiPersen / 100));
    const pelunasanEfektif = Math.max(0, targetTopUp - biayaPenalti);
    const sisaPokokBaru = Math.max(0, sisaPokok - pelunasanEfektif);

    // Opsi A: Potong Tenor Sisa KPR
    let n_baru = n;
    if (sisaPokokBaru <= 0) {
      n_baru = 0;
    } else if (r > 0 && cicilanFloating > 0) {
      const factor = 1 - (r * sisaPokokBaru / cicilanFloating);
      if (factor > 0) {
        n_baru = Math.ceil(-Math.log(factor) / Math.log(1 + r));
      } else {
        n_baru = 0;
      }
    } else if (cicilanFloating > 0) {
      n_baru = Math.ceil(sisaPokokBaru / cicilanFloating);
    }
    const bulanHematA = Math.max(0, n - n_baru);
    const tahunHematA = (bulanHematA / 12).toFixed(1);
    const totalBungaDihematA = Math.max(0, Math.round((cicilanFloating * bulanHematA) - biayaPenalti));
    const bebasKprText = `${tahunHematA} Tahun (${bulanHematA} Bulan Lebih Cepat)`;

    // Opsi B: Turunkan Cicilan Bulanan
    let cicilanBaruB = 0;
    if (sisaPokokBaru > 0 && n > 0) {
      if (r > 0) {
        const denB = 1 - Math.pow(1 + r, -n);
        cicilanBaruB = denB !== 0 ? Math.round((r * sisaPokokBaru) / denB) : Math.round(sisaPokokBaru / n);
      } else {
        cicilanBaruB = Math.round(sisaPokokBaru / n);
      }
    }
    const penghematanCashflowBulananB = Math.max(0, cicilanFloating - cicilanBaruB);
    const totalBungaDihematB = Math.max(0, Math.round(((cicilanFloating - cicilanBaruB) * n) - biayaPenalti));

    // Active Selection Metrics
    const isPotongTenor = opsiRestrukturisasi === 'potong_tenor';
    const totalBungaDihemat = isPotongTenor ? totalBungaDihematA : totalBungaDihematB;
    const cicilanPasca = isPotongTenor ? cicilanFloating : cicilanBaruB;
    const tenorSisaPasca = isPotongTenor ? n_baru : n;

    return {
      r,
      n,
      cicilanFloating,
      floatingSpike,
      totalBebanBungaStatusQuo,
      biayaPenalti,
      pelunasanEfektif,
      sisaPokokBaru,
      // Opsi A
      n_baru,
      bulanHematA,
      tahunHematA,
      totalBungaDihematA,
      bebasKprText,
      // Opsi B
      cicilanBaruB,
      penghematanCashflowBulananB,
      totalBungaDihematB,
      // Active
      isPotongTenor,
      totalBungaDihemat,
      cicilanPasca,
      tenorSisaPasca,
    };
  }, [
    floatingRate,
    sisaTenorBulan,
    sisaPokok,
    cicilanFixed,
    targetTopUp,
    penaltiPersen,
    opsiRestrukturisasi,
  ]);

  // --------------------------------------------------------------------------
  // 6. STATE PERSISTENCE KE GOOGLE SHEETS & CONTEXT
  // --------------------------------------------------------------------------
  const syncToGlobalState = () => {
    const updatedState: KprSimulationState = {
      originalLoanAmount: sisaPokok,
      remainingLoanBalance: sisaPokok,
      originalTenorYears: tenorTotal,
      remainingTenorMonths: sisaTenorBulan,
      fixedInterestRate: bungaFixed,
      floatingInterestRate: floatingRate,
      isFloatingActive: true,
      extraMonthlyPayment: 0,
      lumpSumExtraPayment: targetTopUp,
      mFundReturnRate: returnInvestasi,
      // Extended Institutional fields
      biRate,
      spreadBank,
      tenorBerjalan,
      cicilanFixed,
      danaLikuid,
      nabungBulanan,
      penaltiPersen,
      opsiRestrukturisasi,
    };

    if (propOnUpdateKpr) {
      propOnUpdateKpr(updatedState);
    } else if (updateKprContext) {
      updateKprContext(updatedState);
    }

    setIsSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaved(false), 2500);
  };

  // Debounced auto-save whenever any state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      syncToGlobalState();
    }, 600);
    return () => clearTimeout(timer);
  }, [
    biRate,
    spreadBank,
    floatingRate,
    sisaPokok,
    bungaFixed,
    tenorTotal,
    tenorBerjalan,
    cicilanFixed,
    danaLikuid,
    nabungBulanan,
    returnInvestasi,
    targetTopUp,
    penaltiPersen,
    opsiRestrukturisasi,
  ]);

  // --------------------------------------------------------------------------
  // 4. GENERASI DATA KURVA AMORTISASI INTERAKTIF (SVG CHART)
  // --------------------------------------------------------------------------
  const chartData = useMemo(() => {
    const totalMonths = calculations.n;
    if (totalMonths <= 0 || sisaPokok <= 0) return { pointsStatusQuo: [], pointsAccelerated: [], maxBalance: 1 };

    const r = calculations.r;
    const maxBalance = sisaPokok;

    // We sample up to 25 intervals for a smooth SVG path
    const steps = Math.min(25, totalMonths);
    const stepInterval = Math.max(1, Math.floor(totalMonths / steps));

    const pointsStatusQuo: { month: number; year: string; balance: number }[] = [];
    const pointsAccelerated: { month: number; year: string; balance: number }[] = [];

    // Simulate status quo month-by-month
    let balSQ = sisaPokok;
    const monthlySQ = calculations.cicilanFloating;

    let balAcc = calculations.sisaPokokBaru;
    const monthlyAcc = calculations.isPotongTenor ? calculations.cicilanFloating : calculations.cicilanBaruB;

    // Month 0
    pointsStatusQuo.push({ month: 0, year: 'Thn 0', balance: sisaPokok });
    pointsAccelerated.push({ month: 0, year: 'Thn 0', balance: calculations.sisaPokokBaru });

    let currentMonth = 0;
    while (currentMonth < totalMonths) {
      currentMonth += stepInterval;
      if (currentMonth > totalMonths) currentMonth = totalMonths;

      // Status Quo calculation at currentMonth
      // Exact balance formula: B_t = B_0 (1+r)^t - PMT * ((1+r)^t - 1) / r
      if (r > 0) {
        const factor = Math.pow(1 + r, currentMonth);
        balSQ = Math.max(0, Math.round(sisaPokok * factor - (monthlySQ * (factor - 1)) / r));
      } else {
        balSQ = Math.max(0, sisaPokok - (monthlySQ * currentMonth));
      }

      // Accelerated calculation at currentMonth
      if (calculations.isPotongTenor) {
        if (currentMonth >= calculations.n_baru) {
          balAcc = 0;
        } else if (r > 0) {
          const factorAcc = Math.pow(1 + r, currentMonth);
          balAcc = Math.max(0, Math.round(calculations.sisaPokokBaru * factorAcc - (monthlyAcc * (factorAcc - 1)) / r));
        } else {
          balAcc = Math.max(0, calculations.sisaPokokBaru - (monthlyAcc * currentMonth));
        }
      } else {
        // Lowered installment
        if (r > 0) {
          const factorAcc = Math.pow(1 + r, currentMonth);
          balAcc = Math.max(0, Math.round(calculations.sisaPokokBaru * factorAcc - (monthlyAcc * (factorAcc - 1)) / r));
        } else {
          balAcc = Math.max(0, calculations.sisaPokokBaru - (monthlyAcc * currentMonth));
        }
      }

      const yearLabel = `Thn ${(currentMonth / 12).toFixed(1)}`;
      pointsStatusQuo.push({ month: currentMonth, year: yearLabel, balance: balSQ });
      pointsAccelerated.push({ month: currentMonth, year: yearLabel, balance: balAcc });

      if (currentMonth === totalMonths) break;
    }

    return { pointsStatusQuo, pointsAccelerated, maxBalance };
  }, [calculations, sisaPokok]);

  // Convert points to SVG coordinates
  const svgCoordinates = useMemo(() => {
    const width = 800;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 40, left: 75 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const totalMonths = calculations.n || 1;
    const maxBal = chartData.maxBalance || 1;

    const getX = (month: number) => padding.left + (month / totalMonths) * chartW;
    const getY = (bal: number) => padding.top + chartH - (Math.max(0, bal) / maxBal) * chartH;

    const sqCoords = chartData.pointsStatusQuo.map((p) => ({
      ...p,
      x: getX(p.month),
      y: getY(p.balance),
    }));

    const accCoords = chartData.pointsAccelerated.map((p) => ({
      ...p,
      x: getX(p.month),
      y: getY(p.balance),
    }));

    // SVG path string for Status Quo (Red)
    const dSQ = sqCoords.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // SVG path string for Accelerated (Green)
    const dAcc = accCoords.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Shaded Area between Red (SQ) and Green (Acc)
    // We go along SQ from start to end, then reverse along Acc back to start
    const reverseAcc = [...accCoords].reverse();
    const dShaded = `${dSQ} L ${reverseAcc[0]?.x ?? 0} ${reverseAcc[0]?.y ?? 0} ` +
      reverseAcc.map((p) => `L ${p.x} ${p.y}`).join(' ') + ' Z';

    return {
      width,
      height,
      padding,
      chartW,
      chartH,
      sqCoords,
      accCoords,
      dSQ,
      dAcc,
      dShaded,
      getY,
      getX,
    };
  }, [chartData, calculations.n]);

  // --------------------------------------------------------------------------
  // 5. PRINT / EXPORT HANDLER
  // --------------------------------------------------------------------------
  const handlePrintReport = () => {
    window.print();
  };

  const clientGreeting = profile?.fullName
    ? `Klien VIP ${profile.fullName}`
    : 'Klien VIP Jago Rencana';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* ==================================================================== */}
      {/* HEADER UTAMA: INSTITUTIONAL ADVISORY KPR */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-black tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-3 py-1 rounded-full border border-[#32A89C]/25">
              Rekomendasi Institutional Advisor Jago Rencana
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#32A89C]" />
              KPR Restructuring & Acceleration Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Simulator Percepatan KPR & Restrukturisasi Bunga
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
            Selamat datang, <strong className="text-slate-900">{clientGreeting}</strong>. Analisis lonjakan suku bunga floating masa mandiri bank, perbandingan arbitrase kas pasar uang (RDPU), dan peta jalan pelunasan dipercepat untuk menyelamatkan ratusan juta rupiah beban bunga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handlePrintReport}
            className="h-11 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            title="Cetak Ringkasan Audit KPR ke PDF"
          >
            <Printer className="w-4 h-4 text-[#32A89C]" />
            <span>Download Ringkasan Audit KPR (Cetak PDF)</span>
          </button>

          {onOpenAdvisorModal && (
            <button
              onClick={onOpenAdvisorModal}
              className="h-11 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#32A89C]" />
              <span>Konsultasi Takeover KPR</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DOKUMEN CETAK KHUSUS (PRINT ONLY HEADER) */}
      {/* ==================================================================== */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-black tracking-widest uppercase text-[#32A89C]">
              JAGO RENCANA PRIVATE WEALTH ADVISORY DESK
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
              LEMBAR AUDIT RESTRUKTURISASI & PERCEPATAN KPR
            </h1>
            <p className="text-[10pt] text-slate-600">
              Rekomendasi Institutional Advisor Jago Rencana • Standar Matematika Keuangan Anuitas Perbankan
            </p>
          </div>
          <div className="text-right text-[9pt] text-slate-500">
            <div>Klien: <strong className="text-slate-900">{profile?.fullName || 'Klien VIP'}</strong></div>
            <div>Email: {profile?.email || '-'}</div>
            <div>Tanggal Audit: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXECUTIVE IMPACT BANNER / HIGHLIGHT MATRIKS UTAMA */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lonjakan Cicilan Floating */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
            <span>Estimasi Cicilan Floating</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {formatRupiah(calculations.cicilanFloating)}
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
            <span>+{formatRupiah(calculations.floatingSpike)}/bln</span>
            <span className="text-slate-400 font-normal">vs masa fixed</span>
          </div>
        </div>

        {/* Card 2: Total Bunga Dihemat */}
        <div className="bg-[#E8F7F5] rounded-2xl p-5 border border-[#32A89C]/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-[#1D6E66] mb-1.5">
            <span>Total Bunga Dihemat</span>
            <ShieldCheck className="w-4 h-4 text-[#32A89C]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1D6E66] tabular-nums">
            {formatRupiah(calculations.totalBungaDihemat)}
          </div>
          <div className="mt-2 text-[11px] text-[#1D6E66] font-semibold">
            Beban bunga bank berhasil dipangkas
          </div>
        </div>

        {/* Card 3: Tenor Terpangkas / Cashflow Lega */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
            <span>{calculations.isPotongTenor ? 'Pangkas Tenor Utang' : 'Pelegaan Cashflow'}</span>
            <Clock className="w-4 h-4 text-[#32A89C]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {calculations.isPotongTenor ? calculations.bebasKprText : `${formatRupiah(calculations.penghematanCashflowBulananB)}/bln`}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {calculations.isPotongTenor ? 'Bebas KPR lebih awal' : 'Alokasi sisa cicilan lebih longgar'}
          </div>
        </div>

        {/* Card 4: Sisa Pokok Baru */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
            <span>Sisa Pokok Pasca Top-Up</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {formatRupiah(calculations.sisaPokokBaru)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Net potong: {formatRupiah(calculations.pelunasanEfektif)}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. STRATEGI ARBITRASE MAKRO & ADVISOR INSIGHT (KPR VS RDPU) */}
      {/* ==================================================================== */}
      <div className="rounded-2xl p-5 sm:p-6 border transition-all duration-200 shadow-sm bg-gradient-to-r from-[#0F1A24] to-[#162534] text-white border-[#32A89C]/30">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#32A89C]/20 border border-[#32A89C]/40 text-[#32A89C] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#32A89C] bg-[#32A89C]/20 px-2.5 py-0.5 rounded-full border border-[#32A89C]/30">
                Institutional Macro Yield Arbitrage
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-300">
                Perbandingan Suku Bunga KPR ({floatingRate}%) vs Return RDPU M-Fund ({returnInvestasi}%)
              </span>
            </div>

            {floatingRate > returnInvestasi ? (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                <strong className="text-[#32A89C] font-black">STRATEGI AKSELERASI LETS-GO ACCELERATE:</strong> Karena suku bunga pinjaman KPR ({floatingRate}%) lebih tinggi dari return bebas pajak pasar uang ({returnInvestasi}%), mempercepat pelunasan pokok langsung akan memangkas akrual bunga harian bank secara efisien dan memberikan imbal hasil pasti (guaranteed yield) bebas risiko.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                <strong className="text-amber-400 font-black">STRATEGI ARBITRASE KAS:</strong> Tahan dana likuid pada instrumen pasar uang untuk memaksimalkan fleksibilitas kas.
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>Spread Biaya Bunga: <strong className="text-white">{(floatingRate - returnInvestasi).toFixed(2)}% net gap</strong></span>
              <span>•</span>
              <span>Rekomendasi Aksi: <strong className="text-emerald-400">Prioritaskan Eksekusi Top-Up Pokok</strong></span>
              {onOpenDeliverable && (
                <button
                  onClick={() => onOpenDeliverable('mfund')}
                  className="text-xs text-[#32A89C] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer ml-auto"
                >
                  Lihat Analisis Pasar Uang M-Fund <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. INPUT PARAMETER (FORM 2-KOLOM RESPONSIP DILENGKAPI AUTO-PARSER) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* KOLOM KIRI: ACUAN MAKRO & DATA PINJAMAN RIIL (SPAN 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-[#E5E0D8] shadow-sm space-y-6">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex items-center justify-center text-slate-700">
                <Landmark className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                A. Acuan Makro & Pinjaman Riil KPR
              </h2>
            </div>
            <span className="text-[11px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              BI Rate Sensitive
            </span>
          </div>

          {/* Acuan Makro BI */}
          <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E0D8] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Benchmark Suku Bunga Makro BI</span>
              <span className="text-[10px] text-slate-500">Bank Indonesia</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  BI Rate Berjalan (% p.a.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={biRate}
                    onChange={(e) => setBiRate(parseFloat(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Spread Bunga Bank (% p.a.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={spreadBank}
                    onChange={(e) => setSpreadBank(parseFloat(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1D6E66] mb-1 block">
                  Floating Rate (Otomatis)
                </label>
                <div className="h-10 w-full rounded-lg px-3 bg-[#E8F7F5] border border-[#32A89C]/30 flex items-center justify-between text-xs font-black text-[#1D6E66] tabular-nums">
                  <span>{floatingRate.toFixed(2)}%</span>
                  <span className="text-[10px] text-[#1D6E66]/70">p.a.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Input Data Pinjaman Riil */}
          <div className="space-y-4">
            {/* Sisa Pokok KPR */}
            <div>
              <label className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Sisa Pokok KPR / Baki Debet Saat Ini</span>
                <span className="text-[10px] text-slate-400 font-normal">Input Rupiah</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={formatInputRupiah(sisaPokok)}
                  onChange={(e) => setSisaPokok(cleanNumber(e.target.value))}
                  placeholder="500.000.000"
                  className="h-11 w-full rounded-xl pl-10 pr-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] focus:ring-2 focus:ring-[#32A89C]/15 text-slate-900 font-black text-sm tabular-nums outline-none"
                />
              </div>
            </div>

            {/* Suku Bunga Fixed Awal & Cicilan Fixed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Suku Bunga Fixed Awal (% p.a.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="20"
                    value={bungaFixed}
                    onChange={(e) => setBungaFixed(parseFloat(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Cicilan Fixed Saat Ini (Rp/bln)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={formatInputRupiah(cicilanFixed)}
                    onChange={(e) => setCicilanFixed(cleanNumber(e.target.value))}
                    className="h-10 w-full rounded-xl pl-9 pr-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tenor Total Awal & Tenor Berjalan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Tenor Total Awal (Tahun)
                </label>
                <input
                  type="number"
                  min="1"
                  max="35"
                  value={tenorTotal}
                  onChange={(e) => setTenorTotal(cleanNumber(e.target.value))}
                  className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  = {tenorTotal * 12} Total Bulan
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Tenor Berjalan (Bulan Terlewati)
                </label>
                <input
                  type="number"
                  min="0"
                  max={tenorTotal * 12}
                  value={tenorBerjalan}
                  onChange={(e) => setTenorBerjalan(cleanNumber(e.target.value))}
                  className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ≈ {(tenorBerjalan / 12).toFixed(1)} Tahun Terlewati
                </span>
              </div>
            </div>

            {/* Display Kalkulasi Otomatis Sisa Tenor */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Sisa Tenor Berjalan:
              </span>
              <div className="text-right">
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {sisaTenorBulan} Bulan
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  ({(sisaTenorBulan / 12).toFixed(1)} Tahun)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: RENCANA INTERVENSI & EKSEKUSI TOP-UP (SPAN 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-[#E5E0D8] shadow-sm space-y-6">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 flex items-center justify-center text-[#1D6E66]">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                B. Rencana Intervensi & Eksekusi (Top-Up)
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Kapabilitas Kas
            </span>
          </div>

          {/* Dana Kas Likuid & Nabung Bulanan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Dana Kas Likuid Tersedia</span>
                <span className="text-[10px] text-slate-400">Kas / Deposito</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={formatInputRupiah(danaLikuid)}
                  onChange={(e) => setDanaLikuid(cleanNumber(e.target.value))}
                  className="h-10 w-full rounded-xl pl-9 pr-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Kemampuan Nabung Bulanan</span>
                <span className="text-[10px] text-slate-400">Cashflow Surplus</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={formatInputRupiah(nabungBulanan)}
                  onChange={(e) => setNabungBulanan(cleanNumber(e.target.value))}
                  className="h-10 w-full rounded-xl pl-9 pr-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
              </div>
            </div>
          </div>

          {/* Asumsi Return RDPU & Biaya Penalti */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Asumsi Return RDPU (% p.a.)</span>
                <span className="text-[10px] text-[#32A89C] font-semibold">Bebas Pajak</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  value={returnInvestasi}
                  onChange={(e) => setReturnInvestasi(parseFloat(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Penalti Pelunasan Dipercepat</span>
                <span className="text-[10px] text-slate-400">Biaya Bank</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={penaltiPersen}
                  onChange={(e) => setPenaltiPersen(parseFloat(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Slider & Input Target Pelunasan Sebagian / Lump-Sum */}
          <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E5E0D8] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Target Pelunasan Sebagian (Lump-Sum)
              </label>
              <span className="text-xs font-black text-[#1D6E66] tabular-nums">
                {formatRupiah(targetTopUp)}
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={Math.min(sisaPokok, 500000000)}
              step="5000000"
              value={targetTopUp}
              onChange={(e) => setTargetTopUp(cleanNumber(e.target.value))}
              className="w-full accent-[#32A89C] cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Manual Rupiah Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                value={formatInputRupiah(targetTopUp)}
                onChange={(e) => setTargetTopUp(cleanNumber(e.target.value))}
                placeholder="100.000.000"
                className="h-10 w-full rounded-xl pl-10 pr-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 font-bold text-xs tabular-nums outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Estimasi Biaya Penalti Bank ({penaltiPersen}%):</span>
              <span className="font-bold text-rose-600 tabular-nums">
                {formatRupiah(calculations.biayaPenalti)}
              </span>
            </div>
          </div>

          {/* TOGGLE OPSI RESTRUKTURISASI */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-900 block">
              Pilihan Opsi Restrukturisasi Perbankan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opsi A */}
              <button
                type="button"
                onClick={() => setOpsiRestrukturisasi('potong_tenor')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  opsiRestrukturisasi === 'potong_tenor'
                    ? 'bg-[#E8F7F5] border-[#32A89C] shadow-sm ring-1 ring-[#32A89C]'
                    : 'bg-white border-[#D5CEBF] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${opsiRestrukturisasi === 'potong_tenor' ? 'text-[#1D6E66]' : 'text-slate-800'}`}>
                    Opsi A: Potong Tenor Sisa KPR
                  </span>
                  {opsiRestrukturisasi === 'potong_tenor' && (
                    <CheckCircle2 className="w-4 h-4 text-[#32A89C]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Cicilan bulanan tetap sama ({formatRupiah(calculations.cicilanFloating)}), durasi utang terpangkas drastis.
                </p>
              </button>

              {/* Opsi B */}
              <button
                type="button"
                onClick={() => setOpsiRestrukturisasi('turunkan_cicilan')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  opsiRestrukturisasi === 'turunkan_cicilan'
                    ? 'bg-[#E8F7F5] border-[#32A89C] shadow-sm ring-1 ring-[#32A89C]'
                    : 'bg-white border-[#D5CEBF] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${opsiRestrukturisasi === 'turunkan_cicilan' ? 'text-[#1D6E66]' : 'text-slate-800'}`}>
                    Opsi B: Turunkan Cicilan Bulanan
                  </span>
                  {opsiRestrukturisasi === 'turunkan_cicilan' && (
                    <CheckCircle2 className="w-4 h-4 text-[#32A89C]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Tenor sisa tetap, beban cicilan bulanan diperkecil agar cashflow keluarga jauh lebih lega.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. VISUALISASI KURVA AMORTISASI INTERAKTIF (SVG CHART) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E0D8] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Visual Amortisasi
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-600">
                Peta Baki Debet Status Quo vs Pasca Top-Up
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
              Lintasan Penurunan Pokok KPR & Penyelamatan Bunga
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span className="text-slate-600">Status Quo (Tanpa Top-Up)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-slate-900 font-bold">Pasca Intervensi Top-Up</span>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px]">
            <svg
              viewBox={`0 0 ${svgCoordinates.width} ${svgCoordinates.height}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32A89C" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-Axis Labels */}
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
                const y = svgCoordinates.padding.top + (1 - ratio) * svgCoordinates.chartH;
                const valueLabel = formatRupiah(chartData.maxBalance * ratio, true);
                return (
                  <g key={ratio}>
                    <line
                      x1={svgCoordinates.padding.left}
                      y1={y}
                      x2={svgCoordinates.width - svgCoordinates.padding.right}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={svgCoordinates.padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-medium tabular-nums"
                    >
                      {valueLabel}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Labels (Timeline) */}
              {svgCoordinates.sqCoords
                .filter((_, idx, arr) => idx % Math.ceil(arr.length / 7) === 0 || idx === arr.length - 1)
                .map((pt, idx) => (
                  <g key={idx}>
                    <line
                      x1={pt.x}
                      y1={svgCoordinates.height - svgCoordinates.padding.bottom}
                      x2={pt.x}
                      y2={svgCoordinates.height - svgCoordinates.padding.bottom + 5}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <text
                      x={pt.x}
                      y={svgCoordinates.height - svgCoordinates.padding.bottom + 18}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold"
                    >
                      {pt.year}
                    </text>
                  </g>
                ))}

              {/* Shaded Area (Bunga yang Diselamatkan) */}
              {svgCoordinates.dShaded && (
                <path
                  d={svgCoordinates.dShaded}
                  fill="url(#savingsGradient)"
                />
              )}

              {/* Red Line: Status Quo */}
              {svgCoordinates.dSQ && (
                <path
                  d={svgCoordinates.dSQ}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Green Line: Accelerated */}
              {svgCoordinates.dAcc && (
                <path
                  d={svgCoordinates.dAcc}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Start & End Marker Dots */}
              {svgCoordinates.sqCoords[0] && (
                <circle
                  cx={svgCoordinates.sqCoords[0].x}
                  cy={svgCoordinates.sqCoords[0].y}
                  r="4"
                  fill="#EF4444"
                />
              )}
              {svgCoordinates.accCoords[0] && (
                <circle
                  cx={svgCoordinates.accCoords[0].x}
                  cy={svgCoordinates.accCoords[0].y}
                  r="4.5"
                  fill="#10B981"
                />
              )}
              {svgCoordinates.accCoords[svgCoordinates.accCoords.length - 1] && (
                <circle
                  cx={svgCoordinates.accCoords[svgCoordinates.accCoords.length - 1].x}
                  cy={svgCoordinates.accCoords[svgCoordinates.accCoords.length - 1].y}
                  r="5"
                  fill="#10B981"
                />
              )}
            </svg>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="w-4 h-4 text-[#32A89C] shrink-0" />
            <span>
              Area hijau transparan menunjukkan nominal akumulasi bunga bank senilai <strong>{formatRupiah(calculations.totalBungaDihemat)}</strong> yang sukses diselamatkan melalui strategi intervensi top-up ini.
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#1D6E66] shrink-0 bg-[#E8F7F5] px-2.5 py-1 rounded-full border border-[#32A89C]/20">
            {calculations.isPotongTenor ? 'Target: Pangkas Durasi' : 'Target: Cashflow Bulanan'}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TABEL PERBANDINGAN KOMPARATIF INSTITUSIONAL (STATUS QUO VS AKSELERASI) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="pb-3 border-b border-[#E5E0D8]">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Tabel Ringkasan Matriks Restrukturisasi KPR
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Komparasi terperinci parameter pinjaman sebelum dan sesudah eksekusi pelunasan dipercepat.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-4">Metrik Pinjaman</th>
                <th className="py-3 px-4">Status Quo (Tanpa Top-Up)</th>
                <th className="py-3 px-4 text-[#1D6E66] bg-[#E8F7F5]/50 rounded-t-lg">
                  Pasca Restrukturisasi ({calculations.isPotongTenor ? 'Opsi A' : 'Opsi B'})
                </th>
                <th className="py-3 px-4">Dampak Finansial Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">Sisa Baki Debet</td>
                <td className="py-3.5 px-4 tabular-nums">{formatRupiah(sisaPokok)}</td>
                <td className="py-3.5 px-4 tabular-nums font-bold text-[#1D6E66] bg-[#E8F7F5]/30">
                  {formatRupiah(calculations.sisaPokokBaru)}
                </td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold tabular-nums">
                  -{formatRupiah(calculations.pelunasanEfektif)}
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">Cicilan Bulanan</td>
                <td className="py-3.5 px-4 tabular-nums">{formatRupiah(calculations.cicilanFloating)}/bln</td>
                <td className="py-3.5 px-4 tabular-nums font-bold text-[#1D6E66] bg-[#E8F7F5]/30">
                  {formatRupiah(calculations.cicilanPasca)}/bln
                </td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold tabular-nums">
                  {calculations.isPotongTenor ? 'Tetap Sama' : `Hemat ${formatRupiah(calculations.penghematanCashflowBulananB)}/bln`}
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">Sisa Tenor Pinjaman</td>
                <td className="py-3.5 px-4 tabular-nums">
                  {sisaTenorBulan} Bulan ({(sisaTenorBulan / 12).toFixed(1)} Thn)
                </td>
                <td className="py-3.5 px-4 tabular-nums font-bold text-[#1D6E66] bg-[#E8F7F5]/30">
                  {calculations.tenorSisaPasca} Bulan ({(calculations.tenorSisaPasca / 12).toFixed(1)} Thn)
                </td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold tabular-nums">
                  {calculations.isPotongTenor ? calculations.bebasKprText : 'Durasi Sama'}
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-900">Total Bunga Terbuang</td>
                <td className="py-3.5 px-4 tabular-nums text-rose-600">
                  {formatRupiah(calculations.totalBebanBungaStatusQuo)}
                </td>
                <td className="py-3.5 px-4 tabular-nums font-bold text-[#1D6E66] bg-[#E8F7F5]/30">
                  {formatRupiah(Math.max(0, calculations.totalBebanBungaStatusQuo - calculations.totalBungaDihemat))}
                </td>
                <td className="py-3.5 px-4 text-[#1D6E66] font-black tabular-nums">
                  Hemat {formatRupiah(calculations.totalBungaDihemat)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print Only Footer Metadata */}
        <div className="hidden print:block pt-6 border-t border-slate-300 text-[8pt] text-slate-500">
          <div className="flex justify-between items-center">
            <span>Dokumen Rahasia & Personal untuk: <strong>{clientGreeting}</strong></span>
            <span>Jago Rencana Private Wealth Advisory Desk • Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisoryKprView;
