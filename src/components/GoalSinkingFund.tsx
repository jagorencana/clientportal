import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap, 
  Car, 
  Plane, 
  Home, 
  ShieldCheck, 
  Layers, 
  Sliders, 
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  Compass,
  RefreshCw,
  Edit3,
  Pencil
} from 'lucide-react';
import { SinkingFundGoal, BudgetState, SinkingFundCategory } from '../types';
import { formatRupiah, calculateTotals, calculateMonthlyGoalNeed, calculateProgress } from '../utils/calculations';
import { TvmFutureGoalsEngine } from './TvmFutureGoalsEngine';
import { SmartTravelBudgetEngine } from './SmartTravelBudgetEngine';
import { CurrencyInput } from './common/CurrencyInput';
import { usePortal } from '../context/PortalContext';
import confetti from 'canvas-confetti';

interface GoalSinkingFundProps {
  goals: SinkingFundGoal[];
  budget: BudgetState;
  onUpdateGoals: (newGoals: SinkingFundGoal[]) => void;
  onNavigateToBudgeting: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const GoalSinkingFund: React.FC<GoalSinkingFundProps> = ({
  goals,
  budget,
  onUpdateGoals,
  onNavigateToBudgeting,
  onNavigateTab,
}) => {
  const totals = calculateTotals(budget, goals);

  // Sub-tab view mode: 'list' | 'tvm' | 'travel'
  const { triggerManualSave } = usePortal();
  const [subView, setSubView] = useState<'list' | 'tvm' | 'travel'>('list');

  // New goal form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SinkingFundCategory>('education');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [currentSavings, setCurrentSavings] = useState<number>(0);
  const [tenorMonths, setTenorMonths] = useState(18);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [notes, setNotes] = useState('');

  // Edit goal modal state
  const [editingGoal, setEditingGoal] = useState<SinkingFundGoal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<SinkingFundCategory>('emergency');
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [editTargetAmount, setEditTargetAmount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Top-up simulation modal
  const [simulatingGoalId, setSimulatingGoalId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);

  const handleOpenEditModal = (goal: SinkingFundGoal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditCategory(goal.category || 'emergency');
    setEditPriority(goal.priority || 'High');
    setEditTargetAmount(goal.targetAmount);
    setEditNotes(goal.notes || '');
  };

  const handleSaveEditGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editTitle.trim() || !editTargetAmount) return;

    const updatedGoals = goals.map(g => {
      if (g.id === editingGoal.id) {
        return {
          ...g,
          title: editTitle.trim(),
          category: editCategory,
          priority: editPriority,
          targetAmount: editTargetAmount,
          notes: editNotes.trim(),
        };
      }
      return g;
    });

    onUpdateGoals(updatedGoals);
    triggerManualSave();
    setEditingGoal(null);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#32A89C', '#1D6E66'],
    });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount) return;

    const newGoal: SinkingFundGoal = {
      id: `goal-${Date.now()}`,
      title: title.trim(),
      category,
      targetAmount,
      currentSavings,
      tenorMonths: Math.max(1, tenorMonths),
      priority,
      notes: notes.trim(),
    };

    onUpdateGoals([...goals, newGoal]);
    triggerManualSave();
    setShowAddModal(false);
    // Reset form
    setTitle('');
    setTargetAmount(0);
    setCurrentSavings(0);
    setTenorMonths(18);
    setNotes('');

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#32A89C', '#E5A93C', '#0F1A24'],
    });
  };

  const handleDeleteGoal = (id: string) => {
    onUpdateGoals(goals.filter(g => g.id !== id));
    triggerManualSave();
  };

  const handleTenorChange = (id: string, newTenor: number) => {
    onUpdateGoals(
      goals.map(g => (g.id === id ? { ...g, tenorMonths: Math.max(1, newTenor) } : g))
    );
    triggerManualSave();
  };

  // Auto Optimize Tenors
  const handleAutoOptimizeTenors = () => {
    if (totals.freeCashflow <= 0) return;
    const ratioNeeded = totals.totalSinkingFundNeed / totals.freeCashflow;
    if (ratioNeeded > 1) {
      const optimized = goals.map(g => ({
        ...g,
        tenorMonths: Math.round(g.tenorMonths * ratioNeeded * 1.05),
      }));
      onUpdateGoals(optimized);
      triggerManualSave();
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.7 },
        colors: ['#32A89C', '#1D6E66'],
      });
    }
  };

  const handleTopUpSubmit = (goalId: string) => {
    if (topUpAmount <= 0) return;

    onUpdateGoals(
      goals.map(g => {
        if (g.id === goalId) {
          const newSavings = g.currentSavings + topUpAmount;
          return { ...g, currentSavings: newSavings };
        }
        return g;
      })
    );
    triggerManualSave();

    setSimulatingGoalId(null);
    setTopUpAmount(0);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#32A89C', '#E5A93C'],
    });
  };

  // Handle Sync from Travel or TVM
  const handleSyncGoalFromTools = (goalData: { title: string; targetAmount: number; tenorMonths: number; category: any; notes: string }) => {
    // Check if goal with similar name exists, update it, otherwise prepend
    const existingIndex = goals.findIndex(g => g.title.toLowerCase().includes(goalData.title.toLowerCase()) || (g.category === goalData.category && goalData.category === 'travel'));
    
    if (existingIndex >= 0) {
      const updated = [...goals];
      updated[existingIndex] = {
        ...updated[existingIndex],
        title: goalData.title,
        targetAmount: goalData.targetAmount,
        tenorMonths: goalData.tenorMonths,
        notes: goalData.notes,
      };
      onUpdateGoals(updated);
    } else {
      const newGoal: SinkingFundGoal = {
        id: `goal-${Date.now()}`,
        title: goalData.title,
        category: goalData.category,
        targetAmount: goalData.targetAmount,
        currentSavings: 0,
        tenorMonths: goalData.tenorMonths,
        priority: 'High',
        notes: goalData.notes,
      };
      onUpdateGoals([newGoal, ...goals]);
    }
    setSubView('list');
  };

  const getCategoryIcon = (cat: SinkingFundCategory) => {
    switch (cat) {
      case 'emergency':
        return <ShieldCheck className="w-4 h-4 text-[#32A89C]" />;
      case 'education':
        return <GraduationCap className="w-4 h-4 text-[#32A89C]" />;
      case 'vehicle':
        return <Car className="w-4 h-4 text-[#32A89C]" />;
      case 'travel':
        return <Plane className="w-4 h-4 text-[#32A89C]" />;
      case 'property':
        return <Home className="w-4 h-4 text-[#32A89C]" />;
      default:
        return <Target className="w-4 h-4 text-[#32A89C]" />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header with Sub-Tab Navigation */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Modul 2 • Sinking Fund Suite
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Stress-Test Validasi Kapasitas Gaji
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Goal Sinking Fund & Target Impian
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Hitung alokasi tabungan bulanan presisi dengan formula <code className="bg-[#F4F0E8] px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">(Target - Tabungan Awal) / Tenor</code>, serta validasi apakah cashflow Anda mampu menampungnya tanpa berutang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="h-11 px-5 rounded-full bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 self-stretch sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 text-[#32A89C]" />
            <span>Tambah Target Baru</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab View Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-[#F4F1EA] rounded-2xl border border-[#E5E0D8] overflow-x-auto max-w-fit">
        <button
          onClick={() => setSubView('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subView === 'list'
              ? 'bg-white text-slate-900 shadow-xs border border-[#E5E0D8]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className={`w-4 h-4 ${subView === 'list' ? 'text-[#32A89C]' : 'text-slate-400'}`} />
          <span>Daftar Target Sinking Fund ({goals.length})</span>
        </button>

        <button
          onClick={() => setSubView('tvm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subView === 'tvm'
              ? 'bg-white text-slate-900 shadow-xs border border-[#E5E0D8]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className={`w-4 h-4 ${subView === 'tvm' ? 'text-[#32A89C]' : 'text-slate-400'}`} />
          <span>Kalkulator TVM Rencana Impian</span>
          <span className="text-[9px] font-black text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded">Compound</span>
        </button>

        <button
          onClick={() => setSubView('travel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subView === 'travel'
              ? 'bg-white text-slate-900 shadow-xs border border-[#E5E0D8]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plane className={`w-4 h-4 ${subView === 'travel' ? 'text-[#32A89C]' : 'text-slate-400'}`} />
          <span>Smart Travel & Trip Planner</span>
          <span className="text-[9px] font-black text-[#1D6E66] bg-[#E8F7F5] px-1.5 py-0.5 rounded">4-Pos</span>
        </button>
      </div>

      {/* VIEW: TVM CALCULATOR TAB */}
      {subView === 'tvm' && (
        <TvmFutureGoalsEngine
          onSyncToSinkingFund={handleSyncGoalFromTools}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* VIEW: TRAVEL PLANNER TAB */}
      {subView === 'travel' && (
        <SmartTravelBudgetEngine
          onSyncToSinkingFund={handleSyncGoalFromTools}
          existingTravelGoals={goals.filter(g => g.category === 'travel')}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* VIEW: ACTIVE SINKING FUND LIST & STRESS TEST */}
      {subView === 'list' && (
        <div className="space-y-6">
          {/* STRESS TEST CASHFLOW VALIDATION CARD (Mandatory Requirement) */}
          <div className={`rounded-2xl p-5 sm:p-7 border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all ${
            totals.isDeficit 
              ? 'bg-[#FFF1F2] border-[#FFE4E6]' 
              : 'bg-[#E8F7F5] border-[#32A89C]/30'
          }`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  totals.isDeficit 
                    ? 'bg-[#EF4444] text-white' 
                    : 'bg-[#10B981] text-white'
                }`}>
                  {totals.isDeficit ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      totals.isDeficit ? 'text-[#EF4444]' : 'text-[#1D6E66]'
                    }`}>
                      {totals.isDeficit ? 'STATUS BAHAYA • CASHFLOW DEFISIT' : 'STATUS SEHAT • CASHFLOW TERPROTEKSI'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                    {totals.isDeficit 
                      ? `Target melebihi kapasitas cashflow (Kurang ${formatRupiah(totals.deficitAmount)}/bln)`
                      : `Kapasitas Cashflow Aman (Sisa Kas Bebas ${formatRupiah(totals.freeCashflow - totals.totalSinkingFundNeed)}/bln)`}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    {totals.isDeficit
                      ? 'Total cicilan Sinking Fund yang Anda tetapkan melebihi sisa gaji setelah kebutuhan pokok, cicilan utang, dan gaya hidup minimum. Sesuaikan slider tenor di bawah atau gunakan Auto-Optimizer agar tidak defisit.'
                      : 'Struktur target realistis dan didanai penuh dari sisa kas bersih bulanan tanpa mengorbankan pos kebutuhan pokok maupun proteksi.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
                {totals.isDeficit && (
                  <button
                    onClick={handleAutoOptimizeTenors}
                    className="h-10 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#32A89C]" />
                    Auto-Optimize Tenor Realistis
                  </button>
                )}
                <button
                  onClick={onNavigateToBudgeting}
                  className="h-10 px-4 rounded-xl bg-white border border-[#D5CEBF] hover:border-[#32A89C] text-slate-700 text-xs font-bold transition-all"
                >
                  Sesuaikan Master Budgeting
                </button>
              </div>
            </div>

            {/* Stress Test Calculation Details */}
            <div className="mt-5 pt-4 border-t border-black/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Pemasukan Bersih:</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(budget.monthlyNetIncome)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Pengeluaran Rutin:</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(totals.totalCommittedExpenses)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sisa Kas Bebas Maksimal:</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(totals.freeCashflow)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Total Kebutuhan Sinking Fund:</span>
                <span className={`font-bold tabular-nums ${totals.isDeficit ? 'text-[#EF4444]' : 'text-[#1D6E66]'}`}>
                  {formatRupiah(totals.totalSinkingFundNeed)}
                </span>
              </div>
            </div>
          </div>

          {/* Goal Cards Grid with Interactive Tenor Sliders & Travel Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {goals.map((goal) => {
              const monthlyNeed = calculateMonthlyGoalNeed(goal);
              const progress = calculateProgress(goal.currentSavings, goal.targetAmount);

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
                >
                  <div>
                    {/* Header of Card */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E5E0D8]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] flex items-center justify-center shrink-0">
                          {getCategoryIcon(goal.category)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                            {goal.title}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {goal.category} • Prioritas {goal.priority}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(goal)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                          title="Edit Target Sinking Fund"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-slate-400 hover:text-[#EF4444] transition-colors p-1"
                          title="Hapus Target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Target Numbers */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Target Dana:</span>
                        <span className="text-base font-black text-slate-900 tabular-nums">
                          {formatRupiah(goal.targetAmount)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">Tabungan Terkumpul:</span>
                        <span className="font-bold text-slate-800 tabular-nums">
                          {progress.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#F4F0E8] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#32A89C] h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Tenor Slider */}
                    <div className="mt-5 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#32A89C]" /> Tenor Waktu:
                        </span>
                        <span className="font-black text-slate-900 tabular-nums">
                          {goal.tenorMonths} Bulan ({(goal.tenorMonths / 12).toFixed(1)} Thn)
                        </span>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="60"
                        step="1"
                        value={goal.tenorMonths}
                        onChange={(e) => handleTenorChange(goal.id, Number(e.target.value))}
                        className="w-full h-1.5 bg-[#D5CEBF] rounded-lg appearance-none cursor-pointer accent-[#32A89C]"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>1 bln</span>
                        <span>24 bln</span>
                        <span>60 bln</span>
                      </div>
                    </div>

                    {/* Monthly Need Highlight Box */}
                    <div className="mt-4 p-3 rounded-xl bg-[#E8F7F5] border border-[#32A89C]/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#1D6E66] block">
                          Kebutuhan Alokasi:
                        </span>
                        <span className="text-base font-black text-[#1D6E66] tabular-nums">
                          {formatRupiah(monthlyNeed)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold"> / bulan</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSimulatingGoalId(goal.id);
                            setTopUpAmount(0);
                          }}
                          className="h-8 px-3 rounded-lg bg-[#0F1A24] hover:bg-[#1E293B] text-white text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Setor Kas
                        </button>
                      </div>
                    </div>

                    {/* Quick Button for Travel Categories */}
                    {goal.category === 'travel' && (
                      <div className="mt-3">
                        <button
                          onClick={() => setSubView('travel')}
                          className="w-full py-2 px-3 bg-[#FAF8F5] hover:bg-[#E8F7F5] text-[#1D6E66] border border-[#32A89C]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plane className="w-3.5 h-3.5 text-[#32A89C]" />
                          <span>✈️ Rinci Anggaran Travel (4 Pos Biaya)</span>
                        </button>
                      </div>
                    )}

                    {goal.notes && (
                      <p className="text-[11px] text-slate-500 mt-3 italic line-clamp-2" title={goal.notes}>
                        Catatan: {goal.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tambah Target Sinking Fund Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Tetapkan target impian yang ingin dicapai secara disiplin.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Nama Target Impian
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dana Masuk SD Islam Anak"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] focus:ring-2 focus:ring-[#32A89C]/20 text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Kategori Target
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SinkingFundCategory)}
                    className="h-11 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs font-semibold outline-none"
                  >
                    <option value="emergency">Dana Darurat (Emergency)</option>
                    <option value="education">Pendidikan / Sekolah</option>
                    <option value="vehicle">Kendaraan / Mobil</option>
                    <option value="travel">Liburan / Traveling</option>
                    <option value="property">DP Properti / Renovasi</option>
                    <option value="retirement">Pensiun / Investasi</option>
                    <option value="custom">Target Khusus Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="h-11 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs font-semibold outline-none"
                  >
                    <option value="High">Tinggi (High Priority)</option>
                    <option value="Medium">Sedang (Medium)</option>
                    <option value="Low">Fleksibel (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Target Dana (Rp)
                  </label>
                  <CurrencyInput
                    value={targetAmount}
                    onChange={(val) => setTargetAmount(val)}
                    placeholder="85.000.000"
                    prefix="Rp"
                    className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-sm font-bold tabular-nums outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Tabungan Awal (Rp)
                  </label>
                  <CurrencyInput
                    value={currentSavings}
                    onChange={(val) => setCurrentSavings(val)}
                    placeholder="15.000.000"
                    prefix="Rp"
                    className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-sm font-bold tabular-nums outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Tenor Waktu Target (Bulan): {tenorMonths} Bulan ({(tenorMonths / 12).toFixed(1)} Thn)
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={tenorMonths}
                  onChange={(e) => setTenorMonths(Number(e.target.value))}
                  className="w-full h-2 bg-[#D5CEBF] rounded-lg appearance-none cursor-pointer accent-[#32A89C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Termasuk uang pangkal & seragam"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-xl text-slate-600 font-semibold text-xs hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs transition-all"
                >
                  Simpan Target Impian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top-up Simulation Modal */}
      {simulatingGoalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-2xl max-w-sm w-full">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Simulasi Setor Tabungan Kas
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tambahkan nominal kas yang baru disisihkan ke target ini.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Nominal Tambahan (Rp)
                </label>
                <CurrencyInput
                  value={topUpAmount}
                  onChange={(val) => setTopUpAmount(val)}
                  placeholder="5.000.000"
                  prefix="Rp"
                  className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-sm font-bold tabular-nums outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0D8]">
                <button
                  type="button"
                  onClick={() => setSimulatingGoalId(null)}
                  className="h-9 px-3.5 rounded-xl text-slate-600 font-semibold text-xs hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleTopUpSubmit(simulatingGoalId)}
                  className="h-9 px-4 rounded-xl bg-[#32A89C] hover:bg-[#25857B] text-white font-bold text-xs"
                >
                  Konfirmasi Setor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Target Sinking Fund Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E0D8] shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#32A89C]" />
                  Edit Target Sinking Fund
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui detail target impian, kategori, nominal, dan alokasi bulanan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditGoal} className="mt-4 space-y-4">
              {/* Input 1: Nama Target Sinking Fund */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Nama Target Sinking Fund
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tabungan Anak"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] focus:ring-2 focus:ring-[#32A89C]/20 text-slate-900 text-sm placeholder:text-slate-400 transition-all outline-none"
                />
              </div>

              {/* Input 2: Kategori & Prioritas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Kategori Target
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as SinkingFundCategory)}
                    className="h-11 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs font-semibold outline-none"
                  >
                    <option value="emergency">Emergency (Dana Darurat)</option>
                    <option value="education">Education (Pendidikan)</option>
                    <option value="property">Property (Properti / Rumah)</option>
                    <option value="travel">Travel (Liburan / Wisata)</option>
                    <option value="vehicle">Vehicle (Kendaraan)</option>
                    <option value="retirement">Retirement (Pensiun)</option>
                    <option value="custom">Custom (Target Khusus)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Prioritas
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="h-11 w-full rounded-xl px-3 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs font-semibold outline-none"
                  >
                    <option value="High">High (Tinggi)</option>
                    <option value="Medium">Medium (Sedang)</option>
                    <option value="Low">Low (Fleksibel)</option>
                  </select>
                </div>
              </div>

              {/* Input 3: Target Dana (Rp) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Target Dana (Rp)
                </label>
                <CurrencyInput
                  value={editTargetAmount}
                  onChange={(val) => setEditTargetAmount(val)}
                  placeholder="Contoh: 50.000.000"
                  prefix="Rp"
                  className="h-11 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-sm font-bold tabular-nums outline-none"
                />
                {/* Dynamic recalculated monthly allocation note */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-[#FAF8F5] p-2 rounded-lg border border-[#E5E0D8]">
                  <span>Tenor Aktif: <strong>{editingGoal.tenorMonths} bulan</strong></span>
                  <span className="text-[#1D6E66] font-bold">
                    Kebutuhan Baru: {formatRupiah(Math.round(Math.max(0, editTargetAmount - (editingGoal.currentSavings || 0)) / Math.max(1, editingGoal.tenorMonths)))}/bln
                  </span>
                </div>
              </div>

              {/* Input 4: Catatan Tambahan */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Persalinan, Perlengkapan Adik Bayi"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="h-10 w-full rounded-xl px-4 bg-white border border-[#D5CEBF] focus:border-[#32A89C] text-slate-900 text-xs outline-none"
                />
              </div>

              {/* Modal Buttons: Batal & Simpan Perubahan */}
              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="h-10 px-4 rounded-xl text-slate-600 font-semibold text-xs hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
