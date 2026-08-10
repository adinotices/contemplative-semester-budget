-- Replaces per-item reimbursement approval with a single weekly batch:
-- one review email covering every pending reimbursement (grouped by
-- submitter, with receipts attached), one signed link, one Approve button
-- that forwards the same email to the accountant. reimbursement_approvals
-- was never used in production (confirmed empty) — safe to drop.

drop table if exists reimbursement_approvals;

create table digest_batches (
  id uuid primary key default gen_random_uuid(),
  approval_token text not null unique,
  token_expires_at timestamptz not null,
  approved_at timestamptz,
  sent_to_accountant_at timestamptz,
  created_at timestamptz not null default now()
);

create index digest_batches_token_idx on digest_batches (approval_token);

create table digest_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references digest_batches (id) on delete cascade,
  reimbursement_id uuid not null references reimbursement_requests (id) on delete cascade,
  sequence_number int not null,
  unique (batch_id, reimbursement_id)
);

create index digest_batch_items_batch_idx on digest_batch_items (batch_id);

alter table digest_batches enable row level security;
alter table digest_batch_items enable row level security;

create policy digest_batches_admin_all on digest_batches
  for all using (is_admin()) with check (is_admin());
create policy digest_batch_items_admin_all on digest_batch_items
  for all using (is_admin()) with check (is_admin());
