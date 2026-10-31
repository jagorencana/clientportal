import type { AssetPocket, CurrencyPocketSummary, LedgerTransaction } from '../types/ledger';

export function valuationInputRate(p:AssetPocket,rates:Record<string,number>){
  const code=p.currencyCode.trim().toUpperCase();
  if(code==='IDR')return 1;
  if(code==='XAU'||code==='CUSTOM')return Number(p.manualMarketRate||p.manualMarketPrice||0);
  return Number(rates[code]||0);
}

export function reportFxRate(p: CurrencyPocketSummary, rates: Record<string,number>) {
  const code=p.currency.trim().toUpperCase();
  if (code==='IDR') return 1;
  if(code==='XAU'||!/^[A-Z]{3}$/.test(code))return undefined;
  const rate = rates[code] ?? p.fxRateToIdr;
  return Number.isFinite(rate) && rate! > 0 ? rate : undefined;
}
export function performanceClass(p: CurrencyPocketSummary) {
  if(p.instrumentType==='CASH_VALAS') return p.currency==='IDR'?'Kas rupiah':'Valas';
  if(p.instrumentType==='SINKING_FUND') return 'Sinking fund';
  if(p.instrumentType==='LOGAM_MULIA') return 'Emas';
  if(p.instrumentType==='ASET_FISIK') return 'Aset fisik';
  return 'Investasi';
}
export function recordedRealized(transactions: LedgerTransaction[], from='', to='9999-12-31') {
  return transactions.filter(t=>t.date>=from && t.date<=to && t.type==='DEBET' &&
    t.costBasisReleasedIdr!==undefined).reduce((sum,t)=>sum+Math.abs(t.costIdr??t.totalIdr??t.nativeAmount*t.exchangeRate)-t.costBasisReleasedIdr!,0);
}
export function performanceGroups(pockets: CurrencyPocketSummary[]) {
  const groups=new Map<string,{name:string;value:number;cost:number;floating:number;realized:number}>();
  for(const p of pockets){
    const name=performanceClass(p);
    const row=groups.get(name)||{name,value:0,cost:0,floating:0,realized:0};
    row.value+=p.marketValueIdr;row.cost+=p.totalCostBasisIdr;
    row.floating+=p.unrealizedPnlIdr;row.realized+=p.realizedPnlIdr||0;groups.set(name,row);
  }
  return [...groups.values()];
}
