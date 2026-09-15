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

-- Data load (2026-09-15), applied via the Data API with the service-role key:
--   * 111 rows for 2023-2024 inserted from the campaigns export.
--   * All 141 pre-existing 2025-26 rows backfilled with campaign metadata;
--     their account_name/email from Erin's report were left untouched.
--
-- Two columns the campaigns export does not carry, and how they are set for
-- the 111 campaign-sourced rows:
--   * account_name: '' and email null — the export has no donor-identity
--     column at all. Not guessed from the transaction name.
--   * original_amount: mirrors current_amount, since the export has no
--     Original Amount column. For those rows a refund would therefore be
--     invisible (current would already be net of it). Only Erin's report
--     distinguishes the two, and only one row has ever differed.
--
-- Verified after load: 252 rows totalling 1,146,116.28, matching the export's
-- own stated total, and every row agreeing with the export across all ten
-- shared fields. Per year: 2023 2/106,400.00, 2024 109/424,501.45,
-- 2025 110/421,332.07, 2026 31/193,882.76.
