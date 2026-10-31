import type {AssetPocket, LedgerTransaction} from '../types/ledger';
import {computeCurrencyPocketSummary} from './calculator';
import {investmentMutationError, investmentPosition, isRupiahInvestment, pocketTransactions, redemptionPreview} from './investmentAccounting';

export interface TransferInput {id:string;fromPocketId:string;toPocketId:string;amount:number;date:string;description:string}
export function normalizeTransferPocket(p:any):AssetPocket {
  const code=String(p.currencyCode||p.currency||'IDR').trim().toUpperCase();
  const raw=String(p.instrumentType||'').trim().toUpperCase().replace(/[ -]+/g,'_');
  const category=String(p.category||'').toLowerCase();
  const type=['CASH_VALAS','REKSADANA','SINKING_FUND','ASET_FISIK','SAHAM_ETF','LOGAM_MULIA'].includes(raw)?raw:
    /sinking/.test(category)?'SINKING_FUND':/reksa/.test(category)?'REKSADANA':/saham|etf|investasi/.test(category)?'SAHAM_ETF':'CASH_VALAS';
  const value=(v:any)=>v===''||v==null||(!p.lastPriceUpdatedAt&&Number(v)===0)?undefined:v;
  return {...p,id:String(p.id||p.pocketId),currencyCode:code,instrumentType:type as AssetPocket['instrumentType'],
    marketValue:value(p.marketValue),marketValueNative:value(p.marketValueNative)};
}
export function transferSupported(p:AssetPocket){return p.instrumentType==='CASH_VALAS'||isRupiahInvestment(p)}
export function transferDependencyError(history:LedgerTransaction[],candidate:Pick<LedgerTransaction,'id'|'pocketId'|'date'>){
  return history.some(t=>t.pocketId===candidate.pocketId && t.transferId && t.id!==candidate.id &&
    (t.date>candidate.date||(t.date===candidate.date&&t.id.localeCompare(candidate.id)>0)))?
    'Batalkan perpindahan yang bergantung pada mutasi ini terlebih dahulu.':'';
}
export function prepareTransfer(pockets:AssetPocket[],history:LedgerTransaction[],input:TransferInput):LedgerTransaction[] {
  const stamp=/^transfer-(\d{13})-[A-Za-z0-9-]+$/.exec(input.id);
  if(!stamp || Number(stamp[1])>Date.now()+60000)throw Error('ID atau waktu perpindahan tidak valid. Periksa jam perangkat.');
  const parsedDate=new Date(input.date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==input.date)throw Error('Tanggal perpindahan tidak valid.');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw Error('Nominal perpindahan harus positif.');
  const accounts=pockets.map(normalizeTransferPocket);
  const from=accounts.find(p=>p.id===input.fromPocketId),to=accounts.find(p=>p.id===input.toPocketId);
  if(!from||!to||from.id===to.id)throw Error('Pilih dua kantong berbeda milik akun Anda.');
  if(from.currencyCode!==to.currencyCode)throw Error('Perpindahan ini memakai mata uang yang sama; konversi valas belum didukung.');
  if(!transferSupported(from)||!transferSupported(to))throw Error('Perpindahan unit saham/emas belum didukung; gunakan kantong kas atau investasi nominal IDR.');
  for(const p of [from,to]){
    if(pocketTransactions(p,history).some(t=>t.date>input.date))throw Error('Tanggal perpindahan mendahului mutasi yang sudah tercatat.');
    if(isRupiahInvestment(p)){
      const pos=investmentPosition(p,history);
      const day=p.lastPriceUpdatedAt?new Date(p.lastPriceUpdatedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}):'';
      if(pos.ambiguousLegacySnapshot || (pos.hasValuation&&p.valuationCashflowIdr===undefined&&(!day||input.date<=day)))throw Error('Perbarui nilai investasi kantong terlebih dahulu agar acuan perpindahan jelas.');
    }
  }
  const summary=computeCurrencyPocketSummary(from.currencyCode,history,1,from);
  const available=isRupiahInvestment(from)?investmentPosition(from,history).marketValueIdr:summary.balanceNative;
  if(input.amount>available+0.000001)throw Error('Nominal melebihi saldo kantong asal.');
  const rate=from.currencyCode==='IDR'?1:summary.averageBuyRate;
  if(!Number.isFinite(rate)||rate<=0)throw Error('Modal perolehan kantong asal tidak valid.');
  const total=input.amount*rate;
  const common={date:input.date,currency:from.currencyCode,nativeAmount:input.amount,amount:input.amount,
    exchangeRate:rate,rate,transferId:input.id,description:input.description.trim()||'Pindah antar kantong'};
  const legPrefix='tx-'+stamp[1]+'-'+input.id;
  for(const p of [from,to]){
    if(pocketTransactions(p,history).some(t=>t.date===input.date && t.id.localeCompare(legPrefix)>=0))throw Error('Urutan mutasi pada tanggal ini tidak dapat dipastikan. Rekonsiliasikan terlebih dahulu.');
  }
  const out:LedgerTransaction={...common,id:legPrefix+'-out',pocketId:from.id,type:'DEBET',costIdr:-total,totalIdr:-total,
    location:from.defaultCustodian||from.custodian||'',posCategory:from.name,transferLeg:'OUT',transferPeerPocketId:to.id,
    costBasisReleasedIdr:isRupiahInvestment(from)?redemptionPreview(from,history,input.amount).costBasisReleasedIdr:undefined};
  const err=investmentMutationError(from,history,out);if(err&&isRupiahInvestment(from))throw Error(err);
  const incoming:LedgerTransaction={...common,id:legPrefix+'-in',pocketId:to.id,type:'CREDIT',costIdr:total,totalIdr:total,
    location:to.defaultCustodian||to.custodian||'',posCategory:to.name,transferLeg:'IN',transferPeerPocketId:from.id};
  return [out,incoming];
}
