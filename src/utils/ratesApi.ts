export interface IsoCurrencyMeta {
  symbol: string;
  flag: string;
  name: string;
}

const ISO_CURRENCY_DATABASE: Record<string, IsoCurrencyMeta> = {
  IDR: { symbol: 'Rp', flag: '🇮🇩', name: 'Rupiah' },
  USD: { symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  EUR: { symbol: '€', flag: '🇪🇺', name: 'Euro' },
  CHF: { symbol: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
  JPY: { symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen' },
  CNY: { symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan' },
  SGD: { symbol: 'S$', flag: '🇸🇬', name: 'Singapore Dollar' },
  GBP: { symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  AUD: { symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
  KRW: { symbol: '₩', flag: '🇰🇷', name: 'South Korean Won' },
  HKD: { symbol: 'HK$', flag: '🇭🇰', name: 'Hong Kong Dollar' },
  THB: { symbol: '฿', flag: '🇹🇭', name: 'Thai Baht' },
  MYR: { symbol: 'RM', flag: '🇲🇾', name: 'Malaysian Ringgit' },
  NZD: { symbol: 'NZ$', flag: '🇳🇿', name: 'New Zealand Dollar' },
  CAD: { symbol: 'CA$', flag: '🇨🇦', name: 'Canadian Dollar' },
  SAR: { symbol: 'SR', flag: '🇸🇦', name: 'Saudi Riyal' },
  AED: { symbol: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  XAU: { symbol: 'gr', flag: '🪙', name: 'Emas Fisik (Gold)' },
};

export function getIsoCurrencyMeta(code: string): IsoCurrencyMeta {
  const normalized = (code || '').toUpperCase().trim();
  return (
    ISO_CURRENCY_DATABASE[normalized] || {
      symbol: normalized,
      flag: '💳',
      name: normalized,
    }
  );
}
