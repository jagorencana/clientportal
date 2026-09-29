import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Coins, 
  BarChart3, 
  Sparkles, 
  Calendar, 
  RotateCcw, 
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { JagoPortfolioState, RiskProfilePreset, PortfolioInstrument } from '../types';
import { formatRupiah } from '../utils/calculations';
import { 
  calculatePortfolioSimulation, 
  getCleanInstruments,
  RISK_PROFILE_PRESETS
} from '../utils/portfolioCalculations';
import { CurrencyInput } from './common/CurrencyInput';

export interface JagoPortfolioProps {
  portfolio: JagoPortfolioState;
  surplusCashflow: number;
  auditInvestmentAssets: number;
  onUpdatePortfolio: (newPortfolio: JagoPortfolioState) => void;
  onNavigateToAdvisory?: () => void;
}

export const ASSET_CATEGORIES = [
  'Cash & Liquid',
  'Fixed Income',
  'Equity',
  'Commodity',
  'Kripto',
  'Properti',
  'Saham Global',
  'Kas & Deposito',
  'Pendapatan Tetap',
  'Ekuitas / Saham',
  'Komoditas',
];

export const getCategoryStyle = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('liquid') || cat.includes('kas') || cat.includes('deposito') || cat.includes('pasar uang') || cat.includes('cash')) {
    return {
      barBg: 'bg-slate-500',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      cardBg: 'bg-slate-50/60 border-slate-200',
      textAccent: 'text-slate-900',
      sliderAccent: 'accent-slate-700',
      dotBg: 'bg-slate-500',
    };
  }
  if (cat.includes('fixed') || cat.includes('sbn') || cat.includes('obligasi') || cat.includes('sukuk') || cat.includes('pendapatan tetap')) {
    return {
      barBg: 'bg-[#32A89C]',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      cardBg: 'bg-teal-50/40 border-teal-200',
      textAccent: 'text-[#1D6E66]',
      sliderAccent: 'accent-[#32A89C]',
      dotBg: 'bg-[#32A89C]',
    };
  }
  if (cat.includes('equity') || cat.includes('saham') || cat.includes('dividen') || cat.includes('ekuitas')) {
    return {
      barBg: 'bg-blue-600',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      cardBg: 'bg-blue-50/40 border-blue-200',
      textAccent: 'text-blue-900',
      sliderAccent: 'accent-blue-600',
      dotBg: 'bg-blue-600',
    };
  }
  if (cat.includes('alpha') || cat.includes('growth')) {
    return {
      barBg: 'bg-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      cardBg: 'bg-indigo-50/40 border-indigo-200',
      textAccent: 'text-indigo-900',
      sliderAccent: 'accent-indigo-600',
      dotBg: 'bg-indigo-600',
    };
  }
  if (cat.includes('komoditas') || cat.includes('commodity') || cat.includes('emas') || cat.includes('gold')) {
    return {
      barBg: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      cardBg: 'bg-amber-50/40 border-amber-200',
      textAccent: 'text-amber-900',
      sliderAccent: 'accent-amber-500',
      dotBg: 'bg-amber-500',
    };
  }
  if (cat.includes('kripto') || cat.includes('crypto') || cat.includes('btc')) {
    return {
      barBg: 'bg-violet-600',
      badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
      cardBg: 'bg-violet-50/40 border-violet-200',
      textAccent: 'text-violet-900',
      sliderAccent: 'accent-violet-600',
      dotBg: 'bg-violet-600',
    };
  }
  if (cat.includes('properti') || cat.includes('property') || cat.includes('reits') || cat.includes('sewa')) {
    return {
      barBg: 'bg-rose-600',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      cardBg: 'bg-rose-50/40 border-rose-200',
      textAccent: 'text-rose-900',
      sliderAccent: 'accent-rose-600',
      dotBg: 'bg-rose-600',
    };
  }
  return {
    barBg: 'bg-teal-600',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    cardBg: 'bg-teal-50/40 border-teal-200',
    textAccent: 'text-teal-900',
    sliderAccent: 'accent-teal-600',
    dotBg: 'bg-teal-600',
  };
};

export const JagoPortfolio: React.FC<JagoPortfolioProps> = ({
  portfolio,
  surplusCashflow,
  auditInvestmentAssets,
  onUpdatePortfolio,
  onNavigateToAdvisory,
}) => {
  const { lumpSumCapital, monthlyDCA, horizonYears, riskProfile } = portfolio;

  // Active instruments list with migration fallback
  const instruments = useMemo(() => {
    return getCleanInstruments(portfolio);
  }, [portfolio]);

  // Run real-time simulation
  const simulation = useMemo(() => {
    return calculatePortfolioSimulation(portfolio);
  }, [portfolio]);

  // State for Add Instrument Modal / Form
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Commodity');
  const [newWeight, setNewWeight] = useState<number>(0);
  const [newReturn, setNewReturn] = useState<number>(8.0);

  // Remaining unallocated weight
  const remainingWeight = Math.max(0, 100 - simulation.totalAllocationPct);

  // Fallback surplus amount (Rp 15.511.915 default from Master Budget)
  const effectiveSurplus = surplusCashflow > 0 ? surplusCashflow : 15511915;
  const auditAssetAmount = auditInvestmentAssets > 0 ? auditInvestmentAssets : 141500000;

  // Open modal pre-filling suggested weight
  const handleOpenAddAsset = () => {
    setNewName('');
    setNewCategory('Commodity');
    setNewWeight(remainingWeight > 0 ? remainingWeight : 5);
    setNewReturn(8.0);
    setIsAddingAsset(true);
  };

  // Handler for adding new asset
  const handleSaveNewAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newInst: PortfolioInstrument = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      weight: Number(newWeight) || 0,
      expectedReturn: Number(newReturn) || 0,
      cashYield: 0,
      isCustom: true,
    };

    const nextInstruments = [...instruments, newInst];
    onUpdatePortfolio({
      ...portfolio,
      riskProfile: 'custom',
      instruments: nextInstruments,
    });

    setIsAddingAsset(false);
  };

  // Handler for setting risk profile preset
  const handlePresetSelect = (preset: Exclude<RiskProfilePreset, 'custom'>) => {
    const config = RISK_PROFILE_PRESETS[preset];
    if (!config) return;
    onUpdatePortfolio({
      ...portfolio,
      riskProfile: preset,
      instruments: JSON.parse(JSON.stringify(config.instruments)),
    });
  };

  // Handler for modifying single instrument setting
  const handleUpdateInstrument = (
    id: string,
    field: keyof PortfolioInstrument,
    val: any
  ) => {
    const nextInstruments = instruments.map((inst) => {
      if (inst.id === id) {
        return {
          ...inst,
          [field]: val,
        };
      }
      return inst;
    });

    onUpdatePortfolio({
      ...portfolio,
      riskProfile: 'custom',
      instruments: nextInstruments,
    });
  };

  // Handler for deleting an instrument
  const handleDeleteInstrument = (id: string) => {
    if (instruments.length <= 1) {
      alert('Portofolio harus memiliki minimal satu instrumen aset.');
      return;
    }

    const nextInstruments = instruments.filter((inst) => inst.id !== id);
    onUpdatePortfolio({
      ...portfolio,
      riskProfile: 'custom',
      instruments: nextInstruments,
    });
  };

  // Auto-rebalance / Normalize to exactly 100%
  const handleNormalizeAllocations = () => {
    const currentSum = instruments.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    if (currentSum === 0) {
      handlePresetSelect('moderat');
      return;
    }

    const factor = 100 / currentSum;
    let allocatedSum = 0;

    const nextInstruments = instruments.map((inst, index) => {
      if (index === instruments.length - 1) {
        // Assign remainder to last element to guarantee exact 100%
        const finalWeight = Math.max(0, 100 - allocatedSum);
        return { ...inst, weight: finalWeight };
      }
      const proportional = Math.round((Number(inst.weight) || 0) * factor);
      allocatedSum += proportional;
      return { ...inst, weight: proportional };
    });

    onUpdatePortfolio({
      ...portfolio,
      instruments: nextInstruments,
    });
  };

  const syncDcaFromSurplus = () => {
    onUpdatePortfolio({
      ...portfolio,
      monthlyDCA: effectiveSurplus,
    });
  };

  const syncLumpSumFromAudit = () => {
    onUpdatePortfolio({
      ...portfolio,
      lumpSumCapital: auditAssetAmount,
    });
  };

  const principalRatio = simulation.totalFV > 0 ? (simulation.totalPrincipal / simulation.totalFV) * 100 : 100;
  const principalPct = Math.round(principalRatio);
  const growthPct = Math.max(0, 100 - principalPct);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 sm:pb-12 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Modul Wealth OS • Wealth Builder
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Institutional Portfolio Planning & Dynamic Allocation Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Portfolio Planning</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              Simulation Engine
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Rancang portofolio multi-aset secara personal dari modal mengendap dan kapasitas kas surplus bulanan. 
            Simulasikan bunga berbunga majemuk, kupon obligasi pasif, dividen tunai, emas, dan instrumen custom hingga 20 tahun ke depan.
          </p>
        </div>

        {/* Live Weighted Expected Return Card */}
        <div className="w-full md:w-auto bg-[#FAF8F5] p-4 rounded-xl border border-[#D5CEBF] flex md:flex-col items-center md:items-end justify-between gap-1 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            EXPECTED RETURN PORTOFOLIO
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
              {simulation.weightedReturnPct.toFixed(2)}%
            </span>
            <span className="text-xs font-bold text-slate-500">p.a.</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden md:block">
            Rata-rata return tertimbang live
          </span>
        </div>
      </div>

      {/* LINEAR STEPPING WORKFLOW (1 -> 2 -> 3) */}

      {/* ========================================================= */}
      {/* LANGKAH 1: MODAL POKOK & HORIZON WAKTU (INPUT KAPITAL)    */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        {/* Header Langkah 1 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#32A89C]/10 border border-[#32A89C]/30 text-[#1D6E66] flex items-center justify-center font-black text-sm">
              1
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Langkah 1: Modal Pokok & Horizon Waktu</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tentukan modal awal mengendap (lump-sum), komitmen DCA rutin bulanan, dan horizon waktu investasi
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
            <Coins className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Dual-Source Kapital</span>
          </div>
        </div>

        {/* 3-Column Horizontal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1: Modal Awal / Lump-Sum */}
          <div className="flex flex-col justify-between space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Modal Awal / Dana Mengendap (Lump-Sum)
                </label>
              </div>

              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                <span className="text-xs font-bold text-slate-400 select-none mr-1.5">Rp</span>
                <CurrencyInput
                  value={lumpSumCapital}
                  onChange={(val) => onUpdatePortfolio({ ...portfolio, lumpSumCapital: val })}
                  className="w-full text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                />
              </div>

              {/* Quick Sync from Audit */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={syncLumpSumFromAudit}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Ambil saldo dari audit aset investasi"
                >
                  <RotateCcw className="w-3 h-3 text-[#32A89C]" />
                  <span>Ambil dari Audit ({formatRupiah(auditAssetAmount)})</span>
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Cepat:</span>
                {[25000000, 50000000, 100000000, 250000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onUpdatePortfolio({ ...portfolio, lumpSumCapital: amt })}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    {amt >= 1000000000 ? `${amt / 1000000000}M` : `${amt / 1000000}Jt`}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              Modal pokok cair siap dialokasikan ke instrumen berimbal hasil.
            </p>
          </div>

          {/* Kolom 2: Investasi Rutin Bulanan / DCA */}
          <div className="flex flex-col justify-between space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <label className="text-xs font-bold text-slate-800">
                  Investasi Rutin Bulanan (DCA)
                </label>
              </div>

              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                <span className="text-xs font-bold text-slate-400 select-none mr-1.5">Rp</span>
                <CurrencyInput
                  value={monthlyDCA}
                  onChange={(val) => onUpdatePortfolio({ ...portfolio, monthlyDCA: val })}
                  className="w-full text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                />
              </div>

              {/* Quick Sync from Surplus */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={syncDcaFromSurplus}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Sinkronkan dengan sisa kas surplus bulanan Master Budget"
                >
                  <RotateCcw className="w-3 h-3 text-[#32A89C]" />
                  <span>Gunakan Surplus Budget ({formatRupiah(effectiveSurplus)})</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60">
                <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">Surplus kas bebas {formatRupiah(effectiveSurplus)}/bln</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              Dollar-cost averaging bulanan dari arus kas operasional bulanan.
            </p>
          </div>

          {/* Kolom 3: Horizon Waktu & Preset Cepat */}
          <div className="flex flex-col justify-between space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div>
              {/* Horizon Slider */}
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Horizon Waktu:</span>
                </label>
                <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 tabular-nums">
                  {horizonYears} Tahun ({horizonYears * 12} Bln)
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={horizonYears}
                onChange={(e) => onUpdatePortfolio({ ...portfolio, horizonYears: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#32A89C]"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1 px-1">
                <span>1 Thn</span>
                <span>5 Thn</span>
                <span>10 Thn</span>
                <span>15 Thn</span>
                <span>20 Thn</span>
              </div>

              {/* Preset Profil Risiko */}
              <div className="mt-3.5 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Preset Alokasi Cepat:
                  </label>
                  {riskProfile === 'custom' && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Mode Racikan
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['konservatif', 'moderat', 'agresif'] as const).map((presetKey) => {
                    const presetInfo = RISK_PROFILE_PRESETS[presetKey];
                    const isActive = riskProfile === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => handlePresetSelect(presetKey)}
                        className={`py-1.5 px-2 rounded-lg text-center border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#0F1A24] text-white border-[#0F1A24] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-[11px] font-bold capitalize truncate">
                          {presetKey === 'moderat' ? 'Moderat' : presetInfo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic truncate">
              {riskProfile === 'custom'
                ? 'Racikan personal aktif'
                : RISK_PROFILE_PRESETS[riskProfile]?.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LANGKAH 2: RACIKAN ALOKASI MULTI-ASET (KOMPAK & SLIM)     */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        {/* Header Langkah 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#32A89C]/10 border border-[#32A89C]/30 text-[#1D6E66] flex items-center justify-center font-black text-sm">
              2
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Langkah 2: Racikan Alokasi Portofolio Multi-Aset
              </h2>
              <p className="text-xs text-slate-500">
                Sesuaikan porsi bobot alokasi dan ekspektasi imbal hasil tahunan (% p.a.) secara kompak
              </p>
            </div>
          </div>

          {/* Action buttons & Allocation Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tombol + Tambah Aset */}
            <button
              type="button"
              onClick={handleOpenAddAsset}
              className="border border-[#32A89C] text-[#1D6E66] hover:bg-teal-50 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#32A89C]" />
              <span>+ Tambah Aset</span>
            </button>

            {/* Status Total Alokasi Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                simulation.isAllocationValid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {simulation.isAllocationValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Total Alokasi: 100% (Sempurna)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    Total: {simulation.totalAllocationPct}% ({simulation.totalAllocationPct > 100 ? `+${(simulation.totalAllocationPct - 100).toFixed(1)}%` : `-${(100 - simulation.totalAllocationPct).toFixed(1)}%`})
                  </span>
                </>
              )}
            </div>

            {!simulation.isAllocationValid && (
              <button
                type="button"
                onClick={handleNormalizeAllocations}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs"
                title="Sesuaikan seluruh bobot secara proporsional agar genap 100%"
              >
                Normalisasikan ke 100%
              </button>
            )}
          </div>
        </div>

        {/* Multi-Color Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3.5 rounded-lg overflow-hidden flex bg-slate-100 border border-slate-200 shadow-inner">
            {instruments.map((inst) => {
              const style = getCategoryStyle(inst.category);
              const w = Math.max(0, Number(inst.weight) || 0);
              if (w === 0) return null;
              return (
                <div
                  key={inst.id}
                  className={`${style.barBg} h-full transition-all duration-300`}
                  style={{ width: `${w}%` }}
                  title={`${inst.name}: ${w}%`}
                />
              );
            })}
          </div>

          {/* Quick Legend Under the Bar */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            {instruments.map((inst) => {
              const style = getCategoryStyle(inst.category);
              return (
                <div key={inst.id} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${style.barBg}`} />
                  <span className="font-medium text-slate-700">{inst.name}</span>
                  <span className="font-bold text-slate-900">({inst.weight}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Banner if total != 100% */}
        {!simulation.isAllocationValid && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Total alokasi saat ini <strong>{simulation.totalAllocationPct}%</strong> (
                {simulation.totalAllocationPct > 100
                  ? `Kelebihan +${(simulation.totalAllocationPct - 100).toFixed(1)}%`
                  : `Kurang -${(100 - simulation.totalAllocationPct).toFixed(1)}%`}
                ). Klik tombol untuk menormalkan bobot ke 100%.
              </span>
            </div>
            <button
              type="button"
              onClick={handleNormalizeAllocations}
              className="font-bold underline text-amber-950 hover:text-black shrink-0 cursor-pointer text-xs"
            >
              Ratakan Sekarang →
            </button>
          </div>
        )}

        {/* Inline Card: Tambah Aset Baru */}
        {isAddingAsset && (
          <form
            onSubmit={handleSaveNewAsset}
            className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-teal-50/80 to-emerald-50/50 border border-teal-300 shadow-sm animate-in fade-in duration-200 space-y-3"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-teal-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#32A89C] text-white flex items-center justify-center font-bold text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-bold text-teal-950">
                  Tambah Instrumen / Aset Baru
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingAsset(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Nama Aset / Instrumen:</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: Saham Global, Kripto BTC, SBN FR"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-teal-300 font-sans font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Kategori Aset:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-white border border-teal-300 font-sans font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Porsi Bobot (%):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-teal-300 font-sans font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="font-bold text-slate-500 text-xs">%</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Expected Return (% p.a.):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="-20"
                    max="100"
                    value={newReturn}
                    onChange={(e) => setNewReturn(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-teal-300 font-sans font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="font-bold text-slate-500 text-xs">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-200">
              <button
                type="button"
                onClick={() => setIsAddingAsset(false)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#32A89C] hover:bg-[#25857B] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Simpan Aset
              </button>
            </div>
          </form>
        )}

        {/* SATU TABEL BARIS INTERAKTIF (COMPACT INTERACTIVE TABLE) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3.5 min-w-[200px]">Aset & Instrumen</th>
                <th className="py-3 px-3 min-w-[130px]">Kategori</th>
                <th className="py-3 px-4 min-w-[250px]">Porsi Bobot % (Slider + Input)</th>
                <th className="py-3 px-3 min-w-[130px] text-right">Expected Return %</th>
                <th className="py-3 px-3 min-w-[130px] text-right">Kontribusi Return</th>
                <th className="py-3 px-3 w-[50px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {instruments.map((inst, index) => {
                const style = getCategoryStyle(inst.category);
                const isDeletable = inst.isCustom || instruments.length > 1;
                const contributionPct = ((Number(inst.weight) || 0) * (Number(inst.expectedReturn) || 0)) / 100;

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Aset & Instrumen */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${style.barBg} shrink-0`} />
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {index + 1}. {inst.name}
                          </span>
                          {inst.isCustom && (
                            <span className="text-[10px] text-amber-700 font-semibold">Custom Asset</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style.badgeBg} inline-block whitespace-nowrap`}>
                        {inst.category}
                      </span>
                    </td>

                    {/* Porsi Bobot % (Slider + Input) */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={inst.weight}
                          onChange={(e) => handleUpdateInstrument(inst.id, 'weight', Number(e.target.value))}
                          className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${style.sliderAccent}`}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={inst.weight}
                            onChange={(e) => handleUpdateInstrument(inst.id, 'weight', Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="w-13 h-7 text-right font-sans font-bold text-xs bg-white px-1.5 rounded-md border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                          />
                          <span className="font-bold text-slate-600 text-xs">%</span>
                        </div>
                      </div>
                    </td>

                    {/* Expected Return % */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="80"
                          value={inst.expectedReturn}
                          onChange={(e) => handleUpdateInstrument(inst.id, 'expectedReturn', parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 px-1.5 text-right font-sans font-bold text-xs rounded-md bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </td>

                    {/* Kontribusi Return */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-extrabold text-[#1D6E66] tabular-nums">
                        {contributionPct >= 0 ? `+${contributionPct.toFixed(2)}%` : `${contributionPct.toFixed(2)}%`}
                      </span>
                      <span className="block text-[9px] text-slate-400 tabular-nums">
                        ({inst.weight}% × {inst.expectedReturn}%)
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-2.5 px-3 text-center">
                      {isDeletable ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteInstrument(inst.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus instrumen ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ringkasan Bawah Tabel */}
        <div className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-xl border border-[#D5CEBF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="w-4 h-4 text-[#32A89C] shrink-0" />
            <span>
              <strong>Formula Return:</strong> Total return tertimbang diperoleh dari penjumlahan kontribusi masing-masing instrumen: <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-200">Σ (Bobot % × Expected Return %)</code>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Return Tertimbang:</span>
            <span className="text-sm font-black text-emerald-700 tabular-nums">
              {simulation.weightedReturnPct.toFixed(2)}% p.a.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LANGKAH 3: HASIL PROYEKSI NILAI MASA DEPAN (OUTPUT)      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        {/* Header Langkah 3 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 flex items-center justify-center font-black text-sm">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Langkah 3: Hasil Proyeksi Nilai Masa Depan (Future Value Simulation)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Kompounding bulanan: Lump-Sum {formatRupiah(lumpSumCapital)} + Akumulasi DCA {formatRupiah(monthlyDCA)}/bln ({horizonYears} Tahun)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Compound Growth</span>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Estimasi FV */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                1. Estimasi Akumulasi Aset (Tahun ke-{horizonYears})
              </span>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 break-words mt-1.5 tabular-nums">
                {formatRupiah(simulation.totalFV)}
              </div>
            </div>
            <span className="text-[11px] text-slate-500 block border-t border-slate-200/80 pt-1.5">
              Nilai total portofolio di akhir tenor {horizonYears} tahun
            </span>
          </div>

          {/* Card 2: Pertumbuhan Modal Bersih */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                2. Pertumbuhan Modal Bersih (Net Capital Gain)
              </span>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-700 break-words mt-1.5 tabular-nums">
                +{formatRupiah(simulation.netGrowth)}
              </div>
            </div>
            <div className="text-[11px] text-slate-600 border-t border-emerald-200/60 pt-1.5">
              Dari modal pokok disetor <strong className="font-semibold text-slate-800">{formatRupiah(simulation.totalPrincipal)}</strong>
            </div>
          </div>

          {/* Card 3: Estimasi Passive Income */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                3. Estimasi Passive Income / Dividen Tahunan
              </span>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-amber-900 break-words mt-1.5 tabular-nums">
                {formatRupiah(simulation.annualPassiveIncome)}
                <span className="text-xs font-semibold text-slate-500 ml-1">/thn</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-600 border-t border-amber-200/60 pt-1.5">
              Setara ~<strong className="font-semibold text-slate-800">{formatRupiah(simulation.monthlyPassiveIncome)}/bulan</strong>
            </span>
          </div>
        </div>

        {/* Visual Comparison: Modal Pokok vs Efek Bunga Berbunga (Compound Growth) */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FAF8F5] border border-[#D5CEBF] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
            <span className="font-bold text-slate-800">
              Grafik Komparasi: Modal Pokok Disetor vs Efek Bunga Berbunga (Compound Growth)
            </span>
            <span className="text-[11px] font-bold text-slate-600">
              Total Nilai: {formatRupiah(simulation.totalFV)}
            </span>
          </div>

          {/* Stacked Bar */}
          {simulation.totalFV > 0 && (
            <div className="w-full h-5 rounded-lg overflow-hidden flex bg-slate-200 border border-slate-300 shadow-inner">
              <div
                className="bg-slate-700 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300 px-1"
                style={{
                  width: `${Math.min(100, Math.max(0, principalRatio))}%`,
                }}
                title={`Modal Pokok Disetor: ${formatRupiah(simulation.totalPrincipal)}`}
              >
                {principalPct}%
              </div>
              <div
                className="bg-[#32A89C] h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300 px-1"
                style={{
                  width: `${Math.max(0, 100 - principalRatio)}%`,
                }}
                title={`Hasil Bunga Majemuk: ${formatRupiah(simulation.netGrowth)}`}
              >
                {growthPct}%
              </div>
            </div>
          )}

          {/* Legend Below Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-600 pt-1 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-700 inline-block shrink-0" />
              <span>Modal Pokok Disetor: <strong className="text-slate-800 font-semibold">{formatRupiah(simulation.totalPrincipal)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-[#32A89C] inline-block shrink-0" />
              <span>Hasil Bunga Majemuk (Net Gain): <strong className="text-emerald-700 font-semibold">+{formatRupiah(simulation.netGrowth)}</strong></span>
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Asset Forecast at Year N */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Distribusi Nominal Akumulasi per Instrumen di Akhir Masa Horizon ({horizonYears} Tahun):
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {simulation.instrumentBreakdowns.map((inst) => {
              const style = getCategoryStyle(inst.category);
              return (
                <div key={inst.id} className={`p-3 rounded-xl border ${style.cardBg} flex flex-col justify-between space-y-2`}>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold uppercase truncate max-w-[120px] block text-slate-800" title={inst.name}>
                        {inst.name}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-800 shrink-0">
                        {inst.weight}%
                      </span>
                    </div>
                    <span className={`font-black text-sm block mt-1.5 ${style.textAccent} tabular-nums`}>
                      {formatRupiah(inst.allocatedValue)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                    {inst.annualCashYield > 0 ? (
                      <span className="text-emerald-800 font-medium">
                        Kupon/Div: ~{formatRupiah(inst.monthlyCashYield)}/bln
                      </span>
                    ) : (
                      <span className="text-slate-400">Capital gain akumulatif</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Banner Penutup: Konsultasikan Racikan Portofolio dengan Advisor */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#0F1A24] to-[#1E293B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Konsultasikan Racikan Portofolio dengan Advisor</span>
            </p>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Validasi kembali racikan alokasi aset multi-instrumen ini bersama perencana keuangan bersertifikasi Jago Rencana untuk memastikan toleransi risiko, likuiditas darurat, dan horizon tujuan keluarga Anda selaras.
            </p>
          </div>
          {onNavigateToAdvisory ? (
            <button
              type="button"
              onClick={onNavigateToAdvisory}
              className="px-4 py-2.5 rounded-xl bg-[#32A89C] hover:bg-[#25857B] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <span>Konsultasikan di Sesi 1-on-1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href="https://wa.me/6281806988868"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#32A89C] hover:bg-[#25857B] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <span>Konsultasikan via WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const PortfolioPlanningView = JagoPortfolio;
export const PortfolioPlanning = JagoPortfolio;
export default JagoPortfolio;
