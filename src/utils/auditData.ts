/**
 * Audit Data Continuity & Integration Engine
 * Handles ingestion, persistence, and evaluation of Institutional Audit Data
 */

import { DEFAULT_GOOGLE_SCRIPT_URL, getGoogleScriptUrl } from './googleScript';

export interface HomepageAuditPillars {
  cashflow: number; // 0 - 100
  defense: number; // 0 - 100
  solvency: number; // 0 - 100
  wealth: number; // 0 - 100
}

export interface HomepageAuditRatios {
  dsr: number; // Debt Service Ratio % (Max 30%)
  consumerDebt: number; // Cicilan Konsumtif % (Max 10-15%)
  emergencyFundMonths: number; // Kesiapan Dana Darurat dlm bulan (Min 3-6 bln)
  productiveAssetsRatio: number; // Porsi Aset Produktif % (Min 20-50%)
}

export interface HomepageAuditAllocations {
  rdpu: number; // Reksa Dana Pasar Uang %
  sbn: number; // Surat Berharga Negara / Obligasi %
  blueChip: number; // Saham Blue-Chip %
  growth: number; // Saham Pertumbuhan / ETF %
}

export interface HomepageAuditData {
  clientName: string;
  email?: string;
  phone?: string;
  baselineScore: number;
  baselineStatus: string;
  baselineStatusColor: string;
  baselineDate: string;
  monthlyIncome: number;
  livingExpenses: number;
  debtExpenses: number;
  liquidSavings: number;
  investmentAssets?: number;
  lifestyleExpenses: number;
  pillars: HomepageAuditPillars;
  ratios: HomepageAuditRatios;
  allocations: HomepageAuditAllocations;
  notes?: string;
  source: 'local_storage' | 'url_param' | 'cloud_sync' | 'default_baseline';
}

export const JAGO_ACTIVE_AUDIT_KEY = 'jago_active_audit';
export const JAGO_AUDIT_STORAGE_KEY = 'jago_audit_data';

export const DEFAULT_BASELINE_AUDIT: HomepageAuditData = {
  clientName: 'Klien VIP',
  email: '',
  phone: '',
  baselineScore: 0,
  baselineStatus: 'Belum Diaudit',
  baselineStatusColor: '#64748B',
  baselineDate: 'Perlu Input Data',
  monthlyIncome: 0,
  livingExpenses: 0,
  debtExpenses: 0,
  liquidSavings: 0,
  investmentAssets: 0,
  lifestyleExpenses: 0,
  pillars: {
    cashflow: 0,
    defense: 0,
    solvency: 0,
    wealth: 0,
  },
  ratios: {
    dsr: 0,
    consumerDebt: 0,
    emergencyFundMonths: 0,
    productiveAssetsRatio: 0,
  },
  allocations: {
    rdpu: 25,
    sbn: 25,
    blueChip: 25,
    growth: 25,
  },
  notes: 'Silakan input atau sinkronisasi data audit keuangan Anda.',
  source: 'default_baseline',
};

export function getScoreStatus(score: number): { status: string; color: string } {
  if (score >= 80) return { status: 'Sehat Prima', color: '#10B981' };
  if (score >= 65) return { status: 'Cukup Sehat', color: '#32A89C' };
  if (score >= 50) return { status: 'Perlu Perhatian', color: '#F59E0B' };
  return { status: 'Kritis / Waspada', color: '#EF4444' };
}

function parseNumeric(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Checks whether user has existing audit data saved in localStorage
 */
export function hasActiveAuditStored(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const rawActive = localStorage.getItem(JAGO_ACTIVE_AUDIT_KEY);
    if (rawActive && rawActive.trim().length > 2) return true;
    const rawAudit = localStorage.getItem(JAGO_AUDIT_STORAGE_KEY);
    if (rawAudit && rawAudit.trim().length > 2) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * Parses and extracts audit data from either URL parameters or localStorage
 */
export function extractHomepageAuditData(): HomepageAuditData {
  try {
    // 1. Check URL parameters first
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Full JSON payload parameter
      const rawPayload = urlParams.get('jago_active_audit') || urlParams.get('jago_audit_data') || urlParams.get('audit_data') || urlParams.get('audit');
      if (rawPayload) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawPayload));
          if (parsed && typeof parsed === 'object') {
            const audit = normalizeAuditData(parsed, 'url_param');
            // Cache in localStorage for subsequent visits
            saveHomepageAuditData(audit);
            return audit;
          }
        } catch (e) {
          console.warn('Failed to parse URL audit JSON payload', e);
        }
      }

      // Individual query parameters
      const nameParam = urlParams.get('name') || urlParams.get('fullName') || urlParams.get('nama') || urlParams.get('client_name');
      const scoreParam = urlParams.get('score') || urlParams.get('skor') || urlParams.get('baseline_score');
      const incomeParam = urlParams.get('income') || urlParams.get('pemasukan');
      const livingParam = urlParams.get('living') || urlParams.get('expenses') || urlParams.get('pengeluaran');
      const debtParam = urlParams.get('debt') || urlParams.get('cicilan') || urlParams.get('utang');
      const savingsParam = urlParams.get('savings') || urlParams.get('tabungan') || urlParams.get('kas');
      const invParam = urlParams.get('investments') || urlParams.get('investasi') || urlParams.get('investment') || urlParams.get('assets');

      if (nameParam || scoreParam || incomeParam) {
        const partialData: Partial<HomepageAuditData> = {
          clientName: nameParam || DEFAULT_BASELINE_AUDIT.clientName,
          baselineScore: scoreParam ? parseNumeric(scoreParam, DEFAULT_BASELINE_AUDIT.baselineScore) : DEFAULT_BASELINE_AUDIT.baselineScore,
          monthlyIncome: incomeParam ? parseNumeric(incomeParam, DEFAULT_BASELINE_AUDIT.monthlyIncome) : DEFAULT_BASELINE_AUDIT.monthlyIncome,
          livingExpenses: livingParam ? parseNumeric(livingParam, DEFAULT_BASELINE_AUDIT.livingExpenses) : DEFAULT_BASELINE_AUDIT.livingExpenses,
          debtExpenses: debtParam ? parseNumeric(debtParam, DEFAULT_BASELINE_AUDIT.debtExpenses) : DEFAULT_BASELINE_AUDIT.debtExpenses,
          liquidSavings: savingsParam ? parseNumeric(savingsParam, DEFAULT_BASELINE_AUDIT.liquidSavings) : DEFAULT_BASELINE_AUDIT.liquidSavings,
          investmentAssets: invParam ? parseNumeric(invParam, DEFAULT_BASELINE_AUDIT.investmentAssets ?? 1000000) : DEFAULT_BASELINE_AUDIT.investmentAssets,
        };

        const audit = normalizeAuditData(partialData, 'url_param');
        saveHomepageAuditData(audit);
        return audit;
      }
    }

    // 2. Check localStorage: check jago_active_audit first, then jago_audit_data
    if (typeof localStorage !== 'undefined') {
      const storedActive = localStorage.getItem(JAGO_ACTIVE_AUDIT_KEY);
      if (storedActive) {
        try {
          const parsed = JSON.parse(storedActive);
          if (parsed && typeof parsed === 'object') {
            return normalizeAuditData(parsed, 'local_storage');
          }
        } catch (e) {
          console.warn('Failed to parse localStorage jago_active_audit data', e);
        }
      }

      const storedLegacy = localStorage.getItem(JAGO_AUDIT_STORAGE_KEY);
      if (storedLegacy) {
        try {
          const parsed = JSON.parse(storedLegacy);
          if (parsed && typeof parsed === 'object') {
            return normalizeAuditData(parsed, 'local_storage');
          }
        } catch (e) {
          console.warn('Failed to parse localStorage jago_audit_data data', e);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading homepage audit data:', err);
  }

  // Fallback: Default Baseline (Empty / Unaudited state)
  return DEFAULT_BASELINE_AUDIT;
}

/**
 * Normalizes and validates audit data, computing default pillars and ratios if omitted
 */
export function normalizeAuditData(raw: any, source: HomepageAuditData['source']): HomepageAuditData {
  const name = raw.fullName || raw.clientName || raw.name || raw.nama || DEFAULT_BASELINE_AUDIT.clientName;
  const score = parseNumeric(raw.baselineScore ?? raw.score ?? raw.skor ?? raw.healthScore, DEFAULT_BASELINE_AUDIT.baselineScore);
  const income = parseNumeric(raw.monthlyIncome ?? raw.income ?? raw.pemasukan, DEFAULT_BASELINE_AUDIT.monthlyIncome);
  const living = parseNumeric(raw.livingExpenses ?? raw.expenses ?? raw.living ?? raw.pengeluaran, DEFAULT_BASELINE_AUDIT.livingExpenses);
  const debt = parseNumeric(raw.debtExpenses ?? raw.debt ?? raw.cicilan ?? raw.utang, DEFAULT_BASELINE_AUDIT.debtExpenses);
  const savings = parseNumeric(raw.liquidSavings ?? raw.savings ?? raw.tabungan ?? raw.kas, DEFAULT_BASELINE_AUDIT.liquidSavings);
  const investments = parseNumeric(raw.investmentAssets ?? raw.asetInvestasi ?? raw.investasi ?? raw.portfolioInvestasi, DEFAULT_BASELINE_AUDIT.investmentAssets ?? 1000000);
  const lifestyle = parseNumeric(raw.lifestyleExpenses ?? raw.lifestyle ?? raw.gayaHidup, DEFAULT_BASELINE_AUDIT.lifestyleExpenses);

  const { status, color } = getScoreStatus(score);

  // Derive Ratios
  const calculatedDsr = income > 0 ? Math.round((debt / income) * 1000) / 10 : 0;
  const totalBurn = living + debt + lifestyle;
  const calculatedEmergencyMonths = totalBurn > 0 ? Math.round((savings / totalBurn) * 10) / 10 : 2.0;
  const consumerDebt = raw.ratios?.consumerDebt ?? Math.round((calculatedDsr * 0.35) * 10) / 10;
  const productiveAssetsRatio = raw.ratios?.productiveAssetsRatio ?? Math.min(50, Math.round((savings / (savings + living * 6)) * 100));

  // Derive Pillars
  const cashflowScore = raw.pillars?.cashflow ?? Math.min(100, Math.max(20, Math.round(100 - (living / income) * 100)));
  const defenseScore = raw.pillars?.defense ?? Math.min(100, Math.max(15, Math.round((calculatedEmergencyMonths / 6) * 100)));
  const solvencyScore = raw.pillars?.solvency ?? Math.min(100, Math.max(10, Math.round(100 - (calculatedDsr / 50) * 100)));
  const wealthScore = raw.pillars?.wealth ?? Math.min(100, Math.max(20, Math.round(productiveAssetsRatio * 2)));

  return {
    clientName: name,
    email: raw.email || DEFAULT_BASELINE_AUDIT.email,
    phone: raw.phone || DEFAULT_BASELINE_AUDIT.phone,
    baselineScore: score,
    baselineStatus: raw.baselineStatus || status,
    baselineStatusColor: raw.baselineStatusColor || color,
    baselineDate: raw.baselineDate || raw.date || 'Audit Mandiri Jago Rencana',
    monthlyIncome: income,
    livingExpenses: living,
    debtExpenses: debt,
    liquidSavings: savings,
    investmentAssets: investments,
    lifestyleExpenses: lifestyle,
    pillars: {
      cashflow: raw.pillars?.cashflow ?? cashflowScore,
      defense: raw.pillars?.defense ?? defenseScore,
      solvency: raw.pillars?.solvency ?? solvencyScore,
      wealth: raw.pillars?.wealth ?? wealthScore,
    },
    ratios: {
      dsr: raw.ratios?.dsr ?? calculatedDsr,
      consumerDebt,
      emergencyFundMonths: raw.ratios?.emergencyFundMonths ?? calculatedEmergencyMonths,
      productiveAssetsRatio,
    },
    allocations: {
      rdpu: raw.allocations?.rdpu ?? 35,
      sbn: raw.allocations?.sbn ?? 30,
      blueChip: raw.allocations?.blueChip ?? 25,
      growth: raw.allocations?.growth ?? 10,
    },
    notes: raw.notes || DEFAULT_BASELINE_AUDIT.notes,
    source,
  };
}

/**
 * Explicitly saves audit data to localStorage across both active and legacy keys
 */
export function saveHomepageAuditData(data: HomepageAuditData): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(JAGO_ACTIVE_AUDIT_KEY, serialized);
    localStorage.setItem(JAGO_AUDIT_STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save audit data to localStorage', e);
  }
}

/**
 * Fetches the user's latest audit assessment from Google Apps Script by Phone / WhatsApp or Email
 */
export async function fetchLatestAuditFromCloud(
  identifier: string
): Promise<{ success: boolean; data?: HomepageAuditData; message?: string }> {
  const cleanId = identifier.trim();
  if (!cleanId || cleanId.length < 3) {
    return { success: false, message: 'Masukkan nomor WhatsApp atau Email yang valid.' };
  }

  const scriptUrl = getGoogleScriptUrl();
  const endpoint = `${scriptUrl}?action=get_latest_audit&identifier=${encodeURIComponent(cleanId)}`;

  // 1. Direct fetch GET to Google Apps Script
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && (result.status === 'success' || result.success === true || result.data || result.audit)) {
        const payload = result.data || result.audit || result;
        const normalized = normalizeAuditData(payload, 'cloud_sync');
        saveHomepageAuditData(normalized);
        return {
          success: true,
          data: normalized,
          message: `Data audit untuk "${normalized.clientName}" berhasil disinkronkan dari Google Cloud.`,
        };
      }
      if (result && result.message) {
        return { success: false, message: result.message };
      }
    }
  } catch (err) {
    console.warn('Direct GET fetch to GAS timed out or failed, attempting local proxy fallback...', err);
  }

  // 2. Direct POST fallback to Google Apps Script
  try {
    const postRes = await fetch(DEFAULT_GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_latest_audit', identifier: cleanId }),
    });

    if (postRes.ok) {
      const result = await postRes.json();
      if (result && (result.status === 'success' || result.data || result.audit)) {
        const payload = result.data || result.audit || result;
        const normalized = normalizeAuditData(payload, 'cloud_sync');
        saveHomepageAuditData(normalized);
        return {
          success: true,
          data: normalized,
          message: `Data audit untuk "${normalized.clientName}" berhasil disinkronkan.`,
        };
      }
    }
  } catch {
    // Network down or offline
  }

  return {
    success: false,
    message: `Data audit untuk "${cleanId}" tidak ditemukan di database cloud. Pastikan nomor WhatsApp atau Email sama persis dengan yang diinput saat audit di beranda.`,
  };
}
