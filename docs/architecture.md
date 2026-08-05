# Contemplative Semester — Budget & Reimbursement App
## Full Architecture — Handoff Brief for Claude Code

This supersedes the earlier draft spec. Give this whole doc to Claude Code as project context before it starts scaffolding.

---

## 1. Goal

One system, replacing manual spreadsheets and email-chasing, that:
- Is the canonical source of truth for CS financial data (Postgres)
- Gives the team a self-serve budget dashboard + chatbot (fewer "where are we at" asks)
- Collects reimbursements via web form and WhatsApp
- Runs a weekly review-and-approve flow that auto-emails the accountant
- Eventually reconciles internal transactions against BCBS's exports item-by-item

---

## 2. System Components

```
                          ┌─────────────────────┐
                          │   Next.js App        │
                          │   (Vercel)            │
                          │                        │
     Web form ──────────▶ │  /reimburse (public)  │
     Team browser ───────▶│  /            (admin)  │
     Team browser ───────▶│  /chat        (admin)  │
     Digest email link ─▶ │  /approve/[token]      │
                          └──────────┬────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
        ┌──────────┐          ┌──────────┐           ┌──────────┐
        │ Supabase │          │  Resend  │           │  Twilio  │
        │ Postgres │          │  (email  │           │(WhatsApp │
        │ + Storage│          │ in/out)  │           │ Business │
        └──────────┘          └──────────┘           │   API)   │
              ▲                                        └────┬─────┘
              │                                             │
              │              ┌──────────────┐               │
              └──────────────┤  Claude API  │◀──────────────┘
                              │ (OCR + chat) │
                              └──────────────┘
```

Source control: GitHub. Vercel auto-deploys on push to `main` — no direct Vercel API access needed from a dev sandbox, just a git push. Supabase project/schema can be managed via the Supabase MCP connector directly during development.

---

## 3. Domain & Routing

Single app at `budget.contemplativesemester.org`.

| Route | Auth | Purpose |
|---|---|---|
| `/` | Google OAuth (allowlist) | Dashboard: cash position, budget vs actual, category breakdown |
| `/reimburse` | None (public) | Reimbursement submission form |
| `/chat` | Google OAuth (allowlist) | Chatbot, role-scoped (§7) |
| `/approve/[token]` | Signed token, no login | Weekly reimbursement approval |
| `/admin/*` | Google OAuth, admin role only | Reconciliation tools, staff comp, category management |
| `/api/whatsapp/webhook` | Twilio signature verification | Inbound WhatsApp message handler |
| `/api/email/inbound` | Resend signature verification | Inbound email handler (e.g. Meredith's exports) |

---

## 4. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend/API | Next.js on Vercel | Deploy via GitHub push |
| Database | Supabase (Postgres + Storage) | Storage holds receipt images/PDFs |
| Auth | Auth.js + Google OAuth | Email allowlist for admin routes |
| Email | Resend | Both outbound (digest, accountant emails) and inbound (parsing forwarded exports) |
| Messaging | Twilio WhatsApp Business API | Dedicated number provisioned through Twilio; ~$3–20/month at this volume (see cost notes, §9) |
| AI | Claude API | Receipt OCR/extraction, chatbot |
| Repo | GitHub | Vercel deploy trigger |

---

## 5. Data Model

```sql
-- People & access
team_members (
  id, name, email, phone, role ('admin' | 'staff' | 'viewer'),
  created_at
)

-- Core ledger
transactions (
  id, date, direction ('income'|'expense'), category, payee,
  description, amount, source ('internal_ledger'|'bcbs_export'),
  notes, receipt_url, created_at
)

bcbs_transactions (
  id, date, account_code, description, amount,
  source_file, imported_at
)

reconciliation_matches (
  id, transaction_id FK, bcbs_transaction_id FK,
  status ('matched'|'unmatched'|'disputed'),
  matched_by, matched_at, notes
)

-- Reimbursements
reimbursement_requests (
  id, submitted_by_name, submitted_by_email, submitted_by_phone,
  description, amount, receipt_url, status
  ('pending'|'approved'|'rejected'|'sent'),
  submitted_via ('web'|'whatsapp'), created_at
)

reimbursement_approvals (
  id, reimbursement_id FK, approval_token, token_expires_at,
  approved_by, approved_at, sent_to_accountant_at
)

-- WhatsApp bot state (see §8 — stateless serverless functions need this)
bot_sessions (
  id, phone_number, state_json, last_message_at
)

whatsapp_messages (
  id, phone_number, direction ('in'|'out'), body, media_url,
  twilio_sid, created_at
)

-- Program data
staff_compensation ( id, staff_name, period, amount, status, notes )
students ( id, name, tuition_total, tuition_paid, college_credit_fee_paid,
           scholarship_amount, balance_outstanding )
budget_categories ( id, name, type, budget_target, notes )
```

---

## 6. Reimbursement Flow (both channels feed the same table)

**Web:** `/reimburse` form → direct structured insert into `reimbursement_requests`, `submitted_via = 'web'`.

**WhatsApp:**
1. User texts the bot. Twilio hits `/api/whatsapp/webhook`.
2. Handler looks up (or creates) a row in `bot_sessions` keyed by phone number — this is required because Vercel functions are stateless; you cannot hold conversation state in memory between messages.
3. Claude API drives the back-and-forth (amount, description, request a photo of the receipt) using `state_json` as running context.
4. Receipt photo arrives as a Twilio media URL → downloaded, stored in Supabase Storage, passed to Claude API for OCR/extraction to cross-check the stated amount.
5. On confirmation, insert into `reimbursement_requests`, `submitted_via = 'whatsapp'`, clear the session.

**Weekly approval (both channels, same downstream flow):**
1. Scheduled job (Vercel Cron) queries `pending` requests, sends a Resend digest to Aditya with a signed link per item (`/approve/[token]`, single-use, expires in 7 days).
2. Approve → status `approved` → Resend auto-sends a formatted email to Jaycel/Melissa with payee, amount, description, receipt link → status `sent`, timestamped.
3. Reject → status `rejected`, no email sent, submitter optionally notified.

Do not implement approval via email-reply parsing — insecure and fragile. Signed links only.

---

## 7. Access Control

Enforce this in **two layers**, not just app code — use Supabase Row Level Security (RLS) policies as the backstop, since app-layer filtering alone is one bug away from leaking individual compensation/scholarship data to the wrong `/chat` request:

- `staff_compensation` and `students.scholarship_amount` / `balance_outstanding`: RLS restricts to `role = 'admin'`.
- General `/chat` access: query against a Postgres **view** that pre-aggregates by category with no names attached, not the raw tables.
- Admin `/chat` and `/admin/*`: full table access, still gated by RLS on `role = 'admin'`.

---

## 8. WhatsApp Integration Notes

- Provision the number through Twilio directly (they register it as a Business API number in the same step) — do not install the consumer WhatsApp app on it.
- A2P 10DLC does not apply — that's an SMS/carrier system, WhatsApp doesn't touch it.
- Full Meta Business Verification is not required to launch at this scale; business-initiated conversation limits (250/day unverified) are irrelevant here since almost all traffic is user-initiated.
- Cost at expected volume: roughly $3–20/month (Twilio's flat $0.005/message plus Meta's per-template fee, which becomes chargeable on service-window messages starting October 1, 2026 — budget for the higher end of that range going forward).
- Session state must live in Postgres (`bot_sessions`), not process memory — Vercel functions don't persist state between invocations.

---

## 9. Deployment Checklist (Day 1 for Claude Code)

1. Init Next.js repo, push to GitHub, connect to Vercel for auto-deploy.
2. Create Supabase project (via Supabase MCP or dashboard), run initial schema migration from §5.
3. Set up Auth.js + Google OAuth, configure admin email allowlist.
4. Add DNS: `budget.contemplativesemester.org` CNAME → Vercel.
5. Set environment variables in Vercel: Supabase keys, Resend API key, Twilio Account SID/Auth Token, Claude API key, Google OAuth client ID/secret.
6. Provision Twilio WhatsApp number, point webhook at `/api/whatsapp/webhook`.
7. Set up Resend inbound parsing address for forwarding BCBS exports (optional, phase 3+).

---

## 10. Build Order

| Phase | Scope |
|---|---|
| 1 | Schema + `/` dashboard (read-only). Migrate current ledger data. Replaces "where are we at" chat requests immediately. |
| 2 | `/reimburse` web form + weekly digest + signed approval flow + accountant email send. |
| 3 | `/chat` chatbot, role-scoped per §7. |
| 4 | WhatsApp bot (§8), feeding the same `reimbursement_requests` table as phase 2. |
| 5 | Reconciliation admin tool (`bcbs_transactions`, `reconciliation_matches`) — blocked on Meredith providing exports on a standing monthly cadence, not a technical dependency. |

---

## 11. Open Decisions Still Yours

- Signal as a second channel alongside WhatsApp — not in this plan; add later if actually requested, given the unofficial-bridge maintenance cost discussed separately.
- Exact `/chat` aggregation boundaries for the general-staff view (which categories are visible vs. suppressed).
- Whether OCR/extraction on WhatsApp receipt photos runs synchronously in the webhook response or as a background job (matters once volume grows — trivial at current scale either way).
