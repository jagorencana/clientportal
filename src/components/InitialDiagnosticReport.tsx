import React, { useState } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle, 
  PieChart, 
  Sliders, 
  RotateCcw, 
  Wallet, 
  Building, 
  Award,
  Layers,
  ChevronRight,
  Sparkles,
  Edit3
} from 'lucide-react';
import { HomepageAuditData } from '../utils/auditData';
import { formatRupiah } from '../utils/calculations';
import { SelfAuditModal } from './SelfAuditModal';

interface InitialDiagnosticReportProps {
  auditData: HomepageAuditData;
  onUpdateAuditData?: (updated: Partial<HomepageAuditData>) => void;
  onNavigateToOverview?: () => void;
  onNavigateToBudget?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const InitialDiagnosticReport: React.FC<InitialDiagnosticReportProps> = ({
  auditData,
  onUpdateAuditData,
  onNavigateToOverview,
  onNavigateToBudget,
  onNavigateTab,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSelfAuditModalOpen, setIsSelfAuditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    clientName: auditData.clientName,
    baselineScore: auditData.baselineScore,
    monthlyIncome: auditData.monthlyIncome,
    livingExpenses: auditData.livingExpenses,
    debtExpenses: auditData.debtExpenses,
    liquidSavings: auditData.liquidSavings,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateAuditData) {
      onUpdateAuditData({
        clientName: editForm.clientName,
        baselineScore: Number(editForm.baselineScore) || auditData.baselineScore || 0,
        monthlyIncome: Number(editForm.monthlyIncome) || 0,
        livingExpenses: Number(editForm.livingExpenses) || 0,
        debtExpenses: Number(editForm.debtExpenses) || 0,
        liquidSavings: Number(editForm.liquidSavings) || 0,
      });
    }
    setIsEditModalOpen(false);
  };

  // Speedometer Gauge Math (Semi-circle 180 degrees)
  const score = Math.min(100, Math.max(0, auditData.baselineScore));
  const gaugeRadius = 75;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeStrokeDashoffset = gaugeCircumference - (score / 100) * gaugeCircumference;

  // Total Portfolio Allocations Check
  const totalAlloc = 
    auditData.allocations.rdpu + 
    auditData.allocations.sbn + 
    auditData.allocations.blueChip + 
    auditData.allocations.growth;

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Action Navigation Bar (Hidden in Print) */}
      <div className="no-print bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E0D8] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToOverview}
            className="h-9 px-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Overview</span>
          </button>
          <span className="hidden sm:inline text-xs text-slate-400">|</span>
          <span className="hidden sm:inline text-xs font-semibold text-slate-600">
            Sumber Data: <span className="font-bold text-slate-900 uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded">{auditData.source.replace('_', ' ')}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#D5CEBF] text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Edit input diagnostik awal"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Perbarui Data Audit</span>
          </button>

          <button
            onClick={handlePrint}
            className="h-9 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-[#32A89C]" />
            <span>Cetak PDF Diagnostik Awal</span>
          </button>
        </div>
      </div>

      {/* Call-to-Action for Unaudited Accounts (Score == 0) */}
      {auditData.baselineScore === 0 && (
        <div className="no-print bg-gradient-to-r from-[#0F1A24] to-[#1E293B] text-white rounded-2xl p-6 sm:p-7 border border-[#32A89C]/30 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#32A89C]/20 border border-[#32A89C]/40 text-[#32A89C] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnostik Awal Mandiri</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Akun Anda Belum Memiliki Baseline Audit
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mulai audit mandiri untuk mengaktifkan seluruh modul portal dan menghasilkan peta ketahanan finansial komprehensif Anda.
            </p>
          </div>
          <button
            onClick={() => setIsSelfAuditModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-[#32A89C] hover:bg-[#28867C] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap"
          >
            <span>📝 Isi Lembar Diagnostik Awal</span>
          </button>
        </div>
      )}

      {/* DOCUMENT KOP / HEADER INSTITUSIONAL */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-[0_4px_24px_rgba(0,0,0,0.03)] relative overflow-hidden print-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#E5E0D8] gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0F1A24] text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
              JR
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-0.5 rounded-full border border-[#32A89C]/20">
                  Institutional Financial Diagnostic Standard
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-500">
                  {auditData.baselineDate}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Lembar Diagnostik Keuangan Awal
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                Laporan komprehensif hasil asesmen kesehatan finansial mandiri klien pada platform publik Jago Rencana sebelum optimasi Private Wealth OS.
              </p>
            </div>
          </div>

          {/* Client Metadata Badge */}
          <div className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-xl border border-[#E5E0D8] text-xs space-y-1.5 shrink-0 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-semibold">Nama Klien:</span>
              <span className="font-extrabold text-slate-900">{auditData.clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-semibold">Status Audit:</span>
              <span 
                className="font-bold px-2 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: `${auditData.baselineStatusColor}15`, color: auditData.baselineStatusColor }}
              >
                {auditData.baselineStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-semibold">Pemasukan Awal:</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(auditData.monthlyIncome, true)}/bln</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: SPEEDOMETER SKOR & 4 PILAR FINANSIAL */}
        <div className="mt-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#32A89C]" />
              <span>1. Skor Diagnostik Awal & Analisis 4 Pilar Utama</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Standar Evaluasi Financial Planning Standards Board (FPSB)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Speedometer Gauge Graphic Card (Span 5) */}
            <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl p-6 border border-[#E5E0D8] flex flex-col items-center justify-between text-center relative">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Baseline Financial Health Score
              </span>

              {/* Semi-Circular SVG Speedometer */}
              <div className="relative my-4 flex flex-col items-center justify-center">
                <svg width="200" height="115" viewBox="0 0 200 115" className="overflow-visible">
                  {/* Background Arc */}
                  <path
                    d="M 25 105 A 75 75 0 0 1 175 105"
                    fill="none"
                    stroke="#E5E0D8"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Foreground Animated Score Arc */}
                  <path
                    d="M 25 105 A 75 75 0 0 1 175 105"
                    fill="none"
                    stroke={auditData.baselineStatusColor}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeStrokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Center Value */}
                <div className="absolute bottom-1 flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    {auditData.baselineScore}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Skor dari 100
                  </span>
                </div>
              </div>

              {/* Status Pill & Summary */}
              <div className="w-full space-y-2 pt-2 border-t border-[#E5E0D8]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${auditData.baselineStatusColor}15`, color: auditData.baselineStatusColor }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: auditData.baselineStatusColor }} />
                  <span>Kategori: {auditData.baselineStatus}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  {auditData.notes || 'Struktur keuangan awal Anda memerlukan pembenahan pada pos likuiditas dan rasio utang untuk mencapai stabilitas jangka panjang.'}
                </p>
              </div>
            </div>

            {/* 4 Pilar Evaluasi Finansial (Span 7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E0D8] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8]">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Evaluasi 4 Pilar Finansial
                </span>
                <span className="text-[11px] font-bold text-[#1D6E66] bg-[#E8F7F5] px-2 py-0.5 rounded">
                  Skala 0 - 100
                </span>
              </div>

              {/* Pilar 1: Cashflow Management */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                    <span>Pilar Cashflow Management</span>
                  </span>
                  <span className="tabular-nums font-black text-slate-900">{auditData.pillars.cashflow} / 100</span>
                </div>
                <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#E5E0D8]">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700" 
                    style={{ width: `${auditData.pillars.cashflow}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Mengukur kemampuan mempertahankan surplus kas bulanan dan pengendalian gaya hidup.
                </p>
              </div>

              {/* Pilar 2: Defense / Proteksi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px]">2</span>
                    <span>Pilar Defense (Dana Darurat & Asuransi)</span>
                  </span>
                  <span className="tabular-nums font-black text-slate-900">{auditData.pillars.defense} / 100</span>
                </div>
                <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#E5E0D8]">
                  <div 
                    className="h-full rounded-full bg-cyan-600 transition-all duration-700" 
                    style={{ width: `${auditData.pillars.defense}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Kesiapan menahan guncangan krisis melalui kas likuid dan proteksi kesehatan keluarga.
                </p>
              </div>

              {/* Pilar 3: Solvency / Beban Utang */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">3</span>
                    <span>Pilar Solvency (Rasio Beban Utang)</span>
                  </span>
                  <span className="tabular-nums font-black text-slate-900">{auditData.pillars.solvency} / 100</span>
                </div>
                <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#E5E0D8]">
                  <div 
                    className="h-full rounded-full bg-amber-500 transition-all duration-700" 
                    style={{ width: `${auditData.pillars.solvency}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Kesehatan rasio cicilan terhadap penghasilan bersih (DSR) dan beban bunga pinjaman.
                </p>
              </div>

              {/* Pilar 4: Wealth Accumulation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">4</span>
                    <span>Pilar Wealth (Aset Investasi & Pertumbuhan)</span>
                  </span>
                  <span className="tabular-nums font-black text-slate-900">{auditData.pillars.wealth} / 100</span>
                </div>
                <div className="w-full bg-[#FAF8F5] h-2.5 rounded-full overflow-hidden border border-[#E5E0D8]">
                  <div 
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700" 
                    style={{ width: `${auditData.pillars.wealth}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Tingkat kecepatan akumulasi aset produktif dan imbal hasil compounding investasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: EVALUASI 4 RASIO KOMPREHENSIF */}
        <div className="mt-8 pt-6 border-t border-[#E5E0D8]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#32A89C]" />
              <span>2. Evaluasi 4 Rasio Finansial Komprehensif</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Benchmark Finansial Sehat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rasio 1: DSR */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Rasio 1 • DSR</span>
                  <span className="text-slate-700">Target ≤ 30%</span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Debt Service Ratio</h4>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {auditData.ratios.dsr}%
                  </span>
                  <span className={`text-[11px] font-bold ${auditData.ratios.dsr <= 30 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {auditData.ratios.dsr <= 30 ? 'Ideal' : 'Waspada (>30%)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Porsi pemasukan yang tersedot untuk membayar cicilan KPR, kendaraan, dan pinjaman lainnya.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E0D8] text-[10px] text-slate-500 font-medium">
                Plafon aman: {formatRupiah(auditData.monthlyIncome * 0.3, true)}/bln
              </div>
            </div>

            {/* Rasio 2: Cicilan Konsumtif */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Rasio 2 • Utang</span>
                  <span className="text-slate-700">Target ≤ 10%</span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Cicilan Konsumtif</h4>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {auditData.ratios.consumerDebt}%
                  </span>
                  <span className={`text-[11px] font-bold ${auditData.ratios.consumerDebt <= 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {auditData.ratios.consumerDebt <= 10 ? 'Terkendali' : 'Perlu Ditertibkan'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Beban cicilan non-produktif (paylater, kartu kredit, pinjol). Hindari membeli gaya hidup dengan utang berbunga.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E0D8] text-[10px] text-slate-500 font-medium">
                Kondisi ideal: 0% (Tanpa utang konsumtif)
              </div>
            </div>

            {/* Rasio 3: Kesiapan Dana Darurat */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Rasio 3 • Buffer</span>
                  <span className="text-slate-700">Target 3-6 bln</span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Kesiapan Dana Darurat</h4>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {auditData.ratios.emergencyFundMonths} bln
                  </span>
                  <span className={`text-[11px] font-bold ${auditData.ratios.emergencyFundMonths >= 3 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {auditData.ratios.emergencyFundMonths >= 6 ? 'Sangat Aman' : auditData.ratios.emergencyFundMonths >= 3 ? 'Cukup' : 'Rentan'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kemampuan menopang kebutuhan keluarga jika terjadi musibah mendadak atau kehilangan sumber penghasilan.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E0D8] text-[10px] text-slate-500 font-medium">
                Saldo kas likuid: {formatRupiah(auditData.liquidSavings, true)}
              </div>
            </div>

            {/* Rasio 4: Porsi Aset Produktif */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Rasio 4 • Wealth</span>
                  <span className="text-slate-700">Target ≥ 30%</span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Porsi Aset Produktif</h4>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {auditData.ratios.productiveAssetsRatio}%
                  </span>
                  <span className={`text-[11px] font-bold ${auditData.ratios.productiveAssetsRatio >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {auditData.ratios.productiveAssetsRatio >= 30 ? 'Optimal' : 'Tahap Akumulasi'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Persentase aset yang aktif menghasilkan capital gain, kupon obligasi, dan dividen pasif secara berkelanjutan.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E0D8] text-[10px] text-slate-500 font-medium">
                Fokus: Perbanyak instrumen cashflow
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: REKOMENDASI ALOKASI PORTOFOLIO MANDIRI */}
        <div className="mt-8 pt-6 border-t border-[#E5E0D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#32A89C]" />
                <span>3. Rekomendasi Alokasi Portofolio Mandiri (Private Wealth Strategy)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Formula alokasi aset institusional yang dapat Anda eksekusi langsung tanpa perantara atau potongan komisi agen.
              </p>
            </div>
            <span className="text-xs font-bold text-[#1D6E66] bg-[#E8F7F5] px-2.5 py-1 rounded-full border border-[#32A89C]/20 shrink-0">
              Total Alokasi: {totalAlloc}%
            </span>
          </div>

          {/* Allocation Distribution Bar */}
          <div className="my-4">
            <div className="w-full h-4 rounded-full overflow-hidden flex shadow-2xs border border-[#E5E0D8]">
              <div 
                className="bg-emerald-500 h-full transition-all duration-700" 
                style={{ width: `${auditData.allocations.rdpu}%` }}
                title={`RDPU: ${auditData.allocations.rdpu}%`}
              />
              <div 
                className="bg-cyan-600 h-full transition-all duration-700" 
                style={{ width: `${auditData.allocations.sbn}%` }}
                title={`SBN: ${auditData.allocations.sbn}%`}
              />
              <div 
                className="bg-indigo-600 h-full transition-all duration-700" 
                style={{ width: `${auditData.allocations.blueChip}%` }}
                title={`Saham Blue-Chip: ${auditData.allocations.blueChip}%`}
              />
              <div 
                className="bg-amber-500 h-full transition-all duration-700" 
                style={{ width: `${auditData.allocations.growth}%` }}
                title={`Saham Pertumbuhan: ${auditData.allocations.growth}%`}
              />
            </div>

            {/* Legend Labels */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>RDPU (Pasar Uang): <strong>{auditData.allocations.rdpu}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-600" />
                <span>SBN / Obligasi Negara: <strong>{auditData.allocations.sbn}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span>Saham Blue-Chip (LQ45): <strong>{auditData.allocations.blueChip}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Saham Pertumbuhan / ETF: <strong>{auditData.allocations.growth}%</strong></span>
              </span>
            </div>
          </div>

          {/* Detailed 4 Instrument Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Card 1: RDPU */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E0D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {auditData.allocations.rdpu}% • Reksa Dana Pasar Uang (RDPU)
                </span>
                <span className="text-[10px] font-bold text-slate-500">Likuiditas T+1</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Parkir dana darurat dan sinking fund 1-12 bulan. Imbal hasil bersih estimasi <strong>~6.5% - 7.2% p.a.</strong> tanpa risiko penurunan pokok modal dan bebas pajak penghasilan deposito 20%.
              </p>
              <div className="text-[11px] text-slate-500 bg-[#FAF8F5] p-2 rounded-lg">
                <strong>Rekomendasi Eksekusi:</strong> Sucorinvest Sharia Money Market / Danamas Rupiah via Mirae Asset / Bibit.
              </div>
            </div>

            {/* Card 2: SBN */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E0D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                  {auditData.allocations.sbn}% • Surat Berharga Negara (SBN Ritel)
                </span>
                <span className="text-[10px] font-bold text-slate-500">Dijamin 100% UU</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Membangun mesin cashflow pasif bulanan dengan kupon pasti <strong>~6.4% - 6.8% p.a.</strong> Pajak kupon hanya 10% (jauh lebih rendah dibanding deposito) dan pokok modal dijamin negara.
              </p>
              <div className="text-[11px] text-slate-500 bg-[#FAF8F5] p-2 rounded-lg">
                <strong>Rekomendasi Eksekusi:</strong> Seri SR, ORI, atau Sukuk Tabungan (ST) via Mitra Distribusi resmi perbankan.
              </div>
            </div>

            {/* Card 3: Saham Blue Chip */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E0D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {auditData.allocations.blueChip}% • Saham Blue-Chip (Dividen Aristokrat)
                </span>
                <span className="text-[10px] font-bold text-slate-500">Compounding Jangka Panjang</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Kepemilikan bisnis perbankan dan consumer goods monopoli Indonesia. Menghasilkan dividen cashflow tahunan <strong>4% - 6%</strong> plus capital gain pengawal inflasi.
              </p>
              <div className="text-[11px] text-slate-500 bg-[#FAF8F5] p-2 rounded-lg">
                <strong>Rekomendasi Eksekusi:</strong> Akumulasi berkala (DCA) pada BBCA, BBRI, BMRI, ASII, ICBP saat koreksi pasar.
              </div>
            </div>

            {/* Card 4: Growth Stock / ETF */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E0D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {auditData.allocations.growth}% • Saham Pertumbuhan / Global ETF
                </span>
                <span className="text-[10px] font-bold text-slate-500">Akselerasi Alpha</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Porsi pengungkit pertumbuhan untuk horizon 5-10+ tahun ke depan (dana pensiun dini / pendidikan kuliah anak).
              </p>
              <div className="text-[11px] text-slate-500 bg-[#FAF8F5] p-2 rounded-lg">
                <strong>Rekomendasi Eksekusi:</strong> Reksa Dana Saham Indeks IDX30 atau ETF S&P 500 berbiaya kelola rendah (low expense ratio).
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER & NEXT STEPS BANNER (Hidden in print) */}
        <div className="no-print mt-8 pt-6 border-t border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF8F5] p-5 rounded-2xl">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">
              Langkah Selanjutnya: Realisasikan di Master 4-Pos Budget
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Hubungkan diagnosa awal ini ke modul alokasi cashflow real-time untuk meningkatkan skor finansial Anda secara terukur.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToBudget && (
              <button
                onClick={onNavigateToBudget}
                className="h-9 px-4 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span>Buka Master Budget</span>
                <ChevronRight className="w-4 h-4 text-[#32A89C]" />
              </button>
            )}
          </div>
        </div>

        {/* PRINT ONLY FOOTER METADATA */}
        <div className="hidden print-only mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[9pt] text-slate-500">
          <div>
            Jago Rencana Private Wealth Advisory Desk • Institutional Diagnostic Sheet
          </div>
          <div>
            Dokumen Rahasia & Personal untuk: <strong>{auditData.clientName}</strong>
          </div>
        </div>
      </div>

      {/* EDIT MODAL / DRAWER */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#E5E0D8] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#32A89C]" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Perbarui Data Audit Awal
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Klien:</label>
                <input
                  type="text"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Skor Audit Awal (0-100):</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editForm.baselineScore}
                    onChange={(e) => setEditForm({ ...editForm, baselineScore: Number(e.target.value) })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pemasukan Bulanan (Rp):</label>
                  <input
                    type="number"
                    value={editForm.monthlyIncome}
                    onChange={(e) => setEditForm({ ...editForm, monthlyIncome: Number(e.target.value) })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pengeluaran Living (Rp):</label>
                  <input
                    type="number"
                    value={editForm.livingExpenses}
                    onChange={(e) => setEditForm({ ...editForm, livingExpenses: Number(e.target.value) })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Cicilan / Utang (Rp):</label>
                  <input
                    type="number"
                    value={editForm.debtExpenses}
                    onChange={(e) => setEditForm({ ...editForm, debtExpenses: Number(e.target.value) })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tabungan Kas Likuid Awal (Rp):</label>
                <input
                  type="number"
                  value={editForm.liquidSavings}
                  onChange={(e) => setEditForm({ ...editForm, liquidSavings: Number(e.target.value) })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self Audit Modal */}
      <SelfAuditModal
        isOpen={isSelfAuditModalOpen}
        onClose={() => setIsSelfAuditModalOpen(false)}
        onSuccess={() => setIsSelfAuditModalOpen(false)}
      />
    </div>
  );
};
