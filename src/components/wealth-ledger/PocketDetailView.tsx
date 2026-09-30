import React, { useEffect, useMemo, useState } from 'react';
import { CurrencyPocketSummary, LedgerTransaction } from '../../types/ledger';
import { EnrichedTransaction } from '../../utils/calculator';
import { AssetAvatar } from './AssetAvatar';
import {
  formatIdr,
  formatPercent,
  formatRate,
  getPocketTypeLabel,
  formatPocketBalance,
} from '../../utils/formatters';
import { TransactionTable } from './TransactionTable';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Edit3,
  SlidersHorizontal,
  Coins,
  Scale,
  DollarSign,
  X,
  Loader2,
} from 'lucide-react';

interface PocketDetailViewProps {
  pocket: CurrencyPocketSummary;
  transactions: EnrichedTransaction[];
  onBack: () => void;
  onTopUp: (pocketId: string) => void;
  onWithdraw: (pocketId: string) => void;
  onUpdateMarketRate: (pocketId: string, manualMarketRate: number, marketValue: number) => Promise<boolean>;
  onOpenPocketManager: () => void;
  onEditTransaction: (tx: LedgerTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const PocketDetailView: React.FC<PocketDetailViewProps> = ({
  pocket,
  transactions,
  onBack,
  onTopUp,
  onWithdraw,
  onUpdateMarketRate,
  onOpenPocketManager,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const isPnlPositive = pocket.unrealizedPnlIdr >= 0;
  const isIdr = (pocket.currency || '').toUpperCase() === 'IDR';
  const custodianDisplay =
    pocket.defaultCustodian || (isIdr ? 'BCA / Jago / Cash' : 'CIMB Niaga');
  const supportsManualValuation =
    pocket.instrumentType === 'LOGAM_MULIA' ||
    pocket.instrumentType === 'REKSADANA' ||
    pocket.instrumentType === 'SAHAM_ETF' ||
    pocket.instrumentType === 'SINKING_FUND' ||
    pocket.instrumentType === 'ASET_FISIK';
  const [isMarketValueModalOpen, setIsMarketValueModalOpen] = useState(false);
  const [marketValueInput, setMarketValueInput] = useState('');
  const [isSavingMarketValue, setIsSavingMarketValue] = useState(false);

  useEffect(() => {
    if (!isMarketValueModalOpen) return;
    setMarketValueInput(
      pocket.manualMarketValue !== undefined || pocket.manualMarketRate
        ? String(Math.round(pocket.marketValueIdr))
        : ''
    );
  }, [isMarketValueModalOpen, pocket.manualMarketRate, pocket.manualMarketValue, pocket.marketValueIdr]);

  const parsedMarketInput = Number(marketValueInput.replace(/[^0-9]/g, '')) || 0;
  const previewMarketValue = parsedMarketInput;
  const previewMarketRate = pocket.balanceNative > 0
    ? previewMarketValue / pocket.balanceNative
    : 0;
  const previewPnl = previewMarketValue - pocket.totalCostBasisIdr;
  const previewPnlPercent = pocket.totalCostBasisIdr > 0
    ? (previewPnl / pocket.totalCostBasisIdr) * 100
    : 0;
  const formattedLastPriceUpdate = useMemo(() => {
    if (!pocket.lastPriceUpdatedAt) return 'Belum pernah';
    const date = new Date(pocket.lastPriceUpdatedAt);
    if (Number.isNaN(date.getTime())) return 'Belum pernah';
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
    const formattedTime = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Jakarta',
    });
    return `${formattedDate}, ${formattedTime} WIB`;
  }, [pocket.lastPriceUpdatedAt]);

  const saveMarketValue = async () => {
    if (previewMarketRate <= 0 || pocket.balanceNative <= 0) return;
    setIsSavingMarketValue(true);
    const saved = await onUpdateMarketRate(pocket.pocketId, previewMarketRate, previewMarketValue);
    setIsSavingMarketValue(false);
    if (saved) setIsMarketValueModalOpen(false);
  };

  // Bersihkan teks nama kantong untuk breadcrumb agar bebas kode ganda dan duplikasi kurung valas
  const cleanBreadcrumbName = (() => {
    const rawName = pocket.name || pocket.currencyName || pocket.currency;
    const curr = (pocket.currency || '').trim();
    if (!curr) return rawName;
    if (new RegExp(`\\(${curr}\\)`, 'i').test(rawName)) {
      return rawName;
    }
    return `${rawName} (${curr})`;
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Navigation Bar: Back Button, Breadcrumb, and Pocket Settings */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Semua Kantong</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>/</span>
            <span className="font-semibold text-slate-700">
              {cleanBreadcrumbName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPocketManager}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs hover:border-[#32A89C] transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>Pengaturan Kantong</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Header Kantong (ala Bank Jago & OCTO Mobile) */}
      <section
        aria-label={`Rincian Kantong ${pocket.currency}`}
        className="bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#32A89C]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          {/* Identity Row: Bersih & Fokus */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
            <div className="flex items-center gap-3.5">
              <AssetAvatar
                currency={pocket.currency}
                category={pocket.instrumentType}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {pocket.name || pocket.currencyName}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white font-sans font-bold">
                    {pocket.currency}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-teal-50 text-[#1f6f66] border border-teal-200/60 font-medium">
                    {custodianDisplay}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {getPocketTypeLabel(pocket.currency, pocket.instrumentType)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Buku besar mutasi aset &middot; Metode Moving Average Cost &middot; Real-time valuation
                </p>
              </div>
            </div>
          </div>

          {/* Saldo Native Utama & Direct Action Buttons */}
          <div className="py-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Saldo Tersedia
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-sans tabular-nums tracking-tight mt-1">
                {formatPocketBalance(
                  pocket.balanceNative,
                  pocket.currency,
                  pocket.instrumentType,
                  pocket.symbol
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs md:text-sm font-medium text-slate-500 font-sans tabular-nums">
                  ≈ {formatIdr(pocket.marketValueIdr)}
                </span>
                <span className="text-xs text-slate-400">(Nilai Pasar IDR)</span>
                {isIdr && !supportsManualValuation ? null : (
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold font-sans tabular-nums ${
                      isPnlPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isPnlPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>{formatPercent(pocket.unrealizedPnlPercent)}</span>
                  </span>
                )}
              </div>
              {supportsManualValuation && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsMarketValueModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Perbarui Nilai Pasar
                  </button>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Nilai Pasar: {pocket.manualMarketRate ? formatIdr(pocket.marketValueIdr) : 'Belum diisi'}
                    {' · '}Terakhir diperbarui: {formattedLastPriceUpdate}
                  </span>
                </div>
              )}
            </div>

            {/* Sticky Action Pills in Pocket Detail: Hijau Lembut & Merah Lembut */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onTopUp(pocket.pocketId)}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium rounded-xl px-4 py-2 text-sm flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>+ Top Up / Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => onWithdraw(pocket.pocketId)}
                className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors font-medium rounded-xl px-4 py-2 text-sm flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>- Tarik / Keluar</span>
              </button>
            </div>
          </div>

          {/* 4 Mini Statistics Cards in Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-slate-200/80">
            {/* 1. Kurs Rata-Rata */}
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-500" />
                <span>Kurs Rata-Rata</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-sans tabular-nums mt-1">
                {isIdr && !supportsManualValuation ? '1.0' : `Rp ${formatRate(pocket.averageBuyRate, pocket.currency)}`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Weighted average cost
              </div>
            </div>

            {/* 2. Kurs Pasar Terkini (Murni teks live tanpa tombol edit untuk valas ber-feed) */}
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-500" />
                  <span>{supportsManualValuation ? 'Nilai Pasar Portofolio' : 'Kurs Spot Terkini'}</span>
                </span>
                {supportsManualValuation && (
                  <button
                    type="button"
                    onClick={() => setIsMarketValueModalOpen(true)}
                    title="Perbarui nilai pasar portofolio"
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#32A89C] transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-sans tabular-nums mt-1">
                {supportsManualValuation
                  ? formatIdr(pocket.marketValueIdr)
                  : `Rp ${formatRate(pocket.currentMarketRate, pocket.currency)}`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {supportsManualValuation ? 'Total valuasi manual terkini' : 'Benchmark pasar live'}
              </div>
            </div>

            {/* 3. Total Modal Pokok IDR */}
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Total Modal (Cost)</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-sans tabular-nums mt-1">
                {formatIdr(pocket.totalCostBasisIdr)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Cost basis bersih
              </div>
            </div>

            {/* 4. Floating Profit/Loss */}
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                {isPnlPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>Floating PnL</span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black font-sans tabular-nums mt-1 ${
                  isPnlPositive ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatIdr(pocket.unrealizedPnlIdr)}
              </div>
              <div
                className={`text-[10px] font-semibold font-sans tabular-nums mt-0.5 ${
                  isPnlPositive ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                Return: {formatPercent(pocket.unrealizedPnlPercent)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isMarketValueModalOpen && supportsManualValuation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="market-value-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="market-value-title" className="text-base font-black text-slate-900">Perbarui Nilai Pasar Portofolio</h2>
                <p className="mt-1 text-xs text-slate-500">Masukkan total nilai terkini untuk {pocket.name}.</p>
              </div>
              <button type="button" onClick={() => setIsMarketValueModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-xs font-bold text-slate-700">
              Total Nilai Portofolio Saat Ini (Rp)
              <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <span className="text-sm font-bold text-slate-500">Rp</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={marketValueInput}
                  onChange={(event) => setMarketValueInput(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-right text-base font-bold tabular-nums text-slate-900 outline-none"
                />
              </div>
            </label>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs tabular-nums">
              <div className="flex justify-between gap-3 text-slate-600"><span>Modal Pokok</span><strong className="text-slate-900">{formatIdr(pocket.totalCostBasisIdr)}</strong></div>
              <div className="flex justify-between gap-3 text-slate-600"><span>Estimasi Nilai Pasar Baru</span><strong className="text-slate-900">{formatIdr(previewMarketValue)}</strong></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between gap-3"><span className="font-semibold text-slate-700">Estimasi Floating P/L</span><strong className={previewPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatIdr(previewPnl)} ({formatPercent(previewPnlPercent)})</strong></div>
            </div>

            <button
              type="button"
              onClick={saveMarketValue}
              disabled={previewMarketRate <= 0 || pocket.balanceNative <= 0 || isSavingMarketValue}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingMarketValue ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Simpan Nilai Portofolio
            </button>
          </div>
        </div>
      )}

      {/* 3. Mutasi Jurnal Khusus Kantong Tersebut */}
      <section
        aria-label={`Mutasi Jurnal Kantong ${pocket.currency}`}
        className="space-y-3"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Buku Jurnal Mutasi: {pocket.name || pocket.currencyName}
          </h2>
          <p className="text-xs text-slate-500">
            Riwayat mutasi debet/kredit dan saldo berjalan untuk kantong ini.
          </p>
        </div>

        {/* Dedicated Transaction Table for this pocket (Strictly isolated by pocketId) */}
        <TransactionTable
          transactions={transactions}
          selectedCurrency={pocket.currency}
          selectedPocketId={pocket.pocketId}
          isSinglePocketView={true}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      </section>
    </div>
  );
};
