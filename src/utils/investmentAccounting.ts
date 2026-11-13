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

// Money-denominated foreign investments are not unit-priced holdings. A later
// deposit increases their value; it must not merely increase acquisition cost.
export function foreignInvestmentValuation(pocket:AssetPocket,rows:LedgerTransaction[],fx:number) {
  const applies=pocket.currencyCode!=='IDR' && ['REKSADANA','SINKING_FUND'].includes(pocket.instrumentType);
  if(!applies)return null;
  const value=Number(pocket.marketValueNative);
  const currency=String(pocket.marketValueCurrency||pocket.currencyCode).toUpperCase();
  const day=pocket.lastPriceUpdatedAt ? new Date(pocket.lastPriceUpdatedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}) : '';
  const dated=/^\d{4}-\d{2}-\d{2}$/.test(day);
  const later=dated?rows.filter(t=>t.date>day):[];
  const credit=(t:LedgerTransaction)=>t.type==='CREDIT'||String(t.type)==='IN';
  const needsRefresh=!dated || !Number.isFinite(value)||value<0 || currency!==pocket.currencyCode || fx<=0 ||
    rows.some(t=>t.date===day) || later.some(t=>!credit(t));
  if(needsRefresh)return {needsRefresh:true,marketValueIdr:undefined,adjustedNative:undefined,addedNative:0};
  const addedNative=later.reduce((sum,t)=>sum+Number(t.nativeAmount??t.amount??0),0);
  return {needsRefresh:false,marketValueIdr:(value+addedNative)*fx,adjustedNative:value+addedNative,addedNative};
}

export function investmentNativeSnapshot(pocket: AssetPocket) {
  // The legacy Sheets reader can return 0 for an empty native value. A real
  // zero in a nominal IDR pocket is saved in both valuation columns.
  if (isRupiahInvestment(pocket) && pocket.marketValueNative === 0 &&
      Number.isFinite(pocket.marketValue) && Number(pocket.marketValue) > 0) {
    return undefined;
  }
  return pocket.marketValueNative;
}

export function investmentPosition(pocket: AssetPocket, transactions: LedgerTransaction[]) {
  const rows = pocketTransactions(pocket, transactions);
  const cashflow = netCashflow(rows);
  const rawValue = investmentNativeSnapshot(pocket) ?? pocket.marketValue;
  const hasValuation = rawValue !== undefined && rawValue !== null &&
    String(rawValue) !== '' && Number.isFinite(Number(rawValue)) && Number(rawValue) >= 0 &&
    (Number(rawValue)>0 || !!pocket.lastPriceUpdatedAt);
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

export function redemptionPreview(pocket: AssetPocket, transactions: LedgerTransaction[], amount: number, date?: string) {
  const history = date ? transactions.filter(row => row.date <= date) : transactions;
  const position = investmentPosition(pocket, history);
  const released = position.marketValueIdr > 0
    ? position.costBasisIdr * Math.min(1, amount / position.marketValueIdr) : 0;
  return { ...position, costBasisReleasedIdr: released, realizedPnlIdr: amount - released };
}

export function investmentMutationError(pocket: AssetPocket, transactions: LedgerTransaction[], tx: LedgerTransaction) {
  const rows = pocketTransactions(pocket, transactions);
  const existing = rows.find(t => t.id === tx.id);
  if(existing && sameFinancialValues(existing,tx))return '';
  const credit = (row: LedgerTransaction) => row.type === 'CREDIT' || String(row.type) === 'IN';
  const nominalHistory = !investmentPosition(pocket, rows).hasValuation && rows.every(row => {
    const amount = Number(row.nativeAmount ?? row.amount);
    const cost = credit(row) ? Math.abs(Number(row.costIdr ?? row.totalIdr)) :
      row.costBasisReleasedIdr === undefined ? amount : Number(row.costBasisReleasedIdr);
    return Number.isFinite(cost) && Math.abs(cost - amount) < 0.000001;
  });
  if (!credit(tx) && nominalHistory) {
    const projected = rows.filter(row => row.id !== tx.id).concat(tx);
    const dates = [...new Set(projected.map(row => row.date))].sort();
    for (const date of dates) {
      if (netCashflow(projected.filter(row => row.date <= date)) < -0.000001) {
        return 'Saldo tidak cukup pada ' + date + '. Periksa transaksi pada tanggal tersebut.';
      }
    }
    return '';
  }

  if (credit(tx) && (!existing || credit(existing))) {
    const firstChangedDate = existing && existing.date < tx.date ? existing.date : tx.date;
    const laterRedemption = rows.some(row => row.id !== tx.id &&
      row.costBasisReleasedIdr !== undefined && row.date >= firstChangedDate);
    if (laterRedemption) return 'Perubahan ini memengaruhi laba/rugi pencairan setelah tanggal tersebut. Riwayat pencairan perlu dihitung ulang.';
    const valuationDate = pocket.lastPriceUpdatedAt
      ? new Date(pocket.lastPriceUpdatedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) : '';
    if (pocket.valuationCashflowIdr !== undefined && valuationDate && firstChangedDate <= valuationDate) {
      return 'Transaksi ini mendahului pembaruan nilai investasi. Acuan nilai investasi perlu disesuaikan.';
    }
    return '';
  }

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

export function sameFinancialValues(a:any,b:any):boolean {
  const credit=(t:any)=>t.type==='CREDIT'||t.type==='IN';
  const amount=(t:any)=>Number(t.nativeAmount??t.amount);
  const rate=(t:any)=>Number(t.exchangeRate??t.rate??1);
  const total=(t:any)=>Math.abs(Number(t.costIdr??t.totalIdr??amount(t)*rate(t)));
  return String(a.pocketId)===String(b.pocketId)&&String(a.date)===String(b.date)&&credit(a)===credit(b)&&
    [amount(a),rate(a),total(a)].every(Number.isFinite)&&amount(a)===amount(b)&&rate(a)===rate(b)&&total(a)===total(b);
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
