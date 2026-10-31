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

// Missing acquisition cost is unknown, not a zero gain. Incoming transfer legs
// never realize another gain: only the disposal leg carries released cost.
export function realizationDetails(transactions: LedgerTransaction[]) {
  const disposals = transactions.filter(t => t.type === 'DEBET' || String(t.type) === 'OUT');
  const rows = disposals.flatMap(t => {
    const proceeds = Math.abs(Number(t.costIdr ?? t.totalIdr ?? t.nativeAmount * t.exchangeRate));
    const cost = t.costBasisReleasedIdr;
    if (cost === undefined || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(proceeds)) return [];
    return [{id:t.id,date:t.date,description:t.description,proceeds,cost,pnl:proceeds-cost}];
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  return {rows, total:rows.reduce((sum,t)=>sum+t.pnl,0), unclassified:disposals.length-rows.length};
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
