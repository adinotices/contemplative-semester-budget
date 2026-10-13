-- /chat: persistent per-user conversations, per-call API spend ledger, and a
-- global spend cap. See docs/superpowers/specs/2026-10-13-chat-model-picker-and-history-design.md.
--
-- All three tables are service-role only: the app enforces ownership by
-- user_email in src/lib/data/chat-history.ts, and RLS admin-only policies are
-- the backstop, matching bot_sessions / org_settings.

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  title text not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversations_user_idx
  on chat_conversations (user_email, updated_at desc);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  usage jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_idx
  on chat_messages (conversation_id, created_at);

-- One row per Anthropic API call the app makes (chat, WhatsApp bot, receipt OCR),
-- priced at list rates when the call returns. Sum(cost_usd) is what the cap checks.
create table if not exists api_spend_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('chat', 'whatsapp', 'ocr')),
  model text not null,
  input_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null,
  user_email text,
  created_at timestamptz not null default now()
);
create index if not exists api_spend_events_created_idx on api_spend_events (created_at);

-- Global, cumulative cap on Anthropic spend from this app (Aditya, 2026-10-13: $5).
-- Raise it with: update org_settings set value_numeric = 20 where key = 'anthropic_spend_cap_usd';
insert into org_settings (key, value_numeric)
  values ('anthropic_spend_cap_usd', 5.00)
  on conflict (key) do nothing;

alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table api_spend_events enable row level security;

create policy chat_conversations_admin_all on chat_conversations
  for all using (is_admin()) with check (is_admin());
create policy chat_messages_admin_all on chat_messages
  for all using (is_admin()) with check (is_admin());
create policy api_spend_events_admin_all on api_spend_events
  for all using (is_admin()) with check (is_admin());
