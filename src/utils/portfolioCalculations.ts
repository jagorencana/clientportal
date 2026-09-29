import { JagoPortfolioState, RiskProfilePreset, PortfolioInstrument, PortfolioAsset } from '../types';

export const DEFAULT_PORTFOLIO_INSTRUMENTS: PortfolioInstrument[] = [
  { id: 'rdpu', name: 'RDPU / Kas Likuid', category: 'Cash & Liquid', weight: 20, expectedReturn: 5.5, cashYield: 5.5, isCustom: false },
  { id: 'sbn', name: 'SBN Ritel / Obligasi FR', category: 'Fixed Income', weight: 30, expectedReturn: 6.8, cashYield: 6.8, isCustom: false },
  { id: 'saham_div', name: 'Saham Blue-Chip Dividen', category: 'Equity', weight: 30, expectedReturn: 11.0, cashYield: 4.0, isCustom: false },
  { id: 'saham_alpha', name: 'Saham Alpha / Growth', category: 'Equity', weight: 10, expectedReturn: 15.0, cashYield: 0, isCustom: false },
  { id: 'gold', name: 'Emas Fisik / Logam Mulia', category: 'Commodity', weight: 10, expectedReturn: 7.5, cashYield: 0, isCustom: true },
];

export const DEFAULT_PORTFOLIO_ASSETS: PortfolioAsset[] = [
  {
    id: 'asset-1',
    name: 'RDPU Sucorinvest Sharia Money Market',
    category: 'Pasar Uang',
    platform: 'Bibit',
    costBasis: 25000000,
    marketValue: 26500000,
    notes: 'Alokasi likuiditas lapis dua & dana siaga instan',
    createdAt: '2026-08-15',
  },
  {
    id: 'asset-2',
    name: 'Sukuk Ritel SR020 Tenor 3 Tahun',
    category: 'SBN/Sukuk',
    platform: 'Bareksa',
    costBasis: 50000000,
    marketValue: 51200000,
    notes: 'Kupon 6.30% p.a. fixed masuk rekening bulanan',
    createdAt: '2026-08-20',
  },
  {
    id: 'asset-3',
    name: 'Saham BBCA (Bank Central Asia)',
    category: 'Saham IDX',
    platform: 'Stockbit',
    costBasis: 40000000,
    marketValue: 45800000,
    notes: 'Blue-chip compounder dividen tahunan',
    createdAt: '2026-09-01',
  },
  {
    id: 'asset-4',
    name: 'Emas Logam Mulia Antam CertiCard',
    category: 'Emas/Logam Mulia',
    platform: 'Pegadaian Digital',
    costBasis: 15000000,
    marketValue: 18000000,
    notes: 'Safe haven aset lindung nilai inflasi',
    createdAt: '2026-09-10',
  },
];

export const DEFAULT_JAGO_PORTFOLIO: JagoPortfolioState = {
  lumpSumCapital: 100000000,
  monthlyDCA: 1500000,
  horizonYears: 5,
  riskProfile: 'moderat',
  instruments: DEFAULT_PORTFOLIO_INSTRUMENTS,
  portfolioAssets: DEFAULT_PORTFOLIO_ASSETS,
};

export const RISK_PROFILE_PRESETS: Record<Exclude<RiskProfilePreset, 'custom'>, {
  label: string;
  tagline: string;
  instruments: PortfolioInstrument[];
}> = {
  konservatif: {
    label: 'Konservatif',
    tagline: 'Fokus keamanan modal pokok, likuiditas tinggi & kupon pasti',
    instruments: [
      { id: 'rdpu', name: 'RDPU / Kas Likuid', category: 'Cash & Liquid', weight: 35, expectedReturn: 5.5, cashYield: 5.5, isCustom: false },
      { id: 'sbn', name: 'SBN Ritel / Obligasi FR', category: 'Fixed Income', weight: 45, expectedReturn: 6.8, cashYield: 6.8, isCustom: false },
      { id: 'saham_div', name: 'Saham Blue-Chip Dividen', category: 'Equity', weight: 10, expectedReturn: 11.0, cashYield: 4.0, isCustom: false },
      { id: 'saham_alpha', name: 'Saham Alpha / Growth', category: 'Equity', weight: 0, expectedReturn: 15.0, cashYield: 0, isCustom: false },
      { id: 'gold', name: 'Emas Fisik / Logam Mulia', category: 'Commodity', weight: 10, expectedReturn: 7.5, cashYield: 0, isCustom: true },
    ],
  },
  moderat: {
    label: 'Moderat (All-Weather)',
    tagline: 'Keseimbangan arus kas pasif reguler, emas lindung nilai & compounder saham',
    instruments: [
      { id: 'rdpu', name: 'RDPU / Kas Likuid', category: 'Cash & Liquid', weight: 20, expectedReturn: 5.5, cashYield: 5.5, isCustom: false },
      { id: 'sbn', name: 'SBN Ritel / Obligasi FR', category: 'Fixed Income', weight: 30, expectedReturn: 6.8, cashYield: 6.8, isCustom: false },
      { id: 'saham_div', name: 'Saham Blue-Chip Dividen', category: 'Equity', weight: 30, expectedReturn: 11.0, cashYield: 4.0, isCustom: false },
      { id: 'saham_alpha', name: 'Saham Alpha / Growth', category: 'Equity', weight: 10, expectedReturn: 15.0, cashYield: 0, isCustom: false },
      { id: 'gold', name: 'Emas Fisik / Logam Mulia', category: 'Commodity', weight: 10, expectedReturn: 7.5, cashYield: 0, isCustom: true },
    ],
  },
  agresif: {
    label: 'Agresif',
    tagline: 'Maksimalkan efek compounder jangka panjang dan eksposur saham bertumbuh',
    instruments: [
      { id: 'rdpu', name: 'RDPU / Kas Likuid', category: 'Cash & Liquid', weight: 10, expectedReturn: 5.5, cashYield: 5.5, isCustom: false },
      { id: 'sbn', name: 'SBN Ritel / Obligasi FR', category: 'Fixed Income', weight: 15, expectedReturn: 6.8, cashYield: 6.8, isCustom: false },
      { id: 'saham_div', name: 'Saham Blue-Chip Dividen', category: 'Equity', weight: 35, expectedReturn: 11.0, cashYield: 4.0, isCustom: false },
      { id: 'saham_alpha', name: 'Saham Alpha / Growth', category: 'Equity', weight: 30, expectedReturn: 15.0, cashYield: 0, isCustom: false },
      { id: 'gold', name: 'Emas Fisik / Logam Mulia', category: 'Commodity', weight: 10, expectedReturn: 7.5, cashYield: 0, isCustom: true },
    ],
  },
};

export interface InstrumentBreakdownResult {
  id: string;
  name: string;
  category: string;
  weight: number;
  expectedReturn: number;
  cashYield?: number;
  allocatedValue: number;
  annualCashYield: number;
  monthlyCashYield: number;
  isCustom?: boolean;
}

export function calculateInstrumentAnnualCashflow(
  inst: PortfolioInstrument,
  allocatedValue: number
): number {
  const id = (inst.id || '').toLowerCase();
  const name = (inst.name || '').toLowerCase();
  const cat = (inst.category || '').toLowerCase();

  // 1. SBN / Fixed Income: Kupon = nominal SBN * (expectedReturn / 100)
  if (
    id === 'sbn' ||
    name.includes('sbn') ||
    name.includes('obligasi') ||
    name.includes('sukuk') ||
    cat.includes('fixed') ||
    cat.includes('pendapatan tetap')
  ) {
    return Math.round(allocatedValue * ((Number(inst.expectedReturn) || 0) / 100));
  }

  // 2. Saham Dividen: Dividen tunai = nominal Saham Div * 0.04 (asumsi dividen yield 4%)
  if (
    id === 'saham_div' ||
    id === 'dividend' ||
    name.includes('dividen') ||
    name.includes('dividend')
  ) {
    return Math.round(allocatedValue * 0.04);
  }

  // 3. RDPU / Kas Likuid / Deposito: Bunga = nominal RDPU * (expectedReturn / 100)
  if (
    id === 'rdpu' ||
    name.includes('rdpu') ||
    name.includes('pasar uang') ||
    cat.includes('liquid') ||
    cat.includes('kas') ||
    cat.includes('deposito') ||
    name.includes('deposito')
  ) {
    return Math.round(allocatedValue * ((Number(inst.expectedReturn) || 0) / 100));
  }

  // 4. Properti Sewa (jika ada instrumen custom sewa properti): asumsi cashflow sewa 5%
  if (cat.includes('properti') || name.includes('sewa') || name.includes('kost') || name.includes('kontrakan')) {
    return Math.round(allocatedValue * 0.05);
  }

  // 5. Emas Fisik, Saham Alpha / Growth, Kripto, Komoditas, Global Equity: 0 rupiah (karena murni capital gain)
  return 0;
}

export interface PortfolioSimulationResult {
  totalAllocationPct: number;
  isAllocationValid: boolean;
  weightedReturnPct: number;
  weightedCashYieldPct: number;
  totalMonths: number;
  totalPrincipal: number;
  fvLumpSum: number;
  fvDCA: number;
  totalFV: number;
  netGrowth: number;
  annualPassiveIncome: number;
  monthlyPassiveIncome: number;
  instrumentBreakdowns: InstrumentBreakdownResult[];
  breakdown: {
    rdpuValue: number;
    sbnValue: number;
    dividendValue: number;
    growthValue: number;
  };
}

export function getCleanInstruments(portfolio: JagoPortfolioState): PortfolioInstrument[] {
  if (Array.isArray(portfolio.instruments) && portfolio.instruments.length > 0) {
    return portfolio.instruments.map((inst, index) => ({
      id: inst.id || `inst-${index}`,
      name: inst.name || 'Instrumen Aset',
      category: inst.category || 'Lainnya',
      weight: Number(inst.weight) || 0,
      expectedReturn: Number(inst.expectedReturn) || 0,
      cashYield: Number(inst.cashYield) || 0,
      isCustom: inst.isCustom ?? false,
      notes: inst.notes || '',
    }));
  }

  // Fallback migration if portfolio state has legacy 'allocations' object
  if (portfolio.allocations) {
    return [
      { id: 'rdpu', name: 'RDPU / Kas Likuid', category: 'Cash & Liquid', weight: portfolio.allocations.rdpu?.portionPct ?? 20, expectedReturn: portfolio.allocations.rdpu?.expectedReturnPct ?? 5.5, cashYield: 5.5, isCustom: false },
      { id: 'sbn', name: 'SBN Ritel / Obligasi FR', category: 'Fixed Income', weight: portfolio.allocations.sbn?.portionPct ?? 30, expectedReturn: portfolio.allocations.sbn?.expectedReturnPct ?? 6.8, cashYield: 6.8, isCustom: false },
      { id: 'saham_div', name: 'Saham Blue-Chip Dividen', category: 'Equity', weight: portfolio.allocations.dividend?.portionPct ?? 30, expectedReturn: portfolio.allocations.dividend?.expectedReturnPct ?? 11.0, cashYield: 4.0, isCustom: false },
      { id: 'saham_alpha', name: 'Saham Alpha / Growth', category: 'Equity', weight: portfolio.allocations.growth?.portionPct ?? 10, expectedReturn: portfolio.allocations.growth?.expectedReturnPct ?? 15.0, cashYield: 0, isCustom: false },
      { id: 'gold', name: 'Emas Fisik / Logam Mulia', category: 'Commodity', weight: 10, expectedReturn: 7.5, cashYield: 0, isCustom: true },
    ];
  }

  return DEFAULT_PORTFOLIO_INSTRUMENTS;
}

export function calculatePortfolioSimulation(portfolio: JagoPortfolioState): PortfolioSimulationResult {
  const { lumpSumCapital, monthlyDCA, horizonYears } = portfolio;
  const instruments = getCleanInstruments(portfolio);

  // 1. Total Bobot Alokasi
  const rawTotalAllocationPct = instruments.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  const totalAllocationPct = Math.round(rawTotalAllocationPct * 10) / 10;
  const isAllocationValid = Math.abs(totalAllocationPct - 100) < 0.1;

  // 2. Weighted Expected Return
  // Weighted Return = Sum(weight_i * expectedReturn_i) / 100
  const weightedReturnPct = instruments.reduce(
    (acc, curr) => acc + ((Number(curr.weight) || 0) * (Number(curr.expectedReturn) || 0)),
    0
  ) / 100;

  // 3. Time Value of Money & Compound Future Value
  const totalMonths = Math.max(1, Math.round(horizonYears * 12));
  const rMonthly = (weightedReturnPct / 100) / 12;

  // FV Lump Sum
  const fvLumpSum = lumpSumCapital * Math.pow(1 + rMonthly, totalMonths);

  // FV DCA (Annuity Future Value)
  const fvDCA = rMonthly > 0
    ? monthlyDCA * ((Math.pow(1 + rMonthly, totalMonths) - 1) / rMonthly)
    : monthlyDCA * totalMonths;

  const totalFV = Math.round(fvLumpSum + fvDCA);
  const totalPrincipal = Math.round(lumpSumCapital + (monthlyDCA * totalMonths));
  const netGrowth = Math.max(0, totalFV - totalPrincipal);

  // 4. Dynamic Instrument Breakdowns & Automatic Background Passive Income
  // • SBN: Kupon = nominal SBN * (expectedReturn / 100)
  // • Saham Dividen: Dividen tunai = nominal Saham Div * 0.04 (asumsi dividen yield 4%)
  // • RDPU: Bunga = nominal RDPU * (expectedReturn / 100)
  // • Emas & Saham Alpha: 0 rupiah (karena murni capital gain)
  let calculatedAnnualPassiveIncome = 0;

  const instrumentBreakdowns: InstrumentBreakdownResult[] = instruments.map((inst) => {
    const allocatedValue = Math.round(totalFV * ((Number(inst.weight) || 0) / 100));
    const annualCash = calculateInstrumentAnnualCashflow(inst, allocatedValue);
    const monthlyCash = Math.round(annualCash / 12);
    calculatedAnnualPassiveIncome += annualCash;

    return {
      id: inst.id,
      name: inst.name,
      category: inst.category,
      weight: inst.weight,
      expectedReturn: inst.expectedReturn,
      cashYield: inst.cashYield,
      allocatedValue,
      annualCashYield: annualCash,
      monthlyCashYield: monthlyCash,
      isCustom: inst.isCustom,
    };
  });

  const annualPassiveIncome = Math.round(calculatedAnnualPassiveIncome);
  const monthlyPassiveIncome = Math.round(annualPassiveIncome / 12);
  const weightedCashYieldPct = totalFV > 0 ? (annualPassiveIncome / totalFV) * 100 : 0;

  // Legacy Breakdown for backward compatibility
  const rdpuInst = instruments.find((i) => i.id === 'rdpu');
  const sbnInst = instruments.find((i) => i.id === 'sbn');
  const divInst = instruments.find((i) => i.id === 'saham_div' || i.id === 'dividend');
  const growthInst = instruments.find((i) => i.id === 'saham_alpha' || i.id === 'growth');

  const breakdown = {
    rdpuValue: Math.round(totalFV * ((rdpuInst?.weight || 0) / 100)),
    sbnValue: Math.round(totalFV * ((sbnInst?.weight || 0) / 100)),
    dividendValue: Math.round(totalFV * ((divInst?.weight || 0) / 100)),
    growthValue: Math.round(totalFV * ((growthInst?.weight || 0) / 100)),
  };

  return {
    totalAllocationPct,
    isAllocationValid,
    weightedReturnPct,
    weightedCashYieldPct,
    totalMonths,
    totalPrincipal,
    fvLumpSum: Math.round(fvLumpSum),
    fvDCA: Math.round(fvDCA),
    totalFV,
    netGrowth,
    annualPassiveIncome,
    monthlyPassiveIncome,
    instrumentBreakdowns,
    breakdown,
  };
}
