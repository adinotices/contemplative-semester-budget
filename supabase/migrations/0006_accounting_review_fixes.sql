-- Data corrections from the 2026-08-10 accounting review.
--
-- Two independent problems, both found by reconciling the app against the
-- source ledger and BCBS's exports:
--
-- 1. staff_compensation was imported as a frozen June 7 2026 snapshot and
--    never updated when later transactions were imported, so the Staff
--    Compensation tab disagreed with the Compensation line on Budget vs.
--    Actual by $2,500 (actual) and $1,200 (projected). Every difference is
--    attributable to a specific person and a specific ledger row, so this
--    reconciles rather than overwrites:
--      +2,000  Aditya Aswani  June compensation, projected -> actual
--        +350  Victoria Cary  mentoring, absent from the snapshot entirely
--        +150  Chas DiCapua   3 further mentoring hours
--        +800  Brent Beresford  new projected, absent from the snapshot
--    After this, staff_compensation totals 226,819.52 actual / 59,221.79
--    projected, matching the Compensation category in transactions exactly.
--
-- 2. A projected income row was filed under a category with no
--    budget_categories entry. getBudgetVsActual() builds its rows from
--    budget_categories, so the $1,000 was silently dropped from that table
--    while still counting toward the dashboard's Projected Net.

begin;

-- 1. staff_compensation reconciliation
update staff_compensation set amount = amount + 2000
  where staff_name = 'Aditya Aswani' and period like 'Actual%';
update staff_compensation set amount = amount - 2000
  where staff_name = 'Aditya Aswani' and period like 'Projected%';
update staff_compensation set amount = amount + 150
  where staff_name = 'Chas DiCapua' and period like 'Actual%';

-- Period labels carry an en dash; copy them off an existing row rather than
-- retyping so the pivot on the Staff Compensation page keeps grouping.
insert into staff_compensation (staff_name, period, amount, status, notes)
select 'Victoria Cary', period, 350, 'paid',
       'Mentoring hours (7 hrs, mentoring Angela) - confirmed after the June 7 snapshot'
  from staff_compensation where period like 'Actual%' limit 1;

insert into staff_compensation (staff_name, period, amount, status, notes)
select 'Brent Beresford', period, 800, 'pending',
       'Additional one-on-one mentoring and group insight dialogue - not yet confirmed paid'
  from staff_compensation where period like 'Projected%' limit 1;

-- 2. orphaned category
insert into budget_categories (name, type, budget_target, notes)
values ('Security Deposit Refund', 'income', 0,
        'Refundable Potash Hill security deposit - not program revenue, so no budget target.')
on conflict (name) do nothing;

commit;

-- Verification (expect both sides equal, and no rows returned by the second):
--
--   select case when period like 'Actual%' then 'actual' else 'projected' end kind,
--          sum(amount)
--     from staff_compensation group by 1;
--   -- expect actual 226819.52, projected 59221.79
--
--   select distinct t.category
--     from transactions t
--     left join budget_categories b on b.name = t.category
--    where b.name is null;
--   -- expect zero rows
