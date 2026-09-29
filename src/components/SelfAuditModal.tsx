import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Wallet, 
  Building, 
  ChevronRight,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { CurrencyInput } from './common/CurrencyInput';
import { HomepageAuditData } from '../utils/auditData';

interface SelfAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SelfAuditModal: React.FC<SelfAuditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { 
    userSession, 
    profile, 
    updateProfile, 
    updateNetWorth, 
    updateMasterBudget, 
    updateKprData, 
    applyAuditData,
    triggerManualSave 
  } = usePortal();

  // Form State
  // A. Demografi & Arus Kas
  const [age, setAge] = useState<number>(profile?.age || 30);
  const [maritalStatus, setMaritalStatus] = useState<string>(profile?.maritalStatus || 'Menikah (1 Anak)');
  const [dependents, setDependents] = useState<number>(1);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(15000000);

  // B. Pengeluaran Rutin
  const [livingExpenses, setLivingExpenses] = useState<number>(7500000);

  // C. Kewajiban & Utang
  const [debtInstallment, setDebtInstallment] = useState<number>(3000000);
  const [totalDebtBalance, setTotalDebtBalance] = useState<number>(120000000);

  // D. Posisi Aset & Portofolio
  const [liquidCash, setLiquidCash] = useState<number>(25000000);
  const [investmentPortfolio, setInvestmentPortfolio] = useState<number>(30000000);
  const [physicalAssets, setPhysicalAssets] = useState<number>(250000000);
  const [riskProfile, setRiskProfile] = useState<'konservatif' | 'moderat' | 'agresif'>('moderat');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time calculated metrics
  const calculatedDsr = monthlyIncome > 0 ? (debtInstallment / monthlyIncome) * 100 : 0;
  const emergencyFundMonths = livingExpenses > 0 ? liquidCash / livingExpenses : 0;
  const surplusCash = monthlyIncome - (livingExpenses + debtInstallment);
  const surplusPct = monthlyIncome > 0 ? (surplusCash / monthlyIncome) * 100 : 0;
  const netWorth = (liquidCash + investmentPortfolio + physicalAssets) - totalDebtBalance;

  // Formula Skor Baseline (0 - 100)
  // 1. Pilar Cashflow (Bobot 35): Surplus > 20% = 35, Surplus 0-20% = 20, Defisit = 0
  let cashflowPillarScore = 0;
  if (surplusPct > 20) {
    cashflowPillarScore = 35;
  } else if (surplusCash >= 0) {
    cashflowPillarScore = 20;
  } else {
    cashflowPillarScore = 0;
  }

  // 2. Pilar Debt (Bobot 25): DSR <= 30% = 25, DSR 31-40% = 15, DSR > 40% = 5
  let debtPillarScore = 5;
  if (calculatedDsr <= 30) {
    debtPillarScore = 25;
  } else if (calculatedDsr <= 40) {
    debtPillarScore = 15;
  } else {
    debtPillarScore = 5;
  }

  // 3. Pilar Defense (Bobot 25): Dana Darurat >= 6 bulan = 25, 3-5 bulan = 15, < 3 bulan = 5
  let defensePillarScore = 5;
  if (emergencyFundMonths >= 6) {
    defensePillarScore = 25;
  } else if (emergencyFundMonths >= 3) {
    defensePillarScore = 15;
  } else {
    defensePillarScore = 5;
  }

  // 4. Pilar Investment (Bobot 15): Punya investasi & rutin = 15, Kas saja = 5
  let investmentPillarScore = 5;
  if (investmentPortfolio > 0) {
    investmentPillarScore = 15;
  } else {
    investmentPillarScore = 5;
  }

  const totalBaselineScore = Math.min(100, Math.max(0, cashflowPillarScore + debtPillarScore + defensePillarScore + investmentPillarScore));

  let baselineStatusText = 'Waspada';
  let baselineStatusColor = '#D97706';
  if (totalBaselineScore >= 80) {
    baselineStatusText = 'Sehat Prima';
    baselineStatusColor = '#059669';
  } else if (totalBaselineScore >= 60) {
    baselineStatusText = 'Cukup Sehat';
    baselineStatusColor = '#0D9488';
  } else if (totalBaselineScore >= 40) {
    baselineStatusText = 'Perlu Perhatian';
    baselineStatusColor = '#D97706';
  } else {
    baselineStatusText = 'Kritis';
    baselineStatusColor = '#DC2626';
  }

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const clientName = profile?.name || userSession?.nama || 'Klien VIP';
      const clientEmail = userSession?.email || profile?.email || '';

      // 1. Prepare normalized HomepageAuditData
      const newAudit: HomepageAuditData = {
        clientName,
        email: clientEmail,
        phone: profile?.phone || '',
        baselineScore: totalBaselineScore,
        baselineStatus: baselineStatusText,
        baselineStatusColor,
        baselineDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        monthlyIncome,
        livingExpenses,
        debtExpenses: debtInstallment,
        liquidSavings: liquidCash,
        investmentAssets: investmentPortfolio,
        lifestyleExpenses: Math.max(0, Math.round(surplusCash * 0.3)),
        pillars: {
          cashflow: Math.round((cashflowPillarScore / 35) * 100),
          defense: Math.round((defensePillarScore / 25) * 100),
          solvency: Math.round((debtPillarScore / 25) * 100),
          wealth: Math.round((investmentPillarScore / 15) * 100),
        },
        ratios: {
          dsr: Math.round(calculatedDsr * 10) / 10,
          consumerDebt: Math.round(calculatedDsr * 0.3 * 10) / 10,
          emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
          productiveAssetsRatio: Math.round(((liquidCash + investmentPortfolio) / Math.max(1, netWorth || 1)) * 100),
        },
        allocations: {
          rdpu: riskProfile === 'konservatif' ? 50 : riskProfile === 'moderat' ? 35 : 20,
          sbn: riskProfile === 'konservatif' ? 35 : riskProfile === 'moderat' ? 30 : 25,
          blueChip: riskProfile === 'konservatif' ? 10 : riskProfile === 'moderat' ? 25 : 35,
          growth: riskProfile === 'konservatif' ? 5 : riskProfile === 'moderat' ? 10 : 20,
        },
        notes: `Hasil Audit Mandiri Finansial: Skor Ketahanan ${totalBaselineScore}/100 (${baselineStatusText}). Rasio DSR ${calculatedDsr.toFixed(1)}%, Ketahanan Kas ${emergencyFundMonths.toFixed(1)} bulan.`,
        source: 'local_storage',
      };

      // 2. Apply audit data to PortalContext (updates baselineAudit, resets global state accordingly)
      applyAuditData(newAudit);

      // 3. Synchronize explicit modules in PortalContext
      updateProfile({
        name: clientName,
        age,
        maritalStatus: maritalStatus as any,
      });

      updateNetWorth({
        kasLikuid: liquidCash,
        investasi: investmentPortfolio,
        asetFisik: physicalAssets,
        liabilitasKPR: Math.round(totalDebtBalance * 0.7),
        utangLain: Math.round(totalDebtBalance * 0.3),
      });

      updateMasterBudget({
        monthlyNetIncome: monthlyIncome,
        livingExpenses: [
          {
            id: `liv-${Date.now()}`,
            name: 'Biaya Hidup & Kebutuhan Operasional Pokok',
            amount: livingExpenses,
            isEssential: true,
          }
        ],
        debtObligations: [
          {
            id: `debt-${Date.now()}`,
            name: 'Cicilan Bulanan (KPR, Kendaraan & Lainnya)',
            amount: debtInstallment,
            isEssential: true,
          }
        ],
        lifestyleExpenses: [
          {
            id: `life-${Date.now()}`,
            name: 'Pos Gaya Hidup & Hiburan',
            amount: Math.max(0, Math.round(surplusCash * 0.3)),
          }
        ],
      });

      updateKprData({
        originalLoanAmount: totalDebtBalance,
        remainingLoanBalance: totalDebtBalance,
        originalTenorYears: 15,
        remainingTenorMonths: 120,
        fixedInterestRate: 6.5,
        floatingInterestRate: 11.5,
        isFloatingActive: false,
        extraMonthlyPayment: 0,
        lumpSumExtraPayment: 0,
        mFundReturnRate: 7.0,
      });

      // 4. Save state to Google Sheets Cloud (Kolom H)
      await triggerManualSave();

      setSuccessMessage('Audit Mandiri Berhasil Disimpan & Disinkronkan!');
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Failed to save self audit:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E5E0D8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E0D8] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F1A24] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#32A89C]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Audit Mandiri Finansial
              </h2>
              <p className="text-xs text-slate-500">
                Lengkapi 4 pilar data untuk mengkalkulasi skor kesehatan keuangan awal Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSaveAudit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* PILAR A: Demografi & Arus Kas */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-[#E5E0D8]/60">
              <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white flex items-center justify-center text-[10px]">A</span>
              <span className="text-sm">Demografi & Arus Kas Masuk</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Usia (Tahun)</label>
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value) || 18)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status Pernikahan</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900 text-xs"
                >
                  <option value="Belum Menikah">Lajang / Belum Menikah</option>
                  <option value="Menikah (Tanpa Anak)">Menikah (Tanpa Anak)</option>
                  <option value="Menikah (1 Anak)">Menikah (1 Anak)</option>
                  <option value="Menikah (2+ Anak)">Menikah (2+ Anak)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Tanggungan (Orang)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={dependents}
                  onChange={(e) => setDependents(Number(e.target.value) || 0)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] font-semibold text-slate-900 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Total Pemasukan Bersih Bulanan (Gaji Pokok + Sampingan)
              </label>
              <CurrencyInput
                value={monthlyIncome}
                onChange={setMonthlyIncome}
                prefix="Rp"
                className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          {/* PILAR B: Pengeluaran Rutin */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-[#E5E0D8]/60">
              <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white flex items-center justify-center text-[10px]">B</span>
              <span className="text-sm">Pengeluaran Rutin & Biaya Hidup</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Total Biaya Hidup & Operasional Rumah Tangga Bulanan
              </label>
              <CurrencyInput
                value={livingExpenses}
                onChange={setLivingExpenses}
                prefix="Rp"
                className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Termasuk makan, utilitas, belanja rumah tangga, kuota, transportasi, dan sekolah anak.
              </p>
            </div>
          </div>

          {/* PILAR C: Kewajiban & Utang */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-[#E5E0D8]/60">
              <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white flex items-center justify-center text-[10px]">C</span>
              <span className="text-sm">Kewajiban & Liabilitas Utang</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Total Cicilan Bulanan (KPR + Kendaraan + Lainnya)
                </label>
                <CurrencyInput
                  value={debtInstallment}
                  onChange={setDebtInstallment}
                  prefix="Rp"
                  className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Estimasi Total Sisa Pokok Utang
                </label>
                <CurrencyInput
                  value={totalDebtBalance}
                  onChange={setTotalDebtBalance}
                  prefix="Rp"
                  className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* PILAR D: Posisi Aset & Portofolio */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-[#E5E0D8]/60">
              <span className="w-5 h-5 rounded-md bg-[#0F1A24] text-white flex items-center justify-center text-[10px]">D</span>
              <span className="text-sm">Posisi Aset, Portofolio & Profil Risiko</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Kas Siap Pakai (Likuid)
                </label>
                <CurrencyInput
                  value={liquidCash}
                  onChange={setLiquidCash}
                  prefix="Rp"
                  className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Portofolio Investasi (RD/Saham/SBN)
                </label>
                <CurrencyInput
                  value={investmentPortfolio}
                  onChange={setInvestmentPortfolio}
                  prefix="Rp"
                  className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Estimasi Aset Fisik (Properti/Logam Mulia)
                </label>
                <CurrencyInput
                  value={physicalAssets}
                  onChange={setPhysicalAssets}
                  prefix="Rp"
                  className="w-full h-10 rounded-xl bg-white border border-[#D5CEBF] focus:outline-none focus:border-[#32A89C] text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Pilihan Profil Risiko Investasi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'konservatif', label: 'Konservatif', desc: 'Fokus keamanan kas & SBN' },
                  { id: 'moderat', label: 'Moderat', desc: 'Imbang RDPU, SBN & Saham' },
                  { id: 'agresif', label: 'Agresif', desc: 'Fokus pertumbuhan & ekuitas' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRiskProfile(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      riskProfile === item.id
                        ? 'bg-[#0F1A24] text-white border-[#0F1A24] shadow-xs'
                        : 'bg-white text-slate-700 border-[#D5CEBF] hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-extrabold block text-xs">{item.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${riskProfile === item.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SUMMARY LIVE CALCULATION */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                Preview Hasil Evaluasi Otomatis
              </span>
              <span className="font-black text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                Skor Baseline: {totalBaselineScore} / 100 ({baselineStatusText})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 text-[11px] pt-1 border-t border-emerald-200/60">
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Rasio Utang (DSR):</span>
                <span className={`font-extrabold ${calculatedDsr > 35 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {calculatedDsr.toFixed(1)}% {calculatedDsr <= 30 ? '✅ Aman' : '⚠️ Tinggi'}
                </span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Dana Darurat:</span>
                <span className="font-extrabold text-emerald-700">
                  {emergencyFundMonths.toFixed(1)} Bulan
                </span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Sisa Kas Bulanan:</span>
                <span className={`font-extrabold ${surplusCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Rp {Math.round(surplusCash).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Estimasi Net Worth:</span>
                <span className="font-extrabold text-slate-900">
                  Rp {Math.round(netWorth).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-slate-700 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 rounded-xl bg-[#0F1A24] hover:bg-[#1E293B] text-white font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#32A89C]" />
              <span>{isSubmitting ? 'Menghitung & Menyimpan...' : 'Simpan & Aktifkan Seluruh Portal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
