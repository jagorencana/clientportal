import React, { useState, useMemo, useEffect } from 'react';
import { AssetPocket, CurrencyType, LedgerTransaction } from '../../types/ledger';
import { EnrichedTransaction } from '../../utils/calculator';
import {
  formatDate,
  formatIdr,
  formatNative,
  formatRate,
} from '../../utils/formatters';
import {
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CalendarRange,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';

export type PeriodFilter = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';

type SortField = 'date' | 'location';

interface TransactionTableProps {
  transactions: EnrichedTransaction[];
  selectedCurrency: 'ALL' | CurrencyType;
  selectedPocketId?: string;
  pockets?: AssetPocket[];
  isSinglePocketView?: boolean;
  onEditTransaction: (tx: LedgerTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNewTxModal?: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  selectedCurrency,
  selectedPocketId,
  pockets = [],
  isSinglePocketView = false,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activePocketFilter, setActivePocketFilter] = useState<string>(
    selectedPocketId || 'ALL'
  );

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [txToDelete, setTxToDelete] = useState<EnrichedTransaction | null>(null);

  // Filter Periode Transaksi
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Keep activePocketFilter in sync if selectedPocketId prop changes
  useEffect(() => {
    if (selectedPocketId) {
      setActivePocketFilter(selectedPocketId);
    }
  }, [selectedPocketId]);

  // Validasi rentang tanggal custom (startDate > endDate)
  const isDateRangeInvalid = useMemo(() => {
    return Boolean(
      periodFilter === 'CUSTOM' &&
        customStartDate &&
        customEndDate &&
        customStartDate > customEndDate
    );
  }, [periodFilter, customStartDate, customEndDate]);

  // Helper rentang tanggal untuk filter periode
  const periodDateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (periodFilter === 'THIS_MONTH') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { start, end, label: `Bulan Ini (${month + 1}/${year})` };
    }

    if (periodFilter === 'LAST_MONTH') {
      const prevMonthDate = new Date(year, month - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth();
      const start = new Date(prevYear, prevMonth, 1).toISOString().split('T')[0];
      const end = new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0];
      return { start, end, label: `Bulan Lalu (${prevMonth + 1}/${prevYear})` };
    }

    if (periodFilter === 'THIS_YEAR') {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return { start, end, label: `Tahun ${year}` };
    }

    if (periodFilter === 'CUSTOM') {
      if (isDateRangeInvalid) {
        return { label: 'Rentang Tidak Valid' };
      }
      let label = 'Rentang Kustom';
      if (customStartDate && customEndDate) {
        label = `${formatDate(customStartDate)} s.d. ${formatDate(customEndDate)}`;
      } else if (customStartDate) {
        label = `Mulai ${formatDate(customStartDate)}`;
      } else if (customEndDate) {
        label = `Sampai ${formatDate(customEndDate)}`;
      }
      return {
        start: customStartDate || undefined,
        end: customEndDate || undefined,
        label,
      };
    }

    return { label: 'Semua Periode' };
  }, [periodFilter, customStartDate, customEndDate, isDateRangeInvalid]);

  // Guard clause pengaman ketat: Filter transaksi valid (menolak NaN, 0, undefined, atau null)
  const validTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((t) => {
      if (!t) return false;
      const rawAmount = t.nativeAmount !== undefined ? t.nativeAmount : (t as any).amount;
      const rawRate = t.exchangeRate !== undefined ? t.exchangeRate : (t as any).rate;
      const amount = Number(rawAmount);
      const rate = Number(rawRate !== undefined ? rawRate : 1);
      return (
        !isNaN(amount) &&
        amount > 0 &&
        isFinite(amount) &&
        !isNaN(rate) &&
        rate >= 0 &&
        isFinite(rate)
      );
    });
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    // Jika rentang tanggal kustom tidak valid, jangan jalankan filter dan jangan fallback ke semua data!
    if (isDateRangeInvalid) {
      return [];
    }

    return validTransactions.filter((tx) => {
      // 0. Pocket ID filter (Foreign Key - Highest Priority)
      const effectivePocketId = isSinglePocketView
        ? selectedPocketId
        : activePocketFilter;

      if (effectivePocketId && effectivePocketId !== 'ALL') {
        if (tx.pocketId !== effectivePocketId) {
          return false;
        }
      } else if (selectedCurrency !== 'ALL' && tx.currency !== selectedCurrency) {
        return false;
      }

      // 1. Period Filter
      if (periodDateRange.start && tx.date < periodDateRange.start) {
        return false;
      }
      if (periodDateRange.end && tx.date > periodDateRange.end) {
        return false;
      }

      // 2. Type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) {
        return false;
      }

      // 3. Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesLoc = tx.location.toLowerCase().includes(query);
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
        const matchesCurr = tx.currency.toLowerCase().includes(query);

        if (!matchesDesc && !matchesLoc && !matchesNotes && !matchesCurr) {
          return false;
        }
      }

      return true;
    });
  }, [
    validTransactions,
    isSinglePocketView,
    selectedPocketId,
    activePocketFilter,
    selectedCurrency,
    periodDateRange,
    selectedType,
    searchTerm,
  ]);

  // Sort displayed transactions
  const displayTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortField === 'date') {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) {
          return sortOrder === 'desc' ? -dateComparison : dateComparison;
        }
        return sortOrder === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
      } else {
        const locA = (a.location || '').toLowerCase();
        const locB = (b.location || '').toLowerCase();
        const locComparison = locA.localeCompare(locB);
        if (locComparison !== 0) {
          return sortOrder === 'desc' ? -locComparison : locComparison;
        }
        return b.date.localeCompare(a.date);
      }
    });
  }, [filteredTransactions, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'date' ? 'desc' : 'asc');
    }
  };

  // Totals for filtered view (recalculated dynamically)
  const totals = useMemo(() => {
    let creditNative = 0;
    let debetNative = 0;
    let creditIdr = 0;
    let debetIdr = 0;

    filteredTransactions.forEach((tx) => {
      const amount = Number(tx.nativeAmount ?? (tx as any).amount);
      const rate = Number(tx.exchangeRate ?? (tx as any).rate ?? 1);
      const cost = Number(tx.costIdr ?? (tx as any).totalIdr ?? (amount * rate));
      if (isNaN(amount) || amount <= 0 || isNaN(rate) || isNaN(cost)) return;

      if (tx.type === 'CREDIT') {
        creditNative += amount;
        creditIdr += cost;
      } else {
        debetNative += amount;
        debetIdr += Math.abs(cost);
      }
    });

    const netCashflowIdr = creditIdr - debetIdr;
    const netNative = creditNative - debetNative;

    return {
      creditNative,
      debetNative,
      creditIdr,
      debetIdr,
      netCashflowIdr,
      netNative,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const confirmDelete = () => {
    if (txToDelete) {
      onDeleteTransaction(txToDelete.id);
      setTxToDelete(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* 1. Header Filter Periode (Quick Filter Pills & Custom Date) */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Period Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <CalendarRange className="w-3.5 h-3.5 text-[#32A89C]" />
              Periode:
            </span>

            <button
              type="button"
              onClick={() => setPeriodFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                periodFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                periodFilter === 'THIS_MONTH'
                  ? 'bg-[#32A89C] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                periodFilter === 'LAST_MONTH'
                  ? 'bg-[#32A89C] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('THIS_YEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                periodFilter === 'THIS_YEAR'
                  ? 'bg-[#32A89C] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tahun Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                periodFilter === 'CUSTOM'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Custom</span>
            </button>
          </div>

          {/* Quick Active Filter Label */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-medium">Filter Aktif:</span>
            <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              {periodDateRange.label} ({displayTransactions.length} mutasi)
            </span>
          </div>
        </div>

        {/* Custom Date Inputs (only shown when periodFilter === 'CUSTOM') */}
        {periodFilter === 'CUSTOM' && (
          <div className="p-3 bg-white border border-indigo-100 rounded-xl flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Dari Tanggal:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Sampai Tanggal:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}

            {/* Error Message jika startDate > endDate */}
            {isDateRangeInvalid && (
              <div className="w-full text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Tanggal awal tidak boleh lebih besar dari tanggal akhir</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Secondary Table Controls Bar (Pocket Selector, Search, Type, Sort) */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 max-w-2xl">
          {/* Dropdown Selektor Kantong (Hanya Muncul di Tampilan Global Seluruh Mutasi) */}
          {!isSinglePocketView && pockets && pockets.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={activePocketFilter}
                onChange={(e) => setActivePocketFilter(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32A89C]/30 focus:border-[#32A89C] transition cursor-pointer shadow-2xs"
              >
                <option value="ALL">📁 Semua Kantong ({pockets.length})</option>
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.currencyCode})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isSinglePocketView
                  ? 'Cari transaksi atau memo...'
                  : 'Cari transaksi atau keterangan...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#32A89C]/30 focus:border-[#32A89C] transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedType === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('CREDIT')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedType === 'CREDIT'
                  ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('DEBET')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedType === 'DEBET'
                  ? 'bg-white text-rose-800 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Keluar
            </button>
          </div>

          {/* Quick Sort Toggle Button */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title={
              sortOrder === 'desc'
                ? 'Urutan: Data Terbaru ke Terlama'
                : 'Urutan: Data Terlama ke Terbaru'
            }
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#32A89C]" />
            <span className="hidden sm:inline">
              {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </span>
          </button>
        </div>
      </div>

      {/* 3A. Mobile Viewport (block sm:hidden) — Gaya Bank Jago */}
      <div className="block sm:hidden divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        {displayTransactions.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">
              {validTransactions.length === 0
                ? "Belum ada mutasi transaksi yang dibukukan. Klik '+ Masuk' pada salah satu kantong untuk memulai pencatatan."
                : 'Tidak ada mutasi yang sesuai dengan filter'}
            </p>
            {validTransactions.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Coba sesuaikan kata kunci pencarian, filter kantong, atau rentang periode tanggal.
              </p>
            )}
          </div>
        ) : (
          displayTransactions.map((tx) => {
            const rawAmount = Number(tx.nativeAmount ?? (tx as any).amount);
            const rawRate = Number(tx.exchangeRate ?? (tx as any).rate);
            if (isNaN(rawAmount) || rawAmount <= 0 || isNaN(rawRate)) {
              return null;
            }

            const isCredit = tx.type === 'CREDIT';

            return (
              <div
                key={tx.id}
                className="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors"
              >
                {/* Kiri: Ikon Panah & Keterangan */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 select-none ${
                      isCredit
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {isCredit ? '↙' : '↗'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans font-semibold text-xs text-slate-900 truncate leading-snug">
                      {tx.description || 'Mutasi Jurnal'}
                    </div>
                    <div className="font-sans text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{formatDate(tx.date)}</span>
                      {!isSinglePocketView && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200/60">
                          {tx.currency}
                        </span>
                      )}
                      {tx.currency !== 'IDR' && (
                        <span>· @Rp {formatRate(tx.exchangeRate, tx.currency)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kanan: Nominal Utama & Nilai IDR */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-sans font-bold text-xs tabular-nums ${
                      isCredit ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isCredit ? '+' : '-'} {formatNative(tx.nativeAmount, tx.currency)}
                  </div>
                  <div className="font-sans text-[11px] text-slate-400 tabular-nums mt-0.5">
                    ≈ {formatIdr(Math.abs(tx.costIdr))}
                  </div>
                </div>

                {/* Aksi Cepat: Edit & Hapus */}
                <div className="flex items-center gap-0.5 shrink-0 pl-1">
                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    title="Ubah transaksi"
                    aria-label="Edit"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxToDelete(tx)}
                    title="Hapus transaksi"
                    aria-label="Hapus"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Dynamic Footer Row khusus Mobile */}
        <div className="p-3 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            {totals.count} Baris Mutasi
          </span>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 mr-1.5">Net Cashflow:</span>
            <span className="font-sans font-bold tabular-nums text-slate-900">
              Rp {totals.netCashflowIdr.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* 3B. Desktop Table Viewport */}
      <div className="hidden sm:block">
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className={`w-full text-left border-collapse ${isSinglePocketView ? 'min-w-[680px]' : 'min-w-[860px]'}`}>
          <thead>
            <tr>
              {!isSinglePocketView && <th
                scope="col"
                onClick={() => handleSort('date')}
                className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                title="Klik untuk mengubah urutan tanggal (Terbaru / Terlama)"
              >
                <div className="flex items-center gap-1">
                  <span>TANGGAL</span>
                  {sortField === 'date' && (
                    <span className="text-[#32A89C] font-bold text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </div>
              </th>}

              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                KETERANGAN
              </th>
              {!isSinglePocketView && (
                <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  KANTONG
                </th>
              )}
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-center">
                TIPE
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-right">
                MASUK
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-right">
                KELUAR
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-right">
                KURS
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-right">
                TOTAL IDR
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-right">
                SALDO
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-center">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {displayTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={isSinglePocketView ? 8 : 10}
                  className="whitespace-nowrap px-3 py-12 text-xs text-slate-700 border-b border-slate-100 text-center bg-slate-50/50"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    {validTransactions.length === 0
                      ? "Belum ada mutasi transaksi. Buka rincian kantong untuk mencatat mutasi pertama."
                      : 'Tidak ada mutasi yang sesuai dengan filter'}
                  </p>
                  {validTransactions.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Coba sesuaikan kata kunci pencarian, filter kantong, atau rentang periode tanggal.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              displayTransactions.map((tx) => {
                const rawAmount = Number(tx.nativeAmount ?? (tx as any).amount);
                const rawRate = Number(tx.exchangeRate ?? (tx as any).rate);
                if (isNaN(rawAmount) || rawAmount <= 0 || isNaN(rawRate)) {
                  return null;
                }

                const isCredit = tx.type === 'CREDIT';
                const transactionPocket = pockets.find(
                  (pocket) => String(pocket.id).trim() === String(tx.pocketId).trim()
                );
                const pocketLabel = transactionPocket?.name || tx.currency;

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors align-middle group"
                  >
                    {!isSinglePocketView && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 font-sans tabular-nums align-middle">
                        {formatDate(tx.date)}
                      </td>
                    )}

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 align-middle max-w-[260px]">
                      <div className="font-medium text-slate-800 truncate" title={tx.description}>
                        {tx.description}
                      </div>
                      {isSinglePocketView && (
                        <div className="mt-0.5 text-[10px] text-slate-400 tabular-nums">
                          {formatDate(tx.date)}
                        </div>
                      )}
                      {tx.notes && <div className="text-[11px] text-slate-400 truncate" title={tx.notes}>{tx.notes}</div>}
                    </td>

                    {!isSinglePocketView && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 align-middle max-w-[230px]">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800" title={`${pocketLabel} (${tx.currency})`}>
                            {pocketLabel} <span className="font-medium text-slate-500">({tx.currency})</span>
                          </div>
                          {transactionPocket?.defaultCustodian && (
                            <div className="mt-0.5 truncate text-[10px] text-slate-400" title={transactionPocket.defaultCustodian}>
                              {transactionPocket.defaultCustodian}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-center align-middle">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isCredit
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isCredit ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>Masuk</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>Keluar</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums !text-emerald-600 align-middle">
                      {isCredit ? formatNative(tx.nativeAmount, tx.currency) : '-'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums !text-rose-600 align-middle">
                      {!isCredit ? formatNative(tx.nativeAmount, tx.currency) : '-'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans tabular-nums align-middle">
                      {tx.currency === 'IDR' ? '1.0' : `Rp ${formatRate(tx.exchangeRate, tx.currency)}`}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-medium tabular-nums align-middle">
                      {formatIdr(Math.abs(tx.costIdr))}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums align-middle">
                      {formatNative(tx.runningBalanceNative, tx.currency)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-center align-middle">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          title="Ubah transaksi"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxToDelete(tx)}
                          title="Hapus transaksi"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 text-slate-900 font-bold text-xs">
            <tr>
              <td
                colSpan={isSinglePocketView ? 2 : 4}
                className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 uppercase tracking-wider align-middle"
              >
                <div className="flex items-center gap-2">
                  <span>Total Rekapitulasi:</span>
                  <span className="text-[10px] font-sans font-semibold tabular-nums px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                    {totals.count} Baris Mutasi
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums !text-emerald-700 align-middle">
                {selectedCurrency !== 'ALL' && totals.count > 0
                  ? formatNative(totals.creditNative, selectedCurrency)
                  : `+ Rp ${totals.creditIdr.toLocaleString('id-ID')}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums !text-rose-700 align-middle">
                {selectedCurrency !== 'ALL' && totals.count > 0
                  ? formatNative(totals.debetNative, selectedCurrency)
                  : `- Rp ${totals.debetIdr.toLocaleString('id-ID')}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans align-middle">·</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-medium tabular-nums align-middle">
                Rp {totals.netCashflowIdr.toLocaleString('id-ID')}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-right font-sans font-semibold tabular-nums align-middle">
                {selectedCurrency !== 'ALL' && totals.count > 0
                  ? formatNative(totals.netNative, selectedCurrency)
                  : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 border-b border-slate-100 text-center align-middle"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Baris Transaksi?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Yakin ingin menghapus mutasi &ldquo;{txToDelete.description}&rdquo; ({formatDate(txToDelete.date)})?
                  Saldo berjalan dan kurs rata-rata akan otomatis dihitung ulang.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
