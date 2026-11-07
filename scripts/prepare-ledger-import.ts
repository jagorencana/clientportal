import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { auditLedger, normalizeLedgerRows } from '../src/utils/ledgerIntegrity';
import { normalizeTransferPocket } from '../src/utils/ledgerTransfers';

const [input, output, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error('Usage: tsx scripts/prepare-ledger-import.ts <snapshot.json> [private-stage.sql]');
}
if (output && path.resolve(input) === path.resolve(output)) {
  throw new Error('The SQL file must not overwrite the source export.');
}

const source = fs.readFileSync(input);
const sha = createHash('sha256').update(source).digest('hex');
const text = source.toString('utf8').replace(/^\uFEFF/, '');
const snapshot = JSON.parse(text);
assert.ok(Array.isArray(snapshot.pockets) && Array.isArray(snapshot.transactions),
  'Export must include complete pockets and transactions arrays.');
const rows = [...snapshot.pockets, ...snapshot.transactions];
assert.ok(rows.every(row => row && typeof row === 'object' && !Array.isArray(row)),
  'Export contains a malformed row.');
const owners = new Set(rows.flatMap(row =>
  [row.userEmail, row.tenantEmail, row.email]
    .map(value => String(value ?? '').trim().toLowerCase()).filter(Boolean)));
assert.equal(owners.size, 1, 'Each export must identify exactly one account.');

const pockets = snapshot.pockets.map((row: Record<string, unknown>) => ({
  ...normalizeTransferPocket(row),
  id: String(row.id ?? row.pocketId ?? '').trim(),
}));
const transactions = normalizeLedgerRows(pockets, snapshot.transactions);
const audit = auditLedger(pockets, transactions);
const findings: Record<string, number> = {};
for (const issue of audit.issues) findings[issue.code] = (findings[issue.code] ?? 0) + 1;

if (output) {
  // The SQL is an opt-in local artifact. Hex encoding keeps the export contents
  // out of SQL syntax and the fingerprint makes an exact retry idempotent.
  const hex = Buffer.from(text, 'utf8').toString('hex');
  fs.writeFileSync(output, [
    'begin;',
    'insert into ledger_import.snapshots (source_sha256, payload)',
    `values ('${sha}', convert_from(decode('${hex}', 'hex'), 'UTF8')::jsonb)`,
    'on conflict (source_sha256) do nothing;',
    'commit;',
    '',
  ].join('\n'), { flag: 'wx' });
}

console.log(JSON.stringify({
  sourceSha256: sha,
  pockets: pockets.length,
  transactions: transactions.length,
  findings,
  readyForPromotion: false,
  privateStagingSqlPrepared: Boolean(output),
}, null, 2));
