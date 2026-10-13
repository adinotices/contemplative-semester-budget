import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { anthropic } from "@/lib/anthropic";
import { buildChatContext } from "@/lib/data/chat-context";
import { isChatModel, thinkingFor } from "@/lib/chat/models";
import { textFromCompletion, titleFromQuestion, toApiMessages } from "@/lib/chat/reply";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  deleteMessage,
  getConversation,
  getMessages,
  setConversationModel,
} from "@/lib/data/chat-history";
import { assertBudget, BudgetExceededError, recordSpend } from "@/lib/data/spend";

// An Opus answer over the full ledger can take 20-40 s; Vercel's default
// function budget is shorter than that on some plans.
export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 4000;

/**
 * Appends one user message to a conversation (creating it on the first
 * message) and answers it. History comes from the database, never from the
 * browser. Body: { conversationId?, model, message }.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { conversationId?: unknown; model?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters)` }, { status: 400 });
  }
  if (!isChatModel(body.model)) return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  const model = body.model;
  if (body.conversationId !== undefined && typeof body.conversationId !== "string") {
    return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
  }

  // Refuse before doing any work once the global cap is reached.
  try {
    await assertBudget();
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        { error: `The app's API budget is used up ($${err.totalUsd.toFixed(2)} of $${err.capUsd.toFixed(2)}). Ask Aditya to raise it.` },
        { status: 402 },
      );
    }
    console.error("/api/chat: budget check failed", err);
    return NextResponse.json({ error: "Couldn't check the API budget. Try again in a moment." }, { status: 502 });
  }

  const role = session.user.role ?? "viewer";

  // Resolve or create the conversation, then store the question. If the model
  // call fails below, both are rolled back so the UI and the DB agree.
  let conversationId: string;
  let createdNow = false;
  let userMessageId: string;
  try {
    if (body.conversationId) {
      const existing = await getConversation(email, body.conversationId);
      if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      conversationId = existing.id;
      if (existing.model !== model) await setConversationModel(conversationId, model);
    } else {
      conversationId = (await createConversation(email, titleFromQuestion(message), model)).id;
      createdNow = true;
    }
    userMessageId = await appendMessage(conversationId, { role: "user", content: message });
  } catch (err) {
    console.error("/api/chat: failed to store the question", err);
    return NextResponse.json({ error: "Couldn't save the conversation. Try again in a moment." }, { status: 502 });
  }

  async function rollback() {
    try {
      if (createdNow) await deleteConversation(email!, conversationId);
      else await deleteMessage(userMessageId);
    } catch (err) {
      console.error("/api/chat: rollback failed", err);
    }
  }

  let context: string;
  let history: Anthropic.MessageParam[];
  try {
    [context, history] = await Promise.all([
      buildChatContext(role),
      getMessages(conversationId).then(toApiMessages),
    ]);
  } catch (err) {
    console.error("/api/chat: failed to load budget context", err);
    await rollback();
    return NextResponse.json({ error: "Couldn't load the budget data. Try again in a moment." }, { status: 502 });
  }
  if (history.length === 0) {
    // Can't happen (we just stored a user turn), but never send an empty list.
    await rollback();
    return NextResponse.json({ error: "Nothing to send" }, { status: 400 });
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
    const thinking = thinkingFor(model);
    const completion = await anthropic().messages.create({
      model,
      // Thinking and the answer share this budget. 1024 here was exhausted by
      // thinking alone, which returned an empty reply for every question.
      max_tokens: 16000,
      ...(thinking ? { thinking } : {}),
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: history,
    });
    await recordSpend("chat", model, completion.usage, email);

    const text = textFromCompletion(completion);
    if (!text) {
      console.error("/api/chat: no text in completion", {
        stop_reason: completion.stop_reason,
        blocks: completion.content.map((b) => b.type),
        usage: completion.usage,
      });
      await rollback();
      return NextResponse.json(
        { error: "The assistant ran out of room before answering. Try a narrower question." },
        { status: 502 },
      );
    }
    await appendMessage(conversationId, { role: "assistant", content: text, model, usage: completion.usage });
    return NextResponse.json({ reply: text, conversationId, model });
  } catch (err) {
    await rollback();
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
