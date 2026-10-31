import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { computeCurrencyPocketSummary } from '../src/utils/calculator';
import { investmentDeletionError, investmentMutationError, investmentPosition, isRupiahInvestment, redemptionPreview } from '../src/utils/investmentAccounting';
import type { AssetPocket, LedgerTransaction } from '../src/types/ledger';
import { formatIdNumber, parseIdNumber } from '../src/utils/numberInput';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransactionModal } from '../src/components/wealth-ledger/TransactionModal';

const pocket: AssetPocket = {
  id: 'junior', name: 'Junior Vault', currencyCode: 'IDR', instrumentType: 'SINKING_FUND',
  symbol: 'Rp', flag: '', defaultCustodian: 'Test', accentColor: 'teal',
  marketValue: 10_756_482, marketValueNative: 10_756_482, marketValueCurrency: 'IDR',
  lastPriceUpdatedAt: '2026-10-26T09:16:00.000Z',
};
const transaction = (id: string, date: string, type: 'CREDIT' | 'DEBET', amount: number): LedgerTransaction => ({
  id, date, type, pocketId: 'junior', currency: 'IDR', nativeAmount: amount,
  exchangeRate: 1, costIdr: type === 'CREDIT' ? amount : -amount,
  description: 'Synthetic test', location: 'Test', posCategory: 'Test',
});
// Net cash movements from the screenshot, using synthetic transactions only.
const history = [transaction('a', '2026-09-21', 'CREDIT', 33_843_008),
  transaction('b', '2026-10-02', 'DEBET', 519_600),
  transaction('c', '2026-10-07', 'DEBET', 30_000_000),
  transaction('d', '2026-10-21', 'CREDIT', 3_500_000)];
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);

test('actual withdrawal form renders market value as the limit for Junior Vault', () => {
  const html = renderToStaticMarkup(React.createElement(TransactionModal, {
    isOpen: true, onClose: () => {}, onSave: () => {},
    defaultPocketId: pocket.id, defaultType: 'DEBET', currentRates: {IDR: 1},
    pockets: [pocket], transactions: history, investmentAccountingReady: true,
  }));
  assert.match(html, /Nilai Investasi Tercatat/);
  assert.match(html, /Maks:\s*10\.756\.482/);
  assert.doesNotMatch(html, /Maks:\s*6\.823\.408/);
});

test('Indonesian rupiah input and prefilled valuations preserve thousands and decimal separators', () => {
  assert.equal(parseIdNumber('10.756.482'), 10_756_482);
  assert.equal(parseIdNumber('10.756.482,50'), 10_756_482.5);
  assert.equal(parseIdNumber('10000000'), 10_000_000);
  assert.equal(parseIdNumber('12.5'), 12.5);
  near(parseIdNumber(formatIdNumber(10_756_482.50, 0, 2)), 10_756_482.50);
});

const gas = vm.createContext({
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
  Utilities: { formatDate: (date: Date) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) },
});
vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), gas);
vm.runInContext(fs.readFileSync('google-apps-script/TransferHandlers.js','utf8'),gas);

test('screenshot: market value is withdrawable independently of remaining acquisition cost', () => {
  const summary = computeCurrencyPocketSummary('IDR', history, 1, pocket);
  near(summary.balanceNative, 6_823_408);
  near(summary.totalCostBasisIdr, 6_823_408);
  near(summary.marketValueIdr, 10_756_482);
  near(summary.availableBalanceNative!, 10_756_482);
  near(summary.unrealizedPnlIdr, 3_933_074);
});

test('Rp10m redemption leaves Rp756,482 and proportionate positive cost, survives reload', () => {
  const preview = redemptionPreview(pocket, history, 10_000_000);
  const redemption = { ...transaction('e', '2026-10-30', 'DEBET', 10_000_000), costBasisReleasedIdr: preview.costBasisReleasedIdr };
  const rows = JSON.parse(JSON.stringify([...history, redemption]));
  const summary = computeCurrencyPocketSummary('IDR', rows, 1, pocket);
  near(summary.marketValueIdr, 756_482);
  near(summary.totalCostBasisIdr, 6_823_408 * 756_482 / 10_756_482);
  near(summary.realizedPnlIdr!, 10_000_000 - preview.costBasisReleasedIdr);
  assert.ok(summary.totalCostBasisIdr > 0);
  assert.ok(summary.balanceNative < 0, 'net cashflow can be negative without negative investment value');
  const server = gas.investmentServerPosition(pocket, rows);
  near(server.marketValueIdr, summary.marketValueIdr);
  near(server.costBasisIdr, summary.totalCostBasisIdr);
});

test('full redemption and subsequent top-up do not resurrect the old valuation', () => {
  const preview = redemptionPreview(pocket, history, 10_756_482);
  const rows = [...history, { ...transaction('e', '2026-10-30', 'DEBET', 10_756_482), costBasisReleasedIdr: preview.costBasisReleasedIdr }];
  const empty = investmentPosition(pocket, rows);
  near(empty.marketValueIdr, 0);
  near(empty.costBasisIdr, 0);
  const topped = investmentPosition(pocket, [...rows, transaction('f', '2026-10-31', 'CREDIT', 1_000_000)]);
  near(topped.marketValueIdr, 1_000_000);
  near(topped.costBasisIdr, 1_000_000);
});

test('only a last mutation not included in a newer valuation can be deleted', () => {
  const preview = redemptionPreview(pocket, history, 10_000_000);
  const tx = {...transaction('e','2026-10-30','DEBET',10_000_000),costBasisReleasedIdr:preview.costBasisReleasedIdr};
  const rows = [...history, tx];
  assert.equal(investmentDeletionError(pocket, rows, tx.id),'');
  assert.equal(gas.investmentServerDeletionError(pocket,rows,tx.id),'');
  assert.match(investmentDeletionError(pocket,rows,'a'),/terakhir/);
  const later = [...rows,transaction('f','2026-10-31','CREDIT',1_000_000)];
  assert.match(investmentDeletionError(pocket,later,'e'),/terakhir/);
  assert.match(gas.investmentServerDeletionError(pocket,later,'e'),/terakhir/);
  assert.equal(investmentDeletionError(pocket,later,'f'),'');
  for (const date of ['2026-10-30T10:00:00Z','2026-10-31T10:00:00Z']) {
    const updated = {...pocket,lastPriceUpdatedAt:date};
    assert.match(investmentDeletionError(updated,rows,'e'),/Valuasi/);
    assert.match(gas.investmentServerDeletionError(updated,rows,'e'),/Valuasi/);
  }
  const otherPocket = {...transaction('f','2026-10-31','CREDIT',1),pocketId:'another'};
  assert.equal(investmentDeletionError(pocket,[...rows,otherPocket],'e'),'');
});

test('redemption at a loss and without a manual valuation', () => {
  const lossPocket = { ...pocket, marketValue: 5_000_000, marketValueNative: 5_000_000 };
  const loss = redemptionPreview(lossPocket, history, 1_000_000);
  near(loss.costBasisReleasedIdr, 6_823_408 / 5);
  assert.ok(loss.realizedPnlIdr < 0);
  const noValuation = { ...pocket, marketValue: undefined, marketValueNative: undefined, lastPriceUpdatedAt: undefined };
  near(investmentPosition(noValuation, history).marketValueIdr, 6_823_408);
});

test('snapshot anchor includes same-day flows once and allows subsequent valuation refresh', () => {
  const anchored = { ...pocket, valuationCashflowIdr: 6_823_408 };
  const extra = transaction('e', '2026-10-26', 'CREDIT', 1_000_000);
  near(investmentPosition(anchored, [...history, extra]).marketValueIdr, 11_756_482);
  assert.equal(investmentPosition(pocket, [...history, extra]).ambiguousLegacySnapshot, true);
  const refreshed = { ...anchored, marketValueNative: 12_000_000, valuationCashflowIdr: 7_823_408 };
  near(investmentPosition(refreshed, [...history, extra]).marketValueIdr, 12_000_000);
  near(gas.investmentServerPosition(refreshed, [...history, extra]).marketValueIdr, 12_000_000);
});

test('backend rejects overdraft, stale cost allocations and backdated redemptions', () => {
  const preview = redemptionPreview(pocket, history, 10_000_000);
  const tx = { ...transaction('e', '2026-10-30', 'DEBET', 10_000_000), costBasisReleasedIdr: preview.costBasisReleasedIdr };
  assert.equal(gas.validateInvestmentTransaction(pocket, history, { ...tx }), '');
  assert.match(gas.validateInvestmentTransaction(pocket, history, { ...tx, nativeAmount: 11_000_000 }), /melebihi/);
  assert.match(gas.validateInvestmentTransaction(pocket, history, { ...tx, costBasisReleasedIdr: 1 }), /Modal/);
  assert.match(gas.validateInvestmentTransaction(pocket, history, { ...tx, costBasisReleasedIdr: Number.NaN }), /Modal/);
  assert.match(gas.validateInvestmentTransaction(pocket, history, { ...tx, date: '2026-10-25' }), /mendahului/);
  assert.match(investmentMutationError(pocket, history, { ...tx, date: '2026-10-20' }), /berurutan/);
  const saved = [...history, tx];
  assert.equal(gas.validateInvestmentTransaction(pocket, saved, { ...tx }), '', 'identical network retries are idempotent');
  assert.match(gas.validateInvestmentTransaction(pocket, saved, { ...tx, nativeAmount: 1 }), /Modal/);
  assert.equal(investmentMutationError(pocket, saved, tx), '');
  // A second full-sized withdrawal with the previous snapshot is rejected under the server lock.
  assert.match(gas.validateInvestmentTransaction(pocket, saved, { ...tx, id: 'f' }), /melebihi/);
});

test('cash, FX, gold and share/unit accounting retain existing balance limits', () => {
  for (const [currencyCode, instrumentType] of [['IDR', 'CASH_VALAS'], ['USD', 'CASH_VALAS'], ['XAU', 'LOGAM_MULIA'], ['IDR', 'SAHAM_ETF']] as const) {
    const other = { ...pocket, currencyCode, instrumentType, marketValue: undefined, marketValueNative: undefined };
    assert.equal(isRupiahInvestment(other), false);
    const summary = computeCurrencyPocketSummary(currencyCode, history, 1, other);
    near(summary.availableBalanceNative!, 6_823_408);
  }
});

test('latest redemption can change memo or amount with a recalculated acquisition cost', () => {
  const original = {...transaction('e','2026-10-30','DEBET',10_000_000),costBasisReleasedIdr:redemptionPreview(pocket,history,10_000_000).costBasisReleasedIdr};
  const rows = [...history,original];
  const memo = {...original,description:'Corrected memo'};
  assert.equal(investmentMutationError(pocket,rows,memo),'');
  assert.equal(gas.validateInvestmentTransaction(pocket,rows,{...memo}),'');
  const preview = redemptionPreview(pocket,history,9_000_000);
  const edited = {...original,nativeAmount:9_000_000,costIdr:-9_000_000,costBasisReleasedIdr:preview.costBasisReleasedIdr};
  assert.equal(investmentMutationError(pocket,rows,edited),'');
  assert.equal(gas.validateInvestmentTransaction(pocket,rows,{...edited}),'');
  const position = investmentPosition(pocket,[...history,edited]);
  near(position.marketValueIdr,1_756_482);
  near(position.costBasisIdr,6_823_408-preview.costBasisReleasedIdr);
  near(position.realizedPnlIdr,9_000_000-preview.costBasisReleasedIdr);
  const later = [...rows,transaction('f','2026-10-31','CREDIT',1_000_000)];
  assert.match(investmentMutationError(pocket,later,memo),/terakhir/);
  assert.match(gas.validateInvestmentTransaction(pocket,later,{...memo}),/terakhir/);
});

test('accounting metadata persists as numeric Sheet columns including zero cost', () => {
  const tx = { ...transaction('e', '2026-10-30', 'DEBET', 1), costBasisReleasedIdr: 0 };
  assert.equal(gas.canonicalTransactionValue(tx, 'costbasisreleasedidr', 'qa@example.test'), 0);
  assert.equal(gas.canonicalTransactionValue({ ...tx, costBasisReleasedIdr: undefined }, 'costbasisreleasedidr', 'qa@example.test'), '');
  assert.equal(gas.canonicalPocketValue({ ...pocket, valuationCashflowIdr: -1 }, 'valuationcashflowidr', 'qa@example.test'), -1);
  const values = [['ID', 'USEREMAIL', 'COSTBASISRELEASEDIDR', 'VALUATIONCASHFLOWIDR'], ['e', 'qa@example.test', 123.456, -100]];
  const sheet = { getLastRow: () => 2, getLastColumn: () => 4, getDataRange: () => ({ getValues: () => values }) };
  const rows = gas.readTenantLedgerRows(sheet, 'qa@example.test');
  near(rows[0].costBasisReleasedIdr, 123.456);
  near(rows[0].valuationCashflowIdr, -100);
  assert.equal(gas.readTenantLedgerRows(sheet, 'another@example.test').length, 0);
});

test('client/server parity across multiple profits, losses and topups', () => {
  for (const value of [1_000_000, 6_823_408, 10_756_482, 20_000_000]) {
    const p = { ...pocket, marketValueNative: value, valuationCashflowIdr: 6_823_408 };
    const rows = [...history];
    for (let i = 0; i < 6; i++) {
      if (i % 2) rows.push(transaction(`f${i}`, `2026-11-0${i + 1}`, 'CREDIT', 100_000));
      else {
        const preview = redemptionPreview(p, rows, 100_000);
        rows.push({ ...transaction(`f${i}`, `2026-11-0${i + 1}`, 'DEBET', 100_000), costBasisReleasedIdr: preview.costBasisReleasedIdr });
      }
      const local = investmentPosition(p, rows);
      const remote = gas.investmentServerPosition(p, rows);
      near(local.marketValueIdr, remote.marketValueIdr);
      near(local.costBasisIdr, remote.costBasisIdr);
    }
  }
});

class FakeSheet {
  cells: any[][] = [];
  constructor(public name: string) {}
  getName() { return this.name; }
  deleteRow(row: number) { this.cells.splice(row - 1, 1); }
  getLastRow() { return this.cells.length; }
  getLastColumn() { return Math.max(0, ...this.cells.map(row => row.length)); }
  getRange(row: number, col: number, height = 1, width = 1) {
    return {
      getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => this.cells[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: (values: any[][]) => values.forEach((r, i) => r.forEach((value, j) => {
        this.cells[row - 1 + i] ??= [];
        this.cells[row - 1 + i][col - 1 + j] = value;
      })),
      setValue: (value: any) => {
        this.cells[row - 1] ??= [];
        this.cells[row - 1][col - 1] = value;
      },
    };
  }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
}

test('offline Apps Script handlers persist, reload, retry and reconcile investment snapshots', () => {
  const sheets = new Map<string, FakeSheet>();
  const ss = {
    getSheetByName: (name: string) => sheets.get(name),
    insertSheet: (name: string) => { const sheet = new FakeSheet(name); sheets.set(name, sheet); return sheet; },
  };
  gas.getSpreadsheet = () => ss;
  gas.createJsonResponse = (value: any) => value;
  gas.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  gas.SpreadsheetApp = { flush: () => {} };
  const pocketSheet = ss.insertSheet('LEDGER_POCKETS');
  gas.ensureLedgerPocketHeaders(pocketSheet);
  pocketSheet.cells.push(pocketSheet.cells[0].map(header => gas.canonicalPocketValue(pocket, gas.normalizeLedgerHeader(header), 'qa@example.test') ?? ''));
  const txSheet = ss.insertSheet('LEDGER_TRANSACTIONS');
  gas.ensureLedgerTransactionHeaders(txSheet);
  for (const tx of history) txSheet.cells.push(txSheet.cells[0].map(header => gas.canonicalTransactionValue(tx, gas.normalizeLedgerHeader(header), 'qa@example.test') ?? ''));
  const preview = redemptionPreview(pocket, history, 10_000_000);
  const tx = { ...transaction('e', '2026-10-30', 'DEBET', 10_000_000), costBasisReleasedIdr: preview.costBasisReleasedIdr };
  const payload = { userEmail: 'qa@example.test', transaction: tx };
  assert.equal(gas.handleSaveLedgerTransaction(payload).success, true);
  assert.equal(gas.handleSaveLedgerTransaction(payload).success, true, 'safe retry after a lost save response');
  assert.equal(txSheet.getLastRow(), history.length + 2, 'retry must not create a duplicate');
  const loaded = gas.handleGetLedgerData({ userEmail: 'qa@example.test' });
  assert.equal(loaded.investmentAccountingVersion, 1);
  const serverPosition = gas.investmentServerPosition(loaded.pockets[0], loaded.transactions);
  near(serverPosition.marketValueIdr, 756_482);
  near(serverPosition.costBasisIdr, 6_823_408 - preview.costBasisReleasedIdr);
  assert.equal(gas.handleSaveLedgerTransaction({ userEmail: 'qa@example.test', transaction: { ...tx, id: 'f' } }).success, false);
  assert.equal(gas.handleDeleteLedgerTransaction({ userEmail: 'qa@example.test', transactionId: 'a' }).success, false);
  assert.equal(gas.handleDeleteLedgerTransaction({ userEmail: 'qa@example.test', transactionId: 'e' }).success, true);
  const restored = gas.handleGetLedgerData({userEmail:'qa@example.test'});
  near(gas.investmentServerPosition(restored.pockets[0],restored.transactions).marketValueIdr,10_756_482);
  near(gas.investmentServerPosition(restored.pockets[0],restored.transactions).costBasisIdr,6_823_408);
  assert.equal(restored.transactions.length,history.length);
  assert.equal(gas.handleSaveLedgerTransaction(payload).success,true);
  const update = {
    userEmail: 'qa@example.test', pocketId: 'junior', manualMarketRate: 1,
    marketValue: 800_000, marketValueNative: 800_000, marketValueCurrency: 'IDR',
    lastPriceUpdatedAt: '2026-10-31T12:00:00Z', valuationCashflowIdr: serverPosition.cashflow,
  };
  assert.equal(gas.handleUpdateLedgerPocketMarketRate({ ...update, valuationCashflowIdr: 0 }).success, false, 'reject stale snapshot anchors');
  assert.equal(gas.handleUpdateLedgerPocketMarketRate({ ...update, valuationCashflowIdr: undefined }).success, true, 'legacy clients get a server-derived anchor');
  for (const invalidAnchor of [null, '', 'not-a-number']) {
    assert.equal(gas.handleUpdateLedgerPocketMarketRate({ ...update, valuationCashflowIdr: invalidAnchor }).success, false);
  }
  assert.equal(gas.handleUpdateLedgerPocketMarketRate(update).success, true);
  const refreshed = gas.handleGetLedgerData({ userEmail: 'qa@example.test' });
  near(gas.investmentServerPosition(refreshed.pockets[0], refreshed.transactions).marketValueIdr, 800_000);
  assert.equal(gas.handleGetLedgerData({ userEmail: 'other@example.test' }).transactions.length, 0);
});
