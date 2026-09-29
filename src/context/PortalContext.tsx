import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ClientProfile, 
  BudgetState, 
  SinkingFundGoal, 
  KprSimulationState, 
  ActionItem, 
  NetWorthData, 
  TravelBudgetData, 
  GlobalPortalState, 
  UserSession, 
  CloudSyncStatus,
  FinancialHealthMetrics,
  JagoPortfolioState,
  PortfolioAsset,
  BudgetCycle,
  TransactionLedgerItem
} from '../types';
import { SAMPLE_PROFILES } from '../data/initialData';
import { computeFinancialHealth, calculateTotals } from '../utils/calculations';
import { DEFAULT_JAGO_PORTFOLIO, DEFAULT_PORTFOLIO_ASSETS, getCleanInstruments } from '../utils/portfolioCalculations';
import { 
  getStoredVipSession, 
  saveVipSession, 
  clearVipSession, 
  verifyTokenStatus,
  generateLifetimeToken,
  KNOWN_VIP_TOKENS,
  validateEmail,
  sanitizeText,
  VipSessionData
} from '../utils/security';
import { 
  apiPortalLogin, 
  apiSavePortalState, 
  apiForgotPassword, 
  apiResetPassword,
  apiGetPortalData 
} from '../utils/googleScript';
import { savePortalStateToCloud, getClientPortalDataFromCloud } from '../services/googleScriptSync';
import { 
  HomepageAuditData, 
  DEFAULT_BASELINE_AUDIT, 
  extractHomepageAuditData, 
  saveHomepageAuditData 
} from '../utils/auditData';
import { calculateVipDaysRemaining, VipCountdownInfo } from '../utils/vipPass';

export const USER_SESSION_KEY = 'user_session';

interface PortalContextType {
  // Auth state
  isAuthenticated: boolean;
  currentUser: UserSession | null;
  userSession: UserSession | null;
  user: UserSession | null;
  isVip: boolean;
  isModuleAllowed: (moduleId: string) => boolean;
  authView: 'login' | 'reset-password' | 'portal';
  setAuthView: (view: 'login' | 'reset-password' | 'portal') => void;
  loginNotice: string | null;
  setLoginNotice: (notice: string | null) => void;
  login: (email: string, passwordOrToken: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; otp?: string }>;
  resetPassword: (email: string, otpToken: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;

  // Active Profile Selector
  activeProfileKey: string;
  setActiveProfileKey: (key: string) => void;
  loadPresetProfile: (key: string) => void;

  // Global State
  globalState: GlobalPortalState;
  portalData: GlobalPortalState;
  profile: ClientProfile;
  netWorthData: NetWorthData;
  masterBudget: BudgetState;
  sinkingFunds: SinkingFundGoal[];
  kprData: KprSimulationState;
  travelBudget: TravelBudgetData;
  checklist30D: ActionItem[];
  jagoPortfolio: JagoPortfolioState;
  portfolioAssets: PortfolioAsset[];
  totalPortofolioRiil: number;

  // Homepage Audit Baseline (Data Continuity)
  baselineAudit: HomepageAuditData;
  updateBaselineAudit: (audit: Partial<HomepageAuditData>) => void;
  reloadFromHomepageAudit: () => boolean;
  applyAuditData: (audit: HomepageAuditData) => void;

  // Computed Metrics
  metrics: FinancialHealthMetrics;
  budgetTotals: ReturnType<typeof calculateTotals>;
  vipDaysRemaining: number;
  vipCountdown: VipCountdownInfo;

  // Updaters
  updateProfile: (profile: Partial<ClientProfile>) => void;
  updateNetWorth: (netWorth: Partial<NetWorthData>) => void;
  updateMasterBudget: (budget: BudgetState) => void;
  updateSinkingFunds: (goals: SinkingFundGoal[]) => void;
  updateKprData: (kpr: KprSimulationState) => void;
  updateTravelBudget: (travel: Partial<TravelBudgetData>) => void;
  updateChecklist: (checklist: ActionItem[]) => void;
  toggleChecklistItem: (id: string) => void;
  syncTravelToSinkingFund: (goalData: { title: string; targetAmount: number; tenorMonths: number; category: 'travel' | 'education' | 'property' | 'retirement' | 'custom'; notes: string }) => void;
  updateJagoPortfolio: (portfolio: JagoPortfolioState) => void;
  addPortfolioAsset: (asset: Omit<PortfolioAsset, 'id' | 'createdAt'>) => void;
  updatePortfolioAsset: (id: string, updates: Partial<PortfolioAsset>) => void;
  deletePortfolioAsset: (id: string) => void;
  setPortfolioAssets: (assets: PortfolioAsset[]) => void;
  resetAllData: () => void;

  // Cloud Sync
  cloudSyncStatus: CloudSyncStatus;
  lastSavedTime: Date | null;
  triggerManualSave: () => Promise<void>;

  // VIP Upgrade Action (Duitku Integration)
  upgradeToVip: (customOrderId?: string) => void;

  // Optimization flag (Live Score reactive logic)
  hasUserOptimized: boolean;
  setHasUserOptimized: (val: boolean) => void;

  // Defensive Budget Cycle & Ledger Management
  budgetCycle: BudgetCycle;
  currentPeriod: string;
  budgetStatus: string;
  budgetStatusPerPeriod: Record<string, string>;
  transactionLedger: TransactionLedgerItem[];
  setBudgetPeriod: (period: string) => void;
  setBudgetStatus: (period: string, status: string) => void;
}

const DEFAULT_TRAVEL_BUDGET: TravelBudgetData = {
  destination: 'Tokyo, Kyoto & Osaka (Cherry Blossom / Autumn)',
  durationDays: 10,
  participants: 2,
  targetMonths: 8,
  flightCost: 11000000,
  hotelCost: 2400000,
  visaInsuranceCost: 1200000,
  diningDailyPerPax: 950000,
  transportDaily: 450000,
  tourPerPax: 2500000,
  shoppingCost: 6000000,
  bufferPct: 10,
};

// Helper to detect placeholder names
export const isPlaceholderName = (name?: string) => {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return lower === 'vip demo' || lower === 'starter demo' || lower === 'vip blueprint member' || lower === 'user' || lower === 'demo' || lower === '';
};

export const buildStateFromAudit = (audit: HomepageAuditData): GlobalPortalState => {
  const effectiveName = (audit.clientName && !isPlaceholderName(audit.clientName)) ? audit.clientName : 'Klien VIP';
  
  // Ambil nilai pemasukan bersih secara dinamis dari data audit aktif
  const activeAudit: any = audit;
  const userIncome = activeAudit?.pemasukan || activeAudit?.income || audit.monthlyIncome || 0;
  const userLiving = activeAudit?.pengeluaran || activeAudit?.pengeluaranRutin || audit.livingExpenses || 0;
  const userDebt = activeAudit?.cicilan || activeAudit?.cicilanUtang || audit.debtExpenses || 0;
  const debtEst = userDebt > 0 ? Math.round(userDebt * 12 * 5) : 0;

  // Target sinking fund realistis sesuai kapasitas sisa kas riil klien (menghindari target dummy puluhan juta)
  const realisticStarterGoals: SinkingFundGoal[] = [
    {
      id: 'g-darurat-1',
      title: 'Fondasi Dana Darurat 3 Bulan (RDPU M-Fund)',
      category: 'emergency',
      targetAmount: Math.max(1500000, userLiving * 3),
      currentSavings: Math.min(Math.max(1500000, userLiving * 3), audit.liquidSavings || 0),
      tenorMonths: 6,
      priority: 'High',
      notes: 'Diparkir di Reksadana Pasar Uang M-Fund Mirae Asset (likuid & bebas pajak)',
      deadlineDate: 'Februari 2027',
    },
    {
      id: 'g-sinking-1',
      title: 'Sinking Fund Kebutuhan Terencana',
      category: 'custom',
      targetAmount: Math.max(2000000, Math.round(userIncome * 0.5)),
      currentSavings: 0,
      tenorMonths: 10,
      priority: 'Medium',
      notes: 'Alokasi sisa kas bulanan proporsional sesuai kapasitas',
      deadlineDate: 'Juni 2027',
    },
  ];

  return {
    profile: {
      id: 'JR-VIP-' + (effectiveName ? effectiveName.toUpperCase().replace(/\s+/g, '-') : 'MEMBER'),
      name: effectiveName,
      email: audit.email || '',
      phone: audit.phone || '',
      city: 'Jakarta',
      occupation: 'Professional Client',
      age: 28,
      maritalStatus: 'Belum Menikah',
      tier: 'BLUEPRINT_VIP',
      registeredDate: 'Audit Homepage Terintegrasi',
      advisorName: 'Jago Rencana Private Wealth Advisory Desk',
      advisorRole: 'Principal Wealth Planner',
      advisorPhone: '6281806988868',
      consultationDate: 'Jadwal Konsultasi Tersedia',
      googleMeetUrl: 'https://meet.google.com/jgr-plan-vip',
    },
    netWorthData: {
      kasLikuid: audit.liquidSavings || 0,
      investasi: audit.investmentAssets || 0,
      asetFisik: 0,
      liabilitasKPR: 0,
      utangLain: debtEst,
    },
    masterBudget: {
      monthlyNetIncome: userIncome,
      livingExpenses: userLiving > 0 ? [
        {
          id: 'aud-liv-1',
          name: 'Biaya Hidup & Kebutuhan Pokok (Living)',
          amount: userLiving,
          isEssential: true,
        },
      ] : [],
      debtObligations: userDebt > 0 ? [
        {
          id: 'aud-debt-1',
          name: 'Cicilan & Kewajiban Utang (Debt)',
          amount: userDebt,
          isEssential: true,
        },
      ] : [],
      lifestyleExpenses: (audit.lifestyleExpenses && audit.lifestyleExpenses > 0) ? [
        {
          id: 'aud-life-1',
          name: 'Gaya Hidup & Keinginan (Lifestyle)',
          amount: audit.lifestyleExpenses,
        },
      ] : [],
    },
    sinkingFunds: realisticStarterGoals,
    kprData: {
      originalLoanAmount: 0,
      remainingLoanBalance: 0,
      originalTenorYears: 15,
      remainingTenorMonths: 0,
      fixedInterestRate: 6.5,
      floatingInterestRate: 11.5,
      isFloatingActive: false,
      extraMonthlyPayment: 0,
      lumpSumExtraPayment: 0,
      mFundReturnRate: 7.0,
    },
    travelBudget: { ...DEFAULT_TRAVEL_BUDGET },
    checklist30D: [],
    portfolioAssets: [...DEFAULT_PORTFOLIO_ASSETS],
    jagoPortfolio: {
      ...DEFAULT_JAGO_PORTFOLIO,
      portfolioAssets: [...DEFAULT_PORTFOLIO_ASSETS],
      lumpSumCapital: audit.investmentAssets > 0 ? audit.investmentAssets : 0,
      monthlyDCA: Math.max(0, userIncome - userLiving - userDebt) > 0
        ? Math.max(500000, Math.round((userIncome - userLiving - userDebt) * 0.4))
        : 0,
    },
    budgetCycle: {
      currentPeriod: '2026-09',
      status: 'DRAFT',
      cycleMonth: '2026-09',
      updatedAt: new Date().toISOString(),
    },
    budgetStatusPerPeriod: { '2026-09': 'DRAFT' },
    currentPeriod: '2026-09',
    transactionLedger: [],
  };
};

const buildInitialState = (key: string = 'budi'): GlobalPortalState => {
  const preset = SAMPLE_PROFILES[key] || SAMPLE_PROFILES.budi || SAMPLE_PROFILES.starter;
  const currentPeriod = '2026-09';
  const budgetCycle: BudgetCycle = {
    currentPeriod,
    status: 'DRAFT',
    cycleMonth: currentPeriod,
    updatedAt: new Date().toISOString(),
  };
  return {
    profile: { ...preset.profile },
    netWorthData: {
      kasLikuid: preset.assets.liquid,
      investasi: preset.assets.investment,
      asetFisik: preset.assets.personal,
      liabilitasKPR: preset.kpr.remainingLoanBalance,
      utangLain: Math.max(0, preset.assets.liabilities - preset.kpr.remainingLoanBalance),
    },
    masterBudget: {
      ...JSON.parse(JSON.stringify(preset.budget)),
      budgetCycle,
      currentPeriod,
      budgetStatusPerPeriod: { [currentPeriod]: 'DRAFT' },
      status: 'DRAFT',
    },
    sinkingFunds: JSON.parse(JSON.stringify(preset.goals)),
    kprData: JSON.parse(JSON.stringify(preset.kpr)),
    travelBudget: { ...DEFAULT_TRAVEL_BUDGET },
    checklist30D: JSON.parse(JSON.stringify(preset.actions)),
    portfolioAssets: [...DEFAULT_PORTFOLIO_ASSETS],
    jagoPortfolio: { 
      ...DEFAULT_JAGO_PORTFOLIO,
      portfolioAssets: [...DEFAULT_PORTFOLIO_ASSETS],
    },
    budgetCycle,
    budgetStatusPerPeriod: { [currentPeriod]: 'DRAFT' },
    currentPeriod,
    transactionLedger: [],
  };
};

/**
 * Defensive deep-merging state normalizer
 * Ensures budgetCycle, budgetStatusPerPeriod, portfolioAssets, and transactionLedger
 * are always non-undefined objects/arrays across all account types and old cache versions.
 */
export const normalizePortalState = (raw: any, fallbackKey: string = 'budi'): GlobalPortalState => {
  const baseDefault = buildInitialState(fallbackKey);
  if (!raw || typeof raw !== 'object') {
    return baseDefault;
  }

  const currentPeriod = raw?.budgetCycle?.currentPeriod || raw?.currentPeriod || raw?.masterBudget?.currentPeriod || '2026-09';
  const budgetCycleStatus = raw?.budgetCycle?.status || raw?.budgetStatusPerPeriod?.[currentPeriod] || raw?.masterBudget?.status || 'DRAFT';

  const budgetCycle: BudgetCycle = {
    currentPeriod,
    status: budgetCycleStatus,
    cycleMonth: raw?.budgetCycle?.cycleMonth || currentPeriod,
    updatedAt: raw?.budgetCycle?.updatedAt || new Date().toISOString(),
  };

  const budgetStatusPerPeriod: Record<string, string> = (raw?.budgetStatusPerPeriod && typeof raw.budgetStatusPerPeriod === 'object')
    ? { [currentPeriod]: budgetCycleStatus, ...raw.budgetStatusPerPeriod }
    : { [currentPeriod]: budgetCycleStatus };

  const portfolioAssets = Array.isArray(raw?.portfolioAssets)
    ? raw.portfolioAssets
    : (Array.isArray(raw?.jagoPortfolio?.portfolioAssets) ? raw.jagoPortfolio.portfolioAssets : baseDefault.portfolioAssets || []);

  const transactionLedger = Array.isArray(raw?.transactionLedger) ? raw.transactionLedger : [];

  const rawMb = raw?.masterBudget || {};
  const masterBudget: BudgetState = {
    monthlyNetIncome: Number(rawMb.monthlyNetIncome ?? baseDefault.masterBudget.monthlyNetIncome) || 0,
    livingExpenses: Array.isArray(rawMb.livingExpenses) ? rawMb.livingExpenses : baseDefault.masterBudget.livingExpenses,
    debtObligations: Array.isArray(rawMb.debtObligations) ? rawMb.debtObligations : baseDefault.masterBudget.debtObligations,
    lifestyleExpenses: Array.isArray(rawMb.lifestyleExpenses) ? rawMb.lifestyleExpenses : baseDefault.masterBudget.lifestyleExpenses,
    budgetCycle,
    currentPeriod,
    budgetStatusPerPeriod,
    status: budgetCycleStatus,
  };

  return {
    profile: {
      ...baseDefault.profile,
      ...(raw?.profile || {}),
    },
    netWorthData: {
      ...baseDefault.netWorthData,
      ...(raw?.netWorthData || {}),
    },
    masterBudget,
    sinkingFunds: Array.isArray(raw?.sinkingFunds) ? raw.sinkingFunds : baseDefault.sinkingFunds,
    kprData: {
      ...baseDefault.kprData,
      ...(raw?.kprData || {}),
    },
    travelBudget: {
      ...baseDefault.travelBudget,
      ...(raw?.travelBudget || {}),
    },
    checklist30D: Array.isArray(raw?.checklist30D) ? raw.checklist30D : baseDefault.checklist30D,
    portfolioAssets,
    jagoPortfolio: {
      ...baseDefault.jagoPortfolio,
      ...(raw?.jagoPortfolio || {}),
      portfolioAssets,
    },
    budgetCycle,
    budgetStatusPerPeriod,
    currentPeriod,
    transactionLedger,
  };
};

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [authView, setAuthView] = useState<'login' | 'reset-password' | 'portal'>('login');
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [activeProfileKey, setActiveProfileKey] = useState<string>('budi');
  
  const [globalState, setGlobalState] = useState<GlobalPortalState>(() => {
    const audit = extractHomepageAuditData();
    return buildStateFromAudit(audit);
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());

  // User Optimization Flag: false initially for new users until they save budget/assets
  const [hasUserOptimized, setHasUserOptimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jr_user_has_optimized') === 'true';
    } catch {
      return false;
    }
  });

  // Baseline Homepage Audit State
  const [baselineAudit, setBaselineAudit] = useState<HomepageAuditData>(() => extractHomepageAuditData());

  const updateBaselineAudit = useCallback((updated: Partial<HomepageAuditData>) => {
    setBaselineAudit((prev) => {
      const next = { ...prev, ...updated };
      saveHomepageAuditData(next);
      return next;
    });
  }, []);

  const reloadFromHomepageAudit = useCallback(() => {
    const fresh = extractHomepageAuditData();
    setBaselineAudit(fresh);
    return true;
  }, []);

  const applyAuditData = useCallback((newAudit: HomepageAuditData) => {
    setBaselineAudit(newAudit);
    saveHomepageAuditData(newAudit);

    const clientName = (newAudit.clientName && !isPlaceholderName(newAudit.clientName)) ? newAudit.clientName : 'Klien VIP';

    setUserSession((prev) => {
      if (!prev) return null;
      const updated: UserSession = {
        ...prev,
        nama: clientName,
        email: newAudit.email || prev.email,
      };
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
        localStorage.setItem('jr_portal_user', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    const newState = buildStateFromAudit(newAudit);
    setGlobalState(newState);
    setHasUserOptimized(false);
    try {
      localStorage.removeItem('jr_user_has_optimized');
      if (newAudit.email) {
        localStorage.removeItem(`jr_portal_cache_${newAudit.email.toLowerCase()}`);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // 1. Session check on startup (localStorage: user_session and jr_vip_session)
  useEffect(() => {
    try {
      // Ingest homepage audit data
      const audit = extractHomepageAuditData();
      setBaselineAudit(audit);

      // Check Duitku Sandbox payment return or pending upgrade in localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const authParam = urlParams.get('auth');
      const isPaymentSuccess = urlParams.get('payment') === 'success' || urlParams.get('resultCode') === '00';
      const pendingUpgradeRaw = localStorage.getItem('jr_pending_upgrade');

      if (pendingUpgradeRaw || isPaymentSuccess) {
        try {
          const pendingTx = pendingUpgradeRaw ? JSON.parse(pendingUpgradeRaw) : null;
          const orderId = urlParams.get('orderId') || pendingTx?.orderId || `JR-UPG-${Date.now()}`;
          const effectiveName = (pendingTx?.name && !isPlaceholderName(pendingTx.name))
            ? pendingTx.name
            : (audit.clientName && !isPlaceholderName(audit.clientName) ? audit.clientName : 'Klien VIP Blueprint');
          const effectiveEmail = pendingTx?.email || audit.email || 'client@jagorencana.com';
          const lifetimeToken = generateLifetimeToken('blueprint');

          const vipSessionData: VipSessionData = {
            token: lifetimeToken,
            tier: 'BLUEPRINT_VIP',
            email: effectiveEmail,
            name: effectiveName,
            phone: '+62 812-xxxx-xxxx',
            access: 'lifetime',
            issuedAt: new Date().toISOString(),
            orderId,
            unlockedModules: [
              'tvm_goals',
              'kpr_restructure',
              'smart_travel',
              'master_budgeting',
              'sinking_funds',
              'executive_report',
              'jago_portfolio',
            ],
          };

          saveVipSession(vipSessionData);
          const upgradedUserSession: UserSession = {
            email: effectiveEmail,
            nama: effectiveName,
            orderId,
            token: lifetimeToken,
            tier: 'BLUEPRINT_VIP',
            loginAt: new Date().toISOString(),
          };
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(upgradedUserSession));
          localStorage.removeItem('jr_pending_upgrade');
          setUserSession(upgradedUserSession);

          const auditState = buildStateFromAudit(audit);
          auditState.profile.name = effectiveName;
          auditState.profile.email = effectiveEmail;
          auditState.profile.tier = 'BLUEPRINT_VIP';
          auditState.profile.id = orderId;
          setGlobalState(auditState);

          setAuthView('portal');
          return;
        } catch (upgradeErr) {
          console.warn('Error processing Duitku upgrade return verification:', upgradeErr);
        }
      }

      if (authParam) {
        const verification = verifyTokenStatus(authParam);
        if (verification.valid && verification.data) {
          const clientName = (isPlaceholderName(verification.data.name) && audit.clientName) 
            ? audit.clientName 
            : verification.data.name;

          const session: UserSession = {
            email: verification.data.email,
            nama: clientName,
            orderId: verification.data.orderId,
            token: verification.data.token,
            tier: verification.data.tier,
            loginAt: new Date().toISOString(),
          };
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
          saveVipSession(verification.data);
          setUserSession(session);
          setAuthView('portal');
          return;
        }
      }

      // Check user_session or jr_portal_user in localStorage
      const storedSessionRaw = localStorage.getItem(USER_SESSION_KEY) || localStorage.getItem('jr_portal_user');
      if (storedSessionRaw) {
        try {
          const parsed = JSON.parse(storedSessionRaw) as UserSession;
          // Discard and clear any obsolete dummy Lia session
          if (parsed && (parsed.email?.toLowerCase().includes('lia') || parsed.nama?.toLowerCase() === 'lia')) {
            localStorage.removeItem(USER_SESSION_KEY);
            localStorage.removeItem('jr_portal_user');
            setUserSession(null);
            setAuthView('login');
            return;
          }

          if (parsed && parsed.email && (parsed.token || parsed.orderId)) {
            const effectiveName = (isPlaceholderName(parsed.nama) && audit.clientName) 
              ? audit.clientName 
              : parsed.nama;

            parsed.nama = effectiveName;
            setUserSession(parsed);
            setAuthView('portal');

            const isStarter = parsed.tier === 'STARTER' || (parsed.tier && String(parsed.tier).toUpperCase().includes('STARTER'));
            const isDemoBudi = parsed.email.toLowerCase().includes('budi');
            const isDemoSiti = parsed.email.toLowerCase().includes('siti');

            if (isDemoBudi || isDemoSiti || isStarter) {
              const initialKey = isStarter ? 'starter' : (isDemoSiti ? 'siti' : 'budi');
              const baseState = buildInitialState(initialKey);

              // Populate with audit cashflow & liquid savings if available
              if (audit.monthlyIncome > 0) {
                baseState.masterBudget.monthlyNetIncome = audit.monthlyIncome;
              }
              if (audit.livingExpenses > 0) {
                baseState.masterBudget.livingExpenses = [
                  { id: 'aud-liv-1', name: 'Biaya Hidup & Kebutuhan Pokok (Living)', amount: audit.livingExpenses, isEssential: true },
                ];
              }
              if (audit.debtExpenses > 0) {
                baseState.masterBudget.debtObligations = [
                  { id: 'aud-debt-1', name: 'Cicilan & Kewajiban Utang (Debt)', amount: audit.debtExpenses, isEssential: true },
                ];
              }
              if (audit.lifestyleExpenses > 0) {
                baseState.masterBudget.lifestyleExpenses = [
                  { id: 'aud-life-1', name: 'Gaya Hidup & Keinginan (Lifestyle)', amount: audit.lifestyleExpenses },
                ];
              }
              if (audit.liquidSavings > 0) {
                baseState.netWorthData.kasLikuid = audit.liquidSavings;
              }

              setGlobalState(normalizePortalState({
                ...baseState,
                profile: {
                  ...baseState.profile,
                  name: effectiveName || baseState.profile.name,
                  email: parsed.email || baseState.profile.email,
                  tier: parsed.tier || baseState.profile.tier,
                  id: parsed.orderId || baseState.profile.id,
                },
              }, initialKey));
              return;
            }

            // Check if custom cached state exists for this email
            const cached = localStorage.getItem(`jr_portal_cache_${parsed.email.toLowerCase()}`);
            if (cached) {
              try {
                const parsedCache = JSON.parse(cached);
                if (parsedCache && parsedCache.data) {
                  setGlobalState(normalizePortalState({
                    ...parsedCache.data,
                    profile: {
                      ...parsedCache.data.profile,
                      name: effectiveName || parsedCache.data?.profile?.name,
                      email: parsed.email || parsedCache.data?.profile?.email,
                      tier: parsed.tier || parsedCache.data?.profile?.tier,
                      id: parsed.orderId || parsedCache.data?.profile?.id,
                    },
                  }));
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse cached portal data', e);
              }
            }

            // Real Client / Audit User initial state
            const auditState = normalizePortalState(buildStateFromAudit(audit));
            auditState.profile.name = effectiveName;
            auditState.profile.email = parsed.email;
            setGlobalState(auditState);
            return;
          }
        } catch (e) {
          console.warn('Error reading stored session', e);
        }
      }

      // Check legacy vip session (if genuine)
      const legacyVip = getStoredVipSession();
      if (legacyVip && legacyVip.email && !legacyVip.email.toLowerCase().includes('lia')) {
        const legacyName = (isPlaceholderName(legacyVip.name) && audit.clientName) 
          ? audit.clientName 
          : legacyVip.name;

        const session: UserSession = {
          email: legacyVip.email,
          nama: legacyName,
          orderId: legacyVip.orderId,
          token: legacyVip.token,
          tier: legacyVip.tier,
          loginAt: new Date().toISOString(),
        };
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
        localStorage.setItem('jr_portal_user', JSON.stringify(session));
        setUserSession(session);
        setAuthView('portal');
        return;
      }

      // STRICT AUTH GATEWAY: No valid session -> Show Login Screen directly
      setUserSession(null);
      setAuthView('login');
      return;
    } catch {
      setUserSession(null);
      setAuthView('login');
    }
  }, []);

  // 2. Debounced Auto-Save (2 Detik)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!userSession || authView !== 'portal') return;

    setCloudSyncStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (!userSession?.email) return;
        const officialOrderId = userSession?.orderId || globalState?.profile?.id || 'JR-VIP-CLIENT';
        const stateToSave: GlobalPortalState = {
          ...globalState,
          profile: {
            ...globalState.profile,
            id: officialOrderId,
          },
        };
        const res = await savePortalStateToCloud(userSession.email, stateToSave);
        if (res.success) {
          setCloudSyncStatus('saved');
          setLastSavedTime(new Date());
        } else {
          setCloudSyncStatus('offline');
        }
      } catch {
        setCloudSyncStatus('offline');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [globalState, userSession, authView]);

  // 3. Evaluasi Hak Akses Tier (Case-Insensitive & Resilient)
  const currentUser = userSession;
  const isVip = Boolean(
    (currentUser?.tier || globalState.profile.tier) &&
    String(currentUser?.tier || globalState.profile.tier).toUpperCase().includes("VIP")
  );

  const isModuleAllowed = useCallback((moduleId: string): boolean => {
    if (isVip) return true;
    const normalized = moduleId.toLowerCase().replace(/[-_]/g, '');
    // Pada status Starter Pass, 'overview', 'diagnostic', dan 'tvm'/'tvm_goals' diizinkan
    return normalized === 'overview' || normalized === 'tvm' || normalized === 'tvmgoals' || normalized === 'diagnostic';
  }, [isVip]);

  // 4. Computed Financial Health & Reactivity (Reactive Net Worth)
  // Sinking Fund tidak dijumlahkan ke dalam neraca Net Worth riil
  const totalPortofolioRiil = useMemo(() => {
    const assets = globalState.portfolioAssets || globalState.jagoPortfolio?.portfolioAssets;
    if (assets && assets.length > 0) {
      return assets.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
    }
    return Number(globalState.netWorthData.investasi || 0);
  }, [globalState.portfolioAssets, globalState.jagoPortfolio?.portfolioAssets, globalState.netWorthData.investasi]);

  const liveAssets = useMemo(() => {
    const kasLikuid = Number(globalState.netWorthData.kasLikuid) || 0;
    const investasi = totalPortofolioRiil;
    const asetFisik = Number(globalState.netWorthData.asetFisik) || 0;
    const kpr = Number((globalState.netWorthData as any).kpr) || Number(globalState.netWorthData.liabilitasKPR) || 0;
    const utangLain = Number(globalState.netWorthData.utangLain) || 0;

    return {
      liquid: kasLikuid,
      investment: investasi,
      personal: asetFisik,
      liabilities: kpr + utangLain,
    };
  }, [globalState.netWorthData, totalPortofolioRiil]);

  const metrics = useMemo(() => {
    return computeFinancialHealth(globalState.masterBudget, globalState.sinkingFunds, liveAssets, globalState.kprData);
  }, [globalState.masterBudget, globalState.sinkingFunds, liveAssets, globalState.kprData]);

  const budgetTotals = useMemo(() => {
    return calculateTotals(globalState.masterBudget, globalState.sinkingFunds);
  }, [globalState.masterBudget, globalState.sinkingFunds]);

  const activeUser = currentUser || userSession;
  const vipCountdown = useMemo(() => {
    return calculateVipDaysRemaining(activeUser, globalState.profile, globalState);
  }, [activeUser, globalState.profile, globalState]);
  const vipDaysRemaining = vipCountdown.daysRemaining;

  // Login handler
  const login = useCallback(async (emailInput: string, passwordOrToken: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanSecret = sanitizeText(passwordOrToken);

    if (!validateEmail(cleanEmail)) {
      return { success: false, message: 'Format email tidak valid. Masukkan email resmi yang terdaftar.' };
    }

    if (!cleanSecret || cleanSecret.length < 3) {
      return { success: false, message: 'Password atau Kode Akses VIP tidak boleh kosong (min. 3 karakter).' };
    }

    // Call Backend Google Apps Script (portal_login)
    const apiRes = await apiPortalLogin(cleanEmail, cleanSecret);

    const nestedApiData = (apiRes as any).data;
    const backendUser =
      apiRes.user ||
      nestedApiData?.user ||
      nestedApiData?.data?.user ||
      apiRes.portal_data?.profile ||
      nestedApiData?.portal_data?.profile;
    const authenticationSucceeded = apiRes.status === 'success' || (apiRes as any).success === true;

    // Strict validation: if status is not success OR backend user is not found:
    // DO NOT set user, DO NOT redirect to dashboard, return error message
    if (!authenticationSucceeded || !backendUser) {
      return {
        success: false,
        message: apiRes.message || 'Password atau Kode Akses akun Anda salah.',
      };
    }

    // Determine user profile based on backend response or fallback preset
    let clientName = backendUser.nama || backendUser.name || apiRes.nama || '';
    let clientTier: 'BLUEPRINT_VIP' | 'STARTER' = (backendUser.tier as any) || 'BLUEPRINT_VIP';
    let token = apiRes.token || backendUser.token || cleanSecret || 'JR-VIP-LIFETIME-PASS';
    let orderId = backendUser.orderId || apiRes.orderId || apiRes.portal_data?.profile?.id || globalState?.profile?.id || 'JR-VIP-CLIENT';

    const isStarterAccount = cleanSecret.toUpperCase().includes('STARTER') || 
                             cleanEmail.includes('starter') || 
                             clientTier === 'STARTER' ||
                             (backendUser.tier && String(backendUser.tier).toUpperCase().includes('STARTER'));

    if (isStarterAccount) {
      clientTier = 'STARTER';
      if (!clientName || clientName.toLowerCase().includes('budi')) {
        clientName = 'Starter Demo';
      }
    }

    if (!clientName) {
      if (KNOWN_VIP_TOKENS[cleanSecret]) {
        const info = KNOWN_VIP_TOKENS[cleanSecret];
        clientName = info.name;
        clientTier = info.tier;
      } else if (cleanEmail === 'starter@test.com' || cleanEmail.includes('starter')) {
        clientName = 'Starter Demo';
        clientTier = 'STARTER';
      } else if (cleanEmail.includes('budi.santoso') || cleanEmail === 'budi@test.com') {
        clientName = 'Budi Santoso';
        setActiveProfileKey('budi');
      } else if (cleanEmail.includes('siti')) {
        clientName = 'Siti Rahma';
        setActiveProfileKey('siti');
      } else {
        const fallbackName = (baselineAudit.clientName && !isPlaceholderName(baselineAudit.clientName)) ? baselineAudit.clientName : '';
        if (fallbackName) {
          clientName = fallbackName;
        } else {
          const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
          clientName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }
      }
    }

    const session: UserSession = {
      email: cleanEmail,
      nama: clientName,
      name: clientName,
      orderId,
      token,
      tier: clientTier,
      loginAt: new Date().toISOString(),
    };

    // Save session to localStorage
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('jr_portal_user', JSON.stringify(session));
    
    const vipSessionData: VipSessionData = {
      token,
      tier: clientTier,
      email: cleanEmail,
      name: clientName,
      phone: '+62 812-8920-4112',
      access: isStarterAccount ? 'standard' : 'lifetime',
      issuedAt: new Date().toISOString(),
      orderId,
      unlockedModules: isStarterAccount 
        ? ['overview', 'tvm_goals']
        : ['tvm_goals', 'kpr_restructure', 'smart_travel', 'master_budgeting', 'sinking_funds', 'executive_report'],
    };
    saveVipSession(vipSessionData);
    setUserSession(session);
    // Buka portal segera setelah sesi persisten tersedia. Hidrasi data cloud
    // berikutnya tidak boleh menahan keberhasilan login atau memicu klik kedua.
    setAuthView('portal');

    // If backend returned portal_data directly, load it into Global State
    if (apiRes.portal_data && typeof apiRes.portal_data === 'object') {
      setGlobalState((prev) => normalizePortalState({
        ...prev,
        ...apiRes.portal_data,
        profile: {
          ...prev.profile,
          ...(apiRes.portal_data?.profile || {}),
          name: apiRes.portal_data?.profile?.name || clientName,
          email: cleanEmail,
          tier: clientTier,
          id: orderId,
        },
      }));
    } else {
      // Otherwise fetch cloud / cache di background setelah session aktif.
      void getClientPortalDataFromCloud(cleanEmail, token).then((cloudRes) => {
        if (cloudRes.success && cloudRes.data) {
          setGlobalState(normalizePortalState({
            ...cloudRes.data,
            profile: {
              ...cloudRes.data.profile,
              name: clientName,
              email: cleanEmail,
              tier: clientTier,
              id: orderId,
            },
          }));
        } else {
          if (isStarterAccount) {
            const starterState = normalizePortalState(buildInitialState('starter'), 'starter');
            setGlobalState({
              ...starterState,
              profile: {
                ...starterState.profile,
                name: clientName,
                email: cleanEmail,
                tier: 'STARTER',
                id: orderId,
              },
            });
          } else if (cleanEmail.includes('siti')) {
            const sitiState = normalizePortalState(buildInitialState('siti'), 'siti');
            setGlobalState({
              ...sitiState,
              profile: {
                ...sitiState.profile,
                name: clientName,
                email: cleanEmail,
                tier: clientTier,
                id: orderId,
              },
            });
          } else {
            setGlobalState((prev) => normalizePortalState({
              ...prev,
              profile: {
                ...prev.profile,
                name: clientName,
                email: cleanEmail,
                tier: clientTier,
                id: orderId,
              },
            }));
          }
        }
      }).catch((error) => {
        console.warn('Hidrasi data portal setelah login tertunda:', error);
      });
    }

    return { success: true };
  }, []);

  // Forgot Password handler (portal_forgot_password)
  const forgotPassword = useCallback(async (emailInput: string): Promise<{ success: boolean; message?: string; otp?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return { success: false, message: 'Format email tidak valid. Masukkan email resmi yang terdaftar.' };
    }

    const res = await apiForgotPassword(cleanEmail);
    if (res.status === 'success') {
      return {
        success: true,
        message: res.message || 'Instruksi reset password / kode OTP telah dikirimkan ke email Anda.',
        otp: res.otp || (res as any).data?.otp,
      };
    } else {
      return {
        success: false,
        message: res.message || 'Gagal mengirim instruksi reset password. Pastikan email terdaftar.',
      };
    }
  }, []);

  // Reset Password handler (portal_reset_password)
  const resetPassword = useCallback(async (emailInput: string, otpToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanOtp = otpToken.trim();
    const cleanNewPwd = newPassword.trim();

    if (!validateEmail(cleanEmail)) {
      return { success: false, message: 'Format email tidak valid.' };
    }
    if (!cleanOtp || cleanOtp.length < 3) {
      return { success: false, message: 'Kode OTP / Token Reset tidak boleh kosong.' };
    }
    if (!cleanNewPwd || cleanNewPwd.length < 6) {
      return { success: false, message: 'Password baru minimal harus 6 karakter.' };
    }

    const res = await apiResetPassword(cleanEmail, cleanOtp, cleanNewPwd);

    if (res.status === 'success') {
      try {
        localStorage.setItem(`jr_client_pwd_${cleanEmail}`, cleanNewPwd);
      } catch (e) {
        console.warn('Password save error', e);
      }
      return { success: true, message: res.message || 'Password berhasil diperbarui! Silakan masuk dengan password baru Anda.' };
    } else {
      return {
        success: false,
        message: res.message || 'Gagal mengatur ulang password. Periksa kode OTP atau coba lagi.',
      };
    }
  }, []);

  // Logout handler - Total Cache & Session Flush
  const logout = useCallback(() => {
    try {
      // Hash kredensial lokal tidak berisi password/token mentah dan dipertahankan
      // agar akun yang pernah terverifikasi tetap dapat login saat localhost offline.
      const protectedAuthHashes: Array<[string, string]> = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith('jr_auth_hash_')) {
          const value = localStorage.getItem(key);
          if (value) protectedAuthHashes.push([key, value]);
        }
      }
      localStorage.clear();
      protectedAuthHashes.forEach(([key, value]) => localStorage.setItem(key, value));
      sessionStorage.clear();
      clearVipSession();
    } catch (e) {
      console.warn('Storage clear error on logout', e);
    }
    setUserSession(null);
    setAuthView('login');
  }, []);

  // Preset switch
  const loadPresetProfile = useCallback((key: string) => {
    if (SAMPLE_PROFILES[key]) {
      setActiveProfileKey(key);
      const newState = buildInitialState(key);
      setGlobalState(newState);
      setHasUserOptimized(true);
      try {
        localStorage.setItem('jr_user_has_optimized', 'true');
      } catch (e) {
        console.warn(e);
      }
      if (userSession) {
        setUserSession((prev) => prev ? { 
          ...prev, 
          nama: newState.profile.name, 
          email: newState.profile.email,
          tier: newState.profile.tier 
        } : null);
      }
    }
  }, [userSession]);

  // Updaters
  const updateProfile = useCallback((profileUpdates: Partial<ClientProfile>) => {
    setGlobalState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profileUpdates },
    }));
    setUserSession((prev) => {
      if (!prev) return null;
      const updated: UserSession = {
        ...prev,
        nama: profileUpdates.name !== undefined ? profileUpdates.name : prev.nama,
        email: profileUpdates.email !== undefined ? profileUpdates.email : prev.email,
        tier: profileUpdates.tier !== undefined ? (profileUpdates.tier as any) : prev.tier,
      };
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update stored session', e);
      }
      return updated;
    });
  }, []);

  const updateNetWorth = useCallback((netWorthUpdates: Partial<NetWorthData>) => {
    setGlobalState((prev) => {
      const updatedNetWorth = { ...prev.netWorthData, ...netWorthUpdates };
      return {
        ...prev,
        netWorthData: updatedNetWorth,
        // Also keep KPR remaining in sync if liabilitasKPR is changed
        kprData: {
          ...prev.kprData,
          remainingLoanBalance: updatedNetWorth.liabilitasKPR,
        },
      };
    });
    setHasUserOptimized(true);
    try {
      localStorage.setItem('jr_user_has_optimized', 'true');
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const updateMasterBudget = useCallback((newBudget: BudgetState) => {
    setGlobalState((prev) => ({
      ...prev,
      masterBudget: newBudget,
    }));
    setHasUserOptimized(true);
    try {
      localStorage.setItem('jr_user_has_optimized', 'true');
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const updateSinkingFunds = useCallback((newGoals: SinkingFundGoal[]) => {
    setGlobalState((prev) => ({
      ...prev,
      sinkingFunds: newGoals,
    }));
  }, []);

  const updateKprData = useCallback((newKpr: KprSimulationState) => {
    setGlobalState((prev) => ({
      ...prev,
      kprData: newKpr,
      netWorthData: {
        ...prev.netWorthData,
        liabilitasKPR: newKpr.remainingLoanBalance,
      },
    }));
  }, []);

  const updateTravelBudget = useCallback((travelUpdates: Partial<TravelBudgetData>) => {
    setGlobalState((prev) => ({
      ...prev,
      travelBudget: { ...(prev.travelBudget || DEFAULT_TRAVEL_BUDGET), ...travelUpdates },
    }));
  }, []);

  const updateChecklist = useCallback((checklist: ActionItem[]) => {
    setGlobalState((prev) => ({
      ...prev,
      checklist30D: checklist,
    }));
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setGlobalState((prev) => ({
      ...prev,
      checklist30D: prev.checklist30D.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  }, []);

  // Cross-Module: Sync Smart Travel / TVM Goals to Sinking Fund Goals
  const syncTravelToSinkingFund = useCallback((goalData: {
    title: string;
    targetAmount: number;
    tenorMonths: number;
    category: 'travel' | 'education' | 'property' | 'retirement' | 'custom';
    notes: string;
  }) => {
    setGlobalState((prev) => {
      const existingIdx = prev.sinkingFunds.findIndex(
        (g) => g.title.toLowerCase().includes(goalData.title.toLowerCase()) || g.category === goalData.category
      );

      let updatedGoals: SinkingFundGoal[];
      if (existingIdx >= 0) {
        // Update existing
        updatedGoals = [...prev.sinkingFunds];
        updatedGoals[existingIdx] = {
          ...updatedGoals[existingIdx],
          title: goalData.title,
          category: goalData.category,
          targetAmount: goalData.targetAmount,
          tenorMonths: goalData.tenorMonths,
          notes: goalData.notes,
        };
      } else {
        // Append new
        const newGoal: SinkingFundGoal = {
          id: `goal-${goalData.category}-${Date.now()}`,
          title: goalData.title,
          category: goalData.category,
          targetAmount: goalData.targetAmount,
          currentSavings: 0,
          tenorMonths: goalData.tenorMonths,
          priority: 'Medium',
          notes: goalData.notes,
        };
        updatedGoals = [...prev.sinkingFunds, newGoal];
      }

      return {
        ...prev,
        sinkingFunds: updatedGoals,
      };
    });
  }, []);

  const resetAllData = useCallback(() => {
    if (activeProfileKey && activeProfileKey !== 'budi') {
      const fresh = buildInitialState(activeProfileKey);
      setGlobalState(fresh);
    } else {
      const audit = extractHomepageAuditData();
      setGlobalState(buildStateFromAudit(audit));
    }
    setHasUserOptimized(false);
    try {
      localStorage.removeItem('jr_user_has_optimized');
      if (userSession?.email) {
        localStorage.removeItem(`jr_portal_cache_${userSession.email.toLowerCase()}`);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [activeProfileKey, userSession]);

  const updateJagoPortfolio = useCallback((newPortfolio: JagoPortfolioState) => {
    const cleanPortfolio: JagoPortfolioState = {
      ...newPortfolio,
      instruments: getCleanInstruments(newPortfolio),
      portfolioAssets: newPortfolio.portfolioAssets || globalState.portfolioAssets,
    };
    setGlobalState((prev) => ({
      ...prev,
      jagoPortfolio: cleanPortfolio,
      portfolioAssets: cleanPortfolio.portfolioAssets || prev.portfolioAssets,
    }));
  }, [globalState.portfolioAssets]);

  const addPortfolioAsset = useCallback((asset: Omit<PortfolioAsset, 'id' | 'createdAt'>) => {
    const newAsset: PortfolioAsset = {
      ...asset,
      id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setGlobalState((prev) => {
      const currentList = prev.portfolioAssets || prev.jagoPortfolio?.portfolioAssets || [];
      const updatedList = [newAsset, ...currentList];
      const newInvestasiTotal = updatedList.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);

      return {
        ...prev,
        portfolioAssets: updatedList,
        netWorthData: {
          ...prev.netWorthData,
          investasi: newInvestasiTotal,
        },
        jagoPortfolio: {
          ...(prev.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          portfolioAssets: updatedList,
        },
      };
    });
  }, []);

  const updatePortfolioAsset = useCallback((id: string, updates: Partial<PortfolioAsset>) => {
    setGlobalState((prev) => {
      const currentList = prev.portfolioAssets || prev.jagoPortfolio?.portfolioAssets || [];
      const updatedList = currentList.map((item) => (item.id === id ? { ...item, ...updates } : item));
      const newInvestasiTotal = updatedList.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);

      return {
        ...prev,
        portfolioAssets: updatedList,
        netWorthData: {
          ...prev.netWorthData,
          investasi: newInvestasiTotal,
        },
        jagoPortfolio: {
          ...(prev.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          portfolioAssets: updatedList,
        },
      };
    });
  }, []);

  const deletePortfolioAsset = useCallback((id: string) => {
    setGlobalState((prev) => {
      const currentList = prev.portfolioAssets || prev.jagoPortfolio?.portfolioAssets || [];
      const updatedList = currentList.filter((item) => item.id !== id);
      const newInvestasiTotal = updatedList.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);

      return {
        ...prev,
        portfolioAssets: updatedList,
        netWorthData: {
          ...prev.netWorthData,
          investasi: newInvestasiTotal,
        },
        jagoPortfolio: {
          ...(prev.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          portfolioAssets: updatedList,
        },
      };
    });
  }, []);

  const setPortfolioAssets = useCallback((assets: PortfolioAsset[]) => {
    setGlobalState((prev) => {
      const newInvestasiTotal = assets.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
      return {
        ...prev,
        portfolioAssets: assets,
        netWorthData: {
          ...prev.netWorthData,
          investasi: newInvestasiTotal,
        },
        jagoPortfolio: {
          ...(prev.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          portfolioAssets: assets,
        },
      };
    });
  }, []);

  const triggerManualSave = useCallback(async () => {
    if (!userSession?.email) return;
    setCloudSyncStatus('saving');
    const officialOrderId = userSession?.orderId || globalState?.profile?.id || 'JR-VIP-CLIENT';
    const stateToSave: GlobalPortalState = {
      ...globalState,
      profile: {
        ...globalState.profile,
        id: officialOrderId,
      },
    };
    const res = await savePortalStateToCloud(userSession.email, stateToSave);
    if (res.success) {
      setCloudSyncStatus('saved');
      setLastSavedTime(new Date());
    } else {
      setCloudSyncStatus('offline');
    }
  }, [userSession, globalState]);

  const upgradeToVip = useCallback((customOrderId?: string) => {
    const orderId = customOrderId || `JR-UPG-${Date.now()}`;
    const effectiveName = (userSession?.nama && !isPlaceholderName(userSession.nama))
      ? userSession.nama
      : (baselineAudit?.clientName && !isPlaceholderName(baselineAudit.clientName) ? baselineAudit.clientName : 'Klien VIP Blueprint');
    const effectiveEmail = userSession?.email || baselineAudit?.email || 'client@jagorencana.com';
    const lifetimeToken = generateLifetimeToken('blueprint');

    const vipSessionData: VipSessionData = {
      token: lifetimeToken,
      tier: 'BLUEPRINT_VIP',
      email: effectiveEmail,
      name: effectiveName,
      phone: '+62 812-xxxx-xxxx',
      access: 'lifetime',
      issuedAt: new Date().toISOString(),
      orderId,
      unlockedModules: [
        'tvm_goals',
        'kpr_restructure',
        'smart_travel',
        'master_budgeting',
        'sinking_funds',
        'executive_report',
        'jago_portfolio',
      ],
    };

    saveVipSession(vipSessionData);
    const upgradedUserSession: UserSession = {
      ...(userSession || {}),
      email: effectiveEmail,
      nama: effectiveName,
      orderId,
      token: lifetimeToken,
      tier: 'BLUEPRINT_VIP',
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(upgradedUserSession));
    localStorage.removeItem('jr_pending_upgrade');
    setUserSession(upgradedUserSession);

    setGlobalState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        tier: 'BLUEPRINT_VIP',
        id: orderId,
        name: effectiveName,
        email: effectiveEmail,
      },
    }));
  }, [userSession, baselineAudit]);

  const setBudgetPeriod = useCallback((period: string) => {
    setGlobalState((prev) => ({
      ...prev,
      currentPeriod: period,
      budgetCycle: {
        ...(prev.budgetCycle || { status: 'DRAFT' }),
        currentPeriod: period,
        cycleMonth: period,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const setBudgetStatus = useCallback((period: string, status: string) => {
    setGlobalState((prev) => ({
      ...prev,
      budgetCycle: {
        ...(prev.budgetCycle || { currentPeriod: period }),
        currentPeriod: period,
        status,
        updatedAt: new Date().toISOString(),
      },
      budgetStatusPerPeriod: {
        ...(prev.budgetStatusPerPeriod || {}),
        [period]: status,
      },
    }));
  }, []);

  const safePeriod = globalState?.budgetCycle?.currentPeriod || globalState?.currentPeriod || '2026-09';
  const safeCycleStatus = globalState?.budgetStatusPerPeriod?.[safePeriod] || globalState?.budgetCycle?.status || 'DRAFT';

  return (
    <PortalContext.Provider
      value={{
        isAuthenticated: Boolean(userSession && authView === 'portal'),
        currentUser,
        userSession,
        user: currentUser || userSession,
        isVip,
        isModuleAllowed,
        authView,
        setAuthView,
        loginNotice,
        setLoginNotice,
        login,
        forgotPassword,
        resetPassword,
        logout,
        activeProfileKey,
        setActiveProfileKey,
        loadPresetProfile,
        globalState,
        portalData: globalState,
        profile: globalState.profile,
        netWorthData: globalState.netWorthData,
        masterBudget: globalState.masterBudget,
        sinkingFunds: globalState.sinkingFunds,
        kprData: globalState.kprData,
        travelBudget: globalState.travelBudget || DEFAULT_TRAVEL_BUDGET,
        checklist30D: globalState.checklist30D,
        jagoPortfolio: {
          ...(globalState.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          instruments: getCleanInstruments(globalState.jagoPortfolio || DEFAULT_JAGO_PORTFOLIO),
          portfolioAssets: globalState.portfolioAssets || globalState.jagoPortfolio?.portfolioAssets || DEFAULT_PORTFOLIO_ASSETS,
        },
        portfolioAssets: globalState.portfolioAssets || globalState.jagoPortfolio?.portfolioAssets || DEFAULT_PORTFOLIO_ASSETS,
        totalPortofolioRiil,
        baselineAudit,
        updateBaselineAudit,
        reloadFromHomepageAudit,
        applyAuditData,
        metrics,
        budgetTotals,
        vipDaysRemaining,
        vipCountdown,
        updateProfile,
        updateNetWorth,
        updateMasterBudget,
        updateSinkingFunds,
        updateKprData,
        updateTravelBudget,
        updateChecklist,
        toggleChecklistItem,
        syncTravelToSinkingFund,
        updateJagoPortfolio,
        addPortfolioAsset,
        updatePortfolioAsset,
        deletePortfolioAsset,
        setPortfolioAssets,
        resetAllData,
        cloudSyncStatus,
        lastSavedTime,
        triggerManualSave,
        upgradeToVip,
        hasUserOptimized,
        setHasUserOptimized,
        budgetCycle: globalState.budgetCycle || {
          currentPeriod: safePeriod,
          status: safeCycleStatus,
          cycleMonth: safePeriod,
          updatedAt: new Date().toISOString(),
        },
        currentPeriod: safePeriod,
        budgetStatus: safeCycleStatus,
        budgetStatusPerPeriod: globalState.budgetStatusPerPeriod || { [safePeriod]: safeCycleStatus },
        transactionLedger: Array.isArray(globalState.transactionLedger) ? globalState.transactionLedger : [],
        setBudgetPeriod,
        setBudgetStatus,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = (): PortalContextType => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
