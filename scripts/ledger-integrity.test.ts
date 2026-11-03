import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {auditLedger,cacheBelongsToTenant,nativeMutationError,normalizeLedgerTransaction,validLedgerDate} from '../src/utils/ledgerIntegrity';
import {computeCurrencyPocketSummary,computeGlobalWealthSummary,filterValidTransactions} from '../src/utils/calculator';
import {reportValuationKnown} from '../src/utils/wealthPresentation';
import type {AssetPocket,LedgerTransaction,InstrumentType} from '../src/types/ledger';

const pocket=(id='cash',currencyCode='IDR',instrumentType:InstrumentType='CASH_VALAS'):AssetPocket=>({id,name:id,currencyCode,instrumentType,symbol:currencyCode,flag:'',accentColor:'teal',defaultCustodian:'TEST'});
const tx=(id:string,date:string,type:'CREDIT'|'DEBET',amount:number,p=pocket(),rate=1):LedgerTransaction=>({id,date,type,pocketId:p.id,currency:p.currencyCode,nativeAmount:amount,exchangeRate:rate,costIdr:(type==='CREDIT'?1:-1)*amount*rate,description:'Synthetic',posCategory:p.name,location:'TEST'});
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.000001,`${a} != ${b}`);
const gas=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>''})},Utilities:{formatDate:(date:Date)=>new Date(date).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})}});
vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),gas);

test('loading preserves authoritative IDR totals instead of multiplying rounded display rates',()=>{
  const row=normalizeLedgerTransaction({...tx('a','2026-10-01','CREDIT',100.12345,pocket('usd','USD'),17000),costIdr:1_700_999.75});
  assert.equal(row.costIdr,1_700_999.75);
  assert.equal(row.totalIdr,1_700_999.75);
  assert.notEqual(row.costIdr,Math.round(row.nativeAmount*row.exchangeRate));
  const out=normalizeLedgerTransaction({...row,type:'OUT',costIdr:1_700_999.75});
  assert.equal(out.costIdr,-1_700_999.75);
  assert.equal(normalizeLedgerTransaction({...row,costIdr:'',totalIdr:500}).costIdr,500);
});

test('bad source values do not become invented IDs, today dates, debit types or default foreign FX',()=>{
  const row=normalizeLedgerTransaction({amount:'1.500.000',currency:'USD',type:'oops'});
  assert.equal(row.id,'');assert.equal(row.date,'');assert.equal(String(row.type),'OOPS');
  assert.ok(Number.isNaN(row.nativeAmount));assert.ok(Number.isNaN(row.exchangeRate));
  assert.equal(filterValidTransactions([row]).length,0);
  assert.equal(validLedgerDate('2026-02-30'),false);assert.equal(validLedgerDate('2026-02-28'),true);
  const issues=auditLedger([pocket()], [row]);assert.ok(issues.blocking>=3);
});

test('tenant cache rejects mixed owners and unverifiable legacy ownership',()=>{
  assert.equal(cacheBelongsToTenant({pockets:[],transactions:[]},'a@example.test'),false);
  assert.equal(cacheBelongsToTenant({cacheTenantEmail:'a@example.test',pockets:[],transactions:[]},'a@example.test'),true);
  assert.equal(cacheBelongsToTenant({cacheTenantEmail:'a@example.test',pockets:[{userEmail:'b@example.test'}],transactions:[]},'a@example.test'),false);
  assert.equal(cacheBelongsToTenant({pockets:[{userEmail:'A@EXAMPLE.TEST'}],transactions:[]},'a@example.test'),true);
  assert.equal(cacheBelongsToTenant({pockets:[{userEmail:'a@example.test'},{userEmail:'b@example.test'}],transactions:[]},'a@example.test'),false);
});

test('audit distinguishes realized investment cashflow from cash overdrafts and same-day ordering',()=>{
  const fund=pocket('fund','IDR','REKSADANA');
  const rows=[tx('a','2026-10-01','CREDIT',100,fund),{...tx('b','2026-10-02','DEBET',120,fund),costBasisReleasedIdr:100}];
  assert.equal(auditLedger([fund],rows).issues.some(i=>i.code==='historical-overdraft'),false);
  const cash=pocket();
  assert.equal(auditLedger([cash],rows.map(t=>({...t,pocketId:cash.id}))).issues.some(i=>i.code==='historical-overdraft'),true);
  assert.equal(auditLedger([cash],[tx('a','2026-10-01','DEBET',100),tx('b','2026-10-01','CREDIT',100)]).blocking,0);
});

test('audit detects orphan, duplicate, mismatched-currency and one-sided transfer data',()=>{
  const a={...tx('same','2026-10-01','CREDIT',100),currency:'USD',transferId:'pair'};
  const b={...a,pocketId:'missing'};
  const codes=auditLedger([pocket()],[a,b]).issues.map(i=>i.code);
  for(const code of ['orphan','transaction-id','currency','transfer-pair'])assert.ok(codes.includes(code),code);
});

test('cash and unit edits/deletions cannot invalidate later-day balances, in both engines',()=>{
  for(const type of ['CASH_VALAS','LOGAM_MULIA','SAHAM_ETF'] as InstrumentType[]){
    const p=pocket(type,'USD',type);
    const rows=[tx('a','2026-10-01','CREDIT',100,p),tx('b','2026-10-02','DEBET',80,p)];
    const changed={...rows[0],nativeAmount:50,costIdr:50};
    assert.match(nativeMutationError(p,rows,changed),/negatif/);
    assert.match(gas.validateInvestmentTransaction(p,rows,changed),/negatif/);
    assert.match(nativeMutationError(p,rows,null,'a'),/negatif/);
    assert.match(gas.investmentServerDeletionError(p,rows,'a'),/negatif/);
    const earlier={...rows[1],id:'new',date:'2026-09-30'};
    assert.match(nativeMutationError(p,rows,earlier),/negatif/);
    assert.equal(nativeMutationError(p,rows,{...rows[0],nativeAmount:150,costIdr:150}),'');
  }
});

test('native balance guard permits corrections that improve an already bad history',()=>{
  const rows=[tx('a','2026-10-01','CREDIT',10),tx('b','2026-10-02','DEBET',20)];
  assert.equal(nativeMutationError(pocket(),rows,tx('c','2026-10-01','CREDIT',5)),'');
  assert.equal(nativeMutationError(pocket(),rows,null,'b'),'');
  assert.match(nativeMutationError(pocket(),rows,tx('c','2026-10-03','DEBET',5)),/negatif/);
});

test('pocket metadata may change without reinterpreting the currency or asset type of old transactions',()=>{
  const p=pocket('stock','USD','SAHAM_ETF');
  const history=[tx('a','2026-10-01','CREDIT',100,p,17000)];
  assert.equal(gas.pocketServerTypeMutationError(p,{...p,name:'Renamed'},history),'');
  assert.match(gas.pocketServerTypeMutationError(p,{...p,currencyCode:'IDR'},history),/rekonsiliasi/);
  assert.match(gas.pocketServerTypeMutationError(p,{...p,instrumentType:'REKSADANA'},history),/rekonsiliasi/);
  assert.equal(gas.pocketServerTypeMutationError(p,{...p,currencyCode:'IDR'},[]),'');
});

test('explicit dated zero valuations produce a real 100 percent loss across manual asset categories',()=>{
  for(const [currency,type] of [['IDR','REKSADANA'],['IDR','SINKING_FUND'],['IDR','ASET_FISIK'],['USD','SAHAM_ETF'],['USD','REKSADANA'],['XAU','LOGAM_MULIA']] as [string,InstrumentType][]){
    const p={...pocket(type,currency,type),marketValue:0,marketValueNative:0,marketValueCurrency:currency,lastPriceUpdatedAt:'2026-10-02T00:00:00Z'};
    const rate=currency==='IDR'?1:10;
    const row=tx('a','2026-10-01','CREDIT',100,p,rate);
    const result=computeCurrencyPocketSummary(currency,[row],10,p);
    near(result.marketValueIdr,0);near(result.totalCostBasisIdr,100*rate);near(result.unrealizedPnlIdr,-100*rate);near(result.unrealizedPnlPercent,-100);
    assert.equal(reportValuationKnown(result,'2026-10-03'),true,type);
  }
});

test('unit snapshots flag later movements and do not retain a ghost asset after full sale',()=>{
  const p={...pocket('stock','USD','SAHAM_ETF'),marketValueNative:120,marketValue:1_200_000,marketValueCurrency:'USD',lastPriceUpdatedAt:'2026-10-02T00:00:00Z'};
  const buy=tx('a','2026-10-01','CREDIT',100,p,10_000);
  const top=computeCurrencyPocketSummary('USD',[buy,tx('b','2026-10-03','CREDIT',10,p,10_000)],10_000,p);
  assert.equal(top.valuationNeedsRefresh,true);
  const closed=computeCurrencyPocketSummary('USD',[buy,tx('b','2026-10-03','DEBET',100,p,10_000)],10_000,p);
  near(closed.marketValueIdr,0);near(closed.totalCostBasisIdr,0);
});

test('all asset categories preserve aggregate and class-independent asset-minus-cost invariants',()=>{
  const types:InstrumentType[]=['CASH_VALAS','REKSADANA','SINKING_FUND','SAHAM_ETF','LOGAM_MULIA','ASET_FISIK'];
  for(let seed=1;seed<=80;seed++){
    const result=types.map((type,i)=>{
      const p=pocket(type,type==='LOGAM_MULIA'?'XAU':i%2?'IDR':'USD',type);
      const amount=100+seed,rate=1000+i*100;
      return computeCurrencyPocketSummary(p.currencyCode,[tx('a','2026-10-01','CREDIT',amount,p,rate),tx('b','2026-10-02','DEBET',seed,p,rate)],rate+50,p);
    });
    const total=computeGlobalWealthSummary(result);
    near(total.totalNetWorthIdr-total.totalCostBasisIdr,total.totalUnrealizedPnlIdr);
    near(result.reduce((sum,p)=>sum+p.unrealizedPnlIdr,0),total.totalUnrealizedPnlIdr);
    assert.ok(result.every(p=>p.totalCostBasisIdr>=0&&Number.isFinite(p.marketValueIdr)));
  }
});
