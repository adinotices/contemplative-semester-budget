import type Anthropic from "@anthropic-ai/sdk";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const MAX_HISTORY_MESSAGES = 20;

/**
 * Turns the UI's message list into Messages API input: drops anything that
 * isn't a plain user/assistant string turn, drops the UI's canned greeting
 * (and any other leading assistant turns), and keeps only the most recent
 * history so the request can't grow without bound.
 */
export function toApiMessages(input: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(input)) return [];
  const turns = input.filter(
    (m): m is ChatTurn =>
      typeof m === "object" &&
      m !== null &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );
  const firstUser = turns.findIndex((m) => m.role === "user");
  if (firstUser === -1) return [];
  return turns
    .slice(firstUser)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * The assistant's visible answer, or null when the model produced no text —
 * which happens when `max_tokens` is exhausted by thinking before any answer
 * is written (the bug that blanked every /chat reply until 2026-10-13).
 */
export function textFromCompletion(completion: Pick<Anthropic.Message, "content">): string | null {
  const text = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text.length > 0 ? text : null;
}
