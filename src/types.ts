export type ClientTier = 'LEAD' | 'STARTER' | 'BLUEPRINT_VIP';

export interface ClientProfile {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  city: string;
  occupation: string;
  age: number;
  maritalStatus: 'Belum Menikah' | 'Menikah (Tanpa Anak)' | 'Menikah (1 Anak)' | 'Menikah (2+ Anak)';
  tier: ClientTier;
  registeredDate: string;
  advisorName: string;
  advisorRole: string;
  advisorPhone: string;
  consultationDate: string;
  googleMeetUrl: string;
  avatarUrl?: string;
  createdAt?: string;
  activationDate?: string;
}

export interface BudgetBucketItem {
  id: string;
  name: string;
  amount: number;
  isEssential?: boolean;
}

export interface BudgetCycle {
  currentPeriod: string;
  status?: 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'ARCHIVED' | string;
  cycleMonth?: string;
  updatedAt?: string;
}

export interface TransactionLedgerItem {
  id: string;
  date?: string;
  period?: string;
  category?: string;
  description?: string;
  amount: number;
  type?: 'income' | 'expense';
  pos?: 'living' | 'debt' | 'sinking' | 'lifestyle';
}

export interface BudgetState {
  monthlyNetIncome: number;
  livingExpenses: BudgetBucketItem[];
  debtObligations: BudgetBucketItem[];
  lifestyleExpenses: BudgetBucketItem[];
  // Sinking fund monthly total is automatically computed from goals
  budgetCycle?: BudgetCycle;
  currentPeriod?: string;
  budgetStatusPerPeriod?: Record<string, string>;
  status?: string;
}

export type SinkingFundCategory = 'education' | 'vehicle' | 'travel' | 'property' | 'emergency' | 'retirement' | 'custom';

export interface SinkingFundGoal {
  id: string;
  title: string;
  category: SinkingFundCategory;
  targetAmount: number;
  currentSavings: number;
  tenorMonths: number;
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  iconName?: string;
  deadlineDate?: string;
}

export interface KprSimulationState {
  originalLoanAmount: number;
  remainingLoanBalance: number;
  originalTenorYears: number;
  remainingTenorMonths: number;
  fixedInterestRate: number; // e.g. 5.5%
  floatingInterestRate: number; // e.g. 11.5%
  isFloatingActive: boolean;
  extraMonthlyPayment: number;
  lumpSumExtraPayment: number;
  mFundReturnRate: number; // e.g. 7.5% p.a.
  // Institutional Advisor Extended Fields
  biRate?: number;
  spreadBank?: number;
  tenorBerjalan?: number;
  cicilanFixed?: number;
  danaLikuid?: number;
  nabungBulanan?: number;
  penaltiPersen?: number;
  opsiRestrukturisasi?: 'potong_tenor' | 'turunkan_cicilan';
}

export interface ActionItem {
  id: string;
  title: string;
  category: 'Cashflow' | 'Utang/KPR' | 'Proteksi' | 'Investasi' | 'Dana Darurat';
  priority: 'Segera (Minggu 1)' | 'Prioritas (Minggu 2-3)' | 'Jangka Menengah (Bulan 1)';
  impactText: string;
  completed: boolean;
  notes?: string;
}

export interface FinancialHealthMetrics {
  healthScore: number; // 0 - 100
  status: 'Sehat Prima' | 'Cukup Sehat' | 'Waspada' | 'Kritis';
  statusColor: string;
  debtServiceRatio: number; // DSR %
  emergencyFundMonths: number; // Months covered
  emergencyFundAmount: number;
  savingRate: number; // % of income allocated to savings + sinking funds
  netWorth: number;
  totalLiquidAssets: number;
  totalInvestmentAssets: number;
  totalPersonalAssets: number;
  totalLiabilities: number;
  freeCashflow: number;
}

export interface UserSession {
  email: string;
  nama: string;
  name?: string;
  orderId: string;
  token: string;
  password?: string;
  role?: string;
  loginAt: string;
  createdAt?: string;
  activationDate?: string;
  tier?: ClientTier;
}

export interface NetWorthData {
  kasLikuid: number;
  investasi: number;
  asetFisik: number;
  liabilitasKPR: number;
  kpr?: number;
  utangLain: number;
}

export interface TravelBudgetData {
  destination: string;
  durationDays: number;
  participants: number;
  targetMonths: number;
  flightCost: number;
  hotelCost: number;
  visaInsuranceCost: number;
  diningDailyPerPax: number;
  transportDaily: number;
  tourPerPax: number;
  shoppingCost: number;
  bufferPct: number;
}

export type AssetCategory = 'Pasar Uang' | 'SBN/Sukuk' | 'Saham IDX' | 'Valas & Global' | 'Emas/Logam Mulia' | string;

export interface PortfolioAsset {
  id: string;
  name: string;
  category: AssetCategory;
  platform: string; // Bibit, Bareksa, Stockbit, CIMB, IBKR, dll
  costBasis: number; // Modal Pembelian Awal (Cost Basis Rp)
  marketValue: number; // Nilai Pasar Terkini (Current Market Value Rp)
  notes?: string; // Catatan Singkat
  createdAt?: string;
}

export type RiskProfilePreset = 'konservatif' | 'moderat' | 'agresif' | 'custom';

export interface PortfolioInstrument {
  id: string;
  name: string;
  category: string; // 'Cash & Liquid' | 'Fixed Income' | 'Equity' | 'Commodity' | 'Crypto' | 'Property' | 'Global Asset'
  weight: number; // in %
  expectedReturn: number; // in % p.a.
  cashYield?: number; // in % p.a. (optional / legacy)
  isCustom?: boolean;
  notes?: string;
}

export interface PortfolioInstrumentSetting {
  portionPct: number;
  expectedReturnPct: number;
}

export interface JagoPortfolioState {
  lumpSumCapital: number;
  monthlyDCA: number;
  horizonYears: number;
  riskProfile: RiskProfilePreset;
  instruments: PortfolioInstrument[];
  portfolioAssets?: PortfolioAsset[];
  // Optional legacy fields for backward compatibility
  allocations?: {
    rdpu?: PortfolioInstrumentSetting;
    sbn?: PortfolioInstrumentSetting;
    dividend?: PortfolioInstrumentSetting;
    growth?: PortfolioInstrumentSetting;
  };
}

export interface GlobalPortalState {
  profile: ClientProfile;
  netWorthData: NetWorthData;
  masterBudget: BudgetState;
  sinkingFunds: SinkingFundGoal[];
  kprData: KprSimulationState;
  travelBudget?: TravelBudgetData;
  checklist30D: ActionItem[];
  jagoPortfolio?: JagoPortfolioState;
  portfolioAssets?: PortfolioAsset[];
  // Defensive cycle & ledger extensions
  budgetCycle?: BudgetCycle;
  budgetStatusPerPeriod?: Record<string, string>;
  currentPeriod?: string;
  transactionLedger?: TransactionLedgerItem[];
}

export type CloudSyncStatus = 'saved' | 'saving' | 'offline' | 'error';
