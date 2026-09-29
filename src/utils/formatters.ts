import { CurrencyType, InstrumentType } from '../types/ledger';

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = parts[2];
    const m = months[parseInt(parts[1], 10)] || parts[1];
    const y = parts[0];
    return `${d} ${m} ${y}`;
  }
  return dateStr;
}

export function formatIdr(amount: number, withPrefix = true): string {
  const val = Math.round(Number(amount) || 0);
  const formatted = Math.abs(val).toLocaleString('id-ID');
  const sign = val < 0 ? '-' : '';
  return withPrefix ? `${sign}Rp ${formatted}` : `${sign}${formatted}`;
}

export function formatNative(amount: number, currency?: CurrencyType): string {
  const val = Number(amount) || 0;
  const curr = (currency || '').toUpperCase();
  const isIdr = curr === 'IDR';
  if (isIdr) {
    return Math.round(val).toLocaleString('id-ID');
  }
  const isSmall = ['JPY', 'KRW', 'THB'].includes(curr);
  return val.toLocaleString('en-US', {
    minimumFractionDigits: isSmall ? 2 : 2,
    maximumFractionDigits: 4,
  });
}

export function formatPercent(percent: number): string {
  const p = Number(percent) || 0;
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

export function formatRate(rate: number, currency?: CurrencyType): string {
  const r = Number(rate) || 0;
  const curr = (currency || '').toUpperCase();
  if (curr === 'IDR') return '1,00';
  if (r < 1000 && !Number.isInteger(r)) {
    return r.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(r).toLocaleString('id-ID');
}

export function getPocketTypeLabel(currency?: string, instrumentType?: InstrumentType | string): string {
  const curr = (currency || '').toUpperCase();
  const inst = (instrumentType || '').toUpperCase();

  if (curr === 'XAU' || inst === 'LOGAM_MULIA') return 'Logam Mulia';
  if (inst === 'SAHAM_ETF') return 'Saham & ETF';
  if (inst === 'REKSADANA') return 'Reksadana / Efek';
  if (inst === 'ASET_FISIK') return 'Aset Fisik & Operasional';
  if (inst === 'SINKING_FUND') return 'Sinking Fund';
  if (curr === 'IDR') return 'Kas & Tabungan Rupiah';
  return 'Kas Valas';
}

export function formatPocketBalance(
  balance: number,
  currency: string,
  instrumentType?: InstrumentType | string,
  symbol?: string
): string {
  const val = Number(balance) || 0;
  const curr = (currency || '').toUpperCase();
  const inst = (instrumentType || '').toUpperCase();

  if (curr === 'IDR' || inst === 'ASET_FISIK') {
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  }
  if (curr === 'XAU' || inst === 'LOGAM_MULIA') {
    return `${val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} gr`;
  }
  if (symbol?.toLowerCase() === 'unit' || inst === 'REKSADANA') {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${symbol || 'Unit'}`;
  }
  const formattedVal = val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formattedVal} ${curr}`;
}
