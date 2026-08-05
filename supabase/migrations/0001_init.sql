-- Contemplative Semester Budget App — initial schema
-- Implements the data model in the architecture doc (§5) plus RLS policies (§7).
-- Run against a Supabase Postgres project. Idempotent-ish: safe to re-run on a fresh DB.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- People & access
-- ============================================================================
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  role text not null check (role in ('admin', 'staff', 'viewer')) default 'viewer',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Core ledger
-- ============================================================================
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  direction text not null check (direction in ('income', 'expense')),
  category text not null,
  payee text,
  description text,
  amount numeric(12, 2) not null,
  source text not null check (source in ('internal_ledger', 'bcbs_export')) default 'internal_ledger',
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_category_idx on transactions (category);

create table if not exists bcbs_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  account_code text,
  description text,
  amount numeric(12, 2) not null,
  source_file text,
  imported_at timestamptz not null default now()
);

create table if not exists reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions (id) on delete cascade,
  bcbs_transaction_id uuid references bcbs_transactions (id) on delete cascade,
  status text not null check (status in ('matched', 'unmatched', 'disputed')) default 'unmatched',
  matched_by text,
  matched_at timestamptz,
  notes text
);

-- ============================================================================
-- Reimbursements
-- ============================================================================
create table if not exists reimbursement_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by_name text not null,
  submitted_by_email text,
  submitted_by_phone text,
  description text not null,
  amount numeric(12, 2) not null,
  receipt_url text,
  status text not null check (status in ('pending', 'approved', 'rejected', 'sent')) default 'pending',
  submitted_via text not null check (submitted_via in ('web', 'whatsapp')),
  created_at timestamptz not null default now()
);

create index if not exists reimbursement_requests_status_idx on reimbursement_requests (status);

create table if not exists reimbursement_approvals (
  id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references reimbursement_requests (id) on delete cascade,
  approval_token text not null unique,
  token_expires_at timestamptz not null,
  approved_by text,
  approved_at timestamptz,
  sent_to_accountant_at timestamptz
);

create index if not exists reimbursement_approvals_token_idx on reimbursement_approvals (approval_token);

-- ============================================================================
-- WhatsApp bot state
-- ============================================================================
create table if not exists bot_sessions (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  state_json jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  direction text not null check (direction in ('in', 'out')),
  body text,
  media_url text,
  twilio_sid text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_phone_idx on whatsapp_messages (phone_number);

-- ============================================================================
-- Program data
-- ============================================================================
create table if not exists staff_compensation (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null,
  period text not null,
  amount numeric(12, 2) not null,
  status text not null default 'pending',
  notes text
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tuition_total numeric(12, 2) not null default 0,
  tuition_paid numeric(12, 2) not null default 0,
  college_credit_fee_paid numeric(12, 2) not null default 0,
  scholarship_amount numeric(12, 2) not null default 0,
  balance_outstanding numeric(12, 2) not null default 0
);

create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('income', 'expense')),
  budget_target numeric(12, 2) not null default 0,
  notes text
);

-- ============================================================================
-- Aggregated view for general (non-admin) /chat access — §7
-- No names, no per-line detail: category totals only.
-- ============================================================================
create or replace view category_summary as
select
  category,
  direction,
  date_trunc('month', date)::date as month,
  sum(amount) as total_amount,
  count(*) as transaction_count
from transactions
group by category, direction, date_trunc('month', date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- These policies assume the app connects with the Supabase service role for
-- trusted server-side operations (API routes that have already checked the
-- caller's role in app code) and that any direct client-side / PostgREST
-- access uses a JWT carrying the caller's team_members.role as a claim
-- (custom claim `role`, wired up via a Supabase Auth Hook that looks up
-- team_members by the authenticated user's email). Treat RLS as the
-- backstop described in §7, not the only gate — app code must still avoid
-- ever handing raw admin data to a non-admin caller.

alter table team_members enable row level security;
alter table transactions enable row level security;
alter table bcbs_transactions enable row level security;
alter table reconciliation_matches enable row level security;
alter table reimbursement_requests enable row level security;
alter table reimbursement_approvals enable row level security;
alter table bot_sessions enable row level security;
alter table whatsapp_messages enable row level security;
alter table staff_compensation enable row level security;
alter table students enable row level security;
alter table budget_categories enable row level security;

-- Helper: is the current JWT caller an admin?
create or replace function is_admin() returns boolean as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$ language sql stable;

-- team_members: admins can read/write; everyone authenticated can read their own row.
create policy team_members_admin_all on team_members
  for all using (is_admin()) with check (is_admin());
create policy team_members_self_read on team_members
  for select using (email = auth.jwt() ->> 'email');

-- transactions: admin-only direct table access (general /chat must use category_summary).
create policy transactions_admin_all on transactions
  for all using (is_admin()) with check (is_admin());

create policy bcbs_transactions_admin_all on bcbs_transactions
  for all using (is_admin()) with check (is_admin());

create policy reconciliation_matches_admin_all on reconciliation_matches
  for all using (is_admin()) with check (is_admin());

-- reimbursement_requests: admins manage everything. Public inserts happen via
-- the service role from the /reimburse API route, never directly from the browser.
create policy reimbursement_requests_admin_all on reimbursement_requests
  for all using (is_admin()) with check (is_admin());

create policy reimbursement_approvals_admin_all on reimbursement_approvals
  for all using (is_admin()) with check (is_admin());

-- bot/session tables: service-role only (no direct client access at all).
create policy bot_sessions_admin_all on bot_sessions
  for all using (is_admin()) with check (is_admin());
create policy whatsapp_messages_admin_all on whatsapp_messages
  for all using (is_admin()) with check (is_admin());

-- staff_compensation & sensitive student fields: admin only per §7.
create policy staff_compensation_admin_all on staff_compensation
  for all using (is_admin()) with check (is_admin());
create policy students_admin_all on students
  for all using (is_admin()) with check (is_admin());

-- budget_categories: readable by any authenticated team member, writable by admins.
create policy budget_categories_read on budget_categories
  for select using (auth.role() = 'authenticated');
create policy budget_categories_admin_write on budget_categories
  for insert with check (is_admin());
create policy budget_categories_admin_update on budget_categories
  for update using (is_admin()) with check (is_admin());
create policy budget_categories_admin_delete on budget_categories
  for delete using (is_admin());

-- Views run with the privileges of their owner (not the invoker) unless
-- `security_invoker` is set, so category_summary intentionally bypasses the
-- admin-only RLS on `transactions` — that's how general-staff /chat gets
-- category totals without ever touching raw per-line transaction rows.
grant select on category_summary to authenticated;
