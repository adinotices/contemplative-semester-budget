# Agent Context — Contemplative Semester Budget App

Working notes on what's built, what's provisioned, and what's left. Read
`docs/architecture.md` first for the full spec this was built from; this file
tracks *implementation status* against that spec, not the spec itself.

Last updated: 2026-08-10 (§2j: full codebase review — money-path, injection, and bot-state fixes — see below).

---

## 1. Code — fully scaffolded, all 5 phases

Repo: `adinotices/contemplative-semester-budget`, branch `main` (the
`claude/build-architecture-md-ua0g60` branch has the same history minus the
latest hardening commit — safe to delete or ignore).

`npm run build`, `npm run lint`, and `npx tsc --noEmit` all pass clean as of
the last commit.

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema + `/` dashboard (read-only) | Built — populated with real data, see §2b |
| 2 | `/reimburse` form + weekly digest cron + `/approve/[token]` + accountant email | Built — redesigned as one batch email, see §2a |
| 3 | `/chat`, role-scoped per §7 | Built |
| 4 | WhatsApp bot (§8), same `reimbursement_requests` table | Built |
| 5 | Reconciliation admin tool | Scaffolded — manual matching UI works; bulk-import parsing for BCBS exports is stubbed in `/api/email/inbound` pending the actual export file format |

Key files if you need to pick up implementation work:
- `supabase/migrations/0001_init.sql` — full schema + RLS (§5, §7)
- `src/auth.ts`, `src/proxy.ts` — Google OAuth + allowlist + route gating
  (Next.js 16 renamed `middleware.ts` → `proxy.ts`; this repo already uses the
  new convention)
- `src/lib/data/dashboard.ts` — dashboard queries
- `src/app/reimburse/`, `src/app/api/reimburse/` — public web form
- `src/app/api/cron/weekly-digest/`, `src/app/approve/[token]/` — approval flow
- `src/lib/data/chat-context.ts`, `src/app/api/chat/` — role-scoped chatbot
- `src/lib/whatsapp/bot.ts`, `src/app/api/whatsapp/webhook/` — WhatsApp bot
- `src/app/admin/` — categories / staff comp / reconciliation tools

## 2a. Reimbursement approval — redesigned as one batch (2026-08-10)

The originally-built per-item approval flow (§2 above, one email/link per
reimbursement) was replaced per explicit user request with a single-batch
design:

- **`src/lib/email/templates.ts`** — `reimbursementBatchEmail()`, one shared
  template for both the review email and the final accountant email: rows
  grouped by submitter name, subtotal per group, grand total, optional
  Approve button (review email only), optional greeting (accountant email
  only).
- **`src/lib/email/attachments.ts`** — downloads each receipt from Supabase
  Storage and returns real Resend attachments (not links), filename
  prefixed with the row's sequence ID (`R1-receipt.jpg`) so recipients can
  match attachments to table rows by hand.
- **`src/app/api/cron/weekly-digest/route.ts`** — queries all pending
  requests, creates **one** `digest_batches` row + one `digest_batch_items`
  row per request (storing the stable `R1, R2, ...` sequence numbers),
  sends **one** email to `APPROVER_EMAIL` with every item + all receipts
  attached + one Approve link.
- **`src/app/approve/[token]/`** — the link goes to a confirmation page
  (not a raw one-click GET) showing exactly what will be sent, with a
  single "Approve & send to accountant" button. On submit, the API route
  re-sends the *identical* grouped email (same sequence IDs, same
  attachments) to `ACCOUNTANT_EMAILS`, with a greeting ("Hey Jaycel, hope
  you're doing well...") and no button. All items still `pending` at
  approval time move straight to `sent`; anything already processed by a
  different batch is silently skipped (defensive, guards against a
  double-cron-run edge case).
- Schema: `digest_batches` + `digest_batch_items` (migration
  `0002_digest_batches.sql`) replaced the old `reimbursement_approvals`
  table (dropped — confirmed empty, never used in production).
- The `/reimburse` public form also dropped the email/phone fields per the
  same request — only name, description, amount now.
- **Not yet done**: no real end-to-end smoke test with a live email send
  (deliberately avoided creating fake data / sending real test emails to
  Jaycel or Aditya without asking first). Worth doing before relying on
  this for real: submit a real `/reimburse` request, trigger
  `/api/cron/weekly-digest` (needs the `Authorization: Bearer $CRON_SECRET`
  header), confirm the review email arrives with the grouped table +
  attachment, click through and approve, confirm Jaycel/Aditya/Maya all
  receive the final email.

## 2b. Real ledger data imported (2026-08-10)

User provided `CS_Ledger__Updated_June72026.xlsx` (org's own internal
tracking spreadsheet, explicitly *not* a BCBS export) and asked to fill the
DB from it. Imported via the Supabase Management API (`sbp_...` token),
batched raw SQL — not through the app's own insert paths.

- **674 actual + 37 projected transactions** from the "Reclassified Ledger"
  and "Projected Transactions" sheets. Every actual-side category total and
  transaction count was verified to reconcile *exactly* against the
  spreadsheet's own "Summary by Category" tab before treating the import as
  done (e.g. Compensation $224,319.52/124 txns, Total Income $615,113,
  Total Actual Expenses $475,637.58, Projected Net -$82,651.96 — all exact
  matches).
- **18 `budget_categories`** (5 income + 13 expense) from "Category
  Reference". `budget_target` is only populated for the 7 categories that
  map 1:1 onto a single line in the spreadsheet's "Budget vs Actual" tab
  (Compensation $293,316, Facilities $114,100, Food $53,000, Professional
  Services $34,500, Technology $2,500, Travel $10,000, Naropa Pass-Through
  — Prior Cohort $0). The rest (Tuition family, Individual Donations +
  Grants, Supplies + Marketing, Staff Development + Other Expense) share a
  combined or netted budget line in the source spreadsheet that the app's
  flat per-category schema can't represent — left at `budget_target = 0`
  with an explanatory `notes` value rather than fabricating a split. If
  more precision is wanted here, it needs either a product decision on how
  to model combined budget lines, or manual entry via Admin → Categories.
- **36 `staff_compensation` rows** from the "Staff Compensation Tracker"
  summary section only (one row per person per Actual-paid/Projected-
  remaining, skipping zero values) — its "TRANSACTION DETAIL" section was
  *not* imported since it's the same underlying payments already captured
  as `Compensation`-category rows in `transactions` (importing both would
  double-count).
- **`students` table intentionally left empty** — no structured per-student
  roster exists in this file; tuition/scholarship figures only appear as
  free text inside Tuition-category transaction descriptions (e.g. "Rob
  Kellet - Deposit"). Would need a separate roster source to populate.
- **Schema change**: `transactions` gained a `status` column
  (`'actual' | 'projected'`, default `'actual'`, migration
  `0003_transaction_status.sql`) specifically to hold the projected data
  without corrupting real cash-position totals — this concept didn't exist
  before this import; added at the user's explicit request ("create a new
  projected concept, recreate the schema if you need to").
- **`category_summary` view** (migration `0004_...`) was restricted to
  `status = 'actual'` — it previously summed everything unfiltered, which
  would have silently blended projected amounts into what general-staff
  `/chat` shows as real totals.
- **Dashboard** (`src/app/page.tsx`, `src/lib/data/dashboard.ts`): Budget
  vs. Actual table gained Projected and Total(A+P) columns, variance now
  computed against the total; two new stat cards (Projected Net, Projected
  Ending Balance). Category Breakdown stays actual-only by design.

## 2c. Fixed missing starting balance in cash position (2026-08-10)

User cross-checked the dashboard against the xlsx's own "BOTTOM LINE"
summary section (Starting Balance $61,352, Current Money in Bank $200,828,
Projected Remaining $118,176, Variance $33,176) and asked why the numbers
didn't match. Root cause: the dashboard's "Net Cash Position" only summed
`transactions` (actual income − actual expense = $139,475.42), silently
excluding the org's Jan 2025 starting balance that predates the ledger.
Verified fix: `$61,352.24 + ($615,113 − $475,637.58) = $200,827.66`, matching
the xlsx exactly.

- New `org_settings` key/value table (migration `0005_org_settings.sql`,
  admin-only RLS) holding `starting_balance` ($61,352.24) and
  `remaining_balance_target` ($85,000.00) — figures that aren't
  transactions but feed into cash-position math.
- `src/lib/data/dashboard.ts`: `getCashPosition()` now returns
  `startingBalance` and `currentMoneyInBank` (= starting balance + actual
  net); `getProjectedTotals()` takes the full `CashPosition` (not just a
  number) and returns `varianceVsTarget`.
- `src/app/page.tsx`: stat cards relabeled to match the xlsx's own
  terminology exactly (Starting Balance, Current Money in Bank (actuals
  only), Projected Remaining After All Obligations, Variance vs $85K
  Target) so future cross-checks are unambiguous.
- Also fixed missing `pr-3` column padding on the `/admin/categories` table
  (Type/Target/Notes were rendering with no gap between them).
- Verified: `npm run lint` and `npm run build` clean, deployed
  (`dpl_FvzeEhvmRzKqPmboXpJm5sBMzrw5`, commit `686f292`), no runtime errors.

## 2d. Admin nav restructured as Dashboard sub-tabs; manual entry removed (2026-08-10)

Per explicit request: dropped the top-level "Admin" nav item. Categories,
Staff Compensation, and Reconciliation are now shown as sub-tabs under
Dashboard (admin-only), via `src/components/dashboard-tabs.tsx` (server,
checks `session.user.role === "admin"`) wrapping
`dashboard-tabs-client.tsx` (client, `usePathname()`-based active-tab
styling). `/admin` now redirects to `/admin/categories` — routes,
middleware gating (`ADMIN_PREFIXES` in `src/proxy.ts`), and RLS are
unchanged, only the nav UI moved.

Also removed the manual data-entry UI from all three admin sub-pages (add
category form, add staff-comp form, manual reconciliation match form) —
this data now comes from the ledger import, not hand entry. Deleted the
now-unreachable `src/app/api/admin/*` routes those forms posted to and
`src/lib/require-admin.ts` (only consumer was those routes). Reconciliation
still shows the unmatched-transactions tables read-only; matching itself
would need a new UI if wanted again later.

## 2e. UI polish pass: table formatting, grouping, Staff Comp pivot, Categories rewrite, Projected tab (2026-08-10)

A run of small user-driven UI fixes to the admin/dashboard tables, done as
individual commits:

- Fixed missing `pr-3` column padding on several tables (Staff Comp,
  dashboard Category Breakdown) where columns were running together —
  same bug as the earlier categories-table fix.
- Split single mixed-type tables into separate Income/Expense tables:
  Budget Categories, dashboard Category Breakdown.
- Added subtle zebra striping (`odd:`/`even:` bg) to flat data tables for
  readability; skipped on tables that already use group headers +
  indentation, to avoid visual conflict.
- **Budget Categories page (`/admin/categories`) rewritten** from a live
  numeric table into a static **Category Reference Guide** — reproduced
  verbatim from the source spreadsheet's own "Category Reference" and
  "Budget Mapping Reference" sheets (what each ledger category means +
  how it rolls up into Budget vs Actual lines). No longer queries the DB;
  this is documentation, not live numbers. If budget_categories data
  changes, this page will NOT reflect it — it's a fixed reference.
- **Budget vs. Actual and Budget Categories tables both group categories**
  that share a combined budget line (Fundraising, Supplies & Subscriptions,
  Other (Staff Dev, Misc)) under a heading row with aggregated
  actual/projected/total/variance, member categories nested underneath.
  Grouping is derived by parsing `budget_categories.notes` for the pattern
  `under 'X' ($N combined)` — not hardcoded — so `getBudgetVsActual()` now
  also selects `notes`.
- **Staff Compensation page pivoted**: source data has one row per person
  per period-type (`"Actual to date (2025–26)"` / `"Projected remaining
  (2025–26)"`); the page now groups by (staff_name, period-year) into a
  single row per person with Actual / Projected / Actual+Projected
  columns, instead of duplicating each name across two rows.
- **New `/admin/projected` sub-tab** listing every `transactions` row with
  `status = 'projected'`, split into Income/Expense with per-section
  totals — gives admins a detail view behind the dashboard's aggregate
  "Projected Net" figure.
- Sub-tab order is now: Overview, Categories, Projected, Staff
  Compensation, Reconciliation (`src/components/dashboard-tabs-client.tsx`).

## 2f. Fixed Tuition showing "no target" (2026-08-10)

User asked why Budget vs. Actual showed "no target" for Tuition, Tuition —
Admin Fees, and Tuition — College Credit Fees. Root cause: Tuition's real
budget goal in the source spreadsheet is a **netted** figure — "Tuition
(net of Naropa fees & refunds)", $253,064 — computed as gross tuition
(Tuition + Admin Fees + College Credit Fees) minus the current-cohort
Naropa Pass-Through fee and student Refunds. The flat per-category
`budget_categories` import had no way to express that netting, so all five
underlying categories were left at `budget_target = 0`/no target.

Fix (`src/lib/data/dashboard.ts`, `applyTuitionNetting()` inside
`getBudgetVsActual()`): reproduces the spreadsheet's exact netting in code
— sums actual/projected across the three gross tuition categories, sums
actual/projected across Naropa Pass-Through (current cohort only — NOT
"— Prior Cohort", which stays separate and does net against nothing) and
Refund, subtracts, and emits one synthetic "Tuition (net)" income row with
`budgetTarget = 253064`. The five raw component categories are excluded
from the returned array (they no longer appear as their own Budget vs.
Actual rows, matching the spreadsheet, though they're untouched everywhere
else — Category Breakdown, `/admin/projected`, chat context — since those
read `transactions` directly).

Verified exactly against the spreadsheet's own Budget vs Actual tab: target
$253,064, actual $270,340, projected -$14,200, total $256,140, variance
$3,076.

Also removed the `budgetTarget === 0 ? "no target" : ...` UI branch in
`src/app/page.tsx` — after this fix, every standalone (non-grouped) row
left in the table has a real target from the spreadsheet, including a
genuine `$0` target for Naropa Pass-Through — Prior Cohort, which the old
logic was mislabeling as "no target" rather than showing its real
(unfavorable) variance.

Numbers pulled fresh from the original upload
(`/root/.claude/uploads/.../a4d35f6e-CS_Ledger__Updated_June72026.xlsx`,
`Budget vs Actual` sheet) — that file is still present in this environment
if similar spot-checks are needed again.

## 2g. Email-derived transactions added, reconciled against existing PLANNED placeholders (2026-08-10)

User connected their `contemplativesemester.org` Gmail and asked for a review of sent mail + threads with Melissa (Gopnik, BCBS ED) and Jaycel (Arcedera, BCBS Accounts Payable) from 6/7/26 to present, to find new transactions. Found ~19 candidates; user approved the confirmed ones, told me to add the uncertain ones as `projected`, and to disregard one ambiguous item (Kyan Aldrich reimbursement — dollar amount only existed in an unreadable email screenshot).

**Important discovery mid-import**: the original ledger import (§2b) already seeded a full year of forward-looking `status='projected'` placeholder rows for known recurring items (monthly Aditya compensation, quarterly Cornerstone insurance, per-retreat Shea reimbursements, etc.) — many with a `PLANNED` description prefix, some without. Blindly inserting "new" rows from email confirmations created duplicates. Caught this via a systematic amount-match sweep (no date-window restriction — the placeholder dates are service-period dates, sometimes months away from the actual payment date) against the full `transactions` table, both for my own inserts and separately for the CSV import below. Where a match existed, converted the pre-existing placeholder to `status='actual'` (correcting date/description as needed) instead of inserting; only pushed genuinely new rows. **Lesson for future imports into this table: always amount-match against the full table with no date restriction before inserting, given this seeded-placeholder pattern.**

Net result: 4 new transactions (Victoria Cary $350, Chas DiCapua $150 — actual; Brent Beresford $800, Potash Hill security deposit $1,000 income — projected, both still unconfirmed) plus 9 placeholder→actual conversions. Verified actual income held exactly at $615,113 (unchanged — confirms no double-counted income), actual expenses rose $8,183.44 to $483,821.02 net of the genuine additions.

Also incorporated `2026_Reimbursement_Request_Responses` (a 307-row Google Form export of individual receipt submissions, Jan–Jul 2026). Cross-checked every row's dollar amount against the full transactions table (again, no date window) — 300 already matched existing rows; 6 were genuinely new (4 old March receipts that had fallen through the cracks — Luc: Co-op parmesan $13.53 + gas $37.96; Michelle Chai: pizza $217.07 + EV charging $26.19, all `actual`; 2 recent unconfirmed — Mailchimp $261.37, stamp reimbursements $65.60, both `projected`).

Wrote directly via the Supabase Management API using a still-valid `sbp_...` token found in this session's own transcript (originally supplied ~8 hours earlier, tagged "1 day" validity) — no fresh token needed this time, but don't assume that'll be true next session; get a new one if the old one 401s.

## 2h. BCBS general ledger detail imported into `bcbs_transactions` (2026-08-10)

User supplied three BCBS-side finance exports: two summary P&L PDFs/xlsx (2026 YTD and lifetime-to-date through Apr 2026 — useful as context/rough sanity-check totals, not source data, since they're accrual-basis rollups) and one `General Ledger Detail` xlsx (2,021 rows, full double-entry GL for the "Contemplative Semester" location, Nov 2023–Apr 2026, organized into ~16 account sections e.g. `1072 - Bill.com Money Out Clearing`, `2000 - Accounts Payable`, `3857 - Restricted Revenue: Contemplative Semester`).

Importing all 2,021 rows verbatim would have double/triple-counted every real transaction, since double-entry GL posts each event to multiple accounts (e.g., one vendor payment appears in both `1072` and `2000 - Accounts Payable`). Extracted only the two **cash/bank accounts** — `1072 - Bill.com Money Out Clearing` (vendor payments processed via Bill.com, 415 rows) and `1100 - Barre Fidelity Checking Account` (direct deposits/receipts + a few non-Bill.com payments, 26 rows) — since those represent one row per real-world cash event, the same semantics as our own single-entry `transactions` table, and are therefore the right scope for the Reconciliation page's matching purpose. The accrual/AP/revenue-recognition accounts were deliberately excluded.

**441 rows inserted** into `bcbs_transactions` (previously empty): `date`, `account_code` (the GL account name), `description` (`{Source} — {Description}`, e.g. "Payable Payment — Payment: Potash Hill"), `amount` (positive, whichever of debit/credit was non-zero), `source_file` set to the original xlsx name. Total $1,240,237.84 across both accounts, Dec 2023–Apr 2026. No code changes needed — `/admin/reconciliation` already queries this table dynamically (`dynamic = "force-dynamic"`), so the newly imported rows show up as "Unmatched — BCBS export" immediately without a redeploy.

**Update — matching pass run (same day)**: ran an automated reconciliation pass, one-time via SQL rather than a UI feature (the Reconciliation page's manual-match form was removed in §2e; it's still read-only). Matched each `bcbs_transactions` row against `status='actual'` rows in `transactions` on: same direction (BCBS `Receive Money` → income, else expense) + exact amount + date within ±21 days. Where amount+date alone gave a unique candidate, matched directly (116); where multiple candidates tied, narrowed further by checking whether the transaction's payee last name appears in the BCBS description (+5 more, 121 total). Deliberately did **not** force a match when ambiguity remained after that — e.g. same person paid the identical amount twice in nearby months (payroll), or a generic "Various" BCBS description with several same-amount tuition payments — those 7 stay unmatched for a human to resolve by judgment, rather than risk a wrong link on real money.

Result: **121 of 441** BCBS rows matched and written to `reconciliation_matches` (`matched_by = 'claude (automated amount+date match)'`, each with a `notes` explaining which heuristic resolved it). 320 remain unmatched — mostly Dec 2023–Dec 2024 BCBS activity that predates our internal ledger's Jan 2025 start (230 of the 320), plus 83 later ones with no equal-amount internal counterpart within the window (genuinely nothing to match, or our ledger simply doesn't have that line — worth a human skim, not a code problem) and the 7 flagged-ambiguous ones above. The Reconciliation page's existing unmatched-list queries picked this up immediately with no code changes, since they already exclude anything with a non-`unmatched` row in `reconciliation_matches`.

## 2i. Discrepancy panel rebuilt on BCBS's full accrual picture (2026-08-10)

§2h's Discrepancy panel only compared our ledger against BCBS's 2 cash accounts (Bill.com + Fidelity Checking), which understated how much BCBS activity actually exists — user pushed back ("where is this 90k number coming from?") and asked to assume BCBS's export represents *all* of Contemplative Semester's money, not just those 2 accounts.

Investigated the GL Detail export's other ~14 account sections and confirmed: BCBS's income/expense-*recognition* accounts (9 of them — `3600 New Course Income`, `3857 Restricted Revenue: CS`, `4355 CS Expense`, etc.) are **accrual-basis**, not cash — they reconcile exactly to BCBS's official P&L totals when summed as `income = credit − debit`, `expense = debit − credit`. This is why BCBS's full picture is so much bigger than our cash-basis ledger: BCBS recognizes revenue (e.g. tuition) when earned/enrolled, not when cash lands.

User also supplied a short "2026" YTD P&L PDF, confirmed emailed by Melissa on 2026-07-22 and explicitly labeled `Location is Contemplative Semester` (confirming it's CS-scoped, not org-wide) — Income $700,860.46, Expense $583,543.54, Net $117,316.92.

Computed BCBS's full accrual picture for the internal ledger's window (2025-01-23–2026-07-22) by combining:
- **2025 portion**: summed the 9 CS-scoped recognition accounts from the GL Detail export, 2025-01-23–2025-12-31 → income $291,841.14, expense $177,708.04.
- **2026 portion**: the July 22 PDF's YTD figures above (superset of what the GL Detail covers for 2026, so no double-count).
- **Combined**: income $992,701.60, expense $761,251.58.

Internal cash-basis actuals for the identical window: income $615,113.00, expense $483,821.02 (ledger's own `status='actual'` rows span 2025-01-23–2026-06-25, entirely inside the window).

Since these accrual figures aren't line-item data (just verified summary totals), hardcoded them as constants in `getReconciliationSummary()` (`src/lib/data/dashboard.ts`) rather than a table import — same pattern as `TUITION_NET_TARGET` in §2f. Also added BCBS's balance-sheet cash snapshot for the CS-restricted fund ($90,453.73 as of 2026-04-30, from the lifetime P&L export's Balance Sheet section) to directly answer "what does BCBS think is in the bank."

Rebuilt `/admin/reconciliation`'s Discrepancy panel around this accrual comparison (with an explanatory note that most of the gap is accrual-vs-cash timing, not missing transactions), and reworked the "BCBS High Level Numbers" quadrant to show money-in-the-bank + accrual P&L up top, with the original 2-cash-account totals kept below for context/the unmatched-line-item detail tables, which are unchanged.

**Note on branch**: pushed straight to `main` per the established pattern documented in §1 — the `claude/build-architecture-md-ua0g60` branch remains stale/unused.

## 2j. Full codebase review + fixes (2026-08-10)

User asked for a full review for bugs. Reviewed auth, middleware, every API route, the data layer, all UI pages, the SQL/RLS migrations, and the WhatsApp bot. Schema/RLS and `/chat` role-scoping were clean; ten real defects found and all fixed in one pass (commit `b1777de`).

**The two that mattered most, both in the money path, both from the same root cause:** the Resend SDK returns `{ data, error }` and does **not** throw on API failures (verified in `node_modules/resend/dist/index.mjs` — `fetchRequest` catches non-OK responses and returns them). Both send sites ignored the result:
- `/api/approve/[token]` marked every reimbursement `status='sent'` and set `approved_at` regardless, so a failed send left the batch looking delivered *and* burned the token (later attempts hit the 410 "already been sent" branch) — unrecoverable without manual DB edits. Now checks `error`, and **claims the batch before sending** via a conditional `update(...).is("approved_at", null).select()` so two concurrent approve clicks can't both mail the accountant (the old check-then-update was a genuine race). On send failure the claim is released so the link can be retried.
- The weekly-digest cron returned `{ok:true, sent:true}` for undelivered mail; it now deletes the batch it just created, so there's no live token nobody received.

**Security:** `reimbursementBatchEmail()` interpolated `submitted_by_name`/`description` — which come from the **public, unauthenticated** `/reimburse` form (only `z.string().trim().min(1)`, no sanitization) — raw into the HTML emailed to the approver, right beside the real "Approve & send to accountant" button. Anyone on the internet could inject a second, attacker-controlled button. Now escaped via `escapeHtml()`. Separately, `/api/email/inbound` (also public) only checked that the Svix headers *existed* — never verified them — and interpolated the sender-supplied filename straight into the Storage object path. Now does real HMAC-SHA256 verification over `{id}.{timestamp}.{body}` with `timingSafeEqual` and a 5-minute replay window (implemented with Node `crypto`; the `svix` package is not a dependency and wasn't worth adding for one route), plus `safeFilename()` reducing to a flat basename. **Note: this route now requires `RESEND_INBOUND_WEBHOOK_SECRET` and 500s without it** — already in `.env.example`, not yet set on Vercel. Phase 5 is blocked on BCBS exports anyway, so set it when that unblocks.

**Correctness:** `formatCurrency` used `maximumFractionDigits: 0`, so the accountant email and approval screen rounded to whole dollars — and because subtotals were summed unrounded then rounded, displayed line items didn't add up to the displayed total (three $10.40 rows → "$10" each under a "$31" total). Now always exact cents, everywhere (this changes every currency figure in the UI, which the user approved).

**WhatsApp bot:** `state.messages.slice(-MAX_HISTORY)` ran after pushing the user turn but before the assistant turn was appended, so the array was always even-length `[user, assistant, …]`; past 20 messages the slice dropped index 0 and handed the API a transcript starting with `assistant`, which the Anthropic API rejects with a 400 (confirmed against the API reference — "First message must be `user`"). Every session longer than ~10 exchanges died, and state only resets on successful submit. Replaced with `trimHistory()`, which trims to the window and then drops forward to the first user turn; verified over 40 simulated turns (0 violations, window stays ≤20). Also, an empty model reply was pushed into `state_json` *before* the `reply || "Sorry…"` fallback, so one blank turn would persist and be replayed as an empty content block on the next message — the fallback now resolves before the push.

**Also fixed:** `hasReceipt` in both emails was derived from `receipt_url` while `buildReceiptAttachments()` silently skips failed downloads, so the accountant could see a row with no "(no receipt)" warning and no attachment — it's now derived from what actually attached (`buildReceiptAttachments` returns `sequenceLabel`; `toResendAttachments()` strips it before the API call). Roles were resolved only at sign-in, so revoking admin had no effect until the JWT expired — the `jwt` callback now re-reads `team_members` every 5 minutes (`ROLE_REFRESH_MS`), keeping existing claims on lookup error rather than downgrading a real admin on a transient failure. Dropped the now-unused `bcbsInRange` from `getReconciliationSummary()` (dead after §2i), fixed empty-state copy pointing at the removed admin page, and noted in migration 0002 that dropping `reimbursement_approvals` also drops the index/policy 0001 still declares.

## 2. Infrastructure — provisioned so far

**Supabase** (via Supabase MCP connector):
- Project `contemplative-semester-budget`, id `zarjqczhwzkumfhwylyy`,
  region `us-east-1`, free tier ($0/mo)
- URL: `https://zarjqczhwzkumfhwylyy.supabase.co`
- Migration `0001_init.sql` applied, including a follow-up hardening pass
  (pinned `search_path` on `is_admin()`; documented `category_summary`'s
  intentional `security_invoker = false`)
- Storage buckets created: `receipts` (public), `bcbs-exports` (private)
- Security advisories: clean except the expected/intentional
  `category_summary` definer-view flag (documented in the migration)

**Vercel**: project created and live.
- Project `contemplative-semester-budget`, id `prj_RRWY10QprIhaub7WzLmvGGIXFiYU`,
  under team `PausePal` (`team_KpKoA8AVXDl0z7CXKeMGpza1`)
- Git-linked to `adinotices/contemplative-semester-budget`, production branch
  `main` — pushes to `main` now auto-deploy
- First production deploy is READY, no runtime errors: `/reimburse` and
  `/login` render correctly. Live at `https://contemplative-semester-budget.vercel.app`
  (also aliased at `https://contemplative-semester-budget-pause-pal.vercel.app`)
- This was done via the Vercel REST API using a short-lived user-supplied
  token (expired after use) — the Vercel *MCP connector* available in-session
  cannot create git-linked projects or set env vars, only `deploy_to_vercel`
  (file-tree, no git link) and read/observability tools. If you need to touch
  project settings or env vars again and don't have a fresh token, that's the
  gap to plan around.

**Env vars set on Vercel** (production/preview/development):
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` (generated), `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, `ANTHROPIC_API_KEY`, `CRON_SECRET` (generated),
`NEXT_PUBLIC_APP_URL` (`https://contemplative-semester-budget.vercel.app` —
update once the real `budget.contemplativesemester.org` domain is attached).
Each of these was set via a short-lived user-supplied API token (Vercel
`vcp_...` and Supabase `sbp_...` tokens, each valid ~1hr–1day, provided
fresh each time) followed by a manual redeploy — env var changes don't
retroactively apply to an already-built deployment, so every new var
required triggering a fresh production deployment via the `/v13/deployments`
API with the current `main` SHA. See §4 for the pattern if more are needed.

**`team_members` seeded**: `aditya@contemplativesemester.org` is `admin`
and can sign in successfully (verified in production).

**Fixed a contrast bug** (commit `5c56563`): leftover create-next-app
`prefers-color-scheme: dark` CSS in `globals.css` had an unlayered
`body { color }` rule that beat the Tailwind `text-neutral-900` utility on
`<body>` per CSS cascade-layer rules, making body text near-white (and
therefore invisible on white cards) for anyone on a dark-mode OS/browser.
Removed the dark-mode override (app is a fixed light theme by design) and
added explicit `text-neutral-900` to headings that had been relying on
inherited color.

**Resend**: fully wired up and verified. Account created
(`resend.com.user967@passmail.net`), full-access key obtained,
`RESEND_API_KEY` / `APPROVER_EMAIL` / `ACCOUNTANT_EMAILS` / `EMAIL_FROM`
(`budget@contemplativesemester.org`) all set on Vercel. Domain
`contemplativesemester.org` (id `1936750a-4fea-4bcb-8e13-fa5880542163`,
DNS on Squarespace) — DKIM, SPF, and MX (`send` subdomain) records all
`verified` as of last check via `POST .../verify` + `GET` on the domain.
Email sending should work end-to-end now; hasn't been tested with a real
send yet (deliberately avoided firing a real email at Jaycel/Maya just to
test — worth a real `/reimburse` → digest → approve smoke test when
convenient). Note: there's also an unrelated Resend account/domain
(`samvara.app`, different project) that came up during setup — don't
touch it.

**Real people, for context**:
- `Jaycel.Arcedera@npcm.com` — accountant who processes reimbursements/invoices; `ACCOUNTANT_EMAILS` recipient
- `maya@contemplativesemester.org` — team member, seeded as `admin` in
  `team_members`; also cc'd via `ACCOUNTANT_EMAILS` since she's cc'd on
  reimbursements/invoices to Jaycel today
- `meredith.donaldson@npcm.com` — provides BCBS's internal numbers for
  Phase 5 reconciliation (the "Meredith" referenced throughout the
  architecture doc); Aditya says he often has to follow up with her
  repeatedly to get exports

**Twilio**: trial account connected (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
verified against `GET /2010-04-01/Accounts/{sid}.json`, set on Vercel).
Using the **WhatsApp Sandbox** for now (user chose sandbox-first over a
production sender, which needs a Meta Business Manager account they don't
have connected yet). `TWILIO_WHATSAPP_NUMBER` set to the standard shared
sandbox number `whatsapp:+14155238886` — this isn't actually read by app
code (only `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` are, for signature
verification and media download), it's informational only.

**Confirmed working end-to-end**: user joined the sandbox (`join mass-native`)
and set the webhook in the Console. Verified two ways — Twilio's own message
log showed a real bot reply ("Hi there! 👋 I'm here to help you submit a
reimbursement request...", not the generic Twilio echo), and Vercel runtime
logs showed `POST /api/whatsapp/webhook 200`. The full chain (Twilio →
webhook → Claude conversation → reply) works.

Remember the sandbox needs **re-joining every ~72h** — if the bot suddenly
stops responding, that's the first thing to check (have the user text the
join code again), not a code regression. Upgrading to a real WhatsApp
Business sender (matches the architecture doc's original intent) is a later
step once this is proven out further; needs a Meta Business Manager account
connected on Twilio's end, which the user doesn't have set up yet.

Everything — dashboard, chat, sign-in, reimbursement/approval/digest
emails, and now the WhatsApp bot — is fully live. Only a real end-to-end
reimbursement submission (web or WhatsApp) through to an actual sent
accountant email hasn't been tested yet (see §2a).

### Known env values (safe to reuse)
```
NEXT_PUBLIC_SUPABASE_URL=https://zarjqczhwzkumfhwylyy.supabase.co
SUPABASE_URL=https://zarjqczhwzkumfhwylyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcmpxY3pod3prdW1maHd5bHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDI3NDMsImV4cCI6MjEwMTc3ODc0M30.ll-ew0XslXqP2Y1kaxmiYbE77gG27nOQDF_oOqhKBTg
```
`AUTH_SECRET` and `CRON_SECRET` were generated and set directly on Vercel —
not reproduced here since they're already live; regenerate + rotate on
Vercel if they ever need to change. `SUPABASE_SERVICE_ROLE_KEY` is
intentionally not exposed via the Supabase MCP connector — pull it from the
Supabase dashboard (Project Settings → API) when setting it on Vercel.

## 3. No current blocker

Sign-in, dashboard, chat, and now email (Resend, verified domain) are all
confirmed working in production. Only Twilio/WhatsApp remains.

## 4. Next steps, roughly in order

1. **Twilio WhatsApp**: provision a WhatsApp Business API number (the Twilio
   MCP connector in-session is authless/docs-only — it can look up API
   references but can't provision anything; you need real Account SID/Auth
   Token), point its webhook at
   `https://contemplative-semester-budget.vercel.app/api/whatsapp/webhook`,
   set `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER`
   on Vercel, redeploy.
2. **DNS**: `budget.contemplativesemester.org` → CNAME → Vercel, then update
   `NEXT_PUBLIC_APP_URL` and the Google OAuth redirect URI (in Google Cloud
   Console) to match.
3. **Data migration**: one-time manual import of the existing spreadsheet
   ledger into `transactions`, `students`, `staff_compensation` — no
   existing export format to script against yet, so this is data entry, not
   an engineering task.
4. **End-to-end smoke test**: submit a real `/reimburse` request → weekly
   digest email → approve via signed link → accountant email fires →
   `/chat` respects role scoping for an admin vs. non-admin account. Add
   the WhatsApp bot round-trip once Twilio is live.

Phase 5 (reconciliation bulk import) stays blocked on Meredith providing
BCBS exports on a standing cadence — not a technical blocker, per the
architecture doc.

### Pattern for setting more env vars on Vercel

No standing API access — get a fresh short-lived Vercel token
(dashboard → Settings → Tokens) each time, then:
```bash
curl -X POST "https://api.vercel.com/v10/projects/prj_RRWY10QprIhaub7WzLmvGGIXFiYU/env?teamId=team_KpKoA8AVXDl0z7CXKeMGpza1" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '[{"key":"...","value":"...","type":"encrypted","target":["production","preview","development"]}]'
```
Then trigger a redeploy (env vars don't apply retroactively):
```bash
SHA=$(git rev-parse main)
curl -X POST "https://api.vercel.com/v13/deployments?teamId=team_KpKoA8AVXDl0z7CXKeMGpza1" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"contemplative-semester-budget\",\"project\":\"prj_RRWY10QprIhaub7WzLmvGGIXFiYU\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":1323626024,\"ref\":\"main\",\"sha\":\"$SHA\"}}"
```
Both `curl` calls need `--cacert /root/.ccr/ca-bundle.crt` if run through
the same proxied sandbox this was built in.
