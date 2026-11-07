import type {AssetPocket,LedgerTransaction} from '../types/ledger';
import {isRupiahInvestment} from './investmentAccounting';

export function validLedgerDate(value:unknown):boolean {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}

export function storedNumber(value:unknown):number|undefined {
  if(value===undefined||value===null||(typeof value==='string'&&!value.trim()))return undefined;
  return typeof value==='number'||typeof value==='string'?Number(value):NaN;
}

export function normalizeLedgerTransaction(raw:any):LedgerTransaction {
  const first=(...values:unknown[])=>values.find(v=>v!==undefined&&v!==null&&!(typeof v==='string'&&!v.trim()));
  const currency=String(raw.currency??raw.currencyCode??'').trim().toUpperCase();
  const amount=storedNumber(first(raw.nativeAmount,raw.amount));
  const rate=storedNumber(first(raw.exchangeRate,raw.rate))??(currency==='IDR'?1:NaN);
  const stored=storedNumber(first(raw.totalIdr,raw.costIdr));
  const costAlias=storedNumber(raw.costIdr),totalAlias=storedNumber(raw.totalIdr);
  const sourceTotalConflict=Number.isFinite(costAlias)&&Number.isFinite(totalAlias)&&Math.abs(Math.abs(costAlias!)-Math.abs(totalAlias!))>.01;
  const total=stored!==undefined&&!Number.isFinite(stored)?NaN:Number.isFinite(stored)&&Math.abs(stored!)>0?Math.abs(stored!):Math.round(Number(amount)*Number(rate));
  const type=String(raw.type||'').trim().toUpperCase();
  const credit=type==='CREDIT'||type==='IN';
  const normalizedType=credit?'CREDIT':['DEBET','DEBIT','OUT'].includes(type)?'DEBET':type;
  const released=storedNumber(raw.costBasisReleasedIdr);
  return {...raw,id:String(raw.id??raw.transactionId??'').trim(),pocketId:String(raw.pocketId??'').trim(),
    date:String(raw.date??'').trim(),currency,
    type:normalizedType,nativeAmount:amount??NaN,amount:amount??NaN,exchangeRate:rate??NaN,rate:rate??NaN,
    costIdr:credit?total:-total,totalIdr:credit?total:-total,costBasisReleasedIdr:released,
    sourceTotalConflict,description:raw.description||raw.note||raw.notes||'Mutasi Transaksi'} as LedgerTransaction;
}

export function normalizeLedgerRows(pockets: AssetPocket[], rows: unknown[]): LedgerTransaction[] {
  const currencyByPocket = new Map(pockets.map(pocket => [pocket.id, pocket.currencyCode]));
  return rows.map((raw: any) => {
    const row = raw ?? {};
    const explicitCurrency = String(row.currency ?? '').trim() || String(row.currencyCode ?? '').trim();
    const currency = explicitCurrency || currencyByPocket.get(String(row.pocketId ?? '').trim());
    return normalizeLedgerTransaction({ ...row, currency });
  });
}

export function cacheBelongsToTenant(cache:any,emailInput:string):boolean {
  const email=emailInput.trim().toLowerCase();
  if(!email||!Array.isArray(cache?.pockets)||!Array.isArray(cache?.transactions))return false;
  const marker=String(cache.cacheTenantEmail||'').trim().toLowerCase();
  if(marker&&marker!==email)return false;
  const owners=[...cache.pockets,...cache.transactions].map(row=>String(row.userEmail||row.tenantEmail||row.email||'').trim().toLowerCase()).filter(Boolean);
  if(owners.some(owner=>owner!==email))return false;
  return marker===email||owners.includes(email);
}

export interface LedgerIssue {priority:'P1'|'P2';code:string;pocketId?:string;transactionId?:string;message:string}
export function auditLedger(pockets:AssetPocket[],transactions:LedgerTransaction[]) {
  const issues:LedgerIssue[]=[];
  const pocketIds=new Set<string>(),txIds=new Set<string>();
  for(const p of pockets){
    const id=String(p.id||'').trim();
    if(!id||pocketIds.has(id))issues.push({priority:'P1',code:'pocket-id',pocketId:id,message:'ID kantong kosong atau berulang.'});
    pocketIds.add(id);
    if(p.lastPriceUpdatedAt&&!Number.isFinite(new Date(p.lastPriceUpdatedAt).getTime()))issues.push({priority:'P1',code:'valuation-date',pocketId:id,message:'Tanggal nilai pasar tidak valid.'});
    if(String(p.symbol).toLowerCase()==='unit'&&['REKSADANA','SINKING_FUND','ASET_FISIK'].includes(p.instrumentType))issues.push({priority:'P1',code:'quantity-mode',pocketId:id,message:'Catatan unit lama perlu dicocokkan dengan format nominal.'});
  }
  const balances=new Map<string,number>();
  const valid:LedgerTransaction[]=[];
  for(const t of transactions){
    const base={pocketId:t.pocketId,transactionId:t.id};
    if(!t.id||txIds.has(t.id))issues.push({priority:'P1',code:'transaction-id',...base,message:'ID transaksi kosong atau berulang.'});
    txIds.add(t.id);
    if(!pocketIds.has(t.pocketId))issues.push({priority:'P1',code:'orphan',...base,message:'Kantong transaksi tidak ditemukan.'});
    if(!validLedgerDate(t.date))issues.push({priority:'P1',code:'date',...base,message:'Tanggal transaksi tidak valid.'});
    if(!['CREDIT','DEBET'].includes(t.type)||!Number.isFinite(t.nativeAmount)||t.nativeAmount<=0||!Number.isFinite(t.exchangeRate)||t.exchangeRate<=0||!Number.isFinite(t.costIdr)){
      issues.push({priority:'P1',code:'amount-type',...base,message:'Nominal, kurs, atau jenis transaksi tidak valid.'});continue;
    }
    if(t.costBasisReleasedIdr!==undefined&&(!Number.isFinite(t.costBasisReleasedIdr)||t.costBasisReleasedIdr<0))issues.push({priority:'P1',code:'released-cost',...base,message:'Modal pencairan tidak valid.'});
    if((t as any).sourceTotalConflict)issues.push({priority:'P1',code:'total-conflict',...base,message:'Dua kolom total rupiah transaksi berbeda.'});
    const p=pockets.find(p=>p.id===t.pocketId);
    if(p&&t.currency!==p.currencyCode)issues.push({priority:'P1',code:'currency',...base,message:'Mata uang transaksi berbeda dari kantong.'});
    if(validLedgerDate(t.date))valid.push(t);
  }
  const daily=new Map<string,{pocketId:string;date:string;amount:number;transactionId:string}>();
  for(const t of valid){const key=t.pocketId+'|'+t.date;const day=daily.get(key)||{pocketId:t.pocketId,date:t.date,amount:0,transactionId:t.id};day.amount+=(t.type==='CREDIT'?1:-1)*t.nativeAmount;daily.set(key,day);}
  for(const day of [...daily.values()].sort((a,b)=>a.date.localeCompare(b.date))){
    const next=(balances.get(day.pocketId)||0)+day.amount;
    balances.set(day.pocketId,next);
    const p=pockets.find(p=>p.id===day.pocketId);
    // A nominal investment redemption can exceed net deposits by realizing gains.
    if(next<-.000001&&(!p||!isRupiahInvestment(p)))issues.push({priority:'P1',code:'historical-overdraft',pocketId:day.pocketId,transactionId:day.transactionId,message:'Saldo jurnal negatif pada akhir tanggal ini.'});
  }
  const pairs=new Map<string,LedgerTransaction[]>();
  for(const t of transactions)if(t.transferId){const pair=pairs.get(t.transferId)||[];pair.push(t);pairs.set(t.transferId,pair);}
  for(const pair of pairs.values())if(pair.length!==2||pair[0].type===pair[1].type||pair[0].pocketId===pair[1].pocketId||pair[0].date!==pair[1].date||pair[0].currency!==pair[1].currency||pair[0].nativeAmount!==pair[1].nativeAmount||Math.abs(pair[0].costIdr+pair[1].costIdr)>.01){
    issues.push({priority:'P1',code:'transfer-pair',transactionId:pair[0]?.id,message:'Dua sisi transfer tidak cocok.'});
  }
  return {pocketCount:pockets.length,transactionCount:transactions.length,issues,blocking:issues.filter(i=>i.priority==='P1').length};
}

export function nativeMutationError(pocket:AssetPocket,history:LedgerTransaction[],candidate:LedgerTransaction|null,deletedId?:string):string {
  if(isRupiahInvestment(pocket))return '';
  const rows=history.filter(t=>t.pocketId===pocket.id);
  const projected=rows.filter(t=>t.id!==(candidate?.id||deletedId));
  if(candidate)projected.push(candidate);
  const days=[...new Set([...rows,...projected].map(t=>t.date))].sort();
  const cumulative=(items:LedgerTransaction[],day:string)=>items.filter(t=>t.date<=day).reduce((sum,t)=>sum+(t.type==='CREDIT'||String(t.type)==='IN'?1:-1)*Number(t.nativeAmount??t.amount),0);
  for(const day of days){const next=cumulative(projected,day);if(next<-.000001&&next<cumulative(rows,day)-.000001)return 'Perubahan membuat saldo negatif pada '+day+'. Periksa transaksi setelah tanggal tersebut.';}
  return '';
}
