import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Sparkles, 
  Layers, 
  PieChart as PieIcon, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  HelpCircle,
  PiggyBank,
  CheckCircle2,
  RefreshCw,
  Clock,
  Coins,
  BarChart3
} from 'lucide-react';
import { formatRupiah, calculateTVM } from '../utils/calculations';
import { CurrencyInput } from './common/CurrencyInput';
import confetti from 'canvas-confetti';

interface TvmFutureGoalsEngineProps {
  onSyncToSinkingFund?: (goalData: { title: string; targetAmount: number; tenorMonths: number; category: 'education' | 'property' | 'retirement' | 'custom'; notes: string }) => void;
  onNavigateTab?: (tab: string) => void;
}

interface GoalPreset {
  id: string;
  title: string;
  targetPresentValue: number;
  horizonYears: number;
  category: 'retirement' | 'education' | 'property' | 'custom';
  suggestedReturn: number;
  inflationRate: number;
  description: string;
}

const TVM_PRESETS: GoalPreset[] = [
  {
    id: 'pensiun',
    title: 'Dana Pensiun Mandiri (F.I.R.E Portfolio)',
    targetPresentValue: 3000000000,
    horizonYears: 15,
    category: 'retirement',
    suggestedReturn: 11.0,
    inflationRate: 5.0,
    description: 'Portofolio aset produktif untuk menghasilkan passive income bebas finansial.',
  },
  {
    id: 'kuliah_anak',
    title: 'Dana Kuliah Sarjana (Kampus Luar / Swasta)',
    targetPresentValue: 600000000,
    horizonYears: 10,
    category: 'education',
    suggestedReturn: 9.5,
    inflationRate: 6.5,
    description: 'Pendidikan tinggi terbaik dengan proteksi inflasi biaya kuliah tahunan.',
  },
  {
    id: 'rumah_cash',
    title: 'Beli Rumah Idaman / Upgrade Properti Cash 50%',
    targetPresentValue: 1200000000,
    horizonYears: 7,
    category: 'property',
    suggestedReturn: 8.5,
    inflationRate: 5.0,
    description: 'Akumulasi dana tunai atau DP 50%+ untuk meminimalkan beban bunga KPR.',
  },
  {
    id: 'passive_income',
    title: 'Portofolio Dividen & Kupon SBN Mandiri',
    targetPresentValue: 1000000000,
    horizonYears: 5,
    category: 'custom',
    suggestedReturn: 8.0,
    inflationRate: 4.5,
    description: 'Arus kas kupon SBN & dividen saham untuk membiayai gaya hidup keluarga.',
  },
];

export const TvmFutureGoalsEngine: React.FC<TvmFutureGoalsEngineProps> = ({
  onSyncToSinkingFund,
  onNavigateTab,
}) => {
  const [goalTitle, setGoalTitle] = useState<string>(TVM_PRESETS[0].title);
  const [targetFutureValue, setTargetFutureValue] = useState<number>(3000000000);
  const [initialCapitalPv, setInitialCapitalPv] = useState<number>(100000000);
  const [expectedAnnualRate, setExpectedAnnualRate] = useState<number>(11.0);
  const [horizonYears, setHorizonYears] = useState<number>(15);
  const [category, setCategory] = useState<'retirement' | 'education' | 'property' | 'custom'>('retirement');
  const [inflationRate, setInflationRate] = useState<number>(5.0);

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Apply Preset
  const handleApplyPreset = (preset: GoalPreset) => {
    setGoalTitle(preset.title);
    setTargetFutureValue(preset.targetPresentValue);
    setHorizonYears(preset.horizonYears);
    setExpectedAnnualRate(preset.suggestedReturn);
    setInflationRate(preset.inflationRate);
    setCategory(preset.category);
    setSyncFeedback(null);
  };

  // TVM COMPUTATIONS
  const calculations = useMemo(() => {
    const years = Math.max(1, horizonYears);
    const nMonths = years * 12;
    const fv = Math.max(0, targetFutureValue);
    const pv = Math.max(0, initialCapitalPv);
    const rate = Math.max(0, expectedAnnualRate);

    // 1. Monthly PMT Required via standardized TVM formula
    const requiredMonthlyPmt = calculateTVM(fv, pv, rate, years);

    // 2. Future Value of Initial Capital alone
    const rMonthly = (rate / 100) / 12;
    const fvFromInitialCapital = pv * Math.pow(1 + rMonthly, nMonths);

    // 3. Total Out-of-Pocket Principal Disetor (Pokok)
    const totalMonthlyPrincipalPaid = requiredMonthlyPmt * nMonths;
    const totalPrincipalInvested = pv + totalMonthlyPrincipalPaid;

    // 4. Compound Interest Gain (Pertumbuhan Bunga Majemuk)
    const totalCompoundInterestGain = Math.max(0, fv - totalPrincipalInvested);
    const compoundGrowthRatio = fv > 0 ? Math.round((totalCompoundInterestGain / fv) * 100) : 0;

    // 5. Perbandingan: Tabungan Konvensional (0% bunga)
    // Di tabungan biasa 0% bunga, untuk mencapai target yang sama harus setor: (FV - PV) / nMonths
    const conventionalZeroRateMonthlySaving = Math.max(0, (fv - pv) / nMonths);
    const monthlySavingSavedDueToCompound = Math.max(0, conventionalZeroRateMonthlySaving - requiredMonthlyPmt);
    const totalCostSavedThroughInvestment = Math.max(0, (conventionalZeroRateMonthlySaving * nMonths) - totalMonthlyPrincipalPaid);

    // 6. Milestone Year by Year
    const milestones = [];
    let runningBalance = pv;
    for (let yr = 1; yr <= years; yr++) {
      for (let m = 1; m <= 12; m++) {
        runningBalance = runningBalance * (1 + rMonthly) + requiredMonthlyPmt;
      }
      milestones.push({
        year: yr,
        totalBalance: runningBalance,
        totalInvested: pv + requiredMonthlyPmt * yr * 12,
        gain: runningBalance - (pv + requiredMonthlyPmt * yr * 12),
      });
    }

    return {
      requiredMonthlyPmt,
      fvFromInitialCapital,
      totalPrincipalInvested,
      totalCompoundInterestGain,
      compoundGrowthRatio,
      conventionalZeroRateMonthlySaving,
      monthlySavingSavedDueToCompound,
      totalCostSavedThroughInvestment,
      nMonths,
      milestones,
    };
  }, [targetFutureValue, initialCapitalPv, expectedAnnualRate, horizonYears]);

  const handleSyncToSinkingFund = () => {
    if (onSyncToSinkingFund) {
      onSyncToSinkingFund({
        title: goalTitle.trim() || 'Target TVM Masa Depan',
        targetAmount: targetFutureValue,
        tenorMonths: Math.max(1, horizonYears * 12),
        category,
        notes: `TVM Simulation: Return ${expectedAnnualRate}% p.a. PMT: ${formatRupiah(calculations.requiredMonthlyPmt)}/bln (Hemat ${formatRupiah(calculations.totalCostSavedThroughInvestment)} vs tabungan 0%).`,
      });

      setSyncFeedback(`Target "${goalTitle}" berhasil disinkronkan ke Sinking Fund!`);
      
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#32A89C', '#10B981', '#0F1A24'],
      });

      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              VIP Tool Module #2
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Time Value of Money (TVM) Future Goals Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kalkulator TVM & Future Goals Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Hitung cicilan investasi bulanan (PMT) untuk mencapai target finansial jangka panjang dengan kekuatan bunga majemuk (Compound Interest) vs tabungan konvensional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#E5E0D8] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#32A89C]" />
            Compound Interest Multiplier
          </span>
        </div>
      </div>

      {/* Preset Goals Selector */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Pilih Template Tujuan Finansial:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TVM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`p-4 rounded-xl border text-left transition-all ${
                goalTitle === preset.title
                  ? 'bg-[#0F1A24] text-white border-[#0F1A24] shadow-sm'
                  : 'bg-white text-slate-800 border-[#E5E0D8] hover:border-[#D5CEBF] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${goalTitle === preset.title ? 'text-[#32A89C]' : 'text-slate-400'}`}>
                  {preset.category}
                </span>
                <span className="text-[10px] opacity-80">{preset.horizonYears} Thn</span>
              </div>
              <p className="text-xs font-bold leading-snug line-clamp-1">{preset.title}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 text-[11px]">
                <span className={goalTitle === preset.title ? 'text-white/80' : 'text-slate-500'}>
                  Target: {formatRupiah(preset.targetPresentValue, true)}
                </span>
                <span className={`font-bold ${goalTitle === preset.title ? 'text-[#32A89C]' : 'text-[#1D6E66]'}`}>
                  {preset.suggestedReturn}% p.a.
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Parameters (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#E5E0D8]">
            <Target className="w-4 h-4 text-[#32A89C]" />
            Parameter Kalkulasi Time Value of Money (TVM)
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Nama Rencana Impian
            </label>
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Contoh: Dana Pensiun Mandiri 55 Tahun"
              className="h-10 w-full rounded-xl px-3.5 bg-[#FAF8F5] border border-[#D5CEBF] focus:border-[#32A89C] text-sm font-bold text-slate-900 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Future Value (FV) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Target Dana Masa Depan (FV)
              </label>
              <CurrencyInput
                value={targetFutureValue}
                onChange={(val) => setTargetFutureValue(val)}
                prefix="Rp"
                className="h-10 w-full rounded-xl px-3.5 bg-[#FAF8F5] border border-[#D5CEBF] focus:border-[#32A89C] text-sm font-bold text-slate-900 outline-none tabular-nums"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Nominal: {formatRupiah(targetFutureValue)}
              </span>
            </div>

            {/* Modal Awal (PV) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Modal Awal Saat Ini (PV)
              </label>
              <CurrencyInput
                value={initialCapitalPv}
                onChange={(val) => setInitialCapitalPv(val)}
                prefix="Rp"
                className="h-10 w-full rounded-xl px-3.5 bg-[#FAF8F5] border border-[#D5CEBF] focus:border-[#32A89C] text-sm font-bold text-slate-900 outline-none tabular-nums"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Nominal: {formatRupiah(initialCapitalPv)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asumsi Return % */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Asumsi Return Portofolio
                </label>
                <span className="text-xs font-black text-[#1D6E66]">{expectedAnnualRate}% p.a.</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={expectedAnnualRate}
                onChange={(e) => setExpectedAnnualRate(Number(e.target.value))}
                className="w-full h-2 bg-[#E5E0D8] rounded-lg appearance-none cursor-pointer accent-[#32A89C]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (Cash)</span>
                <span>7.2% (M-Fund)</span>
                <span>12%+ (Saham/ETF)</span>
              </div>
            </div>

            {/* Horizon Waktu (Tahun) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Horizon Waktu
                </label>
                <span className="text-xs font-black text-slate-900">{horizonYears} Tahun ({horizonYears * 12} Bln)</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full h-2 bg-[#E5E0D8] rounded-lg appearance-none cursor-pointer accent-[#32A89C]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 Thn</span>
                <span>15 Thn</span>
                <span>30 Thn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Output PMT, Compound Interest Comparison & Action Hook (Span 6) */}
        <div className="lg:col-span-6 space-y-5">
          {/* PMT Output Hero Card */}
          <div className="bg-[#0F1A24] text-white rounded-2xl p-6 sm:p-7 border border-black/20 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#32A89C]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#32A89C]">
                Kebutuhan Cicilan Investasi Bulanan (PMT)
              </span>
              <span className="text-xs font-bold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                Return {expectedAnnualRate}% p.a.
              </span>
            </div>

            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                {formatRupiah(calculations.requiredMonthlyPmt)}
                <span className="text-sm font-normal text-white/60"> / bulan</span>
              </span>
              <span className="text-xs text-white/70 block mt-1">
                Selama {horizonYears} Tahun ({calculations.nMonths} bulan) untuk mencapai target {formatRupiah(targetFutureValue)}
              </span>
            </div>

            {/* Visualisasi: Pokok Disetor vs Compound Growth */}
            <div className="mt-5 pt-4 border-t border-white/15 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-white/80">Uang Pokok Keluar dari Kantong</span>
                <span className="text-[#32A89C] font-black">+{calculations.compoundGrowthRatio}% Cuan Majemuk</span>
              </div>
              
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-slate-300 h-full transition-all duration-500"
                  style={{ width: `${100 - calculations.compoundGrowthRatio}%` }}
                  title={`Uang Pokok: ${formatRupiah(calculations.totalPrincipalInvested)}`}
                />
                <div 
                  className="bg-[#32A89C] h-full transition-all duration-500"
                  style={{ width: `${calculations.compoundGrowthRatio}%` }}
                  title={`Pertumbuhan Bunga: ${formatRupiah(calculations.totalCompoundInterestGain)}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-white/60 block">Total Pokok Disetor:</span>
                  <span className="font-bold text-white tabular-nums">{formatRupiah(calculations.totalPrincipalInvested, true)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#32A89C] block">Bonus Bunga Majemuk:</span>
                  <span className="font-black text-[#32A89C] tabular-nums">+{formatRupiah(calculations.totalCompoundInterestGain, true)}</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTON: TERAPKAN KE SINKING FUND */}
            <div className="mt-5 pt-4 border-t border-white/15">
              <button
                onClick={handleSyncToSinkingFund}
                className="w-full h-11 px-4 rounded-xl bg-[#32A89C] hover:bg-[#25857B] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>🎯 Terapkan ke Target Sinking Fund</span>
              </button>

              {syncFeedback && (
                <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}
            </div>
          </div>

          {/* Perbandingan: Tabungan Biasa vs Investasi Portofolio */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Perbandingan: Tabungan Biasa (0%) vs Investasi Portofolio ({expectedAnnualRate}%)
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E0D8]">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tabungan 0% (Biasa)</span>
                <span className="text-base font-black text-slate-700 tabular-nums">
                  {formatRupiah(calculations.conventionalZeroRateMonthlySaving, true)}
                  <span className="text-[10px] font-normal text-slate-500">/bln</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Harus nabung lebih berat</span>
              </div>

              <div className="p-3 bg-[#E8F7F5] rounded-xl border border-[#32A89C]/30">
                <span className="text-[10px] font-bold text-[#1D6E66] uppercase block">Portofolio {expectedAnnualRate}%</span>
                <span className="text-base font-black text-[#1D6E66] tabular-nums">
                  {formatRupiah(calculations.requiredMonthlyPmt, true)}
                  <span className="text-[10px] font-normal text-slate-500">/bln</span>
                </span>
                <span className="text-[10px] font-bold text-[#1D6E66] block mt-1">
                  Hemat {formatRupiah(calculations.monthlySavingSavedDueToCompound, true)}/bln!
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E0D8] text-xs text-slate-600">
              💡 <strong>Total Efisiensi Finansial:</strong> Dengan menaruh dana di portofolio berimbal hasil {expectedAnnualRate}% p.a. dibanding tabungan biasa, Anda menghemat uang pokok sebesar <strong className="text-slate-900">{formatRupiah(calculations.totalCostSavedThroughInvestment)}</strong> selama {horizonYears} tahun!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
