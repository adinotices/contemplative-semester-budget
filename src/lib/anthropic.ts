import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  client = new Anthropic({ apiKey });
  return client;
}

/** WhatsApp reimbursement bot + receipt OCR. */
export const CHAT_MODEL = "claude-sonnet-5";

/**
 * /chat budget assistant. Opus by Aditya's call (2026-10-13): answers are
 * read as financial facts, so accuracy over an 80k-token ledger beats the
 * per-message saving of a smaller model. The ledger is prompt-cached, so the
 * marginal cost of a follow-up question is small either way.
 */
export const BUDGET_CHAT_MODEL = "claude-opus-5";
