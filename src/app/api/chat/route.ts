import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import { buildChatContext } from "@/lib/data/chat-context";

const MAX_HISTORY_MESSAGES = 20;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const role = session.user.role ?? "viewer";
  const context = await buildChatContext(role);

  const systemPrompt = [
    "You are the budget assistant for Contemplative Semester, a study-abroad program.",
    "Answer questions about the organization's finances using only the JSON data provided below.",
    "Be concise, use dollar amounts formatted with $ and commas, and never invent numbers not present in the data.",
    role === "admin"
      ? "The current user is an admin: you have full financial detail, including staff compensation and student scholarship/balance data. You may discuss it freely with this user. Transactions have a status field: 'actual' means money has actually moved; 'projected' means it's expected but not yet paid/received. Always distinguish the two when reporting totals — never combine them without saying so."
      : "The current user is general staff: you only have category-level aggregate totals (actual/realized amounts only — nothing projected/unpaid), with no names or per-line detail. If asked for individual payee, staff compensation, or student financial detail, explain that it requires admin access.",
    "",
    "DATA:",
    context,
  ].join("\n");

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  const completion = await anthropic().messages.create({
    model: CHAT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: trimmed.map((m: { role: "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = completion.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return NextResponse.json({ reply: text });
}
