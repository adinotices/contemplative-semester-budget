import { auth } from "@/auth";
import { NavBar } from "@/components/nav-bar";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Budget Chat</h1>
        <ChatClient isAdmin={isAdmin} />
      </main>
    </div>
  );
}
