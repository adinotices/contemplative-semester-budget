# Agent Context — Contemplative Semester Budget App

Working notes on what's built, what's provisioned, and what's left. Read
`docs/architecture.md` first for the full spec this was built from; this file
tracks *implementation status* against that spec, not the spec itself.

Last updated: 2026-08-10.

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
