/**
 * Live Currency Data Service Universal
 * Jago Wealth Ledger - Multi-Currency Asset & Transaction Engine
 * 
 * Endpoint: https://open.er-api.com/v6/latest/USD (Bebas CORS, gratis, zero-dependency)
 * Basis: USD Base Open Exchange Rates API
 */

export const CURRENCY_API_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

// Re-export core fxService
export { fetchLiveFxRates, getRateInIdr, convertFx, clearFxCache } from './fxService';
export type { LiveFxRates } from './fxService';

// Daftar 14 Valas Utama di Daftar Pantau Portofolio
export const WATCHLIST_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', isSmallUnit: false },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', isSmallUnit: false },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', isSmallUnit: false },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', isSmallUnit: true },
  { code: 'CNY', name: 'Chinese Yuan (RMB)', symbol: '¥', flag: '🇨🇳', isSmallUnit: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', isSmallUnit: false },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', isSmallUnit: false },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', isSmallUnit: false },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', isSmallUnit: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', isSmallUnit: false },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', isSmallUnit: true },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', isSmallUnit: false },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', isSmallUnit: false },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦', isSmallUnit: false },
] as const;

export interface CurrencyWatchlistItem {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rateToIdr: number;
  rawRateUsd: number;
  formattedRate: string;
  sellRateToIdr: number;
  formattedSellRate: string;
  isSmallUnit: boolean;
}

export interface LiveCurrencyResponse {
  success: boolean;
  rawRates: Record<string, number>; // Raw rates against USD
  idrRates: Record<string, number>; // Converted rates against IDR
  watchlist: CurrencyWatchlistItem[];
  lastUpdated: string;
  timestamp: string;
  timeString: string;
  source: string;
  error?: string;
}

// Fallback rates offline jika perangkat tanpa koneksi internet
export const FALLBACK_RAW_RATES: Record<string, number> = {
  USD: 1,
  IDR: 16450,
  CHF: 0.757,
  EUR: 0.8496,
  JPY: 155.5,
  CNY: 7.24,
  SGD: 1.34,
  GBP: 0.78,
  AUD: 1.52,
  KRW: 1380.0,
  HKD: 7.82,
  THB: 36.5,
  MYR: 4.71,
  NZD: 1.68,
  CAD: 1.37,
};

const CACHE_STORAGE_KEY = 'jago_live_currency_service_cache_v1';

/**
 * Format rate display according to user specification:
 * - Valuta satuan besar (USD, EUR, CHF, GBP, dll): 0 desimal / bulatkan ke Rupiah utuh.
 * - Valuta satuan kecil (JPY, KRW, THB): berikan 2 desimal (contoh: JPY 113.03, KRW 13.18) agar presisi.
 */
export function formatCurrencyRate(rate: number, currencyCode: string): string {
  const code = (currencyCode || '').toUpperCase().trim();
  const isSmallUnit = ['JPY', 'KRW', 'THB'].includes(code);

  if (isSmallUnit) {
    return rate.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return Math.round(rate).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  });
}

/**
 * Konversi otomatis kurs valas ke basis IDR:
 * KursIDR = rates['IDR'] / rates[XXX]
 * 
 * Aturan pembulatan:
 * - Valuta kecil (JPY, KRW, THB): 2 desimal
 * - Valuta besar: integer / bulatkan ke Rupiah utuh
 */
export function computeRateToIdr(
  currencyCode: string,
  rawRates: Record<string, number>
): number {
  const code = (currencyCode || '').toUpperCase().trim();

  if (code === 'IDR') return 1;

  const usdToIdr = rawRates['IDR'] || FALLBACK_RAW_RATES.IDR || 16450;
  const usdToTarget = rawRates[code] || FALLBACK_RAW_RATES[code];

  if (!usdToTarget || usdToTarget <= 0) {
    return 1;
  }

  const rawIdr = usdToIdr / usdToTarget;
  const isSmallUnit = ['JPY', 'KRW', 'THB'].includes(code);

  if (isSmallUnit) {
    // Berikan 2 desimal agar presisi
    return Math.round(rawIdr * 100) / 100;
  }

  // Bulatkan ke Rupiah utuh (0 desimal)
  return Math.round(rawIdr);
}

/**
 * Estimasi Kurs Jual Perbankan Retail (Spread BCA / CIMB Niaga ~0.28% - 0.5%)
 */
export function computeSellRate(buyRate: number, currencyCode: string): number {
  const code = (currencyCode || '').toUpperCase().trim();
  const isSmallUnit = ['JPY', 'KRW', 'THB'].includes(code);

  const spreadMultiplier = isSmallUnit ? 1.005 : 1.0028;
  const rawSell = buyRate * spreadMultiplier;

  if (isSmallUnit) {
    return Math.round(rawSell * 100) / 100;
  }
  return Math.round(rawSell);
}

/**
 * Bangun daftar pantau 14 valas utama berdasarkan raw rates
 */
export function buildWatchlistItems(rawRates: Record<string, number>): CurrencyWatchlistItem[] {
  return WATCHLIST_CURRENCIES.map((curr) => {
    const rateToIdr = computeRateToIdr(curr.code, rawRates);
    const rawRateUsd = rawRates[curr.code] || FALLBACK_RAW_RATES[curr.code] || 1;
    const formattedRate = formatCurrencyRate(rateToIdr, curr.code);
    const sellRateToIdr = computeSellRate(rateToIdr, curr.code);
    const formattedSellRate = formatCurrencyRate(sellRateToIdr, curr.code);

    return {
      code: curr.code,
      name: curr.name,
      symbol: curr.symbol,
      flag: curr.flag,
      rateToIdr,
      rawRateUsd,
      formattedRate,
      sellRateToIdr,
      formattedSellRate,
      isSmallUnit: curr.isSmallUnit,
    };
  });
}

/**
 * Helper generator waktu update kurs: "Fri, 25 Sep · 16:13 WIB"
 */
export function formatFxTimestamp(date: Date = new Date()): string {
  const dayDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }); // Contoh: "Fri, 25 Sep"

  const time = date
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace('.', ':'); // Contoh: "16:13"

  return `${dayDate} · ${time} WIB`;
}

/**
 * Mengambil cache kurs dari localStorage jika offline
 */
export function loadCurrencyCacheFromStorage(): LiveCurrencyResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: LiveCurrencyResponse = JSON.parse(raw);
    if (parsed && parsed.timestamp) {
      const date = new Date(parsed.timestamp);
      if (!isNaN(date.getTime())) {
        parsed.lastUpdated = formatFxTimestamp(date);
        parsed.timeString = parsed.lastUpdated;
      }
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse cached currency data:', e);
    return null;
  }
}

/**
 * Menyimpan data kurs ke localStorage sebagai offline fallback
 */
export function saveCurrencyCacheToStorage(data: LiveCurrencyResponse): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache currency data to localStorage:', e);
  }
}

/**
 * Live Currency Service Fetcher:
 * Mengambil kurs spot live terkini dari endpoint https://open.er-api.com/v6/latest/USD
 * Bebas CORS, gratis, zero-dependency.
 */
export async function fetchUniversalCurrencyRates(): Promise<LiveCurrencyResponse> {
  const now = new Date();
  const formattedTimestamp = formatFxTimestamp(now);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5s timeout

    const response = await fetch(CURRENCY_API_ENDPOINT, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.rates || !data.rates.IDR) {
      throw new Error('Respons API valas tidak memuat kurs IDR yang valid.');
    }

    const rawRates: Record<string, number> = data.rates;

    // Hitung seluruh kurs terhadap basis IDR
    const idrRates: Record<string, number> = { IDR: 1 };
    Object.keys(rawRates).forEach((code) => {
      idrRates[code] = computeRateToIdr(code, rawRates);
    });

    const watchlist = buildWatchlistItems(rawRates);

    const result: LiveCurrencyResponse = {
      success: true,
      rawRates,
      idrRates,
      watchlist,
      lastUpdated: formattedTimestamp,
      timestamp: now.toISOString(),
      timeString: formattedTimestamp,
      source: 'Open Exchange Rates Live Spot',
    };

    // Cache secara otomatis ke localStorage
    saveCurrencyCacheToStorage(result);

    return result;
  } catch (err: any) {
    console.warn('Auto-fetch currency service fallback:', err?.message || err);

    // Coba gunakan cached data dari localStorage
    const cached = loadCurrencyCacheFromStorage();
    if (cached && cached.idrRates) {
      return {
        ...cached,
        success: false,
        error: `Offline / Menggunakan cache (${cached.lastUpdated})`,
      };
    }

    // Jika belum ada cache, hitung dari FALLBACK_RAW_RATES
    const idrRates: Record<string, number> = { IDR: 1 };
    Object.keys(FALLBACK_RAW_RATES).forEach((code) => {
      idrRates[code] = computeRateToIdr(code, FALLBACK_RAW_RATES);
    });

    const watchlist = buildWatchlistItems(FALLBACK_RAW_RATES);

    return {
      success: false,
      rawRates: FALLBACK_RAW_RATES,
      idrRates,
      watchlist,
      lastUpdated: formattedTimestamp,
      timestamp: now.toISOString(),
      timeString: formattedTimestamp,
      source: 'Default Offline Benchmark',
      error: err?.message || 'Gagal tersambung ke server kurs live',
    };
  }
}
