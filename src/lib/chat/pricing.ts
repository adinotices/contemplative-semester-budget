import type Anthropic from "@anthropic-ai/sdk";
import type { ChatModelId } from "./models";

/** USD per million tokens, Anthropic list prices as of 2026-10. */
const PRICES: Record<ChatModelId, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export type UsageLike = Pick<Anthropic.Usage, "input_tokens" | "output_tokens"> &
  Partial<Pick<Anthropic.Usage, "cache_creation_input_tokens" | "cache_read_input_tokens">>;

export interface SpendBreakdown {
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Cost of one completion in USD, rounded to the cent-fraction we store (6 dp). */
export function costUsd(model: ChatModelId, usage: UsageLike): SpendBreakdown {
  const p = PRICES[model];
  const inputTokens = usage.input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const perToken = 1 / 1_000_000;
  const cost =
    inputTokens * p.input * perToken +
    cacheWriteTokens * p.input * CACHE_WRITE_MULTIPLIER * perToken +
    cacheReadTokens * p.input * CACHE_READ_MULTIPLIER * perToken +
    outputTokens * p.output * perToken;
  return { inputTokens, cacheWriteTokens, cacheReadTokens, outputTokens, costUsd: Math.round(cost * 1e6) / 1e6 };
}
