import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteConversation, getConversation, getMessages } from "@/lib/data/chat-history";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One conversation with its full thread; 404 unless it belongs to the caller. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  try {
    const conversation = await getConversation(email, id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const messages = await getMessages(id, 500);
    return NextResponse.json({ conversation, messages });
  } catch (err) {
    console.error("/api/chat/conversations/[id]: load failed", err);
    return NextResponse.json({ error: "Couldn't load that conversation." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  try {
    const deleted = await deleteConversation(email, id);
    if (!deleted) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("/api/chat/conversations/[id]: delete failed", err);
    return NextResponse.json({ error: "Couldn't delete that conversation." }, { status: 502 });
  }
}
