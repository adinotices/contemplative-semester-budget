# Agent Context — Contemplative Semester Budget App

Working notes on what's built, what's provisioned, and what's left. Read
`docs/architecture.md` first for the full spec this was built from; this file
tracks *implementation status* against that spec, not the spec itself.

Last updated: 2026-08-08.

---

## 1. Code — fully scaffolded, all 5 phases

Repo: `adinotices/contemplative-semester-budget`, branch `main` (the
`claude/build-architecture-md-ua0g60` branch has the same history minus the
latest hardening commit — safe to delete or ignore).

`npm run build`, `npm run lint`, and `npx tsc --noEmit` all pass clean as of
the last commit.

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema + `/` dashboard (read-only) | Built |
| 2 | `/reimburse` form + weekly digest cron + `/approve/[token]` + accountant email | Built |
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

**Everything else is not provisioned yet**: no Vercel project, no Google
OAuth client, no Twilio WhatsApp number, no Resend account/domain, no
Anthropic API key wired into the deployed app. A `Vercel` MCP connector and a
`Twilio` MCP connector are both available in this session (not yet used) —
worth checking before falling back to raw API calls when picking these up.

### Known env values (safe to reuse)
```
NEXT_PUBLIC_SUPABASE_URL=https://zarjqczhwzkumfhwylyy.supabase.co
SUPABASE_URL=https://zarjqczhwzkumfhwylyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcmpxY3pod3prdW1maHd5bHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDI3NDMsImV4cCI6MjEwMTc3ODc0M30.ll-ew0XslXqP2Y1kaxmiYbE77gG27nOQDF_oOqhKBTg
```
`SUPABASE_SERVICE_ROLE_KEY` is intentionally not exposed via the Supabase MCP
connector — pull it from the Supabase dashboard (Project Settings → API)
when wiring up Vercel env vars.

## 3. Current blocker

**`team_members` is empty.** The Google OAuth `signIn` callback
(`src/auth.ts`) rejects any email not present in that table, so *no one can
sign in yet*, even once Vercel/Google OAuth are configured. This was asked
of the user (Aditya) and is still unanswered as of this writing: which
email(s) should be seeded as the first admin? Once known:
```sql
insert into team_members (name, email, role)
values ('Aditya', '<email>', 'admin');
```
Run via the Supabase MCP `execute_sql` tool or the dashboard SQL editor.

## 4. Next steps, roughly in order

1. **Resolve the blocker above** — get the admin email(s), seed
   `team_members`.
2. **Vercel**: create the project (Vercel MCP connector or the `vcp_...`
   API token already supplied), link it to this GitHub repo/`main` branch,
   set all env vars from `.env.example` (Supabase values above +
   service role key + everything else below).
3. **Google OAuth**: create an OAuth client in Google Cloud Console,
   redirect URI `https://<domain>/api/auth/callback/google`, set
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET`.
4. **Resend**: create account, verify a sending domain, get `RESEND_API_KEY`,
   set `EMAIL_FROM`, `APPROVER_EMAIL` (Aditya), `ACCOUNTANT_EMAILS`
   (Jaycel/Melissa).
5. **Twilio WhatsApp**: provision a WhatsApp Business API number (Twilio MCP
   connector is available in-session now), point its webhook at
   `https://<domain>/api/whatsapp/webhook`, set `TWILIO_ACCOUNT_SID` /
   `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER`.
6. **Anthropic**: set `ANTHROPIC_API_KEY` for `/chat` and the WhatsApp bot's
   Claude-driven conversation + receipt OCR.
7. **DNS**: `budget.contemplativesemester.org` → CNAME → Vercel.
8. **Cron**: set `CRON_SECRET`; confirm `vercel.json`'s weekly-digest
   schedule (currently Monday 13:00 UTC) matches the actual review cadence.
9. **Data migration**: one-time manual import of the existing spreadsheet
   ledger into `transactions`, `students`, `staff_compensation` — no
   existing export format to script against yet, so this is data entry, not
   an engineering task.
10. **End-to-end smoke test** once the above is live: sign in → dashboard
    loads real numbers → submit a `/reimburse` request → weekly digest email
    → approve via signed link → accountant email fires → WhatsApp bot
    round-trip → `/chat` respects role scoping for an admin vs. non-admin
    account.

Phase 5 (reconciliation bulk import) stays blocked on Meredith providing
BCBS exports on a standing cadence — not a technical blocker, per the
architecture doc.
