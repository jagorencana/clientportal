import fs from 'node:fs';
import path from 'node:path';

// Patch a private backup of the deployed unified engine. Never put that source in Git:
// it may contain credentials and payment configuration absent from the reference backend.
const [sourceDir, outputDir] = process.argv.slice(2);
if (!sourceDir || !outputDir || path.resolve(sourceDir) === path.resolve(outputDir)) throw new Error('Use distinct backup and output directories');
fs.mkdirSync(outputDir, { recursive: true });
let source = fs.readFileSync(path.join(sourceDir, 'Kode.js'), 'utf8').replace(/\r\n/g, '\n');
const original = source;
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Unexpected active backend structure: ' + before.substring(0, 65));
  source = source.replace(before, after);
}
replaceOnce('"note", "createdAt", "notes"];', '"note", "createdAt", "notes", "costBasisReleasedIdr", "currency", "posCategory", "location"];');
replaceOnce('"manualMarketRate", "lastPriceUpdatedAt", "updatedAt"\n  ];', '"manualMarketRate", "lastPriceUpdatedAt", "updatedAt", "valuationCashflowIdr"\n  ];');
replaceOnce('    manualMarketRate: find("manualMarketRate", "manualRate"),', '    valuationCashflowIdr: find("valuationCashflowIdr"),\n    manualMarketRate: find("manualMarketRate", "manualRate"),');
replaceOnce('          updatedAt: pColumns.updatedAt', '          valuationCashflowIdr: pColumns.valuationCashflowIdr >= 0 ? accountingNumber(r[pColumns.valuationCashflowIdr]) : undefined,\n          updatedAt: pColumns.updatedAt');
replaceOnce("    const notesIndex = txHeaders.indexOf('notes');", "    const notesIndex = txHeaders.indexOf('notes');\n    const releasedIndex = txHeaders.indexOf('costbasisreleasedidr');");
replaceOnce('          createdAt: r[9]', '          costBasisReleasedIdr: releasedIndex >= 0 ? accountingNumber(r[releasedIndex]) : undefined,\n          createdAt: r[9]');
replaceOnce('    transactions: transactions\n  });', '    transactions: transactions,\n    investmentAccountingVersion: 1\n  });');
replaceOnce('      service: "Jago Rencana & Wealth Ledger Unified API V4.5",', '      service: "Jago Rencana & Wealth Ledger Unified API V4.5",\n      investmentAccountingVersion: 1,');
replaceOnce('  if (key === "totalidr" || key === "costidr") return totalIdr;', '  if (key === "totalidr" || key === "costidr") return totalIdr;\n  if (key === "costbasisreleasedidr") return tx.costBasisReleasedIdr === undefined ? "" : Number(tx.costBasisReleasedIdr);');
replaceOnce('    const sheet = ensureLedgerTransactionSheet(ss);', `    const positionData = accountingTenantData(ss, userEmail);
    const activePocket = positionData.pockets.find(function(p) { return String(p.id) === pocketId; });
    const accountingError = activePocket ? validateInvestmentTransaction(activePocket, positionData.transactions, tx) : 'Kantong tidak ditemukan.';
    if (accountingError) return respondJson({ status: 'error', success: false, message: accountingError });
    const sheet = ensureLedgerTransactionSheet(ss);`);
replaceOnce('  if (key === "sortorder") return Number(pocket.sortOrder) || position + 1;', '  if (key === "sortorder") return Number(pocket.sortOrder) || position + 1;\n  if (key === "valuationcashflowidr") return pocket.valuationCashflowIdr === undefined ? existingRow : Number(pocket.valuationCashflowIdr);');
replaceOnce('    const incoming = {};', `    const accountingData = accountingTenantData(ss, targetEmail);
    for (const pocket of pockets) {
      const original = accountingData.pockets.find(function(p) { return String(p.id) === String(pocket.id || pocket.pocketId); });
      if (original && isMoneyInvestment(original) && !isMoneyInvestment(pocket) && accountingData.transactions.some(function(t) {
        return String(t.pocketId) === String(original.id) && hasReleasedCost(t);
      })) return respondJson({ status: 'error', success: false, message: 'Perubahan jenis kantong dengan pencairan tercatat memerlukan rekonsiliasi.' });
    }
    const incoming = {};`);
replaceOnce('    if (hasMarketValue && isFinite(marketValue) && marketValue >= 0) {', `    const accountingData = accountingTenantData(ss, targetEmail);
    const activePocket = accountingData.pockets.find(function(p) { return String(p.id) === pocketId; });
    if (activePocket && isMoneyInvestment(activePocket)) {
      const cashflow = investmentServerPosition(activePocket, accountingData.transactions).cashflow;
      if (data.valuationCashflowIdr !== undefined &&
          (accountingNumber(data.valuationCashflowIdr) === undefined || Math.abs(Number(data.valuationCashflowIdr) - cashflow) > 0.000001)) {
        return respondJson({ status: 'error', success: false, message: 'Mutasi berubah. Muat ulang sebelum memperbarui nilai investasi.' });
      }
      sheet.getRange(targetRow, columns.valuationCashflowIdr + 1).setValue(cashflow);
    }
    if (hasMarketValue && isFinite(marketValue) && marketValue >= 0) {`);
// Limit this replacement to the transaction-delete handler (other handlers also read rows).
const deleteStart = source.indexOf('function handleDeleteLedgerTransaction(');
const deleteEnd = source.indexOf('function handleDuitkuCallback(', deleteStart);
let deletion = source.slice(deleteStart, deleteEnd);
const deleteMarker = '    const columns = ledgerColumnIndexes(sheet);';
if (deletion.split(deleteMarker).length !== 2) throw new Error('Unexpected delete handler');
deletion = deletion.replace(deleteMarker, `    const accountingData = accountingTenantData(ss, userEmail);
    const target = accountingData.transactions.find(function(t) { return String(t.id) === transactionId; });
    const pocket = target && accountingData.pockets.find(function(p) { return String(p.id) === String(target.pocketId); });
    const deletionError = pocket ? investmentServerDeletionError(pocket, accountingData.transactions, transactionId) : '';
    if (deletionError) return respondJson({ status: 'error', success: false, message: deletionError });
    const columns = ledgerColumnIndexes(sheet);`);
source = source.slice(0, deleteStart) + deletion + source.slice(deleteEnd);

const reference = fs.readFileSync('google-apps-script/Code.gs', 'utf8');
const accounting = reference.slice(reference.indexOf('function isMoneyInvestment('), reference.indexOf('function ensureLedgerTransactionHeaders('));
if (!accounting.includes('function validateInvestmentTransaction(')) throw new Error('Reference helpers unavailable');
const adapter = `// Investment accounting adapters for the deployed unified backend.
function accountingNumber(value) {
  return value !== '' && value !== undefined && value !== null && isFinite(Number(value)) ? Number(value) : undefined;
}
function normalizePocketInstrumentType(pocket) {
  return normalizeLedgerInstrumentType(pocket.instrumentType, pocket.category, pocket.currencyCode || pocket.currency);
}
function canonicalTransactionValue(tx, key, email) {
  return canonicalLedgerTransactionValue(tx, key, email, '');
}
function accountingTenantData(ss, email) {
  const result = {};
  [ ['pockets', TAB_LEDGER_POCKETS], ['transactions', TAB_LEDGER_TRANSACTIONS] ].forEach(function(entry) {
    const sheet = ss.getSheetByName(entry[1]);
    result[entry[0]] = [];
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(normalizeLedgerHeader);
    const emailIndex = headers.indexOf('useremail') >= 0 ? headers.indexOf('useremail') : headers.indexOf('email');
    const names = {
      id:'id', transactionid:'id', pocketid:'pocketId', currency:'currency', currencycode:'currencyCode',
      instrumenttype:'instrumentType', category:'category', amount:'amount', nativeamount:'nativeAmount',
      rate:'rate', exchangerate:'exchangeRate', totalidr:'totalIdr', costidr:'costIdr', type:'type', date:'date',
      note:'note', notes:'notes', description:'description', location:'location', poscategory:'posCategory',
      marketvalue:'marketValue', marketvalueidr:'marketValue', marketvaluenative:'marketValueNative',
      marketvaluecurrency:'marketValueCurrency', lastpriceupdatedat:'lastPriceUpdatedAt',
      valuationcashflowidr:'valuationCashflowIdr', costbasisreleasedidr:'costBasisReleasedIdr'
    };
    values.slice(1).forEach(function(row) {
      if (String(row[emailIndex] || '').trim().toLowerCase() !== email) return;
      const record = {};
      headers.forEach(function(header, index) {
        const name = names[header];
        let value = row[index];
        if (!name || value === '' || value === null || value === undefined) return;
        if (value instanceof Date) value = name === 'date' ? Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd') : value.toISOString();
        record[name] = value;
      });
      result[entry[0]].push(record);
    });
  });
  return result;
}
`;
// Ensure payment/auth/reset handlers are byte-for-byte unchanged.
for (const [start, end] of [ ['function handleDuitkuCallback(', null] ]) {
  if (original.slice(original.indexOf(start)) !== source.slice(source.indexOf(start))) throw new Error('Unrelated backend code changed');
}
fs.writeFileSync(path.join(outputDir, 'Kode.js'), source);
fs.writeFileSync(path.join(outputDir, 'InvestmentAccounting.js'), adapter + '\n' + accounting);
for (const file of ['appsscript.json', '.clasp.json']) fs.copyFileSync(path.join(sourceDir, file), path.join(outputDir, file));
console.log('Patched private deployment copy; authentication and payment handlers unchanged.');
