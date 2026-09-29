/**
 * Currency Service: Real-time Interbank FX Rates Engine
 * Jago Wealth Ledger
 * 
 * Endpoint: https://open.er-api.com/v6/latest/USD
 * Bebas CORS, gratis, zero-dependency, tanpa API key.
 * 
 * Formula Konversi ke Basis Rupiah (IDR):
 * Karena feed mengembalikan basis 1 USD:
 * 1. usdToIdr = data.rates['IDR']
 * 2. kursKeIdr = usdToIdr / data.rates[targetCurrency]
 *    (Contoh: 1 USD = Rp 16.000, 1 USD = 0.92 EUR => 1 EUR = 16.000 / 0.92 = Rp 17.391)
 */

export interface LiveFxRates {
  [currencyCode: string]: number; // Nilai tukar per 1 unit valas dalam Rupiah (IDR)
}

export const OPEN_ER_API_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

const CACHE_KEY = 'live_fx_cache_data';
const CACHE_TIME_KEY = 'live_fx_cache_timestamp';
const CACHE_DURATION_MS = 60 * 60 * 1000; // Cache 1 jam agar hemat request

/**
 * Fallback kurs interbank jika perangkat dalam keadaan offline
 * dan belum memiliki cache tersimpan di browser.
 */
export const DEFAULT_FALLBACK_FX_RATES: LiveFxRates = {
  IDR: 1,
  USD: 16450,
  CHF: 21730,
  EUR: 19362,
  SGD: 12276,
  JPY: 105.78,
  GBP: 21090,
  AUD: 10822,
  CNY: 2272,
  MYR: 3492,
  THB: 450.68,
  SAR: 4386,
  AED: 4480,
  HKD: 2103,
  KRW: 11.92,
  CAD: 12007,
  NZD: 9792,
};

/**
 * Mengambil kurs valas real-time interbank dengan cache lokal 1 jam
 * @param forceRefresh - Paksa perbarui feed tanpa membaca cache
 */
export async function fetchLiveFxRates(
  forceRefresh = false
): Promise<{ rates: LiveFxRates; lastUpdated: Date }> {
  let cachedRates: string | null = null;
  let cachedTime: string | null = null;

  try {
    cachedRates = localStorage.getItem(CACHE_KEY);
    cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  } catch (storageErr) {
    console.warn('localStorage tidak dapat diakses:', storageErr);
  }

  // Gunakan cache lokal jika belum kedaluwarsa
  if (!forceRefresh && cachedRates && cachedTime) {
    const age = Date.now() - parseInt(cachedTime, 10);
    if (age < CACHE_DURATION_MS) {
      try {
        return {
          rates: JSON.parse(cachedRates),
          lastUpdated: new Date(parseInt(cachedTime, 10)),
        };
      } catch (parseErr) {
        console.warn('Gagal membaca cache FX, mengunduh data baru:', parseErr);
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5s timeout

    const res = await fetch(OPEN_ER_API_ENDPOINT, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Gagal menarik feed FX: HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    if (!json || !json.rates || !json.rates['IDR']) {
      throw new Error('Respons feed FX tidak memuat kurs IDR yang valid');
    }

    const usdToIdr = json.rates['IDR'] || 16000;
    const computedRates: LiveFxRates = { IDR: 1 };

    // Konversi semua valuta terhadap IDR: kursKeIdr = usdToIdr / rateAgainstUsd
    Object.keys(json.rates).forEach((curr) => {
      const rateAgainstUsd = json.rates[curr];
      if (rateAgainstUsd > 0) {
        const normalizedCode = curr.toUpperCase().trim();
        const rawIdr = usdToIdr / rateAgainstUsd;

        // Presisi angka: untuk satuan kecil (JPY, KRW, THB, dll) berikan 2 desimal, valas besar dibulatkan utuh
        const isSmallUnit = ['JPY', 'KRW', 'THB', 'VND', 'LAK', 'KHR'].includes(normalizedCode);
        computedRates[normalizedCode] = isSmallUnit
          ? Math.round(rawIdr * 100) / 100
          : Math.round(rawIdr);
      }
    });

    const now = new Date();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(computedRates));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (saveErr) {
      console.warn('Gagal menyimpan cache FX ke localStorage:', saveErr);
    }

    return { rates: computedRates, lastUpdated: now };
  } catch (err) {
    console.error('FX Fetch Error:', err);

    // Fallback 1: Gunakan cache lama yang ada jika offline/gagal
    if (cachedRates) {
      try {
        return {
          rates: JSON.parse(cachedRates),
          lastUpdated: new Date(parseInt(cachedTime || '0', 10)),
        };
      } catch (fallbackParseErr) {
        console.warn('Gagal mengurai fallback cache FX:', fallbackParseErr);
      }
    }

    // Fallback 2: Gunakan tabel kurs default bawaan jika belum pernah ada cache sama sekali
    return {
      rates: DEFAULT_FALLBACK_FX_RATES,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Helper untuk mengambil kurs 1 unit mata uang tertentu ke IDR
 */
export function getRateInIdr(
  currencyCode: string,
  rates: LiveFxRates,
  fallbackRate = 1
): number {
  const code = (currencyCode || '').toUpperCase().trim();
  if (code === 'IDR') return 1;
  return rates[code] || fallbackRate;
}

/**
 * Konversi nominal dari suatu mata uang ke mata uang lain
 */
export function convertFx(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: LiveFxRates
): number {
  const fromCode = fromCurrency.toUpperCase().trim();
  const toCode = toCurrency.toUpperCase().trim();

  if (fromCode === toCode) return amount;

  const fromRateIdr = getRateInIdr(fromCode, rates, 1);
  const toRateIdr = getRateInIdr(toCode, rates, 1);

  if (toRateIdr <= 0) return 0;

  const amountInIdr = amount * fromRateIdr;
  return amountInIdr / toRateIdr;
}

/**
 * Menghapus cache kurs di browser jika ingin reset bersih
 */
export function clearFxCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  } catch (err) {
    console.warn('Gagal membersihkan cache FX:', err);
  }
}
