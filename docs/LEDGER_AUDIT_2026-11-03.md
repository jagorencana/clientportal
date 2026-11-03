# Wealth Ledger functional audit — 3 November 2026

## Scope and status

Code audit and synthetic regression testing cover cash/FX, nominal-IDR investments, sinking funds, physical assets, shares/ETF and gold. This is **not** certification that the production account balances match bank/broker statements. Production account data has not yet been read: direct Sheets access returned HTTP 403, native browser access timed out awaiting app permission, and the account email is pending. No production transactions were modified.

## Findings and corrections

| Priority | Finding | Correction |
|---|---|---|
| P1 | Loading recalculated IDR totals from rounded display rates | Preserve recorded totals; flag conflicting aliases instead of hiding discrepancies. |
| P1 | Legacy cache ownership could be mixed or unverifiable | Reject mixed owners and unowned legacy caches; check remote owner metadata too. |
| P1 | Missing IDs/dates and unknown types were replaced with guessed values | Preserve invalidity for diagnostics; never invent today dates, IDs or debit classification. |
| P1 | Orphan/duplicate/mismatched-currency/transfer data could be silently omitted | Read-only integrity report, source records retained, visible issue notice and local diagnostic export. |
| P1 | Historical cash/unit edits/deletions could invalidate later balances | Client and server validate end-of-day balance effects; allow corrective changes that improve bad history. |
| P1 | Rename/configuration could reclassify shares as mutual funds | Preserve existing shares/ETF type; block currency/type reinterpretation when history exists. |
| P1 | Metadata save sent a stale full master list including valuations | Save one metadata-only record; preserve valuations and anchors; use collision-resistant stable pocket IDs. |
| P1 | Failed saves/deletes/transfers/valuations could flash then roll back | Confirm before committing visible changes; preserve form state for retry. |
| P1 | Dated explicit zero valuations were rejected or dropped | Accept explicit zero with a date, while keeping blank/undated zero distinct. |
| P1 | Old unit-valued snapshots remained after later movements/full sale | Flag stale snapshots; a fully sold unit holding no longer retains its old value. |
| P1 | New investment unit-display mode was not a persisted accounting mode | New investment pockets use nominal currency; legacy unit records are flagged for reconciliation, never converted automatically. |
| P2 | Monthly historical prices/dividends/fees/cross-currency transfers lack complete event coverage | Preserve explicit limitations; do not fabricate prices, returns or income. |

Security/session enforcement is not certified by this functional PR; detailed security observations remain in a private local audit note and require a separately staged login/API review.

## Validation

- 42 tests across accounting, live-backend-source fixtures, FX, transfers, save/retry/reload, tenant cache, malformed source records and integrity checks.
- Six asset categories with 80 portfolio-history variants, preserving asset-minus-cost, category totals and realized-plus-floating invariants.
- Read-only audit CLI exercised on six synthetic pockets / 36 synthetic transactions: all reconciliation checks passed and the source file hash stayed unchanged.
- Browser QA with the actual pocket-management form: pending save locks controls, rejection preserves entered name, same ID is retained on retry, confirmed rename preserves SAHAM_ETF type.
- TypeScript, login/ledger regression checks and production build pass.
- No authenticated production-account write tests were run.

## Account-level audit procedure

Read the explicitly identified account's ledger snapshot only. Save it outside Git under the private audit folder. Run `tsx scripts/audit-ledger.ts snapshot.json report.json`. Resolve P1 issues against authoritative source records before certifying balances. An auditor exit code 2 means data/reconciliation problems exist; it does not modify the snapshot. Current FX is required for current converted valuations, and independent app/bank statements are required for external verification.

## Rollout

This branch is prepared for review; it has not been merged or deployed. Backend source is prepared privately with existing authentication/payment handlers preserved. Deploy frontend and backend together only after explicit owner approval. No production data cleanup, backfill, migration, deletions or reconciliation writes are authorized by the audit itself.
