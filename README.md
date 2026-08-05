# Contemplative Semester — Budget & Reimbursement App

Canonical source of truth for CS financial data, a self-serve budget dashboard + chatbot,
reimbursement collection (web + WhatsApp), and a weekly review-and-approve flow. See
`docs/architecture.md` for the full handoff brief this app was built from.

## Stack

Next.js (App Router) on Vercel · Supabase (Postgres + Storage) · Auth.js + Google OAuth ·
Resend (email) · Twilio WhatsApp Business API · Claude API (OCR + chat).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

## Deployment checklist (§9 of the architecture doc)

1. **Repo → Vercel.** Push to GitHub, import the repo in Vercel, connect it for
   auto-deploy on push to `main`.
2. **Supabase.** Create a project, then run the migration:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
   ```
   or paste it into the Supabase SQL editor. This creates the full schema (§5) and the
   RLS policies backing the two-layer access control in §7.
   Also create two Storage buckets: `receipts` (public read, for reimbursement receipt
   images/PDFs) and `bcbs-exports` (private, for forwarded BCBS export attachments).
3. **Auth.js + Google OAuth.** Create an OAuth client in Google Cloud Console, set the
   redirect URI to `https://<domain>/api/auth/callback/google`, and set
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` in Vercel.
   **Allowlist**: insert each team member into `team_members` (name, email, role) —
   sign-in is rejected for any email not present in that table.
4. **DNS.** `budget.contemplativesemester.org` → CNAME → Vercel.
5. **Environment variables.** Set everything in `.env.example` in the Vercel project
   settings (Production + Preview as needed).
6. **Twilio WhatsApp.** Provision a WhatsApp Business API number through Twilio, point
   its webhook at `https://<domain>/api/whatsapp/webhook` (POST). See §8 of the
   architecture doc for cost/volume notes.
7. **Resend inbound (optional, Phase 5).** Set up an inbound-parsing address for
   forwarding BCBS exports once Meredith is providing them on a standing cadence;
   point it at `/api/email/inbound`.
8. **Vercel Cron.** `vercel.json` already schedules `/api/cron/weekly-digest` for Monday
   13:00 UTC — adjust the cron expression for the actual review cadence, and set
   `CRON_SECRET` so the route only accepts Vercel's own scheduled calls.

## Build order / phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema + `/` dashboard (read-only) | Built |
| 2 | `/reimburse` form + weekly digest + `/approve/[token]` + accountant email | Built |
| 3 | `/chat` chatbot, role-scoped per §7 | Built |
| 4 | WhatsApp bot (§8), feeding the same `reimbursement_requests` table | Built |
| 5 | Reconciliation admin tool | Scaffolded — manual matching UI is in place; bulk-import parsing for BCBS exports is stubbed pending the actual export file format (see `/api/email/inbound`) |

Migrating existing spreadsheet ledger data into `transactions`, `students`, and
`staff_compensation` is a one-time data-entry/import task, not something this app does
automatically — there's no existing export format to migrate from yet.

## Access control (§7)

Enforced in two layers:
- **App layer**: `src/middleware.ts` gates `/admin/*` to `role = 'admin'` and redirects
  unauthenticated users to `/login`; `src/lib/data/chat-context.ts` scopes what data
  `/chat` ever sees per role.
- **Database layer (backstop)**: `supabase/migrations/0001_init.sql` enables RLS on every
  table, restricts `staff_compensation` / `students` / raw `transactions` to admins, and
  exposes a `category_summary` view (no names, category-level aggregates only) for
  general-staff `/chat` access.

## Notes

- Reimbursement approval is **signed-link only** (`/approve/[token]`, single-use, 7-day
  expiry) — never implement email-reply parsing (§6).
- WhatsApp bot conversation state lives in Postgres (`bot_sessions`), not process memory,
  since Vercel functions are stateless between invocations (§8).
