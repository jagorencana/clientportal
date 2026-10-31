import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { investmentPosition, redemptionPreview } from '../src/utils/investmentAccounting';
import type { AssetPocket, LedgerTransaction } from '../src/types/ledger';

// The production source remains outside Git because it contains private configuration.
const fixture = process.env.ACTIVE_GAS_FIXTURE;
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
  const refreshed = ctx.handleGetLedgerData(ss,email);
  assert.equal(refreshed.pockets[0].valuationCashflowIdr,position.cashflow);
  assert.equal(investmentPosition({...pocket,...refreshed.pockets[0]},nativeRows).marketValueIdr,800_000);
});
