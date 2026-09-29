import { AssetPocket, CurrencyType, LedgerTransaction } from '../types/ledger';
import { INITIAL_MARKET_RATES, SEED_TRANSACTIONS } from '../data/seedData';

export const INITIAL_DEFAULT_POCKETS: AssetPocket[] = [
  {
    id: 'pocket-bca-idr',
    name: 'BCA Rekening Operasional & Darurat',
    currencyCode: 'IDR',
    currency: 'IDR',
    instrumentType: 'CASH_VALAS',
    category: 'Kas & Tabungan Rupiah',
    symbol: 'Rp',
    flag: '🇮🇩',
    defaultCustodian: 'Bank Central Asia',
    custodian: 'Bank Central Asia',
    accentColor: 'indigo',
    isDefault: true,
    sortOrder: 1,
  },
  {
    id: 'pocket-cimb-chf',
    name: 'CIMB Niaga Valas (CHF)',
    currencyCode: 'CHF',
    currency: 'CHF',
    instrumentType: 'CASH_VALAS',
    category: 'Kas Valas',
    symbol: 'CHF',
    flag: '🇨🇭',
    defaultCustodian: 'CIMB Niaga',
    custodian: 'CIMB Niaga',
    accentColor: 'teal',
    isDefault: true,
    sortOrder: 2,
  },
  {
    id: 'pocket-cimb-usd',
    name: 'CIMB Niaga Valas (USD)',
    currencyCode: 'USD',
    currency: 'USD',
    instrumentType: 'CASH_VALAS',
    category: 'Kas Valas',
    symbol: '$',
    flag: '🇺🇸',
    defaultCustodian: 'CIMB Niaga',
    custodian: 'CIMB Niaga',
    accentColor: 'emerald',
    isDefault: true,
    sortOrder: 3,
  },
  {
    id: 'pocket-cimb-eur',
    name: 'CIMB Niaga Valas (EUR)',
    currencyCode: 'EUR',
    currency: 'EUR',
    instrumentType: 'CASH_VALAS',
    category: 'Kas Valas',
    symbol: '€',
    flag: '🇪🇺',
    defaultCustodian: 'CIMB Niaga',
    custodian: 'CIMB Niaga',
    accentColor: 'blue',
    isDefault: true,
    sortOrder: 4,
  },
  {
    id: 'pocket-antam-gold',
    name: 'Emas Fisik Logam Mulia (Antam)',
    currencyCode: 'XAU',
    currency: 'XAU',
    instrumentType: 'LOGAM_MULIA',
    category: 'Logam Mulia',
    symbol: 'gr',
    flag: '🪙',
    defaultCustodian: 'Brankas Pribadi',
    custodian: 'Brankas Pribadi',
    accentColor: 'amber',
    manualMarketPrice: 1520000,
    isDefault: true,
    sortOrder: 5,
  },
  {
    id: 'pocket-reksadana-bibit',
    name: 'Sucorinvest Sharia Money Market',
    currencyCode: 'IDR',
    currency: 'IDR',
    instrumentType: 'REKSADANA',
    category: 'Reksadana / Efek',
    symbol: 'Rp',
    flag: '📈',
    defaultCustodian: 'Bibit',
    custodian: 'Bibit',
    accentColor: 'purple',
    isDefault: true,
    sortOrder: 6,
  },
  {
    id: 'pocket-saham-bbca',
    name: 'Saham Blue-Chip Dividen (BBCA)',
    currencyCode: 'IDR',
    currency: 'IDR',
    instrumentType: 'SAHAM_ETF',
    category: 'Saham & ETF',
    symbol: 'Rp',
    flag: '📈',
    defaultCustodian: 'Stockbit',
    custodian: 'Stockbit',
    accentColor: 'cyan',
    isDefault: true,
    sortOrder: 7,
  },
];

export const INITIAL_MASTER_POCKETS = INITIAL_DEFAULT_POCKETS;

const STORAGE_KEYS = {
  POCKETS: 'jr_wealth_ledger_pockets_v2',
  TRANSACTIONS: 'jr_wealth_ledger_txs_v2',
  RATES: 'jr_wealth_ledger_rates_v2',
  MANUAL_PRICES: 'jr_wealth_ledger_manual_prices_v2',
};

export function loadPocketsFromStorage(): AssetPocket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POCKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load pockets from storage', e);
  }
  return INITIAL_DEFAULT_POCKETS;
}

export function savePocketsToStorage(pockets: AssetPocket[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.POCKETS, JSON.stringify(pockets));
  } catch (e) {
    console.warn('Failed to save pockets to storage', e);
  }
}

export function loadTransactionsFromStorage(): LedgerTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load transactions from storage', e);
  }
  return SEED_TRANSACTIONS;
}

export function saveTransactionsToStorage(txs: LedgerTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.warn('Failed to save transactions to storage', e);
  }
}

export function loadMarketRatesFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...INITIAL_MARKET_RATES, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to load rates from storage', e);
  }
  return INITIAL_MARKET_RATES;
}

export function saveMarketRatesToStorage(rates: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rates));
  } catch (e) {
    console.warn('Failed to save rates to storage', e);
  }
}

export function loadManualPricesFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MANUAL_PRICES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load manual prices from storage', e);
  }
  return { XAU: 1520000 };
}

export function saveManualPricesToStorage(prices: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MANUAL_PRICES, JSON.stringify(prices));
  } catch (e) {
    console.warn('Failed to save manual prices to storage', e);
  }
}

export function migrateCorruptedPockets(pockets: AssetPocket[]): { pockets: AssetPocket[]; hasChanged: boolean } {
  let hasChanged = false;
  const sanitized = pockets.map((p, idx) => {
    const normalizedId = String(p.id ?? '').trim();
    const normalizedCurrency = String(p.currencyCode || p.currency || 'IDR').trim().toUpperCase();
    if (!normalizedId || normalizedId !== p.id || normalizedCurrency !== p.currencyCode || !p.instrumentType) {
      hasChanged = true;
    }
    return {
      ...p,
      id: normalizedId || `pocket-${normalizedCurrency.toLowerCase()}-${idx + 1}`,
      currencyCode: normalizedCurrency,
      currency: normalizedCurrency,
      instrumentType: p.instrumentType || 'CASH_VALAS',
    };
  });
  return { pockets: sanitized, hasChanged };
}

export function hardResetPocketsToDefault(): void {
  savePocketsToStorage(INITIAL_DEFAULT_POCKETS);
}

export function purgeCorruptedTransactions(): void {
  // Purge any corrupted transactions from local storage
}

export function exportLedgerToJson(
  transactions: LedgerTransaction[],
  marketRates: Record<CurrencyType, number>,
  pockets?: AssetPocket[]
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      pockets: pockets || [],
      transactions,
      marketRates,
    },
    null,
    2
  );
}

export function parseImportJson(jsonStr: string): {
  success: boolean;
  transactions?: LedgerTransaction[];
  marketRates?: Record<CurrencyType, number>;
  pockets?: AssetPocket[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return { success: true, transactions: parsed };
    }
    if (parsed && typeof parsed === 'object') {
      const txs = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      const rates = parsed.marketRates && typeof parsed.marketRates === 'object' ? parsed.marketRates : undefined;
      const pckts = Array.isArray(parsed.pockets) ? parsed.pockets : undefined;
      return {
        success: true,
        transactions: txs,
        marketRates: rates,
        pockets: pckts,
      };
    }
    return { success: false, error: 'Format JSON tidak dikenali.' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal mem-parsing data JSON.' };
  }
}
