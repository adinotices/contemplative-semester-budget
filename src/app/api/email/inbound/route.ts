import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BCBS_EXPORT_BUCKET = "bcbs-exports";

/**
 * Inbound email handler for forwarded BCBS exports (§5, Phase 5).
 * Phase 5 is blocked on Meredith providing exports on a standing monthly
 * cadence, not a technical dependency, and the export file format hasn't
 * been specified yet — so this stub verifies the webhook, stores each
 * attachment in Storage for manual review, and stops there. Once the
 * export format is known, parse the attachment here and bulk-insert into
 * `bcbs_transactions` instead of leaving it for manual import.
 *
 * Verification: Resend signs inbound webhooks via Svix headers
 * (svix-id / svix-timestamp / svix-signature). Set RESEND_INBOUND_WEBHOOK_SECRET
 * and swap in the `svix` package's Webhook.verify() before trusting the payload
 * in production — this stub only checks the headers are present.
 */
export async function POST(req: NextRequest) {
  const svixId = req.headers.get("svix-id");
  const svixSignature = req.headers.get("svix-signature");
  const svixTimestamp = req.headers.get("svix-timestamp");

  if (process.env.NODE_ENV === "production" && (!svixId || !svixSignature || !svixTimestamp)) {
    return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
  }

  const payload = await req.json();
  const attachments: Array<{ filename: string; content: string; content_type: string }> =
    payload?.data?.attachments ?? [];

  const db = supabaseAdmin();
  const stored: string[] = [];

  for (const attachment of attachments) {
    const buffer = Buffer.from(attachment.content, "base64");
    const path = `inbound/${crypto.randomUUID()}-${attachment.filename}`;
    const { error } = await db.storage
      .from(BCBS_EXPORT_BUCKET)
      .upload(path, buffer, { contentType: attachment.content_type });
    if (!error) stored.push(path);
  }

  return NextResponse.json({ ok: true, storedAttachments: stored });
}
