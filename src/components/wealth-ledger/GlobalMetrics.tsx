import React, { useMemo } from 'react';
import { CurrencyPocketSummary, GlobalWealthSummary, LedgerTransaction } from '../../types/ledger';
import { formatIdr, formatPercent } from '../../utils/formatters';
import { Building2, Coins, Landmark, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

export interface GlobalMetricsProps {
  summary: GlobalWealthSummary;
  pocketsCount: number;
  pockets: CurrencyPocketSummary[];
  transactions?: LedgerTransaction[];
  monthlySurplusCapacity?: number;
}

type AllocationKey = 'CASH_VALAS' | 'INVESTMENT' | 'SINKING_FUND' | 'LOGAM_MULIA' | 'ASET_FISIK';

const allocationMeta: Array<{
  key: AllocationKey;
  label: string;
  icon: React.ReactNode;
  barClass: string;
  iconClass: string;
}> = [
  { key: 'CASH_VALAS', label: 'Kas & Valas', icon: <Landmark className="h-4 w-4" />, barClass: 'bg-sky-500', iconClass: 'bg-sky-50 text-sky-700' },
  { key: 'INVESTMENT', label: 'Investasi', icon: <TrendingUp className="h-4 w-4" />, barClass: 'bg-violet-500', iconClass: 'bg-violet-50 text-violet-700' },
  { key: 'SINKING_FUND', label: 'Sinking Fund', icon: <Target className="h-4 w-4" />, barClass: 'bg-teal-500', iconClass: 'bg-teal-50 text-teal-700' },
  { key: 'LOGAM_MULIA', label: 'Logam Mulia / Emas', icon: <Coins className="h-4 w-4" />, barClass: 'bg-amber-500', iconClass: 'bg-amber-50 text-amber-700' },
  { key: 'ASET_FISIK', label: 'Aset Fisik & Operasional', icon: <Building2 className="h-4 w-4" />, barClass: 'bg-indigo-500', iconClass: 'bg-indigo-50 text-indigo-700' },
];

const getAllocationKey = (pocket: CurrencyPocketSummary): AllocationKey => {
  if (pocket.instrumentType === 'SINKING_FUND') return 'SINKING_FUND';
  if (pocket.instrumentType === 'LOGAM_MULIA') return 'LOGAM_MULIA';
  if (pocket.instrumentType === 'ASET_FISIK') return 'ASET_FISIK';
  if (pocket.instrumentType === 'REKSADANA' || pocket.instrumentType === 'SAHAM_ETF') return 'INVESTMENT';
  return 'CASH_VALAS';
};

export const GlobalMetrics: React.FC<GlobalMetricsProps> = ({
  summary,
  pocketsCount,
  pockets,
  transactions = [],
  monthlySurplusCapacity,
}) => {
  const isPnlPositive = summary.totalUnrealizedPnlIdr >= 0;
  const capacityLimit = monthlySurplusCapacity ?? 15511915;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyAllocated = transactions
    .filter((transaction) => {
      const isIncoming = transaction.type === 'CREDIT' || String(transaction.type) === 'IN';
      if (!isIncoming || !transaction.date?.startsWith(currentMonth)) return false;
      const description = `${transaction.description || ''} ${transaction.notes || ''} ${transaction.posCategory || ''}`.toLowerCase();
      return !description.includes('saldo awal') && !description.includes('initial') && !description.includes('migrasi');
    })
    .reduce((total, transaction) => total + Math.abs(Number(transaction.costIdr || transaction.totalIdr || 0)), 0);
  const remainingCapacity = Math.max(0, capacityLimit - monthlyAllocated);
  const allocations = useMemo(() => {
    const totals: Record<AllocationKey, number> = {
      CASH_VALAS: 0,
      INVESTMENT: 0,
      SINKING_FUND: 0,
      LOGAM_MULIA: 0,
      ASET_FISIK: 0,
    };
    pockets.forEach((pocket) => {
      totals[getAllocationKey(pocket)] += Number(pocket.marketValueIdr || 0);
    });
    const grandTotal = Math.max(0, summary.totalNetWorthIdr);
    return allocationMeta.map((item) => ({
      ...item,
      value: totals[item.key],
      percentage: grandTotal > 0 ? (totals[item.key] / grandTotal) * 100 : 0,
    }));
  }, [pockets, summary.totalNetWorthIdr]);

  return (
    <div className="space-y-4">
      <section aria-label="Ringkasan Kekayaan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Net Worth Riil</span><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Wallet className="h-4 w-4" /></span></div>
          <div><div className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{formatIdr(summary.totalNetWorthIdr)}</div><p className="mt-1 text-[11px] text-slate-400">Valuasi pasar terkini · {pocketsCount} kantong aset</p></div>
        </div>
        <div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Modal Pokok</span><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Coins className="h-4 w-4" /></span></div>
          <div><div className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{formatIdr(summary.totalCostBasisIdr)}</div><p className="mt-1 text-[11px] text-slate-400">Total akumulasi modal perolehan</p></div>
        </div>
        <div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Floating Profit / Loss</span><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isPnlPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{isPnlPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}</span></div>
          <div><div className={`text-xl font-bold tabular-nums tracking-tight ${isPnlPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{formatIdr(summary.totalUnrealizedPnlIdr)}</div><p className={`mt-1 text-[11px] font-bold ${isPnlPositive ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPercent(summary.totalUnrealizedPnlPercent)} · Unrealized return</p></div>
        </div>
        <div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amunisi Investasi Bebas</span><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-sm">💡</span></div>
          <div className="my-3"><div className="whitespace-nowrap text-xl font-bold tabular-nums tracking-tight text-slate-900">{formatIdr(remainingCapacity)}</div><p className="mt-1 text-[11px] text-slate-400">Sisa kas siap dialokasikan bulan ini</p></div>
          <div className="space-y-1 border-t border-slate-100 pt-2 text-[10px] tabular-nums text-slate-500">
            <div className="flex justify-between gap-2"><span>Plafon</span><strong className="whitespace-nowrap text-slate-700">{formatIdr(capacityLimit)}</strong></div>
            <div className="flex justify-between gap-2"><span>Terpakai</span><strong className="whitespace-nowrap text-slate-700">{formatIdr(monthlyAllocated)}</strong></div>
            <div className="flex justify-between gap-2 text-emerald-700"><span>Sisa Siap Dialokasikan</span><strong className="whitespace-nowrap">{formatIdr(remainingCapacity)}</strong></div>
          </div>
        </div>
      </section>

      <section aria-label="Rincian Alokasi Aset" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
        <div className="mb-4"><h2 className="text-sm font-bold text-slate-900">Rincian Alokasi Aset</h2><p className="mt-0.5 text-[11px] text-slate-500">Komposisi nilai pasar portofolio berdasarkan kelas aset.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {allocations.map((item) => (
            <article key={item.key} className="flex h-full min-h-[154px] flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex min-h-10 items-start gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}>{item.icon}</span>
                <h3 className="min-h-8 pt-0.5 text-xs font-bold leading-tight text-slate-800">{item.label}</h3>
              </div>
              <div className="my-3 min-w-0 whitespace-nowrap text-sm font-bold tabular-nums text-slate-900">{formatIdr(item.value)}</div>
              <div className="mt-auto">
                <div className="flex items-center justify-between text-[10px] text-slate-500"><span>Alokasi</span><strong className="whitespace-nowrap tabular-nums text-slate-700">{item.percentage.toFixed(1)}%</strong></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }} /></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
