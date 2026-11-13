import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { investmentPosition, redemptionPreview } from '../src/utils/investmentAccounting';
import type { AssetPocket, LedgerTransaction } from '../src/types/ledger';

// The production source remains outside Git because it contains private configuration.
const fixture = process.env.ACTIVE_GAS_FIXTURE;

test('Shopping Budget: legacy zero valuation cells without a date do not reject a valid expense', {skip:!fixture},()=>{
  const ctx=vm.createContext({Utilities:{formatDate:(date:Date)=>new Date(date).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})}});
  vm.runInContext(fs.readFileSync(path.join(fixture!,'Kode.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(fixture!,'InvestmentAccounting.js'),'utf8'),ctx);
  const pocket={id:'shopping',currencyCode:'IDR',currency:'IDR',instrumentType:'SINKING_FUND',marketValue:0,marketValueNative:0,lastPriceUpdatedAt:''};
  const row=(id:string,date:string,amount:number)=>({id,date,pocketId:'shopping',currency:'IDR',type:'IN',amount,nativeAmount:amount,rate:1,exchangeRate:1,totalIdr:amount,costIdr:amount});
  const rows=[row('opening','2026-10-21',1_500_000),row('father','2026-11-02',5_000_000)];
  const position=ctx.investmentServerPosition(pocket,rows);
  assert.equal(position.ambiguousLegacySnapshot,false,'an undated zero cell is not a saved valuation');
  assert.equal(position.marketValueIdr,6_500_000);
  const tx={...row('expense','2026-11-03',1_500_000),type:'OUT',totalIdr:-1_500_000,costIdr:-1_500_000,costBasisReleasedIdr:1_500_000};
  assert.equal(ctx.validateInvestmentTransaction(pocket,rows,tx),'');
  const after=ctx.investmentServerPosition(pocket,[...rows,tx]);
  assert.equal(after.marketValueIdr,5_000_000);assert.equal(after.costBasisIdr,5_000_000);
  const actualZero=ctx.investmentServerPosition({...pocket,lastPriceUpdatedAt:'2026-11-03T00:00:00Z'},rows);
  assert.equal(actualZero.marketValueIdr,0,'a dated explicit zero valuation is still respected');
});
class Sheet {
  cells: any[][] = [];
  getLastRow() { return this.cells.length; }
  getLastColumn() { return Math.max(0, ...this.cells.map(r => r.length)); }
  setFrozenRows() {}
  deleteRow(row: number) { this.cells.splice(row - 1, 1); }
  getRange(row: number, col: number, height = 1, width = 1) {
    const range = {
      getValues: () => Array.from({length: height}, (_, i) => Array.from({length: width}, (_, j) => this.cells[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: (values: any[][]) => { values.forEach((r, i) => r.forEach((value, j) => {
        this.cells[row - 1 + i] ??= [];
        this.cells[row - 1 + i][col - 1 + j] = value;
      })); return range; },
      setValue: (value: any) => range.setValues([[value]]),
    };
    return range;
  }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
}

test('legacy website can save Rp30,113,208 valuation without the new cashflow field', {skip: !fixture}, () => {
  const sheets = new Map<string, Sheet>();
  const ss = {getSheetByName: (name: string) => sheets.get(name), insertSheet: (name: string) => {
    const sheet = new Sheet(); sheets.set(name, sheet); return sheet;
  }};
  const ctx = vm.createContext({
    SpreadsheetApp:{getActiveSpreadsheet: () => ss, flush: () => {}},
    LockService:{getScriptLock: () => ({waitLock: () => {},releaseLock: () => {}})},
    Utilities:{formatDate: (date: Date) => new Date(date).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})},
  });
  vm.runInContext(fs.readFileSync(path.join(fixture!, 'Kode.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(fixture!, 'InvestmentAccounting.js'), 'utf8'), ctx);
  if(fs.existsSync(path.join(fixture!,'TransferHandlers.js')))vm.runInContext(fs.readFileSync(path.join(fixture!,'TransferHandlers.js'),'utf8'),ctx);
  ctx.respondJson = (value: any) => value;
  const email = 'qa@example.test';
  const pocket = {id:'fund',name:'Reksadana',currency:'IDR',instrumentType:'REKSADANA'};
  const ps = ctx.ensureLedgerPocketSheet(ss);
  ps.cells.push(ps.cells[0].map((header: string) => ctx.pocketSyncValue(pocket,header,email,0,'','2026-10-31T00:00:00Z')));
  const ts = ctx.ensureLedgerTransactionSheet(ss);
  const tx = {id:'deposit',pocketId:'fund',date:'2026-10-30',type:'IN',amount:30_000_000,rate:1,totalIdr:30_000_000};
  ts.cells.push(ts.cells[0].map((header: string) => ctx.canonicalLedgerTransactionValue(tx,header,email,'2026-10-30T00:00:00Z') ?? ''));
  const payload = {userEmail:email,pocketId:'fund',manualMarketRate:30_113_208/30_000_000,
    marketValue:30_113_208,marketValueNative:30_113_208,marketValueCurrency:'IDR',lastPriceUpdatedAt:'2026-10-31T01:00:00Z'};
  const result = ctx.handleUpdatePocketMarketValue(payload,ss);
  assert.equal(result.success,true, JSON.stringify(result));
  const reloaded = ctx.handleGetLedgerData(ss,email);
  assert.equal(reloaded.pockets[0].marketValue,30_113_208);
  assert.equal(reloaded.pockets[0].valuationCashflowIdr,30_000_000);
  assert.equal(ctx.handleUpdatePocketMarketValue({...payload,valuationCashflowIdr:0},ss).success,false,'explicit stale anchor still rejected');
  const again = ctx.handleGetLedgerData(ss,email);
  assert.equal(again.pockets[0].marketValue,30_113_208,'failed update preserves saved valuation');
  const zero=ctx.handleUpdatePocketMarketValue({...payload,marketValue:0,marketValueNative:0,manualMarketRate:0},ss);
  assert.equal(zero.success,true,JSON.stringify(zero));
  const zeroLoaded=ctx.handleGetLedgerData(ss,email);
  assert.equal(zeroLoaded.pockets[0].marketValueNative,0);
  assert.equal(investmentPosition(zeroLoaded.pockets[0],zeroLoaded.transactions.map((t:any)=>({...t,type:t.type==='IN'?'CREDIT':'DEBET',nativeAmount:t.amount,exchangeRate:t.rate,costIdr:t.totalIdr}))).marketValueIdr,0);
});

test('deployed unified engine integration: redemption, retry, snapshot, tenant boundaries', {skip: !fixture}, () => {
  const sheets = new Map<string, Sheet>();
  const ss = { getSheetByName: (name: string) => sheets.get(name), insertSheet: (name: string) => {
    const sheet = new Sheet(); sheets.set(name, sheet); return sheet;
  }};
  const ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => {} },
    LockService: { getScriptLock: () => ({waitLock: () => {}, releaseLock: () => {}}) },
    Utilities: { formatDate: (date: Date) => new Date(date).toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'}) },
  });
  vm.runInContext(fs.readFileSync(path.join(fixture!, 'Kode.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(fixture!, 'InvestmentAccounting.js'), 'utf8'), ctx);
  if(fs.existsSync(path.join(fixture!,'TransferHandlers.js')))vm.runInContext(fs.readFileSync(path.join(fixture!,'TransferHandlers.js'),'utf8'),ctx);
  ctx.respondJson = (value: any) => value;
  const email = 'qa@example.test';
  const pocket: AssetPocket = {id:'junior', name:'Junior Vault', currencyCode:'IDR', instrumentType:'SINKING_FUND', symbol:'Rp', flag:'', defaultCustodian:'Test', accentColor:'teal', marketValue:10_756_482, marketValueNative:10_756_482, marketValueCurrency:'IDR', lastPriceUpdatedAt:'2026-10-26T09:16:00Z'};
  const pocketSheet = ctx.ensureLedgerPocketSheet(ss);
  pocketSheet.cells.push(pocketSheet.cells[0].map((header: string) => ctx.pocketSyncValue(pocket, header, email, 0, '', '2026-10-26T09:16:00Z')));
  const row = (id: string, date: string, type: 'CREDIT'|'DEBET', nativeAmount: number): LedgerTransaction => ({id,date,type,nativeAmount,pocketId:'junior', currency:'IDR', exchangeRate:1, costIdr:nativeAmount, description:'Synthetic',posCategory:'Junior Vault',location:'Test'});
  const history = [row('a','2026-09-21','CREDIT',33_843_008), row('b','2026-10-02','DEBET',519_600), row('c','2026-10-07','DEBET',30_000_000), row('d','2026-10-21','CREDIT',3_500_000)];
  const txSheet = ctx.ensureLedgerTransactionSheet(ss);
  for (const tx of history) txSheet.cells.push(txSheet.cells[0].map((header: string) => ctx.canonicalLedgerTransactionValue(tx,header,email,'2026-10-21T00:00:00Z') ?? ''));
  const preview = redemptionPreview(pocket,history,10_000_000);
  const tx = {...row('e','2026-10-30','DEBET',10_000_000),costBasisReleasedIdr:preview.costBasisReleasedIdr};
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:tx},ss).success,true);
  const retry = ctx.handleSaveLedgerTransaction({userEmail:email,transaction:tx},ss);
  assert.equal(retry.success,true, JSON.stringify(retry));
  assert.equal(txSheet.cells.length,6);
  const loaded = ctx.handleGetLedgerData(ss,email);
  assert.equal(loaded.investmentAccountingVersion,1);
  assert.equal(loaded.transactions[4].costBasisReleasedIdr,preview.costBasisReleasedIdr);
  const nativeRows = loaded.transactions.map((t: any) => ({...t,type:t.type === 'IN'?'CREDIT':'DEBET',nativeAmount:t.amount,exchangeRate:t.rate,costIdr:t.totalIdr}));
  const position = investmentPosition({...pocket,...loaded.pockets[0]},nativeRows);
  assert.equal(position.marketValueIdr,756_482);
  assert.ok(Math.abs(position.costBasisIdr - 479_876.7227664208) < 0.000001);
  const memoEdit = ctx.handleSaveLedgerTransaction({userEmail:email,transaction:{...tx,description:'Corrected memo'}},ss);
  assert.equal(memoEdit.success,true,JSON.stringify(memoEdit));
  const editedPreview = redemptionPreview(pocket,history,9_000_000);
  const editedTx = {...tx,nativeAmount:9_000_000,costIdr:-9_000_000,costBasisReleasedIdr:editedPreview.costBasisReleasedIdr};
  const amountEdit = ctx.handleSaveLedgerTransaction({userEmail:email,transaction:editedTx},ss);
  assert.equal(amountEdit.success,true,JSON.stringify(amountEdit));
  const afterEdit = ctx.handleGetLedgerData(ss,email);
  assert.equal(afterEdit.transactions.length,history.length+1,'edit must update, not insert');
  assert.equal(afterEdit.transactions.find((t:any)=>t.id==='e').amount,9_000_000);
  const afterEditRows = afterEdit.transactions.map((t:any)=>({...t,type:t.type==='IN'?'CREDIT':'DEBET',nativeAmount:t.amount,exchangeRate:t.rate,costIdr:t.totalIdr}));
  assert.equal(investmentPosition({...pocket,...afterEdit.pockets[0]},afterEditRows).marketValueIdr,1_756_482);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:tx},ss).success,true);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:{...tx,id:'f'}},ss).success,false);
  assert.equal(ctx.handleDeleteLedgerTransaction({userEmail:email,transactionId:'a'},ss).success,false);
  const removed = ctx.handleDeleteLedgerTransaction({userEmail:email,transactionId:'e'},ss);
  assert.equal(removed.success,true,JSON.stringify(removed));
  const restored = ctx.handleGetLedgerData(ss,email);
  const restoredRows = restored.transactions.map((t:any) => ({...t,type:t.type==='IN'?'CREDIT':'DEBET',nativeAmount:t.amount,exchangeRate:t.rate,costIdr:t.totalIdr}));
  const restoredPosition = investmentPosition({...pocket,...restored.pockets[0]},restoredRows);
  assert.equal(restoredPosition.marketValueIdr,10_756_482);
  assert.equal(restoredPosition.costBasisIdr,6_823_408);
  assert.equal(restoredPosition.realizedPnlIdr,0);
  assert.equal(restored.transactions.length,history.length);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:tx},ss).success,true);
  assert.equal(ctx.handleGetLedgerData(ss,'other@example.test').transactions.length,0);
  assert.equal(ctx.handleSyncLedgerPockets({userEmail:email,pockets:[{...pocket,instrumentType:'CASH_VALAS'}]},ss).success,false);
  const update = {userEmail:email,pocketId:'junior',marketValue:800_000,marketValueNative:800_000,marketValueCurrency:'IDR',manualMarketRate:1,lastPriceUpdatedAt:'2026-10-31T00:00:00Z',valuationCashflowIdr:position.cashflow};
  assert.equal(ctx.handleUpdatePocketMarketValue({...update,valuationCashflowIdr:0},ss).success,false);
  assert.equal(ctx.handleUpdatePocketMarketValue(update,ss).success,true);
  assert.equal(ctx.handleDeleteLedgerTransaction({userEmail:email,transactionId:'e'},ss).success,false,'a later valuation prevents unsafe deletion');
  const memoAfterValuation=ctx.handleSaveLedgerTransaction({userEmail:email,transaction:{...tx,description:'Historical memo only',costBasisReleasedIdr:0}},ss);
  assert.equal(memoAfterValuation.success,true,JSON.stringify(memoAfterValuation));
  const refreshed = ctx.handleGetLedgerData(ss,email);
  assert.equal(refreshed.transactions.find((t:any)=>t.id==='e').costBasisReleasedIdr,tx.costBasisReleasedIdr);
  assert.equal(refreshed.pockets[0].valuationCashflowIdr,position.cashflow);
  assert.equal(investmentPosition({...pocket,...refreshed.pockets[0]},nativeRows).marketValueIdr,800_000);
  const shopping={...pocket,id:'shopping',name:'Shopping Budget',marketValue:0,marketValueNative:0,lastPriceUpdatedAt:''};
  pocketSheet.cells.push(pocketSheet.cells[0].map((header:string)=>ctx.pocketSyncValue(shopping,header,email,1,'','2026-11-03T00:00:00Z')));
  const shoppingRows=[{...row('shop-a','2026-10-21','CREDIT',1_500_000),pocketId:'shopping'},
    {...row('shop-b','2026-11-02','CREDIT',5_000_000),pocketId:'shopping'}];
  for(const item of shoppingRows)assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:item},ss).success,true);
  const expense={...row('shop-expense','2026-11-03','DEBET',1_500_000),pocketId:'shopping',costIdr:-1_500_000,costBasisReleasedIdr:1_500_000};
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:expense},ss).success,true);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:expense},ss).success,true,'retry upserts the same id');
  const reload=ctx.handleGetLedgerData(ss,email);
  const shopRows=reload.transactions.filter((t:any)=>t.pocketId==='shopping').map((t:any)=>({...t,type:t.type==='IN'?'CREDIT':'DEBET',nativeAmount:t.amount,exchangeRate:t.rate,costIdr:t.totalIdr}));
  assert.equal(shopRows.length,3,'confirmed expense persists after reload without a duplicate');
  const shopPosition=investmentPosition({...shopping,...reload.pockets.find((p:any)=>p.id==='shopping')},shopRows);
  assert.equal(shopPosition.marketValueIdr,5_000_000);assert.equal(shopPosition.costBasisIdr,5_000_000);
  const cash={...pocket,id:'cash-usd',currencyCode:'USD',instrumentType:'CASH_VALAS',marketValue:undefined,marketValueNative:undefined,lastPriceUpdatedAt:''};
  pocketSheet.cells.push(pocketSheet.cells[0].map((header:string)=>ctx.pocketSyncValue(cash,header,email,2,'','2026-11-03T00:00:00Z')));
  const credit={...row('cash-in','2026-11-01','CREDIT',100),pocketId:cash.id,currency:'USD',exchangeRate:17000,costIdr:1_700_000};
  const debit={...row('cash-out','2026-11-02','DEBET',80),pocketId:cash.id,currency:'USD',exchangeRate:18000,costIdr:-1_440_000};
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:credit},ss).success,true);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:debit},ss).success,true);
  assert.equal(ctx.handleSaveLedgerTransaction({userEmail:email,transaction:{...credit,nativeAmount:50,costIdr:850_000}},ss).success,false,'cannot invalidate the later withdrawal');
  assert.equal(ctx.handleDeleteLedgerTransaction({userEmail:email,transactionId:credit.id},ss).success,false,'cannot remove funding required by later withdrawals');
  const beforeRename=ctx.handleGetLedgerData(ss,email).pockets.find((p:any)=>p.id==='junior');
  const renamed=ctx.handleSyncLedgerPockets({userEmail:email,pockets:[{id:'junior',name:'Renamed Junior',currency:'IDR',instrumentType:'SINKING_FUND',sortOrder:1}]},ss);
  assert.equal(renamed.success,true,JSON.stringify(renamed));
  const afterRename=ctx.handleGetLedgerData(ss,email).pockets.find((p:any)=>p.id==='junior');
  assert.equal(afterRename.marketValue,beforeRename.marketValue,'metadata sync preserves current valuation');
  assert.equal(afterRename.valuationCashflowIdr,beforeRename.valuationCashflowIdr,'metadata sync preserves valuation anchor');
  assert.equal(ctx.handleSyncLedgerPockets({userEmail:email,pockets:[{id:'cash-usd',name:'Changed currency',currency:'IDR',instrumentType:'CASH_VALAS'}]},ss).success,false,'cannot reinterpret existing USD history as IDR');
});


test('active backend saves, edits, and reloads a purchase before later asset entries', { skip: !fixture }, () => {
  const sheets = new Map<string, Sheet>();
  const ss = {getSheetByName: (name: string) => sheets.get(name), insertSheet: (name: string) => {
    const sheet = new Sheet(); sheets.set(name, sheet); return sheet;
  }};
  const ctx = vm.createContext({
    SpreadsheetApp: {getActiveSpreadsheet: () => ss, flush: () => {}},
    LockService: {getScriptLock: () => ({waitLock: () => {}, releaseLock: () => {}})},
    Utilities: {formatDate: (date: Date) => new Date(date).toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'})},
  });
  for (const file of ['Kode.js', 'InvestmentAccounting.js', 'TransferEngine.js', 'TransferHandlers.js']) {
    vm.runInContext(fs.readFileSync(path.join(fixture!,file),'utf8'),ctx);
  }
  ctx.respondJson = (value: unknown) => value;
  const email = 'history@example.test';
  const account = {id:'appliances', name:'Appliance & Gadget', currency:'IDR', instrumentType:'ASET_FISIK'};
  const sheet = ctx.ensureLedgerPocketSheet(ss);
  sheet.cells.push(sheet.cells[0].map((header:string) => ctx.pocketSyncValue(account,header,email,0,'','2026-11-12T00:00:00Z')));
  const save = (id:string,date:string,amount:number) => ctx.handleSaveLedgerTransaction({userEmail:email,transaction:{
    id,pocketId:account.id,date,type:'CREDIT',currency:'IDR',nativeAmount:amount,amount,exchangeRate:1,rate:1,totalIdr:amount,costIdr:amount,
  }},ss);
  for (const [id,date,amount] of [['later','2026-11-12',3_000_000], ['earlier','2026-11-10',2_000_000], ['earlier','2026-11-10',2_500_000], ['earlier','2026-11-09',2_500_000]] as const) {
    const result = save(id,date,amount);
    assert.notEqual(result.success,false,JSON.stringify(result));
    assert.notEqual(result.status,'error',JSON.stringify(result));
  }
  const loaded = ctx.handleGetLedgerData(ss,email);
  assert.equal(loaded.transactions.length,2);
  const earlier = loaded.transactions.find((row:any) => row.id === 'earlier');
  assert.equal(earlier.date,'2026-11-09');
  assert.equal(earlier.amount,2_500_000);
  const position = ctx.investmentServerPosition({...account,currencyCode:'IDR'},loaded.transactions);
  assert.equal(position.costBasisIdr,5_500_000);
  assert.equal(position.marketValueIdr,5_500_000);
});

test('active backend persists historical budget withdrawals, retries and edits without borrowing future funds', {skip:!fixture}, () => {
  const sheets = new Map<string, Sheet>();
  const ss = {getSheetByName:(name:string)=>sheets.get(name),insertSheet:(name:string)=>{
    const sheet = new Sheet();sheets.set(name,sheet);return sheet;
  }};
  const ctx = vm.createContext({
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush:()=>{}},
    LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
    Utilities:{formatDate:(date:Date)=>new Date(date).toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})},
  });
  for(const file of ['Kode.js','InvestmentAccounting.js','TransferEngine.js','TransferHandlers.js']) {
    vm.runInContext(fs.readFileSync(path.join(fixture!,file),'utf8'),ctx);
  }
  ctx.respondJson=(value:unknown)=>value;
  const email='history@example.test';
  const account={id:'shopping',name:'Shopping Budget',currency:'IDR',instrumentType:'SINKING_FUND'};
  const ps=ctx.ensureLedgerPocketSheet(ss);
  ps.cells.push(ps.cells[0].map((header:string)=>ctx.pocketSyncValue(account,header,email,0,'','2026-11-13T00:00:00Z')));
  const save=(id:string,date:string,type:string,amount:number)=>ctx.handleSaveLedgerTransaction({
    userEmail:email,transaction:{id,pocketId:'shopping',date,type,currency:'IDR',amount,nativeAmount:amount,
      rate:1,exchangeRate:1,totalIdr:type==='CREDIT'?amount:-amount,
      costBasisReleasedIdr:type==='CREDIT'?undefined:amount},
  },ss);
  for(const args of [
    ['opening','2026-11-01','CREDIT',5_000_000],
    ['later','2026-11-12','DEBET',1_000_000],
    ['expense','2026-11-11','DEBET',484_802],
    ['expense','2026-11-11','DEBET',484_802],
    ['expense','2026-11-11','DEBET',500_000],
  ] as const){
    const result=save(args[0],args[1],args[2],args[3]);
    assert.notEqual(result.success,false,JSON.stringify(result));
    assert.notEqual(result.status,'error',JSON.stringify(result));
  }
  const rejected=save('too-early','2026-10-31','DEBET',100);
  assert.equal(rejected.success,false);
  const loaded=ctx.handleGetLedgerData(ss,email);
  assert.equal(loaded.transactions.length,3);
  const position=ctx.investmentServerPosition({...account,currencyCode:'IDR'},loaded.transactions);
  assert.equal(position.marketValueIdr,3_500_000);
  assert.equal(position.costBasisIdr,3_500_000);
});
