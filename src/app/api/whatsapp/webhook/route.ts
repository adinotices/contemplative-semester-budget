import { NextRequest, NextResponse } from "next/server";
import { isValidTwilioRequest } from "@/lib/twilio";
import { handleIncomingMessage } from "@/lib/whatsapp/bot";
import { supabaseAdmin } from "@/lib/supabase/server";

function twiml(message: string) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = req.headers.get("x-twilio-signature");
  const url = req.nextUrl.toString();

  if (process.env.NODE_ENV === "production" && !isValidTwilioRequest(signature, url, params)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From; // e.g. "whatsapp:+15551234567"
  const body = params.Body ?? "";
  const mediaUrl = params.NumMedia && Number(params.NumMedia) > 0 ? params.MediaUrl0 : undefined;

  if (!from) {
    return NextResponse.json({ error: "Missing From" }, { status: 400 });
  }

  const db = supabaseAdmin();
  await db.from("whatsapp_messages").insert({
    phone_number: from,
    direction: "in",
    body,
    media_url: mediaUrl ?? null,
    twilio_sid: params.MessageSid ?? null,
  });

  const { reply } = await handleIncomingMessage({ phoneNumber: from, body, mediaUrl });

  await db.from("whatsapp_messages").insert({
    phone_number: from,
    direction: "out",
    body: reply,
  });

  return twiml(reply);
}
