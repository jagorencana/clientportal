import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {prepareTransfer,transferDependencyError} from '../src/utils/ledgerTransfers';
import {computeCurrencyPocketSummary,computeGlobalWealthSummary} from '../src/utils/calculator';
import {reportFxRate,performanceGroups,recordedRealized,valuationInputRate,realizationDetails,reportValuationKnown,reportPerformanceCoverage} from '../src/utils/wealthPresentation';
import {RealizedPerformance} from '../src/components/wealth-ledger/RealizedPerformance';
import {GlobalMetrics} from '../src/components/wealth-ledger/GlobalMetrics';
import type {AssetPocket,LedgerTransaction} from '../src/types/ledger';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<0.00001,`${a} != ${b}`);
const pocket=(id:string,currencyCode='IDR',instrumentType:AssetPocket['instrumentType']='CASH_VALAS'):AssetPocket=>({id,name:id,currencyCode,instrumentType,symbol:currencyCode,flag:'',accentColor:'teal',defaultCustodian:'Synthetic'});
const source={...pocket('fund','IDR','REKSADANA'),marketValueNative:10_756_482,marketValue:10_756_482,lastPriceUpdatedAt:'2026-10-26T00:00:00Z'};
const dest=pocket('cash');
const deposit=(p:AssetPocket,amount:number,rate=1):LedgerTransaction=>({id:'opening-'+p.id,pocketId:p.id,date:'2026-10-21',currency:p.currencyCode,type:'CREDIT',nativeAmount:amount,exchangeRate:rate,costIdr:amount*rate,description:'Synthetic deposit',posCategory:p.name,location:'Synthetic'});
const input=(amount=10_000_000)=>({id:'transfer-'+Date.now()+'-'+crypto.randomUUID(),fromPocketId:'fund',toPocketId:'cash',amount,date:'2026-10-31',description:'Synthetic transfer'});
const summaries=(accounts:AssetPocket[],rows:LedgerTransaction[],rate=1)=>accounts.map(p=>computeCurrencyPocketSummary(p.currencyCode,rows,rate,p));

test('report excludes unvalued investments from performance without dropping their recorded asset value',()=>{
  const accounts=[pocket('cash','CHF'),pocket('sgov','USD','SAHAM_ETF'),pocket('stock','IDR','SAHAM_ETF'),
    {...pocket('rdpu','IDR','REKSADANA'),marketValue:20_537_999,marketValueNative:20_537_999,lastPriceUpdatedAt:'2026-10-09T00:00:00Z'}];
  const rows=accounts.map((p,i)=>deposit(p,[1124.22,2292.93,15_000_000,20_000_000][i],p.currencyCode==='CHF'?22_200:p.currencyCode==='USD'?17_600:1));
  const pockets=accounts.map(p=>computeCurrencyPocketSummary(p.currencyCode,rows,p.currencyCode==='CHF'?21_992:p.currencyCode==='USD'?18_133:1,p));
  assert.deepEqual(pockets.map(p=>reportValuationKnown(p,'2026-10-31')),[true,false,false,true]);
  const items=pockets.map(p=>({historicalMarketValueIdr:p.marketValueIdr,historicalCostBasisIdr:p.totalCostBasisIdr,valuationKnown:reportValuationKnown(p,'2026-10-31')}));
  const coverage=reportPerformanceCoverage(items);
  assert.equal(coverage.missing,2);
  near(coverage.floating,pockets[0].unrealizedPnlIdr+pockets[3].unrealizedPnlIdr);
  assert.equal(items.reduce((sum,p)=>sum+p.historicalMarketValueIdr,0),pockets.reduce((sum,p)=>sum+p.marketValueIdr,0),'coverage does not remove holdings');
  assert.equal(reportValuationKnown({...pockets[3],lastPriceUpdatedAt:'2026-11-01T00:00:00Z'},'2026-10-31'),false,'future valuation does not validate historical performance');
  assert.equal(reportValuationKnown({...pockets[3],lastPriceUpdatedAt:undefined},'2026-10-31'),false,'undated valuation must be disclosed');
  assert.equal(reportValuationKnown({...pockets[0],fxRateToIdr:undefined},'2026-10-31'),false,'no FX means no verified valuation');
});

test('realization disclosure counts a disposal once, separates a loss and unknown cost, and avoids double counting wealth',()=>{
  const legs=prepareTransfer([source,dest],[deposit(source,6_823_408)],input());
  const loss={...deposit(source,100),id:'loss',type:'DEBET' as const,costIdr:100,costBasisReleasedIdr:120};
  const unknown={...loss,id:'legacy',costBasisReleasedIdr:undefined};
  const result=realizationDetails([...legs,loss,unknown]);
  assert.equal(result.rows.length,2,'incoming paired transfer does not realize a second gain');
  assert.equal(result.unclassified,1,'missing cost is not a zero gain');
  near(result.total,3_656_468.722766421-20);
  assert.equal(result.rows.find(t=>t.id==='loss')!.pnl,-20);
  const html=renderToStaticMarkup(React.createElement(RealizedPerformance,{transactions:[...legs,loss,unknown],floating:276_605.2772335792}));
  assert.doesNotMatch(html,/<details|<summary/);assert.match(html,/Modal dilepas/);assert.match(html,/tidak ditambahkan lagi/);assert.match(html,/estimasi pembukuan/);
  const empty=renderToStaticMarkup(React.createElement(RealizedPerformance,{transactions:[unknown],floating:0}));
  assert.doesNotMatch(empty,/<table|<details|<summary/);assert.match(empty,/Belum tersedia/);assert.match(empty,/belum diklasifikasikan/);
});

test('USD pockets share one currency FX even when effective asset ratios differ',()=>{
  const accounts=[pocket('usd-cash','USD'),{...pocket('usd-stock','USD','SAHAM_ETF'),marketValue:28_438_891},
    {...pocket('usd-fund','USD','REKSADANA'),marketValueNative:6_308.12,marketValueCurrency:'USD',manualMarketRate:17_545}];
  const rows=accounts.map((p,i)=>deposit(p,[368.23,1501.55,6519.32][i],17_000));
  const result=summaries(accounts,rows,18_133);
  for(const p of result)near(reportFxRate(p,{USD:18_133})!,18_133);
  assert.notEqual(result[1].marketValueIdr/result[1].balanceNative,18_133);
  near(result[1].marketValueIdr,28_438_891);
  near(result[2].marketValueIdr,6308.12*18133);
  assert.equal(reportFxRate({...result[1],fxRateToIdr:undefined},{}),undefined,'do not invent FX from an asset price');
});
test('investment redemption transfer conserves total assets and recorded gain',()=>{
  const rows=[deposit(source,6_823_408)];
  const before=computeGlobalWealthSummary(summaries([source,dest],rows));
  const legs=prepareTransfer([source,dest],rows,input());
  const afterRows=[...rows,...legs];
  const after=computeGlobalWealthSummary(summaries([source,dest],afterRows));
  near(after.totalNetWorthIdr,before.totalNetWorthIdr);
  near(after.totalRecordedPnlIdr!,before.totalRecordedPnlIdr!);
  near(after.totalRealizedPnlIdr!,3_656_468.722766421);
  const p=summaries([source,dest],afterRows);
  near(p[0].marketValueIdr,756_482);near(p[1].balanceNative,10_000_000);
  near(recordedRealized(afterRows,'2026-10-01','2026-10-31'),after.totalRealizedPnlIdr!);
  assert.equal(recordedRealized(afterRows,'2026-11-01','2026-11-30'),0);
  assert.match(transferDependencyError(afterRows,rows[0]),/Batalkan/);
  const html=renderToStaticMarkup(React.createElement(GlobalMetrics,{summary:after,pocketsCount:2,pockets:p,transactions:afterRows,monthlySurplusCapacity:20_000_000}));
  assert.match(html,/Hasil terealisasi tercatat/);assert.match(html,/Total P\/L tercatat/);assert.match(html,/Riwayat|riwayat/);
  assert.equal(performanceGroups(p).length,2);
});

test('standardizing FX does not replace gold unit prices or zero a stored valuation when FX is unavailable',()=>{
  const gold={...pocket('gold','XAU','LOGAM_MULIA'),manualMarketRate:1_200_000};
  const rate=valuationInputRate(gold,{USD:18_133});
  near(rate,1_200_000);
  const g=computeCurrencyPocketSummary('XAU',[deposit(gold,10,1_100_000)],rate,gold);
  near(g.marketValueIdr,12_000_000);assert.equal(reportFxRate(g,{}),undefined);
  const usd={...pocket('usd','USD','SAHAM_ETF'),manualMarketRate:18_940,marketValueNative:1000,marketValue:18_133_000};
  near(valuationInputRate(usd,{USD:18_133}),18_133);
  const u=computeCurrencyPocketSummary('USD',[deposit(usd,900,17_000)],valuationInputRate(usd,{}),usd);
  near(u.marketValueIdr,18_133_000);assert.equal(reportFxRate(u,{}),undefined);
});
test('cash FX transfer carries acquisition cost rather than pretending an external deposit',()=>{
  const accounts=[pocket('fund','USD'),pocket('cash','USD')],rows=[deposit(accounts[0],100,16_000),deposit(accounts[1],50,17_000)];
  const before=computeGlobalWealthSummary(summaries(accounts,rows,18_133));
  const legs=prepareTransfer(accounts,rows,input(20));
  const after=computeGlobalWealthSummary(summaries(accounts,[...rows,...legs],18_133));
  near(after.totalNetWorthIdr,before.totalNetWorthIdr);near(after.totalCostBasisIdr,before.totalCostBasisIdr);
  near(legs[1].costIdr,320_000);assert.equal(legs[0].transferId,legs[1].transferId);
  assert.throws(()=>prepareTransfer(accounts,rows,input(101)),/saldo/);
  assert.throws(()=>prepareTransfer([accounts[0],dest],rows,input(20)),/mata uang/);
  assert.throws(()=>prepareTransfer([source,{...dest,id:'fund'}],[deposit(source,6_823_408)],input()),/berbeda/);
});

test('new nominal investment pockets accept transfers without mistaking empty zero cells for a valuation',()=>{
  const empty={...pocket('cash','IDR','REKSADANA'),marketValue:0,marketValueNative:0};
  const rows=[deposit(source,6_823_408)];
  const legs=prepareTransfer([source,empty],rows,input(1_000_000));
  const after=summaries([source,{...empty,marketValue:undefined,marketValueNative:undefined}],[...rows,...legs]);
  near(after[1].marketValueIdr,1_000_000);
  const ambiguous={...empty,marketValue:30_000_000,marketValueNative:30_000_000,lastPriceUpdatedAt:'2026-10-31T00:00:00Z'};
  assert.throws(()=>prepareTransfer([source,ambiguous],rows,input(1_000_000)),/Perbarui nilai/);
});

class Sheet{
  cells:any[][]=[];failNext=false;
  constructor(public name:string){}
  getName(){return this.name;}getLastRow(){return this.cells.length;}getLastColumn(){return Math.max(0,...this.cells.map(r=>r.length));}setFrozenRows(){}deleteRow(row:number){this.cells.splice(row-1,1);}
  getRange(row:number,col:number,h=1,w=1){const range={getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>this.cells[row-1+i]?.[col-1+j]??'')),setValues:(values:any[][])=>{if(this.failNext){this.failNext=false;throw Error('Synthetic failure before write');}values.forEach((r,i)=>r.forEach((v,j)=>{this.cells[row-1+i]??=[];this.cells[row-1+i][col-1+j]=v;}));return range;},setValue:(v:any)=>range.setValues([[v]])};return range;}
  getDataRange(){return this.getRange(1,1,this.getLastRow(),this.getLastColumn());}
}
for(const active of [false,true])test(`atomic event persistence, retry, cancel, tenant isolation (${active?'active':'reference'} backend)`,{skip:active&&!process.env.ACTIVE_GAS_FIXTURE},()=>{
  const sheets=new Map<string,Sheet>();
  const ss={getSheetByName:(n:string)=>sheets.get(n),insertSheet:(n:string)=>{const s=new Sheet(n);sheets.set(n,s);return s;}};
  const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>''})},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush:()=>{}},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},Utilities:{formatDate:(d:Date)=>new Date(d).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})}});
  if(active){for(const f of ['Kode.js','InvestmentAccounting.js','TransferEngine.js','TransferHandlers.js'])vm.runInContext(fs.readFileSync(path.join(process.env.ACTIVE_GAS_FIXTURE!,f),'utf8'),ctx);}
  else {vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),ctx);vm.runInContext(fs.readFileSync('google-apps-script/TransferHandlers.js','utf8'),ctx);ctx.LedgerTransferEngine={prepareTransfer};}
  ctx.respondJson=(v:any)=>v;ctx.createJsonResponse=(v:any)=>v;ctx.getSpreadsheet=()=>ss;
  const email='qa@example.test';
  const ps=active?ctx.ensureLedgerPocketSheet(ss):ss.insertSheet('LEDGER_POCKETS');if(!active)ctx.ensureLedgerPocketHeaders(ps);
  for(const p of [source,dest])ps.cells.push(ps.cells[0].map((h:string)=>active?ctx.pocketSyncValue(p,h,email,0,'','2026-10-26T00:00:00Z'):ctx.canonicalPocketValue(p,ctx.normalizeLedgerHeader(h),email)??''));
  const ts=active?ctx.ensureLedgerTransactionSheet(ss):ss.insertSheet('LEDGER_TRANSACTIONS');if(!active)ctx.ensureLedgerTransactionHeaders(ts);
  const d=deposit(source,6_823_408);ts.cells.push(ts.cells[0].map((h:string)=>active?ctx.canonicalLedgerTransactionValue(d,h,email,'2026-10-21T00:00:00Z'):ctx.canonicalTransactionValue(d,ctx.normalizeLedgerHeader(h),email)??''));
  const read=(who=email)=>ctx.doGet({parameter:{action:'get_ledger_data',userEmail:who}});
  const events=ss.insertSheet('LEDGER_TRANSFERS');events.cells=[['id','userEmail','payload','voidedAt','createdAt']];events.failNext=true;
  const transfer=input();
  assert.equal(ctx.handleLedgerTransfer({userEmail:email,transfer},ss).success,false);
  assert.equal(events.cells.length,1);assert.equal(read().transactions.length,1,'a failed event write creates neither leg');
  const saved=ctx.doPost({postData:{contents:JSON.stringify({action:'transfer_ledger_funds',userEmail:email,transfer})}});assert.equal(saved.success,true,JSON.stringify(saved));
  assert.equal(saved.transactions.length,2);assert.equal(read().transactions.length,3);
  assert.equal(ctx.handleLedgerTransfer({userEmail:email,transfer},ss).success,true);assert.equal(events.cells.length,2);
  assert.equal(ctx.handleLedgerTransfer({userEmail:email,transfer:{...transfer,amount:1}},ss).success,false);
  assert.equal(read('other@example.test').transactions.length,0);
  assert.equal(ctx.handleCancelLedgerTransfer({userEmail:'other@example.test',transferId:transfer.id},ss).success,false);
  const editPayload={userEmail:email,transaction:{...saved.transactions[0],nativeAmount:1,amount:1}};
  assert.equal((active?ctx.handleSaveLedgerTransaction(editPayload,ss):ctx.handleSaveLedgerTransaction(editPayload)).success,false,'cannot edit half a transfer');
  const later=deposit(source,1);later.id='later';later.date='2026-11-01';
  ts.cells.push(ts.cells[0].map((h:string)=>active?ctx.canonicalLedgerTransactionValue(later,h,email,'2026-11-01T00:00:00Z'):ctx.canonicalTransactionValue(later,ctx.normalizeLedgerHeader(h),email)??''));
  assert.equal(ctx.handleCancelLedgerTransfer({userEmail:email,transferId:transfer.id},ss).success,false,'dependent later mutations prevent an unsafe cancellation');
  ts.cells.pop();
  const priorPocketRows=ps.cells.map((r:any[])=>[...r]);
  const valuation={userEmail:email,pocketId:'fund',marketValue:800_000,marketValueNative:800_000,marketValueCurrency:'IDR',manualMarketRate:1,lastPriceUpdatedAt:'2026-11-01T00:00:00Z',valuationCashflowIdr:6_823_408-10_000_000};
  const valuationResult=active?ctx.handleUpdatePocketMarketValue(valuation,ss):ctx.handleUpdateLedgerPocketMarketRate(valuation);
  assert.equal(valuationResult.success,true,JSON.stringify(valuationResult));
  assert.equal(ctx.handleCancelLedgerTransfer({userEmail:email,transferId:transfer.id},ss).success,false,'a later valuation also depends on both transfer legs');
  ps.cells=priorPocketRows;
  const deletion={userEmail:email,transactionId:saved.transactions[1].id};
  const cancelled=active?ctx.handleDeleteLedgerTransaction(deletion,ss):ctx.handleDeleteLedgerTransaction(deletion);
  assert.equal(cancelled.success,true,JSON.stringify(cancelled));assert.equal(read().transactions.length,1);
  assert.ok(events.cells[1][3],'void keeps an audit record');
  assert.equal(ctx.handleCancelLedgerTransfer({userEmail:email,transferId:transfer.id},ss).success,true,'cancellation retries are idempotent');
  assert.equal(ctx.handleLedgerTransfer({userEmail:email,transfer},ss).success,false,'do not resurrect a cancelled event');
});
