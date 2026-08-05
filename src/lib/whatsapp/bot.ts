import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import { supabaseAdmin } from "@/lib/supabase/server";
import { downloadTwilioMedia } from "@/lib/twilio";

const RECEIPT_BUCKET = "receipts";
const MAX_HISTORY = 20;

export interface BotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BotState {
  messages: BotMessage[];
  collected: {
    description?: string;
    amount?: number;
    receiptUrl?: string;
    receiptOcrAmount?: number;
    submitterName?: string;
  };
}

function emptyState(): BotState {
  return { messages: [], collected: {} };
}

const SUBMIT_TOOL = {
  name: "submit_reimbursement",
  description:
    "Submit the completed reimbursement request once the user has provided an amount, a description, a receipt photo, and has explicitly confirmed they want to submit.",
  input_schema: {
    type: "object" as const,
    properties: {
      description: { type: "string" as const, description: "What the expense was for" },
      amount: { type: "number" as const, description: "The dollar amount to reimburse" },
      submitter_name: { type: "string" as const, description: "The submitter's full name" },
    },
    required: ["description", "amount", "submitter_name"],
  },
};

const SYSTEM_PROMPT = `You are the Contemplative Semester reimbursement bot on WhatsApp. Your job is to collect, via friendly back-and-forth chat:
1. The submitter's full name (if not already known)
2. A short description of the expense
3. The dollar amount
4. A photo of the receipt (the user sends this as an image; you'll be told when one has been received and OCR-extracted)

Once you have all four AND the user has explicitly confirmed they want to submit, call the submit_reimbursement tool. Do not call it before an explicit confirmation. If the OCR-extracted receipt amount differs from the stated amount, point out the discrepancy and ask the user to confirm which is correct before proceeding. Keep replies short — this is a text message thread.`;

export async function handleIncomingMessage(params: {
  phoneNumber: string;
  body: string;
  mediaUrl?: string;
}): Promise<{ reply: string; submitted: boolean }> {
  const db = supabaseAdmin();

  const { data: existingSession } = await db
    .from("bot_sessions")
    .select("id, state_json")
    .eq("phone_number", params.phoneNumber)
    .maybeSingle();

  const state: BotState = (existingSession?.state_json as BotState) ?? emptyState();

  let userTurnText = params.body?.trim() ?? "";

  if (params.mediaUrl) {
    try {
      const { buffer, contentType } = await downloadTwilioMedia(params.mediaUrl);
      const path = `whatsapp/${params.phoneNumber.replace(/[^\d]/g, "")}/${crypto.randomUUID()}`;
      await db.storage.from(RECEIPT_BUCKET).upload(path, buffer, { contentType });
      const { data: publicUrl } = db.storage.from(RECEIPT_BUCKET).getPublicUrl(path);
      state.collected.receiptUrl = publicUrl.publicUrl;

      const ocrAmount = await extractReceiptAmount(buffer, contentType);
      if (ocrAmount != null) state.collected.receiptOcrAmount = ocrAmount;

      userTurnText = userTurnText
        ? `${userTurnText}\n[receipt photo received${ocrAmount != null ? `, OCR-extracted amount: $${ocrAmount}` : ""}]`
        : `[receipt photo received${ocrAmount != null ? `, OCR-extracted amount: $${ocrAmount}` : ""}]`;
    } catch (err) {
      console.error("Failed to process WhatsApp media", err);
      userTurnText = userTurnText || "[receipt photo received but could not be processed]";
    }
  }

  state.messages.push({ role: "user", content: userTurnText });
  state.messages = state.messages.slice(-MAX_HISTORY);

  const contextNote = `Known so far: ${JSON.stringify(state.collected)}`;

  const completion = await anthropic().messages.create({
    model: CHAT_MODEL,
    max_tokens: 512,
    system: `${SYSTEM_PROMPT}\n\n${contextNote}`,
    tools: [SUBMIT_TOOL],
    messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const toolUse = completion.content.find((b) => b.type === "tool_use");
  const textBlocks = completion.content.filter((b) => b.type === "text").map((b) => b.text);
  let reply = textBlocks.join("\n").trim();

  let submitted = false;

  if (toolUse && toolUse.type === "tool_use") {
    const input = toolUse.input as { description: string; amount: number; submitter_name: string };

    await db.from("reimbursement_requests").insert({
      submitted_by_name: input.submitter_name,
      submitted_by_phone: params.phoneNumber,
      description: input.description,
      amount: input.amount,
      receipt_url: state.collected.receiptUrl ?? null,
      status: "pending",
      submitted_via: "whatsapp",
    });

    submitted = true;
    reply =
      reply ||
      `Thanks! Your reimbursement request for $${input.amount} (${input.description}) has been submitted for review.`;

    await db.from("bot_sessions").upsert(
      {
        phone_number: params.phoneNumber,
        state_json: emptyState(),
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" },
    );
  } else {
    state.messages.push({ role: "assistant", content: reply });
    await db.from("bot_sessions").upsert(
      {
        phone_number: params.phoneNumber,
        state_json: state,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" },
    );
  }

  return { reply: reply || "Sorry, could you say that again?", submitted };
}

async function extractReceiptAmount(buffer: Buffer, contentType: string): Promise<number | null> {
  if (!contentType.startsWith("image/")) return null;
  try {
    const completion = await anthropic().messages.create({
      model: CHAT_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: "What is the total dollar amount on this receipt? Reply with only the number, no currency symbol. If you cannot find a total, reply with exactly: unknown",
            },
          ],
        },
      ],
    });
    const text = completion.content.find((b) => b.type === "text")?.text?.trim();
    if (!text || text.toLowerCase() === "unknown") return null;
    const parsed = Number(text.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    console.error("Receipt OCR failed", err);
    return null;
  }
}
