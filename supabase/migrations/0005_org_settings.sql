-- Single-row-per-key config for figures that aren't transactions but feed
-- into cash-position math — starting balance predates this ledger, budget
-- target is a manually-set goal. Missing this was a real bug: the
-- dashboard's "Net Cash Position" summed transactions only, silently
-- excluding the org's Jan 2025 starting balance and understating actual
-- cash on hand by that amount.

create table org_settings (
  key text primary key,
  value_numeric numeric,
  value_text text,
  updated_at timestamptz not null default now()
);

insert into org_settings (key, value_numeric) values
  ('starting_balance', 61352.24),
  ('remaining_balance_target', 85000.00);

alter table org_settings enable row level security;

create policy org_settings_admin_all on org_settings
  for all using (is_admin()) with check (is_admin());
