import { supabaseAdmin } from "@/lib/supabase/server";
import type { ChatModelId } from "@/lib/chat/models";
import { isChatModel } from "@/lib/chat/models";

/**
 * Persistent /chat conversations. Every read and write is keyed by the
 * owner's email (from the Auth.js session) — this module is the ownership
 * gate, since the app talks to Postgres with the service role.
 */

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  createdAt: string;
}

const HISTORY_LIMIT = 20;

export async function listConversations(email: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabaseAdmin()
    .from("chat_conversations")
    .select("id, title, model, updated_at")
    .eq("user_email", email)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`listConversations: ${error.message}`);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, model: r.model, updatedAt: r.updated_at }));
}

export async function getConversation(email: string, id: string): Promise<ConversationSummary | null> {
  const { data, error } = await supabaseAdmin()
    .from("chat_conversations")
    .select("id, title, model, updated_at")
    .eq("id", id)
    .eq("user_email", email)
    .maybeSingle();
  if (error) throw new Error(`getConversation: ${error.message}`);
  return data ? { id: data.id, title: data.title, model: data.model, updatedAt: data.updated_at } : null;
}

/** The most recent `limit` messages of a conversation, oldest first. */
export async function getMessages(conversationId: string, limit = HISTORY_LIMIT): Promise<StoredMessage[]> {
  const { data, error } = await supabaseAdmin()
    .from("chat_messages")
    .select("id, role, content, model, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getMessages: ${error.message}`);
  return (data ?? [])
    .reverse()
    .map((r) => ({ id: r.id, role: r.role, content: r.content, model: r.model, createdAt: r.created_at }));
}

export async function createConversation(email: string, title: string, model: ChatModelId): Promise<ConversationSummary> {
  const { data, error } = await supabaseAdmin()
    .from("chat_conversations")
    .insert({ user_email: email, title, model })
    .select("id, title, model, updated_at")
    .single();
  if (error) throw new Error(`createConversation: ${error.message}`);
  return { id: data.id, title: data.title, model: data.model, updatedAt: data.updated_at };
}

export async function setConversationModel(id: string, model: ChatModelId): Promise<void> {
  const { error } = await supabaseAdmin().from("chat_conversations").update({ model }).eq("id", id);
  if (error) throw new Error(`setConversationModel: ${error.message}`);
}

export async function appendMessage(
  conversationId: string,
  message: { role: "user" | "assistant"; content: string; model?: string; usage?: unknown },
): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      model: message.model ?? null,
      usage: message.usage ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`appendMessage: ${error.message}`);
  const { error: touchError } = await db
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (touchError) throw new Error(`appendMessage touch: ${touchError.message}`);
  return data.id;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("chat_messages").delete().eq("id", id);
  if (error) throw new Error(`deleteMessage: ${error.message}`);
}

/** Returns false when the conversation doesn't exist or isn't the caller's. */
export async function deleteConversation(email: string, id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("chat_conversations")
    .delete()
    .eq("id", id)
    .eq("user_email", email)
    .select("id");
  if (error) throw new Error(`deleteConversation: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Model of the caller's most recently used conversation, if it's still allowed. */
export async function lastUsedModel(email: string): Promise<ChatModelId | null> {
  const { data, error } = await supabaseAdmin()
    .from("chat_conversations")
    .select("model")
    .eq("user_email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`lastUsedModel: ${error.message}`);
  return data && isChatModel(data.model) ? data.model : null;
}
