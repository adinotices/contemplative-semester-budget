import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_CHAT_MODEL } from "@/lib/chat/models";
import { lastUsedModel, listConversations } from "@/lib/data/chat-history";
import { spendSummary } from "@/lib/data/spend";

/** The caller's conversations (newest first), their default model, and the app's spend. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [conversations, last, spend] = await Promise.all([listConversations(email), lastUsedModel(email), spendSummary()]);
    return NextResponse.json({ conversations, defaultModel: last ?? DEFAULT_CHAT_MODEL, spend });
  } catch (err) {
    console.error("/api/chat/conversations: list failed", err);
    return NextResponse.json({ error: "Couldn't load your conversations." }, { status: 502 });
  }
}
