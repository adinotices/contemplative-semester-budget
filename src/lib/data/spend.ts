import { supabaseAdmin } from "@/lib/supabase/server";
import type { ChatModelId } from "@/lib/chat/models";
import { costUsd, type UsageLike } from "@/lib/chat/pricing";

/**
 * Global, cumulative cap on what this app spends on the Anthropic API.
 * Every call records a row in api_spend_events priced at list rates; the
 * cap lives in org_settings ('anthropic_spend_cap_usd') so it can be raised
 * with one SQL update, no deploy. This only counts calls the app makes and
 * records — a workspace spend limit in the Anthropic Console is the hard
 * backstop.
 */

export const SPEND_CAP_KEY = "anthropic_spend_cap_usd";
export type SpendSource = "chat" | "whatsapp" | "ocr";

export class BudgetExceededError extends Error {
  constructor(
    public readonly totalUsd: number,
    public readonly capUsd: number,
  ) {
    super(`API spend cap reached: $${totalUsd.toFixed(2)} of $${capUsd.toFixed(2)}`);
    this.name = "BudgetExceededError";
  }
}

export interface SpendSummary {
  totalUsd: number;
  capUsd: number;
}

export async function spendSummary(): Promise<SpendSummary> {
  const db = supabaseAdmin();
  const [{ data: cap, error: capError }, { data: rows, error: sumError }] = await Promise.all([
    db.from("org_settings").select("value_numeric").eq("key", SPEND_CAP_KEY).maybeSingle(),
    db.from("api_spend_events").select("cost_usd"),
  ]);
  if (capError) throw new Error(`spendSummary cap: ${capError.message}`);
  if (sumError) throw new Error(`spendSummary sum: ${sumError.message}`);
  const totalUsd = (rows ?? []).reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0);
  // No row = no cap configured; treat as unlimited rather than silently blocking.
  const capUsd = cap?.value_numeric == null ? Number.POSITIVE_INFINITY : Number(cap.value_numeric);
  return { totalUsd, capUsd };
}

/** Throws BudgetExceededError when cumulative spend has reached the cap. */
export async function assertBudget(): Promise<SpendSummary> {
  const summary = await spendSummary();
  if (summary.totalUsd >= summary.capUsd) throw new BudgetExceededError(summary.totalUsd, summary.capUsd);
  return summary;
}

export async function recordSpend(
  source: SpendSource,
  model: ChatModelId,
  usage: UsageLike,
  userEmail?: string | null,
): Promise<number> {
  const b = costUsd(model, usage);
  const { error } = await supabaseAdmin().from("api_spend_events").insert({
    source,
    model,
    input_tokens: b.inputTokens,
    cache_write_tokens: b.cacheWriteTokens,
    cache_read_tokens: b.cacheReadTokens,
    output_tokens: b.outputTokens,
    cost_usd: b.costUsd,
    user_email: userEmail ?? null,
  });
  // A failed spend record must not turn a delivered answer into an error, but
  // it must be visible: the cap is only as good as this ledger.
  if (error) console.error("recordSpend failed", error.message);
  return b.costUsd;
}
