import React, { useState, useMemo } from 'react';
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
  Landmark,
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
  const currentDateStr = formatDate(now.toISOString().split('T')[0]);

  // =========================================================================
  // 3. LOGIKA HISTORICAL CUT-OFF BULANAN (TUTUP BUKU RIIL)
  // =========================================================================
  // Tentukan tanggal cut-off akhir bulan yang dipilih
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const cutOffDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const firstDayDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

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
      const spotRate = p.currency === 'IDR' ? 1 : (p.currentMarketRate || 1);
      const historicalMarketValueIdr =
        p.currency === 'IDR'
          ? historicalBalanceNative
          : historicalBalanceNative * spotRate;

      totalMarketValue += historicalMarketValueIdr;
      totalCostBasis += historicalCostBasisIdr;

      return {
        ...p,
        historicalBalanceNative,
        historicalCostBasisIdr,
        historicalMarketValueIdr,
        spotRate,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Container Preview Dialog (Hidden on Print except printable sheet) */}
      <div className="bg-slate-100 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Never Printed) */}
        <div className="no-print bg-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 font-sans">
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
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
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
        <div className="overflow-y-auto p-3 sm:p-6 flex justify-center bg-slate-200/70">
          {/* Printable Sheet (Standard A4 Dimension emulation) */}
          <div
            id="printable-monthly-report"
            className="w-full max-w-[820px] max-h-[88vh] overflow-y-auto p-6 sm:p-10 pb-20 bg-white text-slate-900 shadow-xl border border-slate-200/80 rounded-2xl space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:max-h-none print:overflow-visible print:rounded-none font-sans"
          >
            {/* 1. Header Dokumen Resmi */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#32A89C] flex items-center justify-center text-white print:bg-slate-900">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight font-sans">
                    JAGO WEALTH LEDGER
                  </h1>
                </div>
                <div className="text-xs font-semibold text-slate-600 tracking-wide uppercase font-sans">
                  Monthly Asset &amp; Wealth Statement
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Independently Recorded Portfolio &middot; Multi-Currency General Ledger
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
                  Cut-off: <span className="font-sans tabular-nums font-medium text-slate-600">{cutOffDateStr}</span>
                </div>
              </div>
            </div>

            {/* 2. Ringkasan Valuasi Portofolio (3 Kotak Metrik Sejajar) */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                I. Ringkasan Posisi Nilai Kekayaan (Portfolio Net Worth)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Metrik 1: Total Net Worth Riil */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                    Total Net Worth Riil
                  </div>
                  <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-slate-900 mt-1">
                    {formatIdr(historicalData.totalMarketValue)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    Nilai pasar per {cutOffDateStr}
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
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                II. Neraca Posisi Aset Portofolio (Saldo per {cutOffDateStr})
              </div>
              <div className="overflow-x-auto w-full border border-slate-200 rounded-lg">
                <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 font-sans">
                      <th className="py-2.5 px-3">Nama Kantong</th>
                      <th className="py-2.5 px-2">Kategori</th>
                      <th className="py-2.5 px-2">Kustodian / Bank</th>
                      <th className="py-2.5 px-3 text-right">Saldo Native</th>
                      <th className="py-2.5 px-2 text-right">Kurs Spot</th>
                      <th className="py-2.5 px-3 text-right">Nilai Pasar (IDR)</th>
                      <th className="py-2.5 px-2 text-right">Porsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicalData.items.map((p) => {
                      const sharePercent =
                        historicalData.totalMarketValue > 0
                          ? (p.historicalMarketValueIdr / historicalData.totalMarketValue) * 100
                          : 0;

                      return (
                        <tr key={p.pocketId} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                                {p.currency}
                              </span>
                              <span className="font-sans">{p.name || p.currencyName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-[11px] text-slate-600 font-sans">
                            {getPocketTypeLabel(p.currency, p.instrumentType)}
                          </td>
                          <td className="py-2 px-2 text-[11px] text-slate-600 font-sans">
                            {p.defaultCustodian || 'CIMB Niaga'}
                          </td>
                          <td className="py-2 px-3 text-right font-sans font-medium tabular-nums text-slate-800">
                            {formatPocketBalance(
                              p.historicalBalanceNative,
                              p.currency,
                              p.instrumentType,
                              p.symbol
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-medium tabular-nums text-slate-500 text-[11px]">
                            {p.currency === 'IDR'
                              ? '1.0'
                              : `Rp ${formatRate(p.spotRate, p.currency)}`}
                          </td>
                          <td className="py-2 px-3 text-right font-sans font-bold tabular-nums text-slate-900">
                            {formatIdr(p.historicalMarketValueIdr)}
                          </td>
                          <td className="py-2 px-2 text-right font-sans font-medium tabular-nums text-slate-700">
                            {sharePercent.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={5} className="py-2.5 px-3 uppercase text-[11px] font-sans">
                        Total Akumulasi Portofolio:
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans font-bold tabular-nums text-sm text-slate-900">
                        {formatIdr(historicalData.totalMarketValue)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-sans font-bold tabular-nums text-slate-900">
                        {historicalData.totalMarketValue > 0 ? '100.0%' : '0.0%'}
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
                Catatan Valuasi: Saldo portofolio dihitung per cut-off tanggal akhir bulan terpilih, dinilai menggunakan indikasi kurs pasar spot saat laporan ini dibuat.
              </p>
              <p>
                Laporan ini dihasilkan secara otomatis oleh sistem <strong>Jago Wealth Ledger</strong> sebagai buku besar independen pemegang aset. Seluruh valuasi aset valas dan logam mulia dihitung berdasarkan kurs pasar acuan spot terkini serta prinsip pencatatan moving average cost basis perpetual hingga batas cut-off periode bersangkutan.
              </p>
              <p>
                Dokumen ini disusun untuk keperluan pemantauan dan rekonsiliasi kekayaan pribadi (for private wealth tracking only) tanpa memuat penawaran atau nasihat investasi perbankan publik.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] text-slate-400 font-sans tabular-nums">
                <span>Dokumen ID: JWL-RPT-{selectedYear}{String(selectedMonth).padStart(2, '0')}-{Date.now().toString().slice(-6)}</span>
                <span>Halaman 1 dari 1 &middot; Jago Wealth Ledger Pro v2.4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
