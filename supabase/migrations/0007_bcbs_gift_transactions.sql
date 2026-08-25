-- BCBS's Salesforce gift-transaction reports (Erin Piermarini's
-- "Contemplative Semester GTs - YTD" exports).
--
-- Deliberately NOT stored in `bcbs_transactions`. Two reasons, both of which
-- would corrupt the Reconciliation page if ignored:
--
--   1. `bcbs_transactions` holds BCBS's *cash accounts* (1072 Bill.com Money
--      Out Clearing, 1100 Barre Fidelity Checking). Salesforce gift
--      transactions are the individual gifts that get batched into the 1100
--      "Receive Money — Various" deposit rows already in that table. Storing
--      both double-counts BCBS income.
--   2. getReconciliationSummary() classifies a bcbs_transactions row as income
--      only when its description contains "Receive Money" (isBcbsIncome), and
--      sums every row into one of the two buckets. Gift rows are named
--      "<Donor> - Donation - 250", so all ~605k of them would have landed on
--      the EXPENSE side of the reconciliation.
--
-- This table is a standalone record of the donor/tuition detail behind BCBS's
-- deposits. Nothing in the dashboard reads it yet; it exists so the detail is
-- queryable and so future work has a home for it.
create table if not exists bcbs_gift_transactions (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  name text not null,
  email text,
  -- Erin's column meanings, per her 2025-12-23 email: Original Amount is the
  -- amount of the transaction as made; Current Amount is Original net of any
  -- refund; Tax Receiptable is the deductible portion (0 for tuition, which
  -- buys a service); Donor Cover is the processing fee the donor opted to
  -- absorb. Donor Cover is what BCBS books as its credit-card-fee line.
  tax_receiptable_amount numeric(12, 2) not null default 0,
  donor_cover_amount numeric(12, 2) not null default 0,
  current_amount numeric(12, 2) not null default 0,
  original_amount numeric(12, 2) not null default 0,
  completion_date date not null,
  source_file text,
  report_as_of date,
  imported_at timestamptz not null default now(),
  -- Salesforce record id, available from the report *email bodies* (which link
  -- each row) but NOT from the CSV/xlsx exports, so it is null for rows sourced
  -- from an attachment.
  salesforce_id text
);

-- Idempotency key for re-importing a refreshed report. Do NOT be tempted to key
-- on (name, completion_date, original_amount) instead: the 7/31/26 report
-- contains two genuinely distinct Salesforce records for Malcom
-- Wilson-Ahlstrom, both "CS Payment", both 2026-03-12, both 2,460.00. A natural
-- key silently merges them and loses 2,460.00.
create unique index if not exists bcbs_gift_transactions_sfid_uniq
  on bcbs_gift_transactions (salesforce_id) where salesforce_id is not null;

create index if not exists bcbs_gift_transactions_date_idx
  on bcbs_gift_transactions (completion_date);

alter table bcbs_gift_transactions enable row level security;

create policy bcbs_gift_transactions_admin_all on bcbs_gift_transactions
  for all using (is_admin()) with check (is_admin());
