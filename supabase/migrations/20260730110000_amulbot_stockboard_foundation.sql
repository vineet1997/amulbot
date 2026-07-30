create table if not exists amulbot.availability_observations (
  id uuid primary key default gen_random_uuid(),
  product_sku text not null references amulbot.products(sku) on delete cascade,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  status text not null check (status in ('available', 'unavailable', 'unknown')),
  checked_at timestamptz not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists availability_observations_lookup_idx
  on amulbot.availability_observations (pincode, product_sku, checked_at desc);

create table if not exists amulbot.worker_runs (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  checks_total integer not null default 0 check (checks_total >= 0),
  available_total integer not null default 0 check (available_total >= 0),
  unknown_total integer not null default 0 check (unknown_total >= 0),
  detail text
);

create index if not exists worker_runs_received_at_idx
  on amulbot.worker_runs (received_at desc);

alter table amulbot.availability_observations enable row level security;
alter table amulbot.worker_runs enable row level security;

revoke all on table amulbot.availability_observations, amulbot.worker_runs from public, anon, authenticated;
grant select, insert, update, delete on table amulbot.availability_observations, amulbot.worker_runs to service_role;
