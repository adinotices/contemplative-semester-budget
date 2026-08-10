-- Adds an actual/projected distinction to transactions, mirroring the
-- Actual / Projected / Total(A+P) model used in the org's own internal
-- ledger spreadsheet. Existing rows default to 'actual' (realized cash
-- flow); 'projected' is for known-but-not-yet-paid/received amounts, kept
-- in the same table so category totals can combine them on demand rather
-- than needing a parallel table.

alter table transactions
  add column status text not null default 'actual' check (status in ('actual', 'projected'));

create index transactions_status_idx on transactions (status);
