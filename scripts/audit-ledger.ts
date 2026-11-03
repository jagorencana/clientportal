import fs from 'node:fs';
import path from 'node:path';
import {auditLedger,normalizeLedgerTransaction} from '../src/utils/ledgerIntegrity';
import {normalizeTransferPocket} from '../src/utils/ledgerTransfers';
import {computeCurrencyPocketSummary,computeGlobalWealthSummary,filterValidTransactions} from '../src/utils/calculator';
import {performanceGroups} from '../src/utils/wealthPresentation';

// Read-only auditor: reads one supplied export/snapshot and writes a local report.
// Never connects to a production write endpoint or modifies the source file.
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: tsx scripts/audit-ledger.ts <snapshot.json> <report.json>');
if(path.resolve(input)===path.resolve(output))throw Error('The report must not overwrite the source snapshot.');
const raw=JSON.parse(fs.readFileSync(input,'utf8'));
const source=raw.data&&Array.isArray(raw.data.pockets)?raw.data:raw;
if(!Array.isArray(source.pockets)||!Array.isArray(source.transactions))throw Error('Snapshot must contain pockets and transactions arrays.');
const pockets=source.pockets.map((p:any)=>({...normalizeTransferPocket(p),id:String(p.id||p.pocketId||'').trim()}));
const transactions=source.transactions.map(normalizeLedgerTransaction);
const audit=auditLedger(pockets,transactions);
const rates=source.marketRates||source.fxRates||{};
const valid=filterValidTransactions(transactions);
const summaries=pockets.filter((p:any)=>p.id).map((p:any)=>computeCurrencyPocketSummary(p.currencyCode,valid,p.currencyCode==='IDR'?1:Number(rates[p.currencyCode]||0),p));
const summary=computeGlobalWealthSummary(summaries);
const classes=performanceGroups(summaries);
const perPocket=summaries.map(p=>({pocketId:p.pocketId,name:p.name,currency:p.currency,
  transactionCount:valid.filter(t=>t.pocketId===p.pocketId).length,balanceNative:p.balanceNative,
  costIdr:p.totalCostBasisIdr,estimatedValueIdr:p.marketValueIdr,estimatedFloatingIdr:p.unrealizedPnlIdr,
  recordedRealizedIdr:p.realizedPnlIdr,requiresValuationRefresh:p.valuationNeedsRefresh||false,
  missingFx:p.currency!=='IDR'&&!(Number(rates[p.currency])>0)}));
const tolerance=.01;
const checks={assetMinusCost:Math.abs(summary.totalNetWorthIdr-summary.totalCostBasisIdr-summary.totalUnrealizedPnlIdr)<tolerance,
  classAssets:Math.abs(classes.reduce((sum,p)=>sum+p.value,0)-summary.totalNetWorthIdr)<tolerance,
  classFloating:Math.abs(classes.reduce((sum,p)=>sum+p.floating,0)-summary.totalUnrealizedPnlIdr)<tolerance,
  realizedPlusFloating:Math.abs(summary.totalUnrealizedPnlIdr+(summary.totalRealizedPnlIdr||0)-(summary.totalRecordedPnlIdr||0))<tolerance};
const report={generatedAt:new Date().toISOString(),sourceFile:path.basename(input),mode:'read-only',
  scope:'Ledger consistency only; independent bank/broker valuations require source statements.',
  audit,checks,estimatedSummary:summary,classes,perPocket};
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({pockets:pockets.length,transactions:transactions.length,issues:audit.issues.length,blocking:audit.blocking,checks,report:output}));
process.exitCode=audit.blocking||Object.values(checks).some(ok=>!ok)?2:0;
