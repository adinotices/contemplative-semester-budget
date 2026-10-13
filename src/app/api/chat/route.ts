import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { anthropic, BUDGET_CHAT_MODEL } from "@/lib/anthropic";
import { buildChatContext } from "@/lib/data/chat-context";
import { textFromCompletion, toApiMessages } from "@/lib/chat/reply";

// An Opus answer over the full ledger can take 20-40 s; Vercel's default
// function budget is shorter than that on some plans.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const messages = toApiMessages((body as { messages?: unknown } | null)?.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const role = session.user.role ?? "viewer";

  let context: string;
  try {
    context = await buildChatContext(role);
  } catch (err) {
    console.error("/api/chat: failed to load budget context", err);
    return NextResponse.json({ error: "Couldn't load the budget data. Try again in a moment." }, { status: 502 });
  }

  // Everything before the data is stable per role; the data is stable until the
  // ledger changes. Both sit in one cached block so follow-up questions in the
  // same conversation re-read the ledger from cache instead of re-sending it.
  const systemPrompt = [
    "You are the budget assistant for Contemplative Semester, a study-abroad program.",
    "Answer questions about the organization's finances using only the JSON data provided below.",
    "Be concise, use dollar amounts formatted with $ and commas, and never invent numbers not present in the data.",
    "When a question needs arithmetic over many rows, work it through carefully and state the figures you summed.",
    role === "admin"
      ? "The current user is an admin: you have full financial detail, including staff compensation and student scholarship/balance data. You may discuss it freely with this user. Transactions have a status field: 'actual' means money has actually moved; 'projected' means it's expected but not yet paid/received. Always distinguish the two when reporting totals — never combine them without saying so."
      : "The current user is general staff: you only have category-level aggregate totals (actual/realized amounts only — nothing projected/unpaid), with no names or per-line detail. If asked for individual payee, staff compensation, or student financial detail, explain that it requires admin access.",
    "",
    "DATA:",
    context,
  ].join("\n");

  try {
    const completion = await anthropic().messages.create({
      model: BUDGET_CHAT_MODEL,
      // Adaptive thinking is on by default for this model and draws from the
      // same budget as the answer. 1024 here was exhausted by thinking alone,
      // which returned an empty reply for every question.
      max_tokens: 16000,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const text = textFromCompletion(completion);
    if (!text) {
      console.error("/api/chat: no text in completion", {
        stop_reason: completion.stop_reason,
        blocks: completion.content.map((b) => b.type),
        usage: completion.usage,
      });
      return NextResponse.json(
        { error: "The assistant ran out of room before answering. Try a narrower question." },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply: text });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("/api/chat: Anthropic rejected the API key", err.message);
      return NextResponse.json({ error: "The assistant's API key was rejected. Tell Aditya." }, { status: 502 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The assistant is rate-limited right now. Try again in a minute." }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("/api/chat: Anthropic API error", err.status, err.message);
      return NextResponse.json({ error: `The assistant returned an error (${err.status}).` }, { status: 502 });
    }
    console.error("/api/chat: unexpected error", err);
    return NextResponse.json({ error: "Something went wrong talking to the assistant." }, { status: 500 });
  }
}
