-- Preserve an immutable export before normalizing any financial records.
create schema ledger_import;
revoke all on schema ledger_import from public, anon, authenticated, service_role;

create table ledger_import.snapshots (
  source_sha256 text primary key check (source_sha256 ~ '^[0-9a-f]{64}$'),
  received_at timestamptz not null default now(),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload -> 'pockets') is not distinct from 'array'
    and jsonb_typeof(payload -> 'transactions') is not distinct from 'array'
  )
);

alter table ledger_import.snapshots enable row level security;
revoke all on table ledger_import.snapshots from public, anon, authenticated, service_role;
