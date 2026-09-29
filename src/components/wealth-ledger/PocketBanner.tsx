import React from 'react';
import { CurrencyPocketSummary } from '../../types/ledger';
import { AssetAvatar } from './AssetAvatar';
import {
  formatIdr,
  formatNative,
  formatPercent,
  formatRate,
} from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Edit3,
  Scale,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface PocketBannerProps {
  pocket: CurrencyPocketSummary;
  onOpenRatesModal: () => void;
}

export const PocketBanner: React.FC<PocketBannerProps> = ({
  pocket,
  onOpenRatesModal,
}) => {
  const isPnlPositive = pocket.unrealizedPnlIdr >= 0;

  return (
    <section aria-label={`Rekapitulasi Kantong ${pocket.currency}`} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 transition-all">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <AssetAvatar currency={pocket.currency} category={pocket.instrumentType} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Kantong Valas: {pocket.currencyName} ({pocket.currency})
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-sans font-medium">
                Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Buku besar mutasi valuta asing & kalkulasi kurs beli tertimbang (Weighted Average Cost)
            </p>
          </div>
        </div>

        {/* Current Market Rate Badge & Quick Edit */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Kurs Pasar Terkini
            </span>
            <span className="text-sm font-bold font-sans tabular-nums text-slate-900">
              1 {pocket.currency} = Rp {formatRate(pocket.currentMarketRate, pocket.currency)}
            </span>
          </div>
          {pocket.currency !== 'IDR' && (
            <button
              onClick={onOpenRatesModal}
              title="Ubah kurs pasar mata uang ini"
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-[#32A89C] transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5 Excel Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
        {/* 1. Saldo Aktif (Native Balance) */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Saldo Aktif (Native)</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 font-sans tabular-nums">
            {formatNative(pocket.balanceNative, pocket.currency)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
            <span className="flex items-center gap-0.5 text-emerald-700">
              <ArrowDownLeft className="w-3 h-3" />
              {pocket.totalCreditNative.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-0.5 text-rose-700">
              <ArrowUpRight className="w-3 h-3" />
              {pocket.totalDebetNative.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 2. Average Price (Kurs Rata-rata Beli) */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-600" />
            <span>Kurs Rata-Rata (Avg)</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 font-sans tabular-nums">
            Rp {formatRate(pocket.averageBuyRate, pocket.currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5 truncate">
            {pocket.currency === 'IDR'
              ? 'Mata uang basis'
              : `Modal / Saldo Unit`}
          </div>
        </div>

        {/* 3. Total Cost of Investment (IDR) */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Cost Basis (IDR)
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 font-sans tabular-nums">
            {formatIdr(pocket.totalCostBasisIdr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
            Akumulasi modal bersih
          </div>
        </div>

        {/* 4. Nilai Pasar Riil (Market Value IDR) */}
        <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#207a71] uppercase tracking-wider">
            Nilai Pasar Riil (IDR)
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-[#1c6961] font-sans tabular-nums">
            {formatIdr(pocket.marketValueIdr)}
          </div>
          <div className="mt-1 text-[11px] text-[#24877d] border-t border-teal-200/40 pt-1.5">
            Saldo × Kurs Terkini
          </div>
        </div>

        {/* 5. Floating Profit / Loss (Rp & %) */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isPnlPositive
              ? 'bg-emerald-50/60 border-emerald-100'
              : 'bg-rose-50/60 border-rose-100'
          }`}
        >
          <div
            className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
              isPnlPositive ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            <span>Floating PnL</span>
            {isPnlPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
          </div>
          <div
            className={`mt-2 text-xl sm:text-2xl font-extrabold font-sans tabular-nums ${
              isPnlPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatIdr(pocket.unrealizedPnlIdr)}
          </div>
          <div
            className={`mt-1 text-[11px] font-semibold border-t pt-1.5 flex items-center justify-between ${
              isPnlPositive
                ? 'border-emerald-200/60 text-emerald-800'
                : 'border-rose-200/60 text-rose-800'
            }`}
          >
            <span>Return (%)</span>
            <span className="font-sans tabular-nums font-bold">
              {formatPercent(pocket.unrealizedPnlPercent)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
