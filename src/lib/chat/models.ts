import type Anthropic from "@anthropic-ai/sdk";

/**
 * The only models /chat may call. Also the picker's source of truth, so a
 * request can never name a model that isn't shown (and priced) in the UI.
 */
export const CHAT_MODELS = [
  { id: "claude-opus-5", label: "Opus 5", hint: "most accurate · ~$0.45 first question, ~$0.09 follow-ups" },
  { id: "claude-sonnet-5", label: "Sonnet 5", hint: "default · ~$0.18 first question, ~$0.04 follow-ups" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", hint: "fastest · ~$0.05 first question, ~$0.01 follow-ups" },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = "claude-sonnet-5";

export function isChatModel(x: unknown): x is ChatModelId {
  return typeof x === "string" && CHAT_MODELS.some((m) => m.id === x);
}

export function modelLabel(id: string): string {
  return CHAT_MODELS.find((m) => m.id === id)?.label ?? id;
}

/**
 * Opus 5 and Sonnet 5 think adaptively by default (omit the parameter).
 * Haiku 4.5 does not, so it gets an explicit budget — the answers stay
 * reasoned over the ledger; only the price changes. The budget must stay
 * well under the route's max_tokens so text is never squeezed out again.
 */
export function thinkingFor(model: ChatModelId): Anthropic.ThinkingConfigParam | undefined {
  if (model === "claude-haiku-4-5") return { type: "enabled", budget_tokens: 8000 };
  return undefined;
}
