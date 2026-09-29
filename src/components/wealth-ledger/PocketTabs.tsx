import React from 'react';
import { AssetPocket, CurrencyPocketSummary } from '../../types/ledger';
import { AssetAvatar } from './AssetAvatar';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';

export type PocketFilter = 'ALL' | string;

interface PocketTabsProps {
  selectedPocket: PocketFilter;
  onSelectPocket: (pocket: PocketFilter) => void;
  pockets: AssetPocket[];
  pocketSummaries: CurrencyPocketSummary[];
  onOpenPocketManager: () => void;
}

export const PocketTabs: React.FC<PocketTabsProps> = ({
  selectedPocket,
  onSelectPocket,
  pockets,
  pocketSummaries,
  onOpenPocketManager,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Scrollable Tabs */}
      <div className="overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl border border-slate-200 text-xs font-semibold">
          {/* 1. All Transactions Tab */}
          <button
            onClick={() => onSelectPocket('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedPocket === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span>Semua Transaksi</span>
          </button>

          {/* 2. Dynamic Asset Pockets */}
          {pockets.map((pocket) => {
            const isActive = selectedPocket === pocket.currencyCode;
            const summary = pocketSummaries.find(
              (p) =>
                (p.pocketId && p.pocketId === pocket.id) ||
                ((p.currency || '').toUpperCase() === (pocket.currencyCode || '').toUpperCase())
            );

            return (
              <button
                key={pocket.id}
                onClick={() => onSelectPocket(pocket.currencyCode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <AssetAvatar
                  currency={pocket.currencyCode}
                  category={pocket.instrumentType}
                  size="sm"
                />
                <span>{pocket.name}</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">
                  ({pocket.currencyCode})
                </span>
                {summary && summary.balanceNative !== 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-sans tabular-nums font-bold ${
                      isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/60 text-slate-700'
                    }`}
                  >
                    {summary.balanceNative > 0 ? '+' : ''}
                    {summary.balanceNative.toLocaleString('en-US', {
                      maximumFractionDigits: pocket.currencyCode === 'IDR' ? 0 : 2,
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Button: + Kelola Kantong */}
      <button
        onClick={onOpenPocketManager}
        title="Buka Manajemen Kantong Valas & Aset (CRUD Kantong)"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs hover:border-[#32A89C] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#32A89C]" />
        <span>Kelola Kantong</span>
      </button>
    </div>
  );
};
