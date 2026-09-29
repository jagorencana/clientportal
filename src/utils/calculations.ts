import { BudgetState, SinkingFundGoal, KprSimulationState, FinancialHealthMetrics } from '../types';
import { calculateHealthScore } from './healthScoreCalculator';

export function formatRupiah(val: number, compact: boolean = false): string {
  if (isNaN(val) || val === null || val === undefined) return 'Rp 0';
  if (compact) {
    if (Math.abs(val) >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} M`;
    }
    if (Math.abs(val) >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toFixed(1).replace(/\.?0+$/, '')} Jt`;
    }
    if (Math.abs(val) >= 1_000) {
      return `Rp ${(val / 1_000).toFixed(0)} Rb`;
    }
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Standardized Sinking Fund Progress calculation
 * Fixes any NaN% (Rp 0) edge cases
 */
export const calculateProgress = (terkumpul: number | string, target: number | string) => {
  const safeTarget = Number(target) || 0;
  const safeTerkumpul = Number(terkumpul) || 0;
  if (safeTarget <= 0) return { percent: 0, label: "0% (Rp 0)" };
  const pct = Math.min(100, Math.round((safeTerkumpul / safeTarget) * 100));
  return {
    percent: pct,
    label: `${pct}% (Rp ${safeTerkumpul.toLocaleString('id-ID')})`
  };
};

/**
 * Time Value of Money (TVM) Monthly PMT formula
 */
export const calculateTVM = (fv: number, pv: number, annualRate: number, years: number): number => {
  const r = (annualRate / 100) / 12;
  const n = years * 12;
  if (n <= 0) return 0;
  if (r === 0) return Math.max(0, (fv - pv) / n);
  const fvFromPv = pv * Math.pow(1 + r, n);
  const pmt = (fv - fvFromPv) * r / (Math.pow(1 + r, n) - 1);
  return Math.max(0, pmt);
};

export function calculateMonthlyGoalNeed(goal: SinkingFundGoal): number {
  const remaining = Math.max(0, goal.targetAmount - goal.currentSavings);
  const tenor = Math.max(1, goal.tenorMonths);
  return Math.round(remaining / tenor);
}

export function calculateTotals(budget?: Partial<BudgetState> | null, goals?: SinkingFundGoal[] | null) {
  const safeLiving = Array.isArray(budget?.livingExpenses) ? budget.livingExpenses : [];
  const safeDebt = Array.isArray(budget?.debtObligations) ? budget.debtObligations : [];
  const safeLifestyle = Array.isArray(budget?.lifestyleExpenses) ? budget.lifestyleExpenses : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const monthlyIncome = Number(budget?.monthlyNetIncome) || 0;

  const totalLiving = safeLiving.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
  const totalDebt = safeDebt.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
  const totalLifestyle = safeLifestyle.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
  
  const totalSinkingFundNeed = safeGoals.reduce((acc, goal) => acc + (goal ? calculateMonthlyGoalNeed(goal) : 0), 0);
  
  const totalCommittedExpenses = totalLiving + totalDebt + totalLifestyle;
  const freeCashflow = monthlyIncome - totalCommittedExpenses;
  const netSurplusOrDeficit = freeCashflow - totalSinkingFundNeed;

  // Percentages relative to income
  const livingPct = monthlyIncome > 0 ? (totalLiving / monthlyIncome) * 100 : 0;
  const debtPct = monthlyIncome > 0 ? (totalDebt / monthlyIncome) * 100 : 0;
  const lifestylePct = monthlyIncome > 0 ? (totalLifestyle / monthlyIncome) * 100 : 0;
  const sinkingPct = monthlyIncome > 0 ? (totalSinkingFundNeed / monthlyIncome) * 100 : 0;

  return {
    totalLiving,
    totalDebt,
    totalLifestyle,
    totalSinkingFundNeed,
    totalCommittedExpenses,
    freeCashflow,
    netSurplusOrDeficit,
    isDeficit: netSurplusOrDeficit < 0,
    deficitAmount: Math.abs(Math.min(0, netSurplusOrDeficit)),
    livingPct,
    debtPct,
    lifestylePct,
    sinkingPct,
  };
}

export interface PyramidAuditResult {
  tier1Protection: {
    covered: boolean;
    insuranceAmount: number;
    status: string;
    statusColor: string;
    description: string;
    detectedItems: string[];
  };
  tier2EmergencyFund: {
    months: number;
    amount: number;
    monthlyBurn: number;
    status: 'Ideal (≥ 6 bln)' | 'Cukup (3-5.9 bln)' | 'Kurang / Rentan (< 3 bln)';
    statusColor: string;
    description: string;
  };
  tier3CashDrag: {
    idleCash: number;
    annualPassiveIncomePotential: number;
    hasCashDrag: boolean;
    status: string;
    statusColor: string;
    description: string;
  };
}

export function auditFinancialPyramid(
  budget: BudgetState,
  liquidCash: number
): PyramidAuditResult {
  const totals = calculateTotals(budget, []);
  const monthlyBurn = totals.totalCommittedExpenses; // Living + Debt + Lifestyle

  // 1. Lapis 1: Fondasi Proteksi
  const insuranceRegex = /asuransi|bpjs|kesehatan|jiwa|prulink|allianz|axa|manulife|prudential|fwd|sequis|cigna|generali|aia|zurich|inhealth/i;
  const detectedInsuranceItems = [...budget.livingExpenses, ...budget.debtObligations, ...budget.lifestyleExpenses]
    .filter(i => insuranceRegex.test(i.name));
  
  const insuranceAmount = detectedInsuranceItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const isProtected = detectedInsuranceItems.length > 0 && insuranceAmount > 0;

  const tier1Protection = {
    covered: isProtected,
    insuranceAmount,
    status: isProtected ? 'Tercakup / Aman' : 'Kritis / Tanpa Proteksi',
    statusColor: isProtected ? '#10B981' : '#EF4444',
    description: isProtected
      ? `Pos proteksi aktif (${formatRupiah(insuranceAmount)}/bln). Risiko finansial keluarga terlindungi dari potensi kebocoran medis mendadak.`
      : 'Peringatan Risiko: Belum terdeteksi pos asuransi/BPJS aktif. Kegagalan mitigasi risiko kesehatan dapat menguras tabungan & investasi secara mendadak.',
    detectedItems: detectedInsuranceItems.map(i => `${i.name} (${formatRupiah(i.amount)}/bln)`),
  };

  // 2. Lapis 2: Dana Darurat (Emergency Fund Duration)
  const efMonths = monthlyBurn > 0 ? liquidCash / monthlyBurn : 0;
  const safeEfMonths = Math.round(efMonths * 10) / 10;
  
  let efStatus: 'Ideal (≥ 6 bln)' | 'Cukup (3-5.9 bln)' | 'Kurang / Rentan (< 3 bln)';
  let efColor: string;
  let efDesc: string;

  if (safeEfMonths >= 6) {
    efStatus = 'Ideal (≥ 6 bln)';
    efColor = '#10B981';
    efDesc = `Dana darurat menopang ${safeEfMonths} bulan pengeluaran (${formatRupiah(liquidCash, true)}). Sangat tangguh terhadap guncangan income.`;
  } else if (safeEfMonths >= 3) {
    efStatus = 'Cukup (3-5.9 bln)';
    efColor = '#F59E0B';
    efDesc = `Dana darurat menopang ${safeEfMonths} bulan pengeluaran. Disarankan menambah hingga minimal 6 bulan pengeluaran rutin.`;
  } else {
    efStatus = 'Kurang / Rentan (< 3 bln)';
    efColor = '#EF4444';
    efDesc = `Ketahanan kas hanya ${safeEfMonths} bulan. Prioritaskan akumulasi dana darurat sebelum menambah investasi berisiko tinggi.`;
  }

  const tier2EmergencyFund = {
    months: safeEfMonths,
    amount: liquidCash,
    monthlyBurn,
    status: efStatus,
    statusColor: efColor,
    description: efDesc,
  };

  // 3. Lapis 3: Cash Drag & M-Fund Allocator
  const idealReserveAmount = monthlyBurn * 6;
  const idleCash = Math.max(0, liquidCash - idealReserveAmount);
  const annualPassiveIncomePotential = Math.round(idleCash * 0.072); // 7.2% p.a. M-Fund Yield

  const tier3CashDrag = {
    idleCash,
    annualPassiveIncomePotential,
    hasCashDrag: idleCash > 10_000_000,
    status: idleCash > 10_000_000 ? 'Cash Drag Terdeteksi' : 'Kas Likuid Optimal',
    statusColor: idleCash > 10_000_000 ? '#F59E0B' : '#10B981',
    description: idleCash > 10_000_000
      ? `${formatRupiah(idleCash, true)} kas menganggur di tabungan 0%. Alokasikan ke Reksa Dana Pasar Uang (M-Fund 7.2% p.a. Bebas Pajak) untuk potensi imbal hasil pasif ${formatRupiah(annualPassiveIncomePotential, true)}/tahun.`
      : 'Seluruh kas likuid difungsikan sebagai buffer dana darurat aktif tanpa kelebihan saldo mengendap di bunga 0%.',
  };

  return {
    tier1Protection,
    tier2EmergencyFund,
    tier3CashDrag,
  };
}

// DYNAMIC REACTIVE NET WORTH:
// Formula Benar: Net Worth = (kasLikuid + totalInvestasi + asetFisik) - totalLiabilitas.
// Sinking Fund adalah target masa depan (future goal), bukan aset neraca riil saat ini.
// Jangan menjumlahkan nilai target Sinking Fund atau tabungan sinking fund ke dalam kalkulasi Net Worth.
export function calculateReactiveNetWorth(
  kasLikuid: number,
  totalInvestasi: number,
  asetFisik: number,
  totalLiabilitas: number
): number {
  return (Number(kasLikuid) || 0) + (Number(totalInvestasi) || 0) + (Number(asetFisik) || 0) - (Number(totalLiabilitas) || 0);
}

export function computeFinancialHealth(
  budget: BudgetState,
  goals: SinkingFundGoal[],
  assets: { liquid: number; investment: number; personal: number; liabilities: number },
  kprState?: KprSimulationState
): FinancialHealthMetrics {
  const totals = calculateTotals(budget, goals);
  const safeIncome = Number(budget.monthlyNetIncome) > 0 ? Number(budget.monthlyNetIncome) : 0;
  
  // 1. DSR (Debt Service Ratio) - Target: <= 30%
  const dsr = safeIncome > 0 ? (totals.totalDebt / safeIncome) * 100 : 0;
  let dsrScore = 30; // Max 30 pts
  let dsrStatus: string;
  let dsrStatusColor: string;

  if (dsr <= 30) {
    dsrScore = 30;
    dsrStatus = 'Ideal (Maks 30%)';
    dsrStatusColor = '#10B981';
  } else if (dsr <= 35) {
    dsrScore = 18;
    dsrStatus = 'Waspada (31-35%)';
    dsrStatusColor = '#F59E0B';
  } else {
    dsrScore = 5;
    dsrStatus = 'Bahaya / Overleveraged (>35%)';
    dsrStatusColor = '#EF4444';
  }

  // 2. Emergency Fund Months - Target: 6 months
  const monthlyEssential = totals.totalCommittedExpenses;
  const emergencyFundMonths = monthlyEssential > 0 ? assets.liquid / monthlyEssential : 0;
  let efScore = 25; // Max 25 pts
  if (emergencyFundMonths >= 6) efScore = 25;
  else if (emergencyFundMonths >= 3) efScore = 18;
  else if (emergencyFundMonths >= 1) efScore = 10;
  else efScore = 3;

  // 3. Saving & Investment Rate - Target: >= 20%
  // Formula: ((Total Tabungan Sinking Fund + Alokasi Investasi) / Pemasukan Bersih) * 100
  const totalSavingsAndInvestment = totals.totalSinkingFundNeed + Math.max(0, totals.netSurplusOrDeficit);
  const savingRate = safeIncome > 0 ? (totalSavingsAndInvestment / safeIncome) * 100 : 0;
  let saveScore = 25; // Max 25 pts
  let savingStatus: string;
  let savingStatusColor: string;

  if (savingRate >= 20) {
    saveScore = 25;
    savingStatus = 'Sehat / Optimal (≥20%)';
    savingStatusColor = '#10B981';
  } else {
    saveScore = Math.max(5, Math.round((savingRate / 20) * 18));
    savingStatus = 'Perlu Peningkatan (<20%)';
    savingStatusColor = '#F59E0B';
  }

  // 4. Cashflow Health (Surplus vs Deficit) - Max 20 pts
  let cashflowScore = 20;
  if (totals.netSurplusOrDeficit >= 0) {
    cashflowScore = 20;
  } else {
    const deficitRatio = safeIncome > 0 ? totals.deficitAmount / safeIncome : 1;
    cashflowScore = Math.max(0, Math.round(20 - deficitRatio * 60));
  }

  const healthScore = calculateHealthScore({
    dsrScore,
    emergencyFundScore: efScore,
    savingScore: saveScore,
    cashflowScore,
  });

  let status: 'Sehat Prima' | 'Cukup Sehat' | 'Waspada' | 'Kritis' = 'Sehat Prima';
  let statusColor = '#10B981'; // Green

  if (healthScore >= 80) {
    status = 'Sehat Prima';
    statusColor = '#10B981';
  } else if (healthScore >= 65) {
    status = 'Cukup Sehat';
    statusColor = '#32A89C';
  } else if (healthScore >= 50) {
    status = 'Waspada';
    statusColor = '#F59E0B'; // Amber
  } else {
    status = 'Kritis';
    statusColor = '#EF4444'; // Red
  }

  // DYNAMIC REACTIVE NET WORTH:
  // Formula Benar: Net Worth = (kasLikuid + totalInvestasi + asetFisik) - totalLiabilitas.
  const totalLiquid = Number(assets.liquid) || 0;
  const totalInvestment = Number(assets.investment) || 0;
  const totalPersonal = Number(assets.personal) || 0;
  
  // Total Liabilitas = Total Liabilitas Riil (KPR + Utang Lain)
  const totalLiabilities = Number(assets.liabilities) || 0;

  const totalAssets = totalLiquid + totalInvestment + totalPersonal;
  const netWorth = calculateReactiveNetWorth(totalLiquid, totalInvestment, totalPersonal, totalLiabilities);

  return {
    healthScore,
    status,
    statusColor,
    debtServiceRatio: Math.round(dsr * 10) / 10,
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    emergencyFundAmount: totalLiquid,
    savingRate: Math.round(savingRate * 10) / 10,
    netWorth,
    totalLiquidAssets: totalLiquid,
    totalInvestmentAssets: totalInvestment,
    totalPersonalAssets: totalPersonal,
    totalLiabilities,
    freeCashflow: totals.freeCashflow,
  };
}

// PMT calculation
export function calculateAnnuityMonthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRatePct <= 0) return principal / months;
  const monthlyRate = annualRatePct / 100 / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  return Math.round(principal * (numerator / denominator));
}

// KPR Simulation Comparison
export interface KprComparisonResult {
  currentMonthlyInstallment: number;
  totalInterestRemainingStandard: number;
  totalPaidStandard: number;
  acceleratedMonths: number;
  monthsSaved: number;
  totalInterestWithExtraPayment: number;
  interestSaved: number;
  mFundCompoundedValue: number;
  mFundNetProfit: number;
  recommendation: string;
}

export function simulateKprScenario(kpr: KprSimulationState): KprComparisonResult {
  const balance = kpr.remainingLoanBalance;
  const months = kpr.remainingTenorMonths;
  const activeRate = kpr.isFloatingActive ? kpr.floatingInterestRate : kpr.fixedInterestRate;
  const monthlyRate = activeRate / 100 / 12;

  const currentMonthlyInstallment = calculateAnnuityMonthlyPayment(balance, activeRate, months);
  const totalPaidStandard = currentMonthlyInstallment * months;
  const totalInterestRemainingStandard = Math.max(0, totalPaidStandard - balance);

  // Accelerated amortization loop with extra payment
  let currentBalance = Math.max(0, balance - kpr.lumpSumExtraPayment);
  let acceleratedMonths = 0;
  let totalInterestWithExtra = 0;
  const totalMonthlyPaid = currentMonthlyInstallment + kpr.extraMonthlyPayment;

  if (totalMonthlyPaid > currentBalance * monthlyRate) {
    while (currentBalance > 0 && acceleratedMonths < months + 120) {
      acceleratedMonths++;
      const interestForMonth = currentBalance * monthlyRate;
      totalInterestWithExtra += interestForMonth;
      const principalPayment = totalMonthlyPaid - interestForMonth;
      currentBalance -= principalPayment;
      if (currentBalance <= 0) break;
    }
  } else {
    acceleratedMonths = months;
    totalInterestWithExtra = totalInterestRemainingStandard;
  }

  const monthsSaved = Math.max(0, months - acceleratedMonths);
  const interestSaved = Math.max(0, totalInterestRemainingStandard - totalInterestWithExtra);

  // M-Fund Alternative (Investing extra payment each month instead of paying down mortgage)
  const mFundMonthlyRate = (kpr.mFundReturnRate / 100) / 12;
  let mFundValue = kpr.lumpSumExtraPayment;
  for (let m = 0; m < months; m++) {
    mFundValue = (mFundValue + kpr.extraMonthlyPayment) * (1 + mFundMonthlyRate);
  }
  const totalPrincipalInvested = kpr.lumpSumExtraPayment + (kpr.extraMonthlyPayment * months);
  const mFundNetProfit = Math.max(0, mFundValue - totalPrincipalInvested);

  let recommendation = '';
  if (activeRate > kpr.mFundReturnRate + 2) {
    recommendation = `Suku bunga KPR (${activeRate}%) jauh lebih tinggi dari return RDPU (${kpr.mFundReturnRate}%). Prioritaskan pelunasan ekstra pokok atau Takeover KPR ke Bank Syariah/Fix Promo untuk menghemat bunga hingga ${formatRupiah(interestSaved, true)}.`;
  } else {
    recommendation = `Return M-Fund (${kpr.mFundReturnRate}% p.a. bebas pajak) kompetitif & likuiditas tinggi. Diversifikasikan sebagian ke M-Fund untuk menjaga likuiditas darurat sebelum melunasi KPR.`;
  }

  return {
    currentMonthlyInstallment,
    totalInterestRemainingStandard,
    totalPaidStandard,
    acceleratedMonths,
    monthsSaved,
    totalInterestWithExtraPayment: Math.round(totalInterestWithExtra),
    interestSaved: Math.round(interestSaved),
    mFundCompoundedValue: Math.round(mFundValue),
    mFundNetProfit: Math.round(mFundNetProfit),
    recommendation,
  };
}
