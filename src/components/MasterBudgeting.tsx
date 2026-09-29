import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  HelpCircle, 
  TrendingUp, 
  PieChart, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ShoppingBag, 
  Home, 
  Target, 
  Coffee,
  RotateCcw
} from 'lucide-react';
import { BudgetState, BudgetBucketItem, SinkingFundGoal } from '../types';
import { formatRupiah, calculateTotals } from '../utils/calculations';
import { CurrencyInput } from './common/CurrencyInput';
import { usePortal } from '../context/PortalContext';

interface MasterBudgetingProps {
  budget?: BudgetState;
  goals?: SinkingFundGoal[];
  onUpdateBudget?: (newBudget: BudgetState) => void;
  onNavigateToGoals: () => void;
  onNavigateToPortfolio?: () => void;
}

export const MasterBudgeting: React.FC<MasterBudgetingProps> = ({
  budget: propBudget,
  goals: propGoals,
  onUpdateBudget: propOnUpdateBudget,
  onNavigateToGoals,
  onNavigateToPortfolio,
}) => {
  const { portalData, masterBudget, sinkingFunds, updateMasterBudget, triggerManualSave } = usePortal();

  // Robust Defensive Props
  const budget: BudgetState = propBudget || masterBudget || {
    monthlyNetIncome: 0,
    livingExpenses: [],
    debtObligations: [],
    lifestyleExpenses: [],
  };
  const goals: SinkingFundGoal[] = Array.isArray(propGoals) ? propGoals : (Array.isArray(sinkingFunds) ? sinkingFunds : []);
  const onUpdateBudget = propOnUpdateBudget || updateMasterBudget;

  // Defensive Optional Chaining and Fallback Default for Period & Status
  const currentPeriod = portalData?.budgetCycle?.currentPeriod || portalData?.currentPeriod || budget?.budgetCycle?.currentPeriod || budget?.currentPeriod || '2026-09';
  const budgetStatus = portalData?.budgetStatusPerPeriod?.[currentPeriod] || portalData?.budgetCycle?.status || budget?.budgetCycle?.status || 'DRAFT';

  const totals = calculateTotals(budget, goals);
  const persenPos1 = totals.livingPct;
  const persenPos2 = totals.debtPct;
  const persenPos3 = totals.sinkingPct;
  const persenPos4 = totals.lifestylePct;
  const totalPos = persenPos1 + persenPos2 + persenPos3 + persenPos4;
  const isDeficit = totalPos > 100 || totals.isDeficit;
  const sisaPersen = isDeficit || budget.monthlyNetIncome <= 0
    ? 0
    : Math.max(0, 100 - totalPos);
  const nominalDefisit = totals.isDeficit 
    ? totals.deficitAmount 
    : (budget.monthlyNetIncome > 0 ? Math.round(((totalPos - 100) / 100) * budget.monthlyNetIncome) : 0);
  const surplusKasBebas = Math.max(0, totals.netSurplusOrDeficit);

  // Normalization for visual rendering so segments seamlessly fill 100% of the bar track
  const scale = totalPos > 100 ? (100 / totalPos) : 1;
  const widthPos1 = persenPos1 * scale;
  const widthPos2 = persenPos2 * scale;
  const widthPos3 = persenPos3 * scale;
  const widthPos4 = persenPos4 * scale;

  // Quick state for adding items to buckets
  const [addingToBucket, setAddingToBucket] = useState<'living' | 'debt' | 'lifestyle' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number>(0);

  const handleIncomeChange = (val: number) => {
    onUpdateBudget({
      ...budget,
      monthlyNetIncome: val,
    });
    triggerManualSave();
  };

  const handleAddItem = (bucket: 'living' | 'debt' | 'lifestyle') => {
    if (!newItemName.trim() || !newItemAmount) return;
    const newItem: BudgetBucketItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      amount: newItemAmount,
      isEssential: bucket !== 'lifestyle',
    };

    const curLiving = budget.livingExpenses || [];
    const curDebt = budget.debtObligations || [];
    const curLifestyle = budget.lifestyleExpenses || [];

    if (bucket === 'living') {
      onUpdateBudget({ ...budget, livingExpenses: [...curLiving, newItem] });
    } else if (bucket === 'debt') {
      onUpdateBudget({ ...budget, debtObligations: [...curDebt, newItem] });
    } else {
      onUpdateBudget({ ...budget, lifestyleExpenses: [...curLifestyle, newItem] });
    }

    setNewItemName('');
    setNewItemAmount(0);
    setAddingToBucket(null);
    triggerManualSave();
  };

  const handleDeleteItem = (bucket: 'living' | 'debt' | 'lifestyle', id: string) => {
    const curLiving = budget.livingExpenses || [];
    const curDebt = budget.debtObligations || [];
    const curLifestyle = budget.lifestyleExpenses || [];

    if (bucket === 'living') {
      onUpdateBudget({ ...budget, livingExpenses: curLiving.filter(i => i.id !== id) });
    } else if (bucket === 'debt') {
      onUpdateBudget({ ...budget, debtObligations: curDebt.filter(i => i.id !== id) });
    } else {
      onUpdateBudget({ ...budget, lifestyleExpenses: curLifestyle.filter(i => i.id !== id) });
    }
    triggerManualSave();
  };

  const handleItemNameChange = (bucket: 'living' | 'debt' | 'lifestyle', id: string, name: string) => {
    const curLiving = budget.livingExpenses || [];
    const curDebt = budget.debtObligations || [];
    const curLifestyle = budget.lifestyleExpenses || [];

    if (bucket === 'living') {
      onUpdateBudget({
        ...budget,
        livingExpenses: curLiving.map(i => i.id === id ? { ...i, name } : i),
      });
    } else if (bucket === 'debt') {
      onUpdateBudget({
        ...budget,
        debtObligations: curDebt.map(i => i.id === id ? { ...i, name } : i),
      });
    } else {
      onUpdateBudget({
        ...budget,
        lifestyleExpenses: curLifestyle.map(i => i.id === id ? { ...i, name } : i),
      });
    }
  };

  const handleItemAmountChange = (bucket: 'living' | 'debt' | 'lifestyle', id: string, amount: number) => {
    const curLiving = budget.livingExpenses || [];
    const curDebt = budget.debtObligations || [];
    const curLifestyle = budget.lifestyleExpenses || [];

    if (bucket === 'living') {
      onUpdateBudget({
        ...budget,
        livingExpenses: curLiving.map(i => i.id === id ? { ...i, amount } : i),
      });
    } else if (bucket === 'debt') {
      onUpdateBudget({
        ...budget,
        debtObligations: curDebt.map(i => i.id === id ? { ...i, amount } : i),
      });
    } else {
      onUpdateBudget({
        ...budget,
        lifestyleExpenses: curLifestyle.map(i => i.id === id ? { ...i, amount } : i),
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header & Framework Introduction */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Modul 1 • Cashflow Allocator
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Modern 4-Bucket Framework
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Periode: {currentPeriod} ({budgetStatus})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Master Budgeting & Alokasi Kas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Struktur 4 Pos Finansial terisolasi untuk memastikan kebutuhan pokok terpenuhi, beban cicilan aman, target impian otomatis terdanai, dan gaya hidup tetap terkendali tanpa rasa bersalah (guilt-free).
          </p>
        </div>

        {/* Monthly Income Input Box */}
        <div className="w-full md:w-80 bg-[#FAF8F5] p-4 rounded-xl border border-[#D5CEBF]">
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Pemasukan Bersih Bulanan (Take Home Pay)
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
            <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
            <CurrencyInput
              value={budget.monthlyNetIncome || 0}
              onChange={handleIncomeChange}
              placeholder="5.000.000"
              className="w-full text-right font-sans font-bold text-slate-900 text-base tracking-tight bg-transparent outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Gaji pokok + tunjangan tetap bersih setelah pajak & BPJS.
          </p>
        </div>
      </div>

      {/* Visual Allocation Breakdown & Benchmark Comparison Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Perbandingan Alokasi Riil vs Rekomendasi Institusional
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi distribusi persentase terhadap total pemasukan bulanan Anda.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isDeficit 
                ? 'bg-rose-100 text-rose-700 border border-rose-300' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}>
              {isDeficit 
                ? `Defisit Kas: -${formatRupiah(nominalDefisit)}` 
                : `Surplus Kas Bebas: +${formatRupiah(surplusKasBebas)} (${sisaPersen.toFixed(1)}%)`}
            </span>
          </div>
        </div>

        {/* Stacked Percentage Visualizer */}
        <div className="space-y-3">
          {/* Bar Container with glowing red border & striped indicator when totalPos > 100 */}
          <div 
            className={`w-full rounded-2xl p-1.5 transition-all duration-300 ${
              totalPos > 100 
                ? 'border-2 border-[#E11D48] shadow-[0_0_20px_rgba(225,29,72,0.4)] ring-2 ring-[#E11D48]/30 bg-rose-50/40' 
                : 'border border-[#E5E0D8] bg-[#F4F0E8]'
            }`}
          >
            {/* Over-capacity Visual Indicator when totalPos > 100 */}
            {totalPos > 100 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 mb-1.5 rounded-xl bg-rose-100/90 border border-rose-300 text-xs font-bold text-rose-900 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse shrink-0" />
                  <span>Kapasitas Terlampaui: Total Alokasi {totalPos.toFixed(1)}% (Batas Aman: 100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-rose-700">Indikator Over-Capacity:</span>
                  <div 
                    className="h-4 w-24 rounded-md bg-[repeating-linear-gradient(45deg,#E11D48,#E11D48_6px,#9F1239_6px,#9F1239_12px)] shadow-inner border border-rose-400"
                    title={`Over-Capacity: +${(totalPos - 100).toFixed(1)}%`}
                  />
                  <span className="font-mono text-[11px] font-black text-rose-800 bg-white/80 px-2 py-0.5 rounded border border-rose-300">
                    +{(totalPos - 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* 100% Horizontal Allocation Bar */}
            <div className="w-full h-8 sm:h-9 rounded-xl flex overflow-hidden gap-0.5 bg-white/70">
              {/* Pos 1: Kebutuhan Pokok - Maroon / Rose Coral (#E11D48) */}
              {persenPos1 > 0 && (
                <div 
                  className="bg-[#E11D48] h-full rounded-lg transition-all duration-500 relative group flex items-center justify-center text-[10px] sm:text-xs font-black text-white select-none shrink-0"
                  style={{ width: `${widthPos1}%` }}
                  title={`Pos 1: Kebutuhan Pokok (${persenPos1.toFixed(1)}%)`}
                >
                  {widthPos1 >= 10 && (
                    <span className="truncate px-1">
                      {persenPos1.toFixed(0)}% Pokok
                    </span>
                  )}
                </div>
              )}

              {/* Pos 2: Kewajiban Utang - Dark Slate / Charcoal (#1E293B) */}
              {persenPos2 > 0 && (
                <div 
                  className="bg-[#1E293B] h-full rounded-lg transition-all duration-500 relative group flex items-center justify-center text-[10px] sm:text-xs font-black text-white select-none shrink-0"
                  style={{ width: `${widthPos2}%` }}
                  title={`Pos 2: Kewajiban Utang (${persenPos2.toFixed(1)}%)`}
                >
                  {widthPos2 >= 10 && (
                    <span className="truncate px-1">
                      {persenPos2.toFixed(0)}% Utang
                    </span>
                  )}
                </div>
              )}

              {/* Pos 3: Sinking Funds - Amber / Emas (#D97706) */}
              {persenPos3 > 0 && (
                <div 
                  className="bg-[#D97706] h-full rounded-lg transition-all duration-500 relative group flex items-center justify-center text-[10px] sm:text-xs font-black text-white select-none shrink-0"
                  style={{ width: `${widthPos3}%` }}
                  title={`Pos 3: Sinking Funds (${persenPos3.toFixed(1)}%)`}
                >
                  {widthPos3 >= 10 && (
                    <span className="truncate px-1">
                      {persenPos3.toFixed(0)}% Goals
                    </span>
                  )}
                </div>
              )}

              {/* Pos 4: Lifestyle - Soft Indigo / Purple (#6366F1) */}
              {persenPos4 > 0 && (
                <div 
                  className="bg-[#6366F1] h-full rounded-lg transition-all duration-500 relative group flex items-center justify-center text-[10px] sm:text-xs font-black text-white select-none shrink-0"
                  style={{ width: `${widthPos4}%` }}
                  title={`Pos 4: Guilt-Free Lifestyle (${persenPos4.toFixed(1)}%)`}
                >
                  {widthPos4 >= 10 && (
                    <span className="truncate px-1">
                      {persenPos4.toFixed(0)}% Lifestyle
                    </span>
                  )}
                </div>
              )}

              {/* Pos Surplus: Hijau Emerald (#10B981) - hanya tampil jika sisaPersen > 0 */}
              {sisaPersen > 0 && (
                <div 
                  className="bg-[#10B981] h-full rounded-lg transition-all duration-500 relative group flex items-center justify-center text-[10px] sm:text-xs font-black text-white select-none shrink-0 shadow-sm"
                  style={{ width: `${sisaPersen}%` }}
                  title={`Surplus Kas Bebas (Siap Diinvestasikan): ${sisaPersen.toFixed(1)}%`}
                >
                  {sisaPersen >= 14 ? (
                    <span className="truncate px-1">
                      {sisaPersen.toFixed(1)}% Surplus / Investasi
                    </span>
                  ) : sisaPersen >= 7 ? (
                    <span className="truncate px-1">
                      {sisaPersen.toFixed(0)}% Surplus
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E11D48] shrink-0" />
              <span className="text-slate-700 font-medium">Pos 1: Pokok ({persenPos1.toFixed(1)}% | Rekom: 40-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1E293B] shrink-0" />
              <span className="text-slate-700 font-medium">Pos 2: Utang ({persenPos2.toFixed(1)}% | Rekom: &lt;30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D97706] shrink-0" />
              <span className="text-slate-700 font-medium">Pos 3: Sinking Funds ({persenPos3.toFixed(1)}% | Rekom: 15-25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#6366F1] shrink-0" />
              <span className="text-slate-700 font-medium">Pos 4: Lifestyle ({persenPos4.toFixed(1)}% | Rekom: 10-15%)</span>
            </div>
            {sisaPersen > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10B981] shrink-0" />
                <span className="text-emerald-700 font-bold">Surplus Kas Bebas (Siap Diinvestasikan)</span>
              </div>
            )}
          </div>

          {/* Alert Banner Merah (Defisit) */}
          {totalPos > 100 && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-500 shadow-[0_4px_16px_rgba(225,29,72,0.15)] flex items-start gap-3 text-rose-950 animate-in fade-in slide-in-from-top-1 duration-300">
              <span className="text-xl shrink-0 mt-0.5">⚠️</span>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  ⚠️ STATUS DEFISIT: Total alokasi anggaran melampaui 100% pemasukan bulanan (Defisit: {formatRupiah(nominalDefisit)}). Segera rasionalisasi pos pengeluaran lifestyle atau turunkan alokasi sinking fund.
                </p>
                <p className="text-[11px] text-rose-700">
                  Total alokasi anggaran saat ini mencapai <span className="font-extrabold">{totalPos.toFixed(1)}%</span> dari pemasukan bulanan. Pengeluaran dan komitmen tabungan Anda melebihi kapasitas kas riil sebesar <span className="font-extrabold">{formatRupiah(nominalDefisit)}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Alert Card Emerald: Kapasitas Investasi Terbuka (Hanya tampil jika tidak defisit dan ada surplus) */}
          {!isDeficit && surplusKasBebas > 0 && (
            <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="text-base sm:text-lg shrink-0">💡</span>
                <p className="text-xs sm:text-sm text-emerald-900 leading-snug">
                  <span className="font-bold">Kapasitas Investasi Terbuka:</span> Tersedia ruang kas bebas <span className="font-extrabold text-emerald-950">{formatRupiah(surplusKasBebas)}</span>/bulan ({sisaPersen.toFixed(1)}%) untuk diinvestasikan secara terukur.
                </p>
              </div>
              {onNavigateToPortfolio && (
                <button
                  type="button"
                  onClick={onNavigateToPortfolio}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <span>Rancang di Portfolio Planning</span>
                  <span className="text-sm">→</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The 4 Bucket Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* BUCKET 1: Kebutuhan Pokok (Living Expenses) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] flex items-center justify-center">
                  <Home className="w-4 h-4 text-[#E11D48]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Pos 1: Kebutuhan Pokok (Living)
                  </h3>
                  <p className="text-[11px] text-slate-500">Makan dapur, utilitas, transportasi, SPP & asuransi</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums block">
                  {formatRupiah(totals.totalLiving)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {totals.livingPct.toFixed(1)}% dari gaji
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-[#E5E0D8] my-3">
              {(budget.livingExpenses || []).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemNameChange('living', item.id, e.target.value)}
                    onBlur={() => {
                      if (!item.name.trim()) {
                        handleItemNameChange('living', item.id, 'Pos Pengeluaran');
                      }
                      triggerManualSave();
                    }}
                    placeholder="Nama Pengeluaran"
                    className="text-slate-800 font-semibold text-sm flex-1 min-w-0 px-2 py-1 -ml-1 rounded border border-transparent hover:border-slate-300 focus:border-[#32A89C] focus:bg-white bg-transparent outline-none transition-all truncate focus:truncate-none"
                    title="Klik untuk langsung mengedit nama pos"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                      <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                      <CurrencyInput
                        value={item.amount || 0}
                        onChange={(val) => handleItemAmountChange('living', item.id, val)}
                        onBlur={triggerManualSave}
                        className="w-28 text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteItem('living', item.id);
                        triggerManualSave();
                      }}
                      className="text-slate-400 hover:text-[#E11D48] transition-colors p-1 cursor-pointer"
                      title="Hapus pos pengeluaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item inline */}
            {addingToBucket === 'living' ? (
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-slate-200 space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Nama Pengeluaran (cth: Wifi Rumah)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-sm outline-none focus:border-[#32A89C]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                    <CurrencyInput
                      value={newItemAmount}
                      onChange={(val) => setNewItemAmount(val)}
                      placeholder="500.000"
                      className="w-full text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleAddItem('living')}
                    className="h-8 px-3 rounded-lg bg-[#0F1A24] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setAddingToBucket(null)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingToBucket('living');
                  setNewItemName('');
                  setNewItemAmount(0);
                }}
                className="w-full py-2 rounded-xl border border-dashed border-[#D5CEBF] hover:border-[#32A89C] text-xs font-bold text-slate-600 hover:text-[#32A89C] flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pos Pokok
              </button>
            )}
          </div>
        </div>

        {/* BUCKET 2: Kewajiban & Utang (Debt Obligations) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] text-slate-900 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Pos 2: Kewajiban & Utang (DSR)
                  </h3>
                  <p className="text-[11px] text-slate-500">Cicilan KPR, kredit kendaraan, KTA & kartu kredit</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums block">
                  {formatRupiah(totals.totalDebt)}
                </span>
                <span className={`text-[10px] font-bold ${totals.debtPct <= 30 ? 'text-[#1D6E66]' : 'text-[#E11D48]'}`}>
                  {totals.debtPct.toFixed(1)}% (Batas Aman &lt;30%)
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-[#E5E0D8] my-3">
              {(budget.debtObligations || []).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemNameChange('debt', item.id, e.target.value)}
                    onBlur={() => {
                      if (!item.name.trim()) {
                        handleItemNameChange('debt', item.id, 'Pos Kewajiban');
                      }
                      triggerManualSave();
                    }}
                    placeholder="Nama Kewajiban"
                    className="text-slate-800 font-semibold text-sm flex-1 min-w-0 px-2 py-1 -ml-1 rounded border border-transparent hover:border-slate-300 focus:border-[#32A89C] focus:bg-white bg-transparent outline-none transition-all truncate focus:truncate-none"
                    title="Klik untuk langsung mengedit nama pos"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                      <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                      <CurrencyInput
                        value={item.amount || 0}
                        onChange={(val) => handleItemAmountChange('debt', item.id, val)}
                        onBlur={triggerManualSave}
                        className="w-28 text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteItem('debt', item.id);
                        triggerManualSave();
                      }}
                      className="text-slate-400 hover:text-[#E11D48] transition-colors p-1 cursor-pointer"
                      title="Hapus pos cicilan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item inline */}
            {addingToBucket === 'debt' ? (
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-slate-200 space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Nama Cicilan (cth: KPR Rumah)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-sm outline-none focus:border-[#32A89C]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                    <CurrencyInput
                      value={newItemAmount}
                      onChange={(val) => setNewItemAmount(val)}
                      placeholder="5.000.000"
                      className="w-full text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleAddItem('debt')}
                    className="h-8 px-3 rounded-lg bg-[#0F1A24] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setAddingToBucket(null)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingToBucket('debt');
                  setNewItemName('');
                  setNewItemAmount(0);
                }}
                className="w-full py-2 rounded-xl border border-dashed border-[#D5CEBF] hover:border-[#32A89C] text-xs font-bold text-slate-600 hover:text-[#32A89C] flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pos Kewajiban / Utang
              </button>
            )}
          </div>
        </div>

        {/* BUCKET 3: Alokasi Target Masa Depan (Sinking Funds - Linked to Module 2) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center">
                  <Target className="w-4 h-4 text-[#D97706]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Pos 3: Sinking Funds (Terhubung ke Modul 2)
                  </h3>
                  <p className="text-[11px] text-slate-500">Dana pendidikan anak, mobil, liburan & pensiun</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums block">
                  {formatRupiah(totals.totalSinkingFundNeed)}
                </span>
                <span className="text-[10px] font-bold text-[#D97706]">
                  {totals.sinkingPct.toFixed(1)}% dari gaji
                </span>
              </div>
            </div>

            {/* Dynamic Goals Summary list */}
            <div className="divide-y divide-[#E5E0D8] my-3">
              {goals.map((g) => {
                const need = Math.round((g.targetAmount - g.currentSavings) / Math.max(1, g.tenorMonths));
                return (
                  <div key={g.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-semibold text-sm truncate">{g.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Tenor: {g.tenorMonths} bulan • Target: {formatRupiah(g.targetAmount, true)}</p>
                    </div>
                    <div className="shrink-0">
                      <span className="font-bold text-slate-900 tabular-nums bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs flex items-center gap-1">
                        <span className="text-slate-500 font-medium text-[11px]">Rp</span>
                        <span>{need.toLocaleString('id-ID')}</span>
                        <span className="text-slate-500 font-normal text-[10px]">/bln</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onNavigateToGoals}
              className="w-full py-2.5 rounded-xl bg-[#E8F7F5] hover:bg-[#d6f2ee] text-[#1D6E66] text-xs font-bold flex items-center justify-center gap-2 border border-[#32A89C]/30 transition-all mt-2 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-[#32A89C]" />
              Kelola & Stress-Test Target di Modul 2 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BUCKET 4: Guilt-Free Lifestyle (Hiburan & Belanja) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] text-slate-700 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Pos 4: Guilt-Free Lifestyle
                  </h3>
                  <p className="text-[11px] text-slate-500">Makan cafe, hobi, belanja gadget, self-care</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums block">
                  {formatRupiah(totals.totalLifestyle)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {totals.lifestylePct.toFixed(1)}% dari gaji
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-[#E5E0D8] my-3">
              {(budget.lifestyleExpenses || []).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemNameChange('lifestyle', item.id, e.target.value)}
                    onBlur={() => {
                      if (!item.name.trim()) {
                        handleItemNameChange('lifestyle', item.id, 'Pos Lifestyle');
                      }
                      triggerManualSave();
                    }}
                    placeholder="Nama Lifestyle"
                    className="text-slate-800 font-semibold text-sm flex-1 min-w-0 px-2 py-1 -ml-1 rounded border border-transparent hover:border-slate-300 focus:border-[#32A89C] focus:bg-white bg-transparent outline-none transition-all truncate focus:truncate-none"
                    title="Klik untuk langsung mengedit nama pos"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                      <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                      <CurrencyInput
                        value={item.amount || 0}
                        onChange={(val) => handleItemAmountChange('lifestyle', item.id, val)}
                        onBlur={triggerManualSave}
                        className="w-28 text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteItem('lifestyle', item.id);
                        triggerManualSave();
                      }}
                      className="text-slate-400 hover:text-[#E11D48] transition-colors p-1 cursor-pointer"
                      title="Hapus pos gaya hidup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item inline */}
            {addingToBucket === 'lifestyle' ? (
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-slate-200 space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Nama Pengeluaran (cth: Langganan Streaming)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-sm outline-none focus:border-[#32A89C]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <span className="text-xs font-semibold text-slate-400 select-none mr-1.5">Rp</span>
                    <CurrencyInput
                      value={newItemAmount}
                      onChange={(val) => setNewItemAmount(val)}
                      placeholder="350.000"
                      className="w-full text-right font-sans font-bold text-slate-900 text-sm tracking-tight bg-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleAddItem('lifestyle')}
                    className="h-8 px-3 rounded-lg bg-[#0F1A24] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setAddingToBucket(null)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingToBucket('lifestyle');
                  setNewItemName('');
                  setNewItemAmount(0);
                }}
                className="w-full py-2 rounded-xl border border-dashed border-[#D5CEBF] hover:border-[#32A89C] text-xs font-bold text-slate-600 hover:text-[#32A89C] flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pos Gaya Hidup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
