# Wealth Ledger migration to Supabase

This phase stages original ledger exports in a private PostgreSQL schema. It does
not switch any portal reads or writes. Login, payments, and diagnostics remain
separate work.

1. Export the complete pocket and journal records for each account separately,
   including the paired transfer history. Confirm completeness against Sheets.
   The browser diagnostic export is useful for a dry run; it does not establish
   that all production rows were exported.
2. Run the read-only check. Supplying a second path also writes an import SQL
   file. Keep the input and output outside Git because they contain account data.

   ```sh
   npx tsx scripts/prepare-ledger-import.ts /private/snapshot.json
   npx tsx scripts/prepare-ledger-import.ts /private/snapshot.json /private/ledger-stage.sql
   ```

3. Apply the schema migration to an isolated Supabase staging project and execute
   the generated SQL there as a database administrator. The same export can be
   retried safely. The staging schema is inaccessible to portal clients.
4. Reconcile IDs, invalid financial fields, and unmatched pockets against the
   original records. Retain the raw export. Record every approved correction and
   compare transaction order, native balances, cost, realized P/L and valuations
   for every pocket at the same exchange rates.
5. Before promotion, map each verified account to its Supabase Auth user ID.
   Build the active ledger with tenant ownership enforced in the database.
   Move paired transfers atomically and test retries and access between accounts.
6. Compare portal results in staging before scheduling the switchover. Freeze
   writes during the final export and reconciliation. Switch traffic after
   approval and document how to reconcile any new writes before a rollback.

References: [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
