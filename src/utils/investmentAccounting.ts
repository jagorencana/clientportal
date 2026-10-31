import type { AssetPocket, LedgerTransaction } from '../types/ledger';

// These pockets are tracked as money, not units. Gold, shares and FX retain unit accounting.
export function isRupiahInvestment(pocket: { currencyCode?: string; currency?: string; instrumentType?: string }) {
  return (pocket.currencyCode || pocket.currency || '').toUpperCase() === 'IDR' &&
    ['REKSADANA', 'SINKING_FUND', 'ASET_FISIK'].includes(pocket.instrumentType || '');
}

export function pocketTransactions(pocket: AssetPocket, transactions: LedgerTransaction[]) {
  return transactions.filter(t => String(t.pocketId || '').trim() === String(pocket.id).trim() ||
    (!t.pocketId && t.currency === pocket.currencyCode));
}

export function netCashflow(transactions: LedgerTransaction[]) {
  return transactions.reduce((sum, t) => sum +
    (t.type === 'CREDIT' || (t.type as string) === 'IN' ? 1 : -1) * Number(t.nativeAmount ?? t.amount ?? 0), 0);
}

export function investmentPosition(pocket: AssetPocket, transactions: LedgerTransaction[]) {
  const rows = pocketTransactions(pocket, transactions);
  const cashflow = netCashflow(rows);
  const rawValue = pocket.marketValueNative ?? pocket.marketValue;
  const hasValuation = rawValue !== undefined && rawValue !== null &&
    Number.isFinite(Number(rawValue)) && Number(rawValue) >= 0;
  const valuationDate = pocket.lastPriceUpdatedAt
    ? new Date(pocket.lastPriceUpdatedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) : '';
  // Legacy snapshots have no cashflow anchor. Same-day transactions are ambiguous: require a refresh.
  const anchored = pocket.valuationCashflowIdr !== undefined &&
    Number.isFinite(Number(pocket.valuationCashflowIdr));
  const ambiguousLegacySnapshot = hasValuation && !anchored &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(valuationDate) || rows.some(t => t.date === valuationDate));
  const baseline = anchored ? Number(pocket.valuationCashflowIdr) :
    netCashflow(rows.filter(t => t.date <= valuationDate));
  const marketValueIdr = hasValuation ? Number(rawValue) + cashflow - baseline : cashflow;
  let costBasisIdr = 0;
  let legacyBalance = 0;
  let realizedPnlIdr = 0;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const tx of sorted) {
    const amount = Number(tx.nativeAmount ?? tx.amount ?? 0);
    const credit = tx.type === 'CREDIT' || (tx.type as string) === 'IN';
    if (credit) {
      costBasisIdr += Math.abs(Number(tx.costIdr ?? tx.totalIdr ?? amount));
      legacyBalance += amount;
    } else {
      const explicitCost = tx.costBasisReleasedIdr;
      const hasExplicitCost = explicitCost !== undefined && explicitCost !== null &&
        String(explicitCost) !== '' && Number.isFinite(Number(explicitCost));
      const released = hasExplicitCost ? Number(explicitCost) :
        legacyBalance > 0 ? Math.min(costBasisIdr, amount * costBasisIdr / legacyBalance) : 0;
      costBasisIdr = Math.max(0, costBasisIdr - released);
      if (hasExplicitCost) realizedPnlIdr += amount - released;
      legacyBalance = Math.max(0, legacyBalance - amount);
    }
  }
  return { cashflow, marketValueIdr, costBasisIdr, realizedPnlIdr, hasValuation, ambiguousLegacySnapshot };
}

export function redemptionPreview(pocket: AssetPocket, transactions: LedgerTransaction[], amount: number) {
  const position = investmentPosition(pocket, transactions);
  const released = position.marketValueIdr > 0
    ? position.costBasisIdr * Math.min(1, amount / position.marketValueIdr) : 0;
  return { ...position, costBasisReleasedIdr: released, realizedPnlIdr: amount - released };
}

export function investmentMutationError(pocket: AssetPocket, transactions: LedgerTransaction[], tx: LedgerTransaction) {
  const rows = pocketTransactions(pocket, transactions);
  const existing = rows.find(t => t.id === tx.id);
  if (existing && rows.some(t => t.costBasisReleasedIdr !== undefined)) {
    const dependencyError = investmentDeletionError(pocket, transactions, existing.id);
    if (dependencyError) return dependencyError;
  }
  if (rows.some(t => t.id !== tx.id && t.date > tx.date)) {
    return 'Masukkan mutasi investasi secara berurutan; tanggal ini mendahului mutasi yang sudah tercatat.';
  }
  if (tx.type === 'DEBET' && pocket.lastPriceUpdatedAt) {
    const date = new Date(pocket.lastPriceUpdatedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    if (tx.date < date) return 'Tanggal pencairan tidak boleh mendahului nilai investasi acuan. Rekonsiliasikan riwayat terlebih dahulu.';
  }
  return '';
}

export function investmentDeletionError(pocket: AssetPocket, transactions: LedgerTransaction[], id: string) {
  const rows = pocketTransactions(pocket, transactions);
  if (!isRupiahInvestment(pocket) || !rows.some(t => t.costBasisReleasedIdr !== undefined)) return '';
  const target = rows.find(t => t.id === id);
  if (!target) return '';
  const latest = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).at(-1);
  if (latest?.id !== id) return 'Hapus mutasi terakhir kantong ini terlebih dahulu agar modal pencairan berikutnya tidak berubah.';
  if (pocket.lastPriceUpdatedAt) {
    const valuationDate = new Date(pocket.lastPriceUpdatedAt).toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valuationDate) || valuationDate >= target.date) {
      return 'Valuasi sudah diperbarui pada/setelah tanggal mutasi ini. Pembatalannya memerlukan rekonsiliasi valuasi.';
    }
  }
  return '';
}
