import { auth } from "@/auth";
import { NavBar } from "@/components/nav-bar";
import { DEFAULT_CHAT_MODEL, isChatModel } from "@/lib/chat/models";
import { getMessages, lastUsedModel, listConversations } from "@/lib/data/chat-history";
import { spendSummary } from "@/lib/data/spend";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const isAdmin = session?.user?.role === "admin";
  const { c } = await searchParams;

  const [conversations, last, spend] = email
    ? await Promise.all([listConversations(email), lastUsedModel(email), spendSummary()])
    : [[], null, { totalUsd: 0, capUsd: Number.POSITIVE_INFINITY }];

  // Deep link: load the thread on the server so the client needs no effect.
  const active = c ? conversations.find((x) => x.id === c) ?? null : null;
  const initialMessages = active ? await getMessages(active.id, 500) : [];
  const initialModel = active && isChatModel(active.model) ? active.model : (last ?? DEFAULT_CHAT_MODEL);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <ChatClient
          isAdmin={isAdmin}
          initialConversations={conversations}
          initialConversationId={active?.id ?? null}
          initialMessages={initialMessages}
          defaultModel={initialModel}
          initialSpend={{ totalUsd: spend.totalUsd, capUsd: Number.isFinite(spend.capUsd) ? spend.capUsd : null }}
        />
      </main>
    </div>
  );
}
