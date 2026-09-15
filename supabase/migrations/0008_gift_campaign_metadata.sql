-- Extends bcbs_gift_transactions with the campaign/classification columns that
-- appear in Melissa Gopnik's "Contemplative Semester Campaigns" export but not
-- in Erin's "GTs - YTD" report, and widens the table's coverage back to 2023.
--
-- The campaigns export is a strict superset of the GT report: for 2025-2026 it
-- reproduces all 141 rows and both yearly totals to the cent (421,332.07 and
-- 193,882.76). It adds 111 rows for 2023-2024 — the FIRST cohort — so this
-- table is no longer 2025-26 only. Nothing in the dashboard reads it, so no
-- page changes; callers that want only the current cohort must filter by date.
--
-- Campaign values seen so far, all under parent campaign "Restricted":
--   Contemplative Semester                        (donations + class registration)
--   Contemplative Semester College Accreditation  (CEU fees)
--   Contemplative Semester Cancellations          (cancellation fees, 2024 only)
alter table bcbs_gift_transactions add column if not exists parent_campaign text;
alter table bcbs_gift_transactions add column if not exists campaign_name text;
alter table bcbs_gift_transactions add column if not exists transaction_type text;
alter table bcbs_gift_transactions add column if not exists payment_method text;
alter table bcbs_gift_transactions add column if not exists registration_amount numeric(12, 2);

create index if not exists bcbs_gift_transactions_campaign_idx
  on bcbs_gift_transactions (campaign_name);
