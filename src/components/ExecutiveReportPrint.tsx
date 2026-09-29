import React, { useMemo } from 'react';
import { Printer, ShieldCheck, Download, CheckCircle2, Circle, FileText, Sparkles, Building2, Layers, AlertTriangle } from 'lucide-react';
import { ClientProfile, BudgetState, SinkingFundGoal, KprSimulationState, ActionItem, FinancialHealthMetrics } from '../types';
import { formatRupiah, calculateTotals, simulateKprScenario, auditFinancialPyramid } from '../utils/calculations';
import { usePortal } from '../context/PortalContext';
import { resolveDisplayHealthScore } from '../utils/healthScoreCalculator';

interface ExecutiveReportPrintProps {
  client?: ClientProfile;
  budget?: BudgetState;
  goals?: SinkingFundGoal[];
  kpr?: KprSimulationState;
  actions?: ActionItem[];
  metrics?: FinancialHealthMetrics;
}

export const ExecutiveReportPrint: React.FC<ExecutiveReportPrintProps> = (props) => {
  const portal = usePortal();

  const client = props.client || portal.profile;
  const budget = props.budget || portal.masterBudget;
  const goals = props.goals || portal.sinkingFunds || [];
  const kpr = props.kpr || portal.kprData;
  const actions = props.actions || portal.checklist30D || [];
  const metrics = props.metrics || portal.metrics;
  const displayHealth = resolveDisplayHealthScore(metrics, portal.baselineAudit, portal.hasUserOptimized);
  const reportIssueDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totals = calculateTotals(budget, goals);
  const kprResult = simulateKprScenario(kpr);
  const pyramidAudit = useMemo(() => {
    return auditFinancialPyramid(budget, metrics?.totalLiquidAssets || 0);
  }, [budget, metrics?.totalLiquidAssets]);

  // Modern 4-Bucket Cashflow Totals & Net Cashflow Calculation
  const total4Pos = totals.totalLiving + totals.totalDebt + totals.totalSinkingFundNeed + totals.totalLifestyle;
  const total4PosPct = budget?.monthlyNetIncome > 0 ? (total4Pos / budget.monthlyNetIncome) * 100 : 0;
  const netCashflow = (budget?.monthlyNetIncome || 0) - total4Pos;
  const netCashflowPct = budget?.monthlyNetIncome > 0 ? (Math.abs(netCashflow) / budget.monthlyNetIncome) * 100 : 0;
  const isSurplus = netCashflow >= 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Interactive Toolbar (Hidden during Print) */}
      <div className="no-print bg-white rounded-2xl p-5 sm:p-7 border border-[#E5E0D8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black tracking-wider uppercase text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
              Institutional Deliverable
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              VIP Executive Wealth Blueprint & PDF Engine
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dokumen Blueprint Perencanaan Keuangan Komprehensif
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Format A4 standar institusional yang siap dicetak atau disimpan sebagai arsip PDF resmi.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="h-11 px-6 rounded-full bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto"
        >
          <Printer className="w-4 h-4 text-[#32A89C]" />
          <span>🖨️ Cetak / Download PDF Blueprint</span>
        </button>
      </div>

      {/* INSTITUTIONAL A4 PRINTABLE DOCUMENT CONTAINER */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#E5E0D8] shadow-sm max-w-5xl mx-auto print-card text-slate-900">
        {/* Document Header */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
          <div className="flex items-start gap-4">
            <img
              src="/logo-jr.png"
              alt="Jago Rencana"
              className="h-10 w-auto max-w-[128px] object-contain"
            />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                JAGO RENCANA
              </h2>
              <p className="text-xs uppercase font-bold tracking-widest text-[#1D6E66]">
                Institutional Wealth Advisory & Financial Planning OS
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Jakarta • Surabaya • Bandung | www.jagorencana.id
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-[#E8F7F5] border border-[#32A89C]/30 text-[#1D6E66] text-xs font-black uppercase tracking-wider rounded-lg mb-1">
              VIP BLUEPRINT OS
            </span>
            <p className="text-xs font-bold text-slate-900">Dokumen ID: {client.id}</p>
            <p className="text-[11px] text-slate-500">Tanggal Terbit: {reportIssueDate}</p>
          </div>
        </div>

        {/* Client Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-[#E5E0D8] text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Klien</span>
            <span className="font-bold text-slate-900">{client.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Kota Domisili</span>
            <span className="font-semibold text-slate-800">{client.city}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Keluarga</span>
            <span className="font-semibold text-slate-800">{client.maritalStatus} (Usia {client.age} Thn)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Advisory Desk</span>
            <span className="font-bold text-slate-900">Jago Rencana Private Wealth</span>
          </div>
        </div>

        {/* SECTION 1: EXECUTIVE FINANCIAL SUMMARY & KEY RATIOS */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#32A89C]" />
            1. Diagnostik Kesehatan Finansial & Rasio Kunci
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Skor Kesehatan</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">{displayHealth.score}/100</span>
              <span className="text-[11px] font-bold text-[#1D6E66] block mt-0.5">{displayHealth.status}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Debt Service Ratio (DSR)</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">{metrics.debtServiceRatio}%</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Batas Ideal: &lt;30%</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Dana Darurat Terlindungi</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">{metrics.emergencyFundMonths} bln</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">{formatRupiah(metrics.emergencyFundAmount, true)} cair</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Estimasi Net Worth</span>
              <span className="text-xl font-black text-slate-900 tabular-nums">{formatRupiah(metrics.netWorth, true)}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Aset Bersih</span>
            </div>
          </div>
        </div>

        {/* SECTION 1.5: 3-TIER FINANCIAL PYRAMID AUDIT */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0F1A24]" />
            2. Evaluasi Piramida Ketahanan Finansial (Institutional Standard)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Lapis 1 • Proteksi</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pyramidAudit.tier1Protection.statusColor}20`, color: pyramidAudit.tier1Protection.statusColor }}>
                  {pyramidAudit.tier1Protection.status}
                </span>
              </div>
              <p className="font-bold text-slate-900">{pyramidAudit.tier1Protection.covered ? 'Asuransi / BPJS Terpenuhi' : 'Belum Ada Pos Asuransi'}</p>
              <p className="text-[11px] text-slate-500 mt-1">{pyramidAudit.tier1Protection.description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Lapis 2 • Likuiditas</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pyramidAudit.tier2EmergencyFund.statusColor}20`, color: pyramidAudit.tier2EmergencyFund.statusColor }}>
                  {pyramidAudit.tier2EmergencyFund.status}
                </span>
              </div>
              <p className="font-bold text-slate-900">{pyramidAudit.tier2EmergencyFund.months} Bulan Biaya Hidup</p>
              <p className="text-[11px] text-slate-500 mt-1">Saldo cadangan: {formatRupiah(pyramidAudit.tier2EmergencyFund.amount, true)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Lapis 3 • Cash Drag</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pyramidAudit.tier3CashDrag.statusColor}20`, color: pyramidAudit.tier3CashDrag.statusColor }}>
                  {pyramidAudit.tier3CashDrag.status}
                </span>
              </div>
              <p className="font-bold text-slate-900">
                {pyramidAudit.tier3CashDrag.hasCashDrag ? `Idle: ${formatRupiah(pyramidAudit.tier3CashDrag.idleCash, true)}` : 'Kas Sangat Optimal'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {pyramidAudit.tier3CashDrag.hasCashDrag ? `Potensi return M-Fund: +${formatRupiah(pyramidAudit.tier3CashDrag.annualPassiveIncomePotential, true)}/thn` : 'Tidak ada kas menganggur.'}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: 4-BUCKET MASTER BUDGETING SNAPSHOT */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#32A89C]" />
              3. Alokasi Cashflow Bulanan (Modern 4-Bucket Framework)
            </h3>
            <span className="text-xs font-bold text-slate-700">
              Pemasukan Bersih: <strong className="text-slate-900">{formatRupiah(budget.monthlyNetIncome)}</strong>
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E5E0D8] text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2">Pos Alokasi</th>
                <th className="py-2">Deskripsi & Pos Utama</th>
                <th className="py-2 text-right">Nominal Riil</th>
                <th className="py-2 text-right">% Porsi</th>
                <th className="py-2 text-right">Standar Industri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              <tr>
                <td className="py-2.5 font-bold text-slate-900">Pos 1: Kebutuhan Pokok (Living)</td>
                <td className="py-2.5 text-slate-600">Dapur, utilitas, transportasi, SPP anak, premi kesehatan</td>
                <td className="py-2.5 text-right font-black tabular-nums">{formatRupiah(totals.totalLiving)}</td>
                <td className="py-2.5 text-right font-bold tabular-nums">{totals.livingPct.toFixed(1)}%</td>
                <td className="py-2.5 text-right text-slate-500">40 - 50%</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-900">Pos 2: Kewajiban & Utang (DSR)</td>
                <td className="py-2.5 text-slate-600">Cicilan KPR rumah, kredit kendaraan, cicilan bank</td>
                <td className="py-2.5 text-right font-black tabular-nums">{formatRupiah(totals.totalDebt)}</td>
                <td className="py-2.5 text-right font-bold tabular-nums">{totals.debtPct.toFixed(1)}%</td>
                <td className="py-2.5 text-right text-slate-500">&lt; 30%</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-900">Pos 3: Sinking Funds (Target)</td>
                <td className="py-2.5 text-slate-600">Dana pendidikan, upgrade aset, liburan terencana</td>
                <td className="py-2.5 text-right font-black tabular-nums text-[#1D6E66]">{formatRupiah(totals.totalSinkingFundNeed)}</td>
                <td className="py-2.5 text-right font-bold tabular-nums text-[#1D6E66]">{totals.sinkingPct.toFixed(1)}%</td>
                <td className="py-2.5 text-right text-slate-500">15 - 25%</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-900">Pos 4: Guilt-Free Lifestyle</td>
                <td className="py-2.5 text-slate-600">Kuliner weekend, hobi, belanja gadget, self-care</td>
                <td className="py-2.5 text-right font-black tabular-nums">{formatRupiah(totals.totalLifestyle)}</td>
                <td className="py-2.5 text-right font-bold tabular-nums">{totals.lifestylePct.toFixed(1)}%</td>
                <td className="py-2.5 text-right text-slate-500">10 - 15%</td>
              </tr>

              {/* 1. Baris Subtotal: Total Komitmen & Alokasi Rutin */}
              <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 font-bold text-slate-900">
                  Total Komitmen & Alokasi Rutin (Pos 1 + 2 + 3 + 4)
                </td>
                <td className="py-2.5 text-slate-600 font-normal">
                  Akumulasi belanja pokok, utang, pos masa depan, dan gaya hidup
                </td>
                <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                  {formatRupiah(total4Pos)}
                </td>
                <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                  {total4PosPct.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right text-slate-400 font-normal">-</td>
              </tr>

              {/* 2. Baris Highlight Net Cashflow (Hasil Bersih) */}
              {isSurplus ? (
                <tr className="bg-emerald-50/80 border-t-2 border-emerald-500">
                  <td className="py-3 font-bold text-emerald-900">
                    Sisa Kas Bebas / Surplus Bersih (Kapasitas Investasi)
                  </td>
                  <td className="py-3 text-emerald-700 text-xs font-normal">
                    Dana likuid segar yang siap dialokasikan ke investasi bertumbuh (DCA) atau cadangan kas
                  </td>
                  <td className="py-3 text-right font-extrabold text-emerald-700 text-sm tabular-nums">
                    +{formatRupiah(netCashflow)}
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-700 tabular-nums">
                    +{netCashflowPct.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Optimal (≥20%)
                    </span>
                  </td>
                </tr>
              ) : (
                <tr className="bg-rose-50 border-t-2 border-rose-500">
                  <td className="py-3 font-bold text-rose-900">
                    Defisit Arus Kas (Over-Budget)
                  </td>
                  <td className="py-3 text-rose-700 text-xs font-normal">
                    Pengeluaran melebihi pemasukan, memerlukan penyesuaian pos lifestyle atau utang
                  </td>
                  <td className="py-3 text-right font-extrabold text-rose-700 text-sm tabular-nums">
                    -{formatRupiah(Math.abs(netCashflow))}
                  </td>
                  <td className="py-3 text-right font-bold text-rose-700 tabular-nums">
                    -{netCashflowPct.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      Defisit Kritis
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 3. Kotak Diagnosis Eksekutif di Bawah Tabel */}
          <div className="mt-4 p-4 rounded-xl border flex items-start gap-3.5 bg-white shadow-2xs">
            {isSurplus ? (
              <div className="flex items-start gap-3 w-full">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-emerald-900">Diagnosis Cashflow: </span>
                  <strong className="text-emerald-700">SURPLUS PRIMA (+{formatRupiah(netCashflow)}/bulan | {netCashflowPct.toFixed(1)}%)</strong>. 
                  Struktur pengeluaran Anda terkendali dengan ruang ekspansi aset yang sangat kuat. 
                  <span className="font-semibold text-slate-800"> Rekomendasi:</span> Alirkan surplus ini secara otomatis ke instrumen investasi majemuk di Jago Portofolio.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 w-full">
                <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-rose-900">Diagnosis Cashflow: </span>
                  <strong className="text-rose-700">DEFISIT ARUS KAS (-{formatRupiah(Math.abs(netCashflow))}/bulan | {netCashflowPct.toFixed(1)}%)</strong>. 
                  Struktur pengeluaran Anda melebihi pemasukan bulanan. 
                  <span className="font-semibold text-slate-800"> Rekomendasi:</span> Lakukan rasionalisasi pos lifestyle atau restrukturisasi cicilan utang agar cashflow kembali positif.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: SINKING FUND GOALS & TARGETS */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E5A93C]" />
            4. Rencana Sinking Fund & Target Impian Terjadwal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {goals.map((g) => {
              const need = Math.round((g.targetAmount - g.currentSavings) / Math.max(1, g.tenorMonths));
              return (
                <div key={g.id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{g.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F0E8]">{g.category}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Target:</span>
                      <strong className="text-slate-900">{formatRupiah(g.targetAmount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Terkumpul:</span>
                      <span>{formatRupiah(g.currentSavings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tenor:</span>
                      <span>{g.tenorMonths} Bulan</span>
                    </div>
                    <div className="pt-1.5 border-t border-black/5 flex justify-between font-bold text-[#1D6E66]">
                      <span>Alokasi/bln:</span>
                      <span>{formatRupiah(need)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: KPR RESTRUCTURING STRATEGY */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#32A89C]" />
            5. Strategi Percepatan KPR & Alokasi M-Fund Pasar Uang
          </h3>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pokok Pinjaman KPR</span>
              <span className="text-base font-black text-slate-900 tabular-nums">{formatRupiah(kpr.remainingLoanBalance)}</span>
              <span className="text-[11px] text-slate-500 block">Sisa {kpr.remainingTenorMonths} bln ({kpr.floatingInterestRate}% p.a.)</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Potensi Hemat Bunga</span>
              <span className="text-base font-black text-[#1D6E66] tabular-nums">{formatRupiah(kprResult.interestSaved)}</span>
              <span className="text-[11px] text-[#1D6E66] block">Pangkas tenor {kprResult.monthsSaved} bulan</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Instrumen Parkir Kas</span>
              <span className="text-base font-black text-slate-900 block">M-Fund RDPU</span>
              <span className="text-[11px] text-slate-500 block">Yield ~{kpr.mFundReturnRate}% p.a. Bebas Pajak</span>
            </div>
          </div>
        </div>

        {/* SECTION 6: 30-DAY ACTION CHECKLIST */}
        <div className="py-6 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0F1A24]" />
            6. Action Plan 30 Hari Pasca-Penerbitan
          </h3>

          <div className="space-y-2 text-xs">
            {actions.map((act, idx) => (
              <div key={act.id} className="flex items-start gap-3 py-1.5">
                <div className="w-4 h-4 rounded border border-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                  {act.completed && <CheckCircle2 className="w-4 h-4 text-[#32A89C]" />}
                </div>
                <div>
                  <span className="font-bold text-slate-900">{idx + 1}. {act.title}</span>
                  <p className="text-[11px] text-slate-500">Dampak: {act.impactText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 7: LEGAL DISCLAIMER & LIMITATION OF LIABILITY */}
        <div className="pt-6 border-t border-[#E5E0D8]">
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] text-[10px] text-slate-600 leading-relaxed text-justify">
            <p className="font-bold text-slate-800 mb-1 tracking-wider uppercase">
              DISCLAIMER & BATASAN TANGGUNG JAWAB:
            </p>
            <p>
              Dokumen laporan dan sistem komputasi Jago Rencana OS disusun sebagai instrumen edukasi dan simulasi perencanaan keuangan independen. Seluruh proyeksi dan indikator rasio dihitung berdasarkan data yang diinput oleh pengguna serta asumsi historis. Jago Rencana tidak memberikan jaminan keuntungan pasti atas instrumen pasar modal/reksa dana, dan tidak bertanggung jawab atas kerugian finansial atau kondisi force majeure yang terjadi di kemudian hari. Segala keputusan eksekusi keuangan dan investasi sepenuhnya merupakan tanggung jawab mandiri klien.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
