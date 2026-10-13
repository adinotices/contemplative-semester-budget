# /chat model picker + persistent conversations — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each signed-in user choose Opus 5 / Sonnet 5 / Haiku 4.5 for /chat and keep their conversations across visits.

**Architecture:** A model allowlist module feeds both the API validation and the picker. Conversation state moves from browser memory into two Supabase tables behind a small data module keyed by the owner's email; `/api/chat` becomes "append one message to a conversation and answer it", with three small routes for list/load/delete. The chat page becomes a two-pane client component fed by the server page.

**Tech Stack:** Next.js 16 App Router, Auth.js session, supabase-js (service role), @anthropic-ai/sdk 0.115, node:test.

## Global Constraints
- Models exactly: `claude-opus-5` (default), `claude-sonnet-5`, `claude-haiku-4-5`. `max_tokens` 16000 on all.
- Conversations are private to `session.user.email`; every data call takes the email.
- Role scoping of the ledger (`buildChatContext(role)`) is unchanged.
- Branch `staging`; no prod deploy. Test files excluded from the Next tsconfig; run with `npm test`.

---

### Task 1: Model allowlist (`src/lib/chat/models.ts` + test)
**Produces:** `CHAT_MODELS`, `DEFAULT_CHAT_MODEL`, `type ChatModelId`, `isChatModel(x): x is ChatModelId`, `thinkingFor(model): Anthropic.ThinkingConfigParam | undefined`, `modelLabel(id)`.
- [ ] Write `src/lib/chat/models.test.ts`: accepts the three ids, rejects `"gpt-5"`/`undefined`; `thinkingFor("claude-haiku-4-5")` = `{type:"enabled",budget_tokens:8000}`, Opus/Sonnet → `undefined`.
- [ ] Run `npm test` → FAIL (module missing). Implement. Run → PASS.
- [ ] Remove `BUDGET_CHAT_MODEL` from `src/lib/anthropic.ts` (keep `CHAT_MODEL` for the bot). Commit.

### Task 2: Title helper (`src/lib/chat/reply.ts` + test)
**Produces:** `titleFromQuestion(q: string): string` — collapse whitespace, trim, ≤60 chars with `…`, fallback `"New chat"`.
- [ ] Add tests to `reply.test.ts`; FAIL; implement; PASS. Commit.

### Task 3: Migration `supabase/migrations/0009_chat_history.sql`
- [ ] Tables, indexes, RLS + admin policies as in the spec. Apply via Supabase `apply_migration`; verify with `select count(*) from chat_conversations`. Record in agent_context.md. Commit.

### Task 4: Data module `src/lib/data/chat-history.ts`
**Produces:** `listConversations(email)`, `getConversation(email,id)`, `getMessages(conversationId, limit=20)`, `createConversation(email,title,model)`, `appendMessage(conversationId,{role,content,model?,usage?})` (also bumps `updated_at`), `setConversationModel(id,model)`, `deleteConversation(email,id): boolean`, `lastUsedModel(email): ChatModelId|null`, `deleteMessage(id)`. Each throws on a supabase `error`.
- [ ] Implement; `tsc` clean. Commit.

### Task 5: Routes
- [ ] Rewrite `src/app/api/chat/route.ts` per the spec (validate `model` with `isChatModel`, `message` non-empty string ≤ 4000 chars; create/verify conversation; store user turn; history = `toApiMessages(prev ++ new)`; call with `thinkingFor`; store assistant turn with `completion.usage`; roll back the user turn / new conversation on failure).
- [ ] Add `src/app/api/chat/conversations/route.ts` (GET) and `src/app/api/chat/conversations/[id]/route.ts` (GET, DELETE).
- [ ] `tsc` + eslint clean. Commit.

### Task 6: UI
- [ ] `src/app/chat/page.tsx`: load `listConversations(email)` + default model server-side; pass `{ conversations, defaultModel, isAdmin }`.
- [ ] Rewrite `src/app/chat/chat-client.tsx`: sidebar/list, `?c=` sync via `useRouter().replace`, load thread on select, composer with model select, delete with `confirm()`, inline error notice, loading state.
- [ ] eslint + tsc clean; `npm test` green. Commit, push `staging`, confirm the Vercel preview is READY.

### Task 7: Docs
- [ ] agent_context.md §2t: what shipped, how to apply the migration if the connector refused, what Aditya should click. Commit, push.
