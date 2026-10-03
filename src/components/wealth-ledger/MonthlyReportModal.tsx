import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CurrencyPocketSummary,
  LedgerTransaction,
} from '../../types/ledger';
import {
  formatDate,
  formatIdr,
  formatPercent,
  formatRate,
  getPocketTypeLabel,
  formatPocketBalance,
} from '../../utils/formatters';
import {
  Printer,
  X,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: CurrencyPocketSummary[];
  transactions: LedgerTransaction[];
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  pockets,
  transactions,
}) => {
  const now = new Date();
  // 1-indexed month (1 = Jan, 12 = Des)
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const monthNames = [
    '',
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const periodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
  const todayDateStr = now.toISOString().split('T')[0];
  const currentDateStr = formatDate(todayDateStr);

  // =========================================================================
  // 3. LOGIKA HISTORICAL CUT-OFF BULANAN (TUTUP BUKU RIIL)
  // =========================================================================
  // Tentukan tanggal cut-off akhir bulan yang dipilih
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const periodEndDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const cutOffDateStr = periodEndDateStr < todayDateStr ? periodEndDateStr : todayDateStr;
  const firstDayDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const isClosedPeriod = periodEndDateStr < todayDateStr;
  const positionBasisLabel = isClosedPeriod
    ? `Posisi akhir bulan per ${formatDate(cutOffDateStr)}`
    : `Posisi berjalan per ${formatDate(cutOffDateStr)}`;

  // 1. NERACA POSISI ASET (SALDO HISTORIS PER KANTONG HINGGA CUT-OFF)
  const historicalData = useMemo(() => {
    let totalMarketValue = 0;
    let totalCostBasis = 0;

    const items = pockets.map((p) => {
      // Filter mutasi kantong ini dengan tanggal <= cutOffDateStr
      const pocketTxUpToCutoff = transactions.filter(
        (t) =>
          (t.pocketId === p.pocketId || (!t.pocketId && t.currency === p.currency)) &&
          t.date <= cutOffDateStr
      );

      // Saldo native per cut-off
      const historicalBalanceNative = pocketTxUpToCutoff.reduce((acc, t) => {
        return t.type === 'CREDIT' ? acc + t.nativeAmount : acc - t.nativeAmount;
      }, 0);

      // Moving average cost basis up to cut-off
      let runningBal = 0;
      let runningCost = 0;
      const sortedTx = [...pocketTxUpToCutoff].sort((a, b) => a.date.localeCompare(b.date));

      sortedTx.forEach((tx) => {
        const cost = Math.abs(tx.costIdr ?? (tx.nativeAmount * tx.exchangeRate));
        if (tx.type === 'CREDIT') {
          runningBal += tx.nativeAmount;
          runningCost += cost;
        } else {
          // DEBET: kurangi proporsional dengan moving average cost
          if (runningBal > 0) {
            const avgCostRate = runningCost / runningBal;
            runningCost = Math.max(0, runningCost - tx.nativeAmount * avgCostRate);
          }
          runningBal = Math.max(0, runningBal - tx.nativeAmount);
        }
      });

      const historicalCostBasisIdr = historicalBalanceNative > 0 ? runningCost : 0;
      // Gunakan nilai pasar per unit dari summary aktif. Ini menghormati manual Market Value/NAB,
      // sementara valas native tetap mengikuti kurs spot pusat terbaru.
      const valuationRate = p.balanceNative > 0 && p.marketValueIdr > 0
        ? p.marketValueIdr / p.balanceNative
        : p.currency === 'IDR'
          ? 1
          : (p.currentMarketRate || p.averageBuyRate || 1);
      const historicalMarketValueIdr = historicalBalanceNative > 0
        ? historicalBalanceNative * valuationRate
        : 0;
      const categoryLabel = getPocketTypeLabel(p.currency, p.instrumentType);

      totalMarketValue += historicalMarketValueIdr;
      totalCostBasis += historicalCostBasisIdr;

      return {
        ...p,
        historicalBalanceNative,
        historicalCostBasisIdr,
        historicalMarketValueIdr,
        spotRate: valuationRate,
        categoryLabel,
      };
    });

    const floatingPnl = totalMarketValue - totalCostBasis;
    const floatingPnlPercent =
      totalCostBasis > 0 ? (floatingPnl / totalCostBasis) * 100 : 0;

    return {
      items,
      totalMarketValue,
      totalCostBasis,
      floatingPnl,
      floatingPnlPercent,
    };
  }, [pockets, transactions, cutOffDateStr]);

  const groupedAssets = useMemo(() => {
    const order = [
      'Kas & Tabungan Rupiah', 'Kas Valas', 'Investasi (Reksa Dana, Saham & ETF)',
      'Sinking Fund', 'Logam Mulia', 'Aset Fisik & Operasional',
    ];
    const groups = new Map<string, typeof historicalData.items>();
    historicalData.items.forEach((item) => {
      const key = /reksa\s*dana|reksadana|efek|saham|etf/i.test(item.categoryLabel)
        ? 'Investasi (Reksa Dana, Saham & ETF)'
        : item.categoryLabel || 'Lainnya';
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });
    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items,
        total: items.reduce((sum, item) => sum + item.historicalMarketValueIdr, 0),
        cost: items.reduce((sum, item) => sum + item.historicalCostBasisIdr, 0),
      }))
      .sort((a, b) => {
        const aIndex = order.indexOf(a.label);
        const bIndex = order.indexOf(b.label);
        return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
      });
  }, [historicalData.items]);

  // 2. REKAPITULASI ARUS KAS (HANYA MUTASI PADA BULAN TERPILIH)
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.date >= firstDayDateStr && t.date <= cutOffDateStr
    );
  }, [transactions, firstDayDateStr, cutOffDateStr]);

  const monthlyInflow = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((acc, t) => acc + Math.abs(t.costIdr ?? (t.nativeAmount * t.exchangeRate)), 0);
  }, [currentMonthTransactions]);

  const monthlyOutflow = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'DEBET')
      .reduce((acc, t) => acc + Math.abs(t.costIdr ?? (t.nativeAmount * t.exchangeRate)), 0);
  }, [currentMonthTransactions]);

  const monthlyNet = monthlyInflow - monthlyOutflow;

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="monthly-report-modal fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Container Preview Dialog (Hidden on Print except printable sheet) */}
      <div className="bg-slate-100 rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col h-[94vh]">
        {/* Top Control Bar (Never Printed) */}
        <div className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 font-sans shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#32A89C] flex items-center justify-center text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Laporan Portofolio Aset Bulanan (PDF A4)
              </h2>
              <p className="text-[11px] text-slate-500">
                Format neraca resmi A4 institusional siap cetak &amp; arsip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Periode Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                {monthNames.slice(1).map((m, idx) => (
                  <option
                    key={m}
                    value={idx + 1}
                    disabled={selectedYear === now.getFullYear() && idx + 1 > now.getMonth() + 1}
                  >
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: Math.max(1, now.getFullYear() - 2023) }, (_, idx) => 2024 + idx).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              title="Pada dialog cetak browser, nonaktifkan opsi Headers and footers agar URL dan tanggal browser tidak tercetak."
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#32A89C] hover:bg-[#288a80] rounded-lg shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="report-preview-scroll overflow-y-auto flex-1 min-h-0 p-3 sm:p-6 bg-slate-200/70">
          {/* Printable Sheet (Standard A4 Dimension emulation) */}
          <div
            id="printable-monthly-report"
            className="monthly-report-print-root mx-auto w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 bg-white text-slate-900 shadow-xl border border-slate-200/80 rounded-xl space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-0 print:overflow-visible print:rounded-none font-sans tabular-nums"
          >
            {/* 1. Header Dokumen Resmi */}
            <div className="report-document-header flex items-start justify-between border-b-2 border-slate-900 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <img src="/reporticon.png" alt="Jago Rencana" className="h-10 w-auto max-w-[160px] object-contain shrink-0" />
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
                    Wealth Ledger
                  </h1>
                </div>
                <div className="text-xs font-semibold text-slate-600 tracking-wide uppercase font-sans">
                  Laporan Portofolio Aset Bulanan
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Jago Rencana &middot; Consolidated Multi-Asset Portfolio Statement
                </div>
              </div>

              <div className="text-right space-y-1 text-xs font-sans">
                <div className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded inline-block text-xs font-sans">
                  Periode: {periodLabel}
                </div>
                <div className="text-slate-500 text-[11px] font-sans">
                  Tanggal Cetak: <span className="font-semibold text-slate-700">{currentDateStr}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Basis: <span className="font-sans tabular-nums font-medium text-slate-600">{positionBasisLabel}</span>
                </div>
              </div>
            </div>

            {/* 2. Ringkasan Valuasi Portofolio (3 Kotak Metrik Sejajar) */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                I. Ringkasan Nilai Kekayaan
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Metrik 1: Total Net Worth Riil */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                    Nilai Pasar Portofolio
                  </div>
                  <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-slate-900 mt-1">
                    {formatIdr(historicalData.totalMarketValue)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    {positionBasisLabel}
                  </div>
                </div>

                {/* Metrik 2: Total Modal Pokok (Cost) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                    Total Modal Pokok (Cost)
                  </div>
                  <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-slate-900 mt-1">
                    {formatIdr(historicalData.totalCostBasis)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    Modal bersih (Moving Avg Cost)
                  </div>
                </div>

                {/* Metrik 3: Floating Profit/Loss */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between font-sans">
                    <span>Floating Profit / Loss</span>
                    {historicalData.floatingPnl >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-600" />
                    )}
                  </div>
                  <div
                    className={`text-base sm:text-lg font-bold font-sans tabular-nums mt-1 ${
                      historicalData.floatingPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatIdr(historicalData.floatingPnl)}
                  </div>
                  <div
                    className={`text-[10px] font-bold font-sans tabular-nums mt-0.5 ${
                      historicalData.floatingPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    Return: {formatPercent(historicalData.floatingPnlPercent)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tabel Neraca Posisi Aset (Breakdown per Kantong) */}
            <div className="report-asset-section">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                II. Neraca Posisi Aset per Kategori
              </div>
              <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900">
                <strong>{positionBasisLabel}.</strong> Saldo menggunakan transaksi hingga tanggal tersebut. Nilai pasar memakai NAB/manual market value terakhir dan kurs spot pada saat laporan dicetak, karena histori harga pasar harian belum disimpan.
              </div>
              <div className="report-asset-table w-full border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 font-sans">
                      <th className="w-[21%] py-2.5 px-2">Kantong</th>
                      <th className="w-[17%] py-2.5 px-2">Kustodian</th>
                      <th className="w-[15%] py-2.5 px-2 text-right">Saldo Native</th>
                      <th className="w-[12%] py-2.5 px-2 text-right">Rate Valuasi</th>
                      <th className="w-[18%] py-2.5 px-2 text-right">Nilai Pasar IDR</th>
                      <th className="w-[7%] py-2.5 px-1 text-right">Porsi</th>
                      <th className="w-[10%] py-2.5 px-1 text-right">Floating P/L (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedAssets.map((group) => (
                      <React.Fragment key={group.label}>
                        <tr className="asset-category-row bg-slate-800 text-white">
                          <td colSpan={4} className="px-2.5 py-1.5 font-bold uppercase tracking-wide">
                            {group.label}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold">{formatIdr(group.total)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">
                            {historicalData.totalMarketValue > 0 ? `${((group.total / historicalData.totalMarketValue) * 100).toFixed(1)}%` : '0.0%'}
                          </td>
                          <td className="px-1 py-1.5 text-right font-semibold whitespace-nowrap">
                            {group.cost > 0 ? formatPercent(((group.total - group.cost) / group.cost) * 100) : '—'}
                          </td>
                        </tr>
                        {group.items.map((p) => {
                      const sharePercent =
                        historicalData.totalMarketValue > 0
                          ? (p.historicalMarketValueIdr / historicalData.totalMarketValue) * 100
                          : 0;

                      return (
                        <tr key={p.pocketId} className="report-pocket-row hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 font-semibold text-slate-800 font-sans">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center font-sans text-[9px] leading-none font-bold bg-slate-100 rounded text-slate-700 border border-slate-200">
                                {p.currency}
                              </span>
                              <span className="min-w-0 truncate font-sans" title={p.name || p.currencyName}>{p.name || p.currencyName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-[11px] text-slate-600 font-sans">
                            <div className="truncate" title={p.defaultCustodian || '—'}>
                              {p.defaultCustodian || '—'}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-medium tabular-nums text-slate-800">
                            {formatPocketBalance(
                              p.historicalBalanceNative,
                              p.currency,
                              p.instrumentType,
                              p.symbol
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-medium tabular-nums text-slate-500 text-[10px]">
                            {`Rp ${formatRate(p.spotRate, p.currency)}`}
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-bold tabular-nums text-slate-900">
                            {formatIdr(p.historicalMarketValueIdr)}
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-medium tabular-nums text-slate-700">
                            {sharePercent.toFixed(1)}%
                          </td>
                          <td className={`py-2 px-1 text-right font-semibold tabular-nums whitespace-nowrap ${p.historicalMarketValueIdr >= p.historicalCostBasisIdr ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {p.historicalCostBasisIdr > 0
                              ? formatPercent(((p.historicalMarketValueIdr - p.historicalCostBasisIdr) / p.historicalCostBasisIdr) * 100)
                              : '—'}
                          </td>
                        </tr>
                      );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 uppercase text-[11px] font-sans">
                        Total Akumulasi Portofolio:
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans font-bold tabular-nums text-sm text-slate-900">
                        {formatIdr(historicalData.totalMarketValue)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-sans font-bold tabular-nums text-slate-900">
                        {historicalData.totalMarketValue > 0 ? '100.0%' : '0.0%'}
                      </td>
                      <td className="py-2.5 px-1 text-right tabular-nums whitespace-nowrap">
                        {historicalData.totalCostBasis > 0 ? formatPercent(historicalData.floatingPnlPercent) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Rekapitulasi Arus Kas Bulan Berjalan */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                III. Rekapitulasi Arus Kas Bulan Berjalan ({periodLabel})
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                  <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    <span>Dana Masuk (Inflow)</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold font-sans tabular-nums text-emerald-800 mt-1">
                    + {formatIdr(monthlyInflow)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5 font-sans">
                    Kredit {periodLabel}
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-lg">
                  <div className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <ArrowUpRight className="w-3 h-3 text-rose-600" />
                    <span>Dana Keluar (Outflow)</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold font-sans tabular-nums text-rose-800 mt-1">
                    - {formatIdr(monthlyOutflow)}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5 font-sans">
                    Debet {periodLabel}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <Wallet className="w-3 h-3 text-slate-500" />
                    <span>Arus Kas Bersih (Net)</span>
                  </div>
                  <div
                    className={`text-sm sm:text-base font-bold font-sans tabular-nums mt-1 ${
                      monthlyNet >= 0
                        ? 'text-slate-900'
                        : 'text-rose-700'
                    }`}
                  >
                    {formatIdr(monthlyNet)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                    {currentMonthTransactions.length} transaksi tercatat
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Catatan Kepatuhan Finansial (Footer Resmi Institusional) */}
            <div className="mt-8 pt-4 border-t border-slate-200 space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-sans">
              <div className="font-bold text-slate-700 uppercase tracking-wider font-sans">
                Catatan Kepatuhan Finansial &amp; Pernyataan Buku Besar:
              </div>
              <p className="font-medium text-slate-600">
                Catatan Valuasi: saldo dihitung berdasarkan transaksi hingga tanggal posisi. Nilai pasar memakai input valuasi manual/NAB terakhir serta kurs spot yang tersedia saat laporan dibuat.
              </p>
              <p>
                Laporan ini dihasilkan otomatis oleh <strong>Wealth Ledger - Jago Rencana</strong>. Nilai pasar bukan histori harga pada tanggal lampau kecuali sumber harga historis secara eksplisit tersedia; angka ditujukan untuk rekonsiliasi internal dan analisis portofolio.
              </p>
              <p>
                Dokumen ini disusun untuk keperluan pemantauan dan rekonsiliasi kekayaan pribadi (for private wealth tracking only) tanpa memuat penawaran atau nasihat investasi perbankan publik.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] text-slate-400 font-sans tabular-nums">
                <span>Dokumen ID: JWL-RPT-{selectedYear}{String(selectedMonth).padStart(2, '0')}-{Date.now().toString().slice(-6)}</span>
                <span>Wealth Ledger &middot; Jago Rencana</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
