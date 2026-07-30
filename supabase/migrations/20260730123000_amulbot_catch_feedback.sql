create table if not exists amulbot.catch_feedback (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references amulbot.alerts(id) on delete set null,
  product_sku text not null references amulbot.products(sku) on delete cascade,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  outcome text not null check (outcome in ('caught', 'missed', 'wrong_stock')),
  created_at timestamptz not null default now()
);

create index if not exists catch_feedback_outcome_created_idx
  on amulbot.catch_feedback (outcome, created_at desc);

create index if not exists catch_feedback_product_sku_idx
  on amulbot.catch_feedback (product_sku);

alter table amulbot.catch_feedback enable row level security;
revoke all on table amulbot.catch_feedback from public, anon, authenticated;
grant select, insert, update, delete on table amulbot.catch_feedback to service_role;
