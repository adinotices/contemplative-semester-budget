# /chat: model picker + persistent per-user conversations — design (2026-10-13)

Approved by Aditya ("go", all defaults) after the empty-reply fix in §2s of agent_context.md.

## Goals
- Each user can pick which Claude model answers: Opus 5 (default), Sonnet 5, Haiku 4.5.
- Conversations persist per signed-in user: list, resume, start new, delete.

## Non-goals (YAGNI)
- Admins reading other users' chats. Conversations are private to the owner email.
- Rename, export, search, sharing. Streaming responses.

## Model picker
- `src/lib/chat/models.ts` is the single allowlist: id, label, cost hint, and the
  per-model `thinking` setting. Opus 5 / Sonnet 5 use their default adaptive
  thinking; Haiku 4.5 gets `{ type: "enabled", budget_tokens: 8000 }` so its
  answers are also reasoned, just cheaper. `max_tokens` stays 16000 for all.
- The picker is a `<select>` in the composer. The chosen model is stored on the
  conversation (`chat_conversations.model`) and on every assistant message
  (`chat_messages.model`), so switching mid-conversation is allowed and auditable.
- Default for a new conversation = the model of the user's most recently updated
  conversation, else Opus 5. No new preference column.
- The WhatsApp bot keeps `CHAT_MODEL` (Sonnet 5); untouched.

## Persistence
Migration `supabase/migrations/0009_chat_history.sql`:
- `chat_conversations(id uuid pk, user_email text, title text, model text,
  created_at, updated_at)`, index on `(user_email, updated_at desc)`.
- `chat_messages(id uuid pk, conversation_id uuid fk cascade, role in
  ('user','assistant'), content text, model text null, usage jsonb null,
  created_at)`, index on `(conversation_id, created_at)`.
- RLS enabled, `*_admin_all` policies like the other service-role-only tables.
  Ownership is enforced in `src/lib/data/chat-history.ts` by `user_email` on
  every read/write (the app uses the service role, same as the rest of the app).
- Title = first question, whitespace-collapsed, cut to 60 chars with "…".

## API
- `POST /api/chat` body `{ conversationId?: string, model: ChatModelId, message: string }`
  → `{ reply, conversationId, model }`. Creates the conversation on first message.
  History is loaded server-side (last 20 messages of that conversation); the
  browser never sends history. On a model error the just-stored user message
  (and a conversation it just created) is removed so the UI and DB agree.
  Errors are JSON with status codes as today.
- `GET /api/chat/conversations` → `{ conversations: [{id,title,model,updatedAt}], defaultModel }`.
- `GET /api/chat/conversations/[id]` → `{ conversation, messages: [{role,content,model,createdAt}] }`; 404 if not the caller's.
- `DELETE /api/chat/conversations/[id]` → 204; 404 if not the caller's.
- All routes require a session; role scoping of the ledger context is unchanged.

## UI (`src/app/chat`)
- Server page loads the user's conversation list + default model and passes them
  to the client component, which keeps `?c=<id>` in the URL for deep links.
- Desktop: left sidebar (New chat, list with title + relative date, active row
  highlighted). Phone: the list collapses into a `<select>` above the thread plus
  a New button. Delete (with `confirm()`) sits in the thread header.
- Composer: model `<select>` (label + cost hint), text input, Send. Greeting is
  static copy when the thread is empty, not a stored message.
- Errors render as an inline notice under the thread, not as a fake assistant turn.

## Testing
- `node --test`: model allowlist + thinking config, `titleFromQuestion`, history
  windowing (existing `toApiMessages`).
- ESLint + `tsc --noEmit` locally; Vercel builds the `staging` preview; Aditya
  clicks through (Google sign-in required). Migration applied via the Supabase
  connector, else a paste block for Aditya.
