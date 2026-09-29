import React, { useState, useMemo } from 'react';
import { AssetPocket, LedgerTransaction, CurrencyType } from '../../types/ledger';
import { formatIdr, formatNative, formatRate } from '../../utils/formatters';
import {
  X,
  Printer,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface StatementDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: AssetPocket[];
  transactions: LedgerTransaction[];
  userEmail?: string;
}

type PeriodPreset = 'LAST_30_DAYS' | 'THIS_MONTH' | 'YTD' | 'ALL_TIME' | 'CUSTOM';

function formatCompactDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatPeriodDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const day = parts[2];
    const month = months[parseInt(parts[1], 10)] || parts[1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

function formatLongIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10)] || parts[1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

export const StatementDownloadModal: React.FC<StatementDownloadModalProps> = ({
  isOpen,
  onClose,
  pockets,
  transactions,
  userEmail = '-',
}) => {
  const [selectedPocketId, setSelectedPocketId] = useState<string>('ALL');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [activeTab, setActiveTab] = useState<'FILTER' | 'PREVIEW'>('PREVIEW');

  // Compute dates based on preset
  const { initialStart, initialEnd } = useMemo(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return { initialStart: startOfMonth, initialEnd: end };
  }, []);

  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);

  // Quick preset click handler
  const handleSelectPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const end = now.toISOString().slice(0, 10);

    if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(end);
    } else if (preset === 'THIS_MONTH') {
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(startOfMonth);
      setEndDate(end);
    } else if (preset === 'YTD') {
      const startOfYear = `${now.getFullYear()}-01-01`;
      setStartDate(startOfYear);
      setEndDate(end);
    } else if (preset === 'ALL_TIME') {
      setStartDate('2020-01-01');
      setEndDate(end);
    }
  };

  // Selected Pocket Info
  const selectedPocket = useMemo(() => {
    if (selectedPocketId === 'ALL') return null;
    return pockets.find((p) => p.id === selectedPocketId) || null;
  }, [pockets, selectedPocketId]);

  // 1. Prior Transactions (strictly before startDate) to calculate Saldo Awal
  const priorTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedPocketId !== 'ALL' && t.pocketId !== selectedPocketId) {
        return false;
      }
      return startDate ? t.date < startDate : false;
    });
  }, [transactions, selectedPocketId, startDate]);

  // Saldo Awal Calculation
  const initialBalance = useMemo(() => {
    let nativeBal = 0;
    let idrBal = 0;
    priorTransactions.forEach((t) => {
      const idrVal = Math.abs(t.costIdr ?? t.nativeAmount * (t.exchangeRate || 1));
      if (t.type === 'CREDIT') {
        nativeBal += t.nativeAmount;
        idrBal += idrVal;
      } else {
        nativeBal -= t.nativeAmount;
        idrBal -= idrVal;
      }
    });
    return { nativeBal, idrBal };
  }, [priorTransactions]);

  // 2. Period Transactions (within [startDate, endDate]) sorted chronologically
  const periodTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (selectedPocketId !== 'ALL' && t.pocketId !== selectedPocketId) {
          return false;
        }
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }, [transactions, selectedPocketId, startDate, endDate]);

  // 3. Ledger Rows with Running Balance & Totals
  const { ledgerRows, totalInNative, totalOutNative, totalInIdr, totalOutIdr, finalBalance } =
    useMemo(() => {
      let runningNative = initialBalance.nativeBal;
      let runningIdr = initialBalance.idrBal;
      let inNative = 0;
      let outNative = 0;
      let inIdr = 0;
      let outIdr = 0;

      const rows = periodTransactions.map((tx) => {
        const idrVal = Math.abs(tx.costIdr ?? tx.nativeAmount * (tx.exchangeRate || 1));
        const isCredit = tx.type === 'CREDIT';

        if (isCredit) {
          runningNative += tx.nativeAmount;
          runningIdr += idrVal;
          inNative += tx.nativeAmount;
          inIdr += idrVal;
        } else {
          runningNative -= tx.nativeAmount;
          runningIdr -= idrVal;
          outNative += tx.nativeAmount;
          outIdr += idrVal;
        }

        return {
          ...tx,
          isCredit,
          inNative: isCredit ? tx.nativeAmount : 0,
          outNative: isCredit ? 0 : tx.nativeAmount,
          inIdr: isCredit ? idrVal : 0,
          outIdr: isCredit ? 0 : idrVal,
          signedIdr: isCredit ? idrVal : -idrVal,
          runningBalanceNative: runningNative,
          runningBalanceIdr: runningIdr,
        };
      });

      return {
        ledgerRows: rows,
        totalInNative: inNative,
        totalOutNative: outNative,
        totalInIdr: inIdr,
        totalOutIdr: outIdr,
        finalBalance: {
          nativeBal: runningNative,
          idrBal: runningIdr,
        },
      };
    }, [periodTransactions, initialBalance]);

  // Document metadata
  const docTimestamp = useMemo(() => {
    const now = new Date();
    const dateFormatted = formatPeriodDate(now.toISOString().slice(0, 10));
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatted}, ${timeFormatted} WIB`;
  }, []);

  const printDateOnly = useMemo(() => {
    const now = new Date();
    return formatLongIndonesianDate(now.toISOString().slice(0, 10));
  }, []);

  const docId = useMemo(() => {
    const seed = (startDate + endDate + selectedPocketId).replace(/[^a-zA-Z0-9]/g, '');
    return `JWL-STM-${seed.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  }, [startDate, endDate, selectedPocketId]);

  // Trigger Print to PDF
  const handlePrintPdf = () => {
    setActiveTab('PREVIEW');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Trigger CSV Download
  const handleDownloadCsv = () => {
    if (periodTransactions.length === 0) return;

    const headers = [
      'Tanggal',
      'ID Mutasi',
      'Nama Kantong',
      'Kustodian',
      'Valas',
      'Tipe',
      'Mutasi Masuk',
      'Mutasi Keluar',
      'Kurs FX',
      'Ekuivalen IDR',
      'Keterangan / Memo',
    ];

    const rows = periodTransactions.map((tx) => {
      const targetPocket = pockets.find((p) => p.id === tx.pocketId);
      const pocketName = targetPocket?.name || tx.currency;
      const custodian = targetPocket?.defaultCustodian || targetPocket?.custodian || '-';
      const creditAmount = tx.type === 'CREDIT' ? tx.nativeAmount : 0;
      const debetAmount = tx.type === 'DEBET' ? tx.nativeAmount : 0;
      const combinedNote = `${tx.description || ''}${tx.notes ? ` (${tx.notes})` : ''}`.replace(
        /"/g,
        '""'
      );

      return [
        `"${tx.date}"`,
        `"${tx.id}"`,
        `"${pocketName.replace(/"/g, '""')}"`,
        `"${custodian.replace(/"/g, '""')}"`,
        `"${tx.currency}"`,
        `"${tx.type === 'CREDIT' ? 'MASUK' : 'KELUAR'}"`,
        creditAmount,
        debetAmount,
        tx.exchangeRate || 1,
        tx.costIdr || tx.nativeAmount * (tx.exchangeRate || 1),
        `"${combinedNote}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    let pocketNameLabel = 'Konsolidasi_Seluruh_Kantong';
    if (selectedPocketId !== 'ALL') {
      const p = pockets.find((item) => item.id === selectedPocketId);
      if (p) {
        pocketNameLabel = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      }
    }

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekening_Koran_${pocketNameLabel}_${startDate || 'awal'}_${endDate || 'akhir'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="statement-modal fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-300 flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in-95 duration-150">
        {/* Top Control Bar (Never Printed) */}
        <div className="no-print bg-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 font-sans">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Rekening Koran (E-Statement A4 &amp; CSV)
              </h2>
              <p className="text-[11px] text-slate-500">
                Laporan resmi mutasi buku besar aset dan arus kas portofolio
              </p>
            </div>
          </div>

          {/* Tab Switcher & Close Button */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau A4</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FILTER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'FILTER'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter Parameter</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5">
          {/* TAB 1: FILTER PARAMETER */}
          {activeTab === 'FILTER' && (
            <div className="no-print max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              {/* 1. Filter Kantong */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>1. Filter Kantong Aset</span>
                </label>
                <select
                  value={selectedPocketId}
                  onChange={(e) => setSelectedPocketId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                >
                  <option value="ALL">🏛️ Seluruh Kantong (Konsolidasi Multi-Aset Portofolio)</option>
                  {pockets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.flag || '💳'} {p.name} ({p.currencyCode} · {p.defaultCustodian || 'Kustodian'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Range Periode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>2. Rentang Periode Mutasi</span>
                </label>

                {/* Preset Cepat */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'THIS_MONTH' as PeriodPreset, label: 'Bulan Ini' },
                    { id: 'LAST_30_DAYS' as PeriodPreset, label: '30 Hari Terakhir' },
                    { id: 'YTD' as PeriodPreset, label: 'Tahun Berjalan (YTD)' },
                    { id: 'ALL_TIME' as PeriodPreset, label: 'Semua Waktu' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer text-center ${
                        periodPreset === item.id
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Input Tanggal Mulai & Selesai */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPeriodPreset('CUSTOM');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-sans shadow-2xs focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPeriodPreset('CUSTOM');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-sans shadow-2xs focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Terfilter: <span className="font-bold text-slate-800">{periodTransactions.length} mutasi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('PREVIEW')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Pratinjau Lembar A4</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 & PRINTABLE AREA: OFFICIAL A4 E-STATEMENT */}
          <div
            id="printable-statement"
            className={`statement-print-root min-h-[297mm] w-full max-w-[210mm] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 text-slate-900 font-sans tabular-nums text-[10px] leading-tight ${
              activeTab !== 'PREVIEW' ? 'hidden print:block' : 'block'
            }`}
          >
            {/* 1. HEADER RESMI A4 (CLEAN & MINIMALIS) */}
            <div className="border-b-2 border-slate-900 pb-3.5 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-jr.png"
                    alt="Logo Jago Rencana"
                    className="h-10 w-auto max-w-[120px] shrink-0 object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                        JAGO WEALTH LEDGER
                      </h1>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                        E-Statement Resmi
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Rekening Koran &amp; Laporan Mutasi Aset Portofolio
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    No. Referensi
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 tabular-nums">
                    {docId}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. KOTAK IDENTITAS KLIEN & PARAMETER STATEMENT (2 KOLOM LEBAR TANPA TEXT-WRAP) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {/* Baris 1: Klien & Periode */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 min-w-[65px]">
                    Klien:
                  </span>
                  <span className="font-medium text-slate-800 text-xs sm:text-[13px] truncate">
                    {userEmail}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 min-w-[65px]">
                    Periode:
                  </span>
                  <span className="font-medium text-slate-800 text-xs sm:text-[13px] tabular-nums">
                    {formatPeriodDate(startDate)} &ndash; {formatPeriodDate(endDate)}
                  </span>
                </div>

                {/* Baris 2: Kantong & Dicetak */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 min-w-[65px]">
                    Kantong:
                  </span>
                  <span className="font-medium text-slate-800 text-xs sm:text-[13px] truncate">
                    {selectedPocket
                      ? `${selectedPocket.flag || '💳'} ${selectedPocket.name} (${selectedPocket.currencyCode} · ${selectedPocket.defaultCustodian || selectedPocket.custodian || 'Kustodian'})`
                      : 'Seluruh Kantong (Konsolidasi Multi-Aset)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 min-w-[65px]">
                    Dicetak:
                  </span>
                  <span className="font-medium text-slate-800 text-xs sm:text-[13px] tabular-nums">
                    {docTimestamp}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. RINGKASAN MUTASI (4 KOTAK REKAPITULASI COMPACT) */}
            <div className="mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Saldo Awal */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Saldo Awal Periode
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 font-sans tabular-nums mt-0.5">
                    {formatIdr(initialBalance.idrBal)}
                  </div>
                  {selectedPocket && selectedPocket.currencyCode !== 'IDR' && (
                    <div className="text-[9.5px] text-slate-500 font-sans tabular-nums">
                      {formatNative(initialBalance.nativeBal, selectedPocket.currencyCode as CurrencyType)}{' '}
                      {selectedPocket.currencyCode}
                    </div>
                  )}
                </div>

                {/* Total Masuk */}
                <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                  <div className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    <span>Total Masuk (Kredit)</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-800 font-sans tabular-nums mt-0.5">
                    + {formatIdr(totalInIdr)}
                  </div>
                  {selectedPocket && selectedPocket.currencyCode !== 'IDR' && (
                    <div className="text-[9.5px] text-emerald-700 font-sans tabular-nums">
                      +{formatNative(totalInNative, selectedPocket.currencyCode as CurrencyType)}{' '}
                      {selectedPocket.currencyCode}
                    </div>
                  )}
                </div>

                {/* Total Keluar */}
                <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200">
                  <div className="text-[9.5px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    <span>Total Keluar (Debet)</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-rose-800 font-sans tabular-nums mt-0.5">
                    - {formatIdr(totalOutIdr)}
                  </div>
                  {selectedPocket && selectedPocket.currencyCode !== 'IDR' && (
                    <div className="text-[9.5px] text-rose-700 font-sans tabular-nums">
                      -{formatNative(totalOutNative, selectedPocket.currencyCode as CurrencyType)}{' '}
                      {selectedPocket.currencyCode}
                    </div>
                  )}
                </div>

                {/* Saldo Akhir */}
                <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 shadow-2xs">
                  <div className="text-[9.5px] font-bold text-slate-300 uppercase tracking-wider">
                    Saldo Akhir Periode
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-sans tabular-nums mt-0.5">
                    {formatIdr(finalBalance.idrBal)}
                  </div>
                  {selectedPocket && selectedPocket.currencyCode !== 'IDR' && (
                    <div className="text-[9.5px] text-emerald-400 font-sans tabular-nums">
                      {formatNative(finalBalance.nativeBal, selectedPocket.currencyCode as CurrencyType)}{' '}
                      {selectedPocket.currencyCode}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. TABEL JURNAL MUTASI (FIT 100% LEBAR A4 PORTRAIT, TABLE-LAYOUT: FIXED) */}
            <div className="mb-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed text-[9px] leading-tight tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10.5px]">
                      {/* 1. Tanggal (lebar ~85px) */}
                      <th className="py-2 px-2 whitespace-nowrap" style={{ width: '85px' }}>
                        Tanggal
                      </th>
                      {/* 2. Keterangan & Kantong */}
                      <th className="py-2 px-2.5">
                        Keterangan &amp; Kantong
                      </th>
                      {/* 3. Tipe (lebar ~55px) */}
                      <th className="py-2 px-1.5 whitespace-nowrap text-center" style={{ width: '55px' }}>
                        Tipe
                      </th>
                      {/* 4. Mutasi Valas (lebar ~115px) */}
                      <th className="py-2 px-2 whitespace-nowrap text-right" style={{ width: '115px' }}>
                        Mutasi Valas
                      </th>
                      {/* 5. Kurs FX (lebar ~90px) */}
                      <th className="py-2 px-2 whitespace-nowrap text-right" style={{ width: '90px' }}>
                        Kurs FX
                      </th>
                      {/* 6. Total Ekuivalen IDR (lebar ~120px) */}
                      <th className="py-2 px-2 whitespace-nowrap text-right" style={{ width: '120px' }}>
                        Ekuivalen IDR
                      </th>
                      {/* 7. Saldo Akhir Berjalan (lebar ~120px) */}
                      <th className="py-2 px-2 whitespace-nowrap text-right" style={{ width: '120px' }}>
                        Saldo Akhir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                          Tidak ada mutasi transaksi pada rentang periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((tx, idx) => {
                        const targetPocket = pockets.find((p) => p.id === tx.pocketId);
                        const currCode = tx.currency || targetPocket?.currencyCode || 'IDR';

                        return (
                          <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                            {/* 1. Tanggal: format DD/MM/YYYY */}
                            <td className="py-1.5 px-2 whitespace-nowrap font-medium text-slate-700">
                              {formatCompactDate(tx.date)}
                            </td>

                            {/* 2. Keterangan & Kantong (Baris 1: Keterangan, Baris 2: Nama Kantong • Kustodian) */}
                            <td className="py-1.5 px-2.5 text-slate-800 break-words leading-tight">
                              <div className="font-semibold text-slate-900 line-clamp-1">
                                {tx.description || 'Mutasi Kas'}
                              </div>
                              <div className="text-[9.5px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                <span className="font-medium text-slate-600">
                                  {targetPocket?.name || currCode}
                                </span>
                                <span>&bull;</span>
                                <span>{tx.location || targetPocket?.defaultCustodian || 'Kustodian'}</span>
                                {tx.notes && <span>&bull; {tx.notes}</span>}
                              </div>
                            </td>

                            {/* 3. Tipe: badge kecil IN / OUT */}
                            <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                                  tx.isCredit
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {tx.isCredit ? 'IN' : 'OUT'}
                              </span>
                            </td>

                            {/* 4. Mutasi Valas: nominal native */}
                            <td
                              className={`py-1.5 px-2 whitespace-nowrap text-right font-sans font-semibold tabular-nums ${
                                tx.isCredit ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {tx.isCredit ? '+ ' : '- '}
                              {currCode !== 'IDR'
                                ? `${currCode} ${formatNative(tx.nativeAmount, currCode as CurrencyType)}`
                                : `Rp ${formatIdr(tx.nativeAmount, false)}`}
                            </td>

                            {/* 5. Kurs FX: font tabular rapi */}
                            <td className="py-1.5 px-2 whitespace-nowrap text-right font-sans text-[10px] text-slate-600 tabular-nums">
                              {tx.exchangeRate && tx.exchangeRate > 1
                                ? `Rp ${formatRate(tx.exchangeRate, currCode as CurrencyType)}`
                                : '1,00'}
                            </td>

                            {/* 6. Total Ekuivalen IDR: nominal rupiah */}
                            <td
                              className={`py-1.5 px-2 whitespace-nowrap text-right font-sans font-semibold tabular-nums ${
                                tx.isCredit ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {tx.isCredit ? '+ ' : '- '}
                              {formatIdr(Math.abs(tx.costIdr || tx.nativeAmount * (tx.exchangeRate || 1)))}
                            </td>

                            {/* 7. Saldo Akhir: saldo berjalan */}
                            <td className="py-1.5 px-2 whitespace-nowrap text-right font-sans font-bold text-slate-900 tabular-nums">
                              <div>{formatIdr(tx.runningBalanceIdr)}</div>
                              {selectedPocket && selectedPocket.currencyCode !== 'IDR' && (
                                <div className="text-[9px] font-normal text-slate-500 font-sans tabular-nums">
                                  {selectedPocket.currencyCode}{' '}
                                  {formatNative(tx.runningBalanceNative, selectedPocket.currencyCode as CurrencyType)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {ledgerRows.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-bold border-t border-slate-300 text-slate-900 text-[10.5px]">
                      <tr>
                        <td colSpan={3} className="py-2 px-2.5 text-slate-700 uppercase">
                          Akumulasi Mutasi Periode
                        </td>
                        <td className="py-2 px-2 text-right text-slate-800 tabular-nums font-sans">
                          {selectedPocket && selectedPocket.currencyCode !== 'IDR'
                            ? `${selectedPocket.currencyCode} ${formatNative(totalInNative - totalOutNative, selectedPocket.currencyCode as CurrencyType)}`
                            : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-400 font-sans tabular-nums">-</td>
                        <td className="py-2 px-2 text-right tabular-nums font-sans">
                          {formatIdr(totalInIdr - totalOutIdr)}
                        </td>
                        <td className="py-2 px-2 text-right font-black tabular-nums font-sans">
                          {formatIdr(finalBalance.idrBal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 5. FOOTER DOKUMEN & DISCLAIMER PERBANKAN FORMAL (CLEAN & MINIMALIS) */}
            <div className="pt-3 border-t border-slate-200 mt-4 text-[10px] text-slate-500 leading-relaxed">
              <p className="text-slate-600">
                Dokumen rekening koran elektronik ini diterbitkan secara otomatis sebagai catatan mutasi
                kepemilikan aset dan arus kas pribadi. Seluruh data disinkronkan secara independen oleh sistem Jago
                Wealth Ledger.
              </p>
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[9.5px] text-slate-400">
                <span>Dicetak pada {printDateOnly}</span>
                <span>Jago Wealth Ledger</span>
                <span>Halaman 1 dari 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer (Dua Opsi Output: PDF Primary, CSV Secondary) */}
        <div className="no-print px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-sans">
            Total <strong className="text-slate-800">{periodTransactions.length} mutasi</strong> ({formatPeriodDate(startDate)} &ndash; {formatPeriodDate(endDate)})
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>

            {/* Tombol 2: Unduh File CSV (Secondary button) */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={periodTransactions.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-2xs transition cursor-pointer active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>📊 Unduh File CSV</span>
            </button>

            {/* Tombol 1: Cetak / Simpan PDF Statement (Primary button) */}
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={periodTransactions.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition cursor-pointer active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>📄 Cetak / Simpan PDF Statement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
