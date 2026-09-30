import {
  AssetPocket,
  CurrencyPocketSummary,
  CurrencyType,
  GlobalWealthSummary,
  LedgerTransaction,
} from '../types/ledger';

export interface EnrichedTransaction extends LedgerTransaction {
  isCredit: boolean;
  runningBalanceNative: number;
  runningBalanceIdr: number;
  averageBuyRate?: number;
  totalCostBasisIdr?: number;
}

export function filterValidTransactions(
  transactions: LedgerTransaction[]
): LedgerTransaction[] {
  if (!Array.isArray(transactions)) return [];
  return transactions.filter((t) => {
    if (!t) return false;
    const amount = Number(t.nativeAmount !== undefined ? t.nativeAmount : t.amount);
    const rate = Number(t.exchangeRate !== undefined ? t.exchangeRate : t.rate !== undefined ? t.rate : 1);
    return (
      !isNaN(amount) &&
      amount > 0 &&
      isFinite(amount) &&
      !isNaN(rate) &&
      rate >= 0 &&
      isFinite(rate)
    );
  });
}

export function computeCurrencyPocketSummary(
  currencyCode: CurrencyType,
  allTransactions: LedgerTransaction[],
  currentMarketRate: number,
  pocket: AssetPocket
): CurrencyPocketSummary {
  const code = (currencyCode || pocket.currencyCode || 'IDR').toUpperCase();
  const normalizedPocketId = String(pocket.id ?? '').trim();
  const pocketTxs = allTransactions.filter(
    (t) =>
      String(t.pocketId ?? '').trim() === normalizedPocketId ||
      (!t.pocketId && (t.currency || '').toUpperCase() === code)
  );

  let totalCreditNative = 0;
  let totalDebetNative = 0;
  let runningCost = 0;
  let runningBalance = 0;

  // Sort chronological for perpetual moving-average cost calculation
  const sorted = [...pocketTxs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  sorted.forEach((tx) => {
    const amt = Number(tx.nativeAmount ?? tx.amount ?? 0);
    const rate = Number(tx.exchangeRate ?? tx.rate ?? (code === 'IDR' ? 1 : currentMarketRate));
    const cost = Math.abs(tx.costIdr ?? tx.totalIdr ?? amt * rate);

    if (tx.type === 'CREDIT' || (tx.type as string) === 'IN') {
      totalCreditNative += amt;
      runningBalance += amt;
      runningCost += cost;
    } else {
      totalDebetNative += amt;
      if (runningBalance > 0) {
        const avg = runningCost / runningBalance;
        runningCost = Math.max(0, runningCost - amt * avg);
      }
      runningBalance = Math.max(0, runningBalance - amt);
    }
  });

  const balanceNative = totalCreditNative - totalDebetNative;
  const totalCostBasisIdr = balanceNative > 0 ? runningCost : 0;
  const averageBuyRate =
    balanceNative > 0 ? totalCostBasisIdr / balanceNative : (code === 'IDR' ? 1 : currentMarketRate);

  const supportsManualValuation =
    pocket.instrumentType === 'LOGAM_MULIA' ||
    pocket.instrumentType === 'REKSADANA' ||
    pocket.instrumentType === 'SAHAM_ETF' ||
    pocket.instrumentType === 'SINKING_FUND' ||
    pocket.instrumentType === 'ASET_FISIK';
  const manualMarketRate = Number(pocket.manualMarketRate || 0);
  const storedMarketValue = Number(pocket.marketValue);
  const hasStoredMarketValue = Number.isFinite(storedMarketValue) && storedMarketValue > 0;
  const storedNativeMarketValue = Number(pocket.marketValueNative);
  const hasStoredNativeMarketValue = Number.isFinite(storedNativeMarketValue) && storedNativeMarketValue > 0;
  const storedMarketCurrency = String(pocket.marketValueCurrency || code).toUpperCase();
  const effectiveSpotRate =
    supportsManualValuation && manualMarketRate > 0 && !hasStoredNativeMarketValue
      ? manualMarketRate
      : code === 'IDR'
        ? 1
        : currentMarketRate > 0
          ? currentMarketRate
          : averageBuyRate;
  // Total marketValue yang diinput user selalu menang atas kalkulasi cost basis/rate.
  const calculatedMarketValue = balanceNative * effectiveSpotRate;
  const nativeMarketValueIdr = storedMarketCurrency === 'IDR'
    ? storedNativeMarketValue
    : storedNativeMarketValue * currentMarketRate;
  const marketValueIdr = supportsManualValuation && hasStoredNativeMarketValue
    ? nativeMarketValueIdr
    : supportsManualValuation && hasStoredMarketValue
      ? storedMarketValue
    : calculatedMarketValue > 0
      ? calculatedMarketValue
      : totalCostBasisIdr;
  const unrealizedPnlIdr = marketValueIdr - totalCostBasisIdr;
  const unrealizedPnlPercent =
    totalCostBasisIdr > 0 ? (unrealizedPnlIdr / totalCostBasisIdr) * 100 : 0;

  return {
    pocketId: normalizedPocketId,
    currency: code,
    currencyName: pocket.name,
    name: pocket.name,
    symbol: pocket.symbol || (code === 'IDR' ? 'Rp' : code),
    flag: pocket.flag || '💳',
    defaultCustodian: pocket.defaultCustodian || pocket.custodian || 'CIMB Niaga',
    instrumentType: pocket.instrumentType,
    accentColor: pocket.accentColor,
    totalCreditNative,
    totalDebetNative,
    balanceNative,
    totalCostBasisIdr,
    averageBuyRate,
    currentMarketRate: effectiveSpotRate,
    manualMarketRate: manualMarketRate > 0 ? manualMarketRate : undefined,
    manualMarketValue: hasStoredMarketValue ? storedMarketValue : undefined,
    manualMarketValueNative: hasStoredNativeMarketValue ? storedNativeMarketValue : undefined,
    marketValueCurrency: hasStoredNativeMarketValue ? storedMarketCurrency : undefined,
    lastPriceUpdatedAt: pocket.lastPriceUpdatedAt,
    marketValueIdr,
    unrealizedPnlIdr,
    unrealizedPnlPercent,
  };
}

export function computeEnrichedTransactions(
  transactions: LedgerTransaction[]
): EnrichedTransaction[] {
  const sorted = [...filterValidTransactions(transactions)].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );

  const pocketBalances: Record<string, { native: number; idr: number }> = {};

  return sorted.map((tx) => {
    const pId = String(tx.pocketId ?? '').trim() || tx.currency;
    if (!pocketBalances[pId]) {
      pocketBalances[pId] = { native: 0, idr: 0 };
    }

    const isCredit = tx.type === 'CREDIT' || (tx.type as string) === 'IN';
    const amt = Number(tx.nativeAmount ?? tx.amount ?? 0);
    const rate = Number(tx.exchangeRate ?? tx.rate ?? 1);
    const cost = Math.abs(tx.costIdr ?? tx.totalIdr ?? amt * rate);

    if (isCredit) {
      pocketBalances[pId].native += amt;
      pocketBalances[pId].idr += cost;
    } else {
      pocketBalances[pId].native -= amt;
      pocketBalances[pId].idr -= cost;
    }

    return {
      ...tx,
      isCredit,
      nativeAmount: amt,
      exchangeRate: rate,
      costIdr: isCredit ? cost : -cost,
      runningBalanceNative: pocketBalances[pId].native,
      runningBalanceIdr: pocketBalances[pId].idr,
    };
  });
}

export function computeGlobalWealthSummary(
  pockets: CurrencyPocketSummary[]
): GlobalWealthSummary {
  let totalNetWorthIdr = 0;
  let totalCostBasisIdr = 0;

  pockets.forEach((p) => {
    totalNetWorthIdr += p.marketValueIdr || 0;
    totalCostBasisIdr += p.totalCostBasisIdr || 0;
  });

  const totalUnrealizedPnlIdr = totalNetWorthIdr - totalCostBasisIdr;
  const totalUnrealizedPnlPercent =
    totalCostBasisIdr > 0 ? (totalUnrealizedPnlIdr / totalCostBasisIdr) * 100 : 0;

  return {
    totalNetWorthIdr,
    totalCostBasisIdr,
    totalUnrealizedPnlIdr,
    totalUnrealizedPnlPercent,
  };
}
