-- category_summary (the aggregate view general-staff /chat queries, per
-- §7) summed every transaction regardless of status before the
-- actual/projected distinction existed. Left unfiltered, it would now
-- silently blend not-yet-paid/received amounts into what non-admins see
-- as real category totals. Restrict it to status = 'actual' — same as
-- the dashboard's own Category Breakdown, which is actual-only for the
-- same reason.

create or replace view category_summary
  with (security_invoker = false)
as
select
  category,
  direction,
  date_trunc('month', date)::date as month,
  sum(amount) as total_amount,
  count(*) as transaction_count
from transactions
where status = 'actual'
group by category, direction, date_trunc('month', date);
