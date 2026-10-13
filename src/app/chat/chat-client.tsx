"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CHAT_MODELS, modelLabel, type ChatModelId } from "@/lib/chat/models";
import type { ConversationSummary, StoredMessage } from "@/lib/data/chat-history";

type ThreadMessage = Pick<StoredMessage, "role" | "content" | "model">;

interface Props {
  isAdmin: boolean;
  initialConversations: ConversationSummary[];
  initialConversationId: string | null;
  initialMessages: ThreadMessage[];
  defaultModel: ChatModelId;
  initialSpend: { totalUsd: number; capUsd: number | null };
}

/** Reads a JSON error body if there is one; platform errors (504s) arrive as text. */
async function readError(res: Response, fallback: string): Promise<string> {
  const raw = await res.text();
  try {
    const body = JSON.parse(raw);
    if (typeof body?.error === "string") return body.error;
  } catch {
    /* not JSON */
  }
  if (res.status === 504) return "The assistant took too long to answer. Try a narrower question.";
  return `${fallback} (HTTP ${res.status})`;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatClient({ isAdmin, initialConversations, initialConversationId, initialMessages, defaultModel, initialSpend }: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [model, setModel] = useState<ChatModelId>(defaultModel);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spend, setSpend] = useState(initialSpend);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const syncUrl = useCallback(
    (id: string | null) => {
      router.replace(id ? `/chat?c=${encodeURIComponent(id)}` : "/chat", { scroll: false });
    },
    [router],
  );

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/chat/conversations");
    if (!res.ok) return;
    const body = await res.json();
    setConversations(body.conversations ?? []);
    if (body.spend) setSpend({ totalUsd: body.spend.totalUsd, capUsd: Number.isFinite(body.spend.capUsd) ? body.spend.capUsd : null });
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setError(null);
      setLoadingThread(true);
      syncUrl(id);
      try {
        const res = await fetch(`/api/chat/conversations/${id}`);
        if (!res.ok) throw new Error(await readError(res, "Couldn't open that conversation"));
        const body = await res.json();
        setMessages(body.messages ?? []);
        const m = body.conversation?.model;
        if (CHAT_MODELS.some((x) => x.id === m)) setModel(m);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't open that conversation");
        setMessages([]);
      } finally {
        setLoadingThread(false);
      }
    },
    [syncUrl],
  );

  function startNew() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    syncUrl(null);
  }

  async function removeActive() {
    if (!activeId) return;
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    const res = await fetch(`/api/chat/conversations/${activeId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setError(await readError(res, "Couldn't delete the conversation"));
      return;
    }
    setConversations((list) => list.filter((c) => c.id !== activeId));
    startNew();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: "user", content: question, model: null }]);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId ?? undefined, model, message: question }),
      });
      if (!res.ok) throw new Error(await readError(res, "Something went wrong"));
      const body = await res.json();
      if (typeof body.reply !== "string" || body.reply.trim() === "") {
        throw new Error("The assistant returned an empty answer. Try again.");
      }
      setMessages((m) => [...m, { role: "assistant", content: body.reply, model: body.model ?? model }]);
      if (!activeId && typeof body.conversationId === "string") {
        setActiveId(body.conversationId);
        syncUrl(body.conversationId);
      }
      void refreshList();
    } catch (err) {
      // The server rolled the question back, so drop it here too and keep it in the box.
      setMessages((m) => m.slice(0, -1));
      setInput(question);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const greeting = isAdmin
    ? "Hi, I'm the budget assistant. Ask me anything about transactions, reimbursements, staff comp, or student balances."
    : "Hi, I'm the budget assistant. Ask me about category totals and budget vs. actual — for individual payee or compensation detail you'll need admin access.";

  const listItem = (c: ConversationSummary) => (
    <button
      key={c.id}
      type="button"
      onClick={() => void openConversation(c.id)}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
        c.id === activeId
          ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      <span className="block truncate">{c.title}</span>
      <span className="block text-xs text-neutral-500 dark:text-neutral-400">
        {relativeDate(c.updatedAt)} · {modelLabel(c.model)}
      </span>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-neutral-200 bg-white p-3 md:flex dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={startNew}
          className="mb-3 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          + New chat
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">No conversations yet.</p>
          )}
          {conversations.map(listItem)}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Thread header: picker on phones, delete everywhere */}
        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <select
              aria-label="Conversation"
              value={activeId ?? ""}
              onChange={(e) => (e.target.value ? void openConversation(e.target.value) : startNew())}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              <option value="">New chat</option>
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <h1 className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 md:block dark:text-neutral-50">
            {activeId ? (conversations.find((c) => c.id === activeId)?.title ?? "Budget Chat") : "Budget Chat"}
          </h1>
          {activeId && (
            <button
              type="button"
              onClick={() => void removeActive()}
              className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!loadingThread && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
                {greeting}
              </div>
            </div>
          )}
          {loadingThread && <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading…</p>}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                }`}
                title={m.role === "assistant" && m.model ? `Answered by ${modelLabel(m.model)}` : undefined}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Thinking with {modelLabel(model)}…</p>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the budget…"
              maxLength={4000}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-neutral-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Send
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <label className="flex items-center gap-2">
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ChatModelId)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              >
                {CHAT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.hint}
                  </option>
                ))}
              </select>
            </label>
            <span>
              API spend ${spend.totalUsd.toFixed(2)}
              {spend.capUsd !== null ? ` of $${spend.capUsd.toFixed(2)}` : ""}
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
