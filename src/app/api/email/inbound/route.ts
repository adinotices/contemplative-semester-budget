import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BCBS_EXPORT_BUCKET = "bcbs-exports";
/** Reject replays of a captured delivery, per Svix's recommended tolerance. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

/**
 * Inbound email handler for forwarded BCBS exports (§5, Phase 5).
 * Phase 5 is blocked on Meredith providing exports on a standing monthly
 * cadence, not a technical dependency, and the export file format hasn't
 * been specified yet — so this stub verifies the webhook, stores each
 * attachment in Storage for manual review, and stops there. Once the
 * export format is known, parse the attachment here and bulk-insert into
 * `bcbs_transactions` instead of leaving it for manual import.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const rawBody = await req.text();

  // This route is public (it has no session — Resend calls it), so the
  // signature IS the authentication. Previously it only checked that the
  // Svix headers were present, which let anyone POST arbitrary files into
  // Storage.
  if (!secret) {
    console.error("RESEND_INBOUND_WEBHOOK_SECRET is not set; refusing inbound webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!verifySvixSignature(req, rawBody, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const attachments: Array<{ filename?: string; content?: string; content_type?: string }> =
    (payload as { data?: { attachments?: [] } })?.data?.attachments ?? [];

  const db = supabaseAdmin();
  const stored: string[] = [];

  for (const attachment of attachments) {
    if (!attachment?.content) continue;
    const buffer = Buffer.from(attachment.content, "base64");
    const path = `inbound/${crypto.randomUUID()}-${safeFilename(attachment.filename)}`;
    const { error } = await db.storage
      .from(BCBS_EXPORT_BUCKET)
      .upload(path, buffer, { contentType: attachment.content_type || "application/octet-stream" });
    if (!error) stored.push(path);
  }

  return NextResponse.json({ ok: true, storedAttachments: stored });
}

/**
 * Sender-supplied filenames are interpolated into a Storage object path, so
 * strip anything that could climb out of the `inbound/` prefix or create
 * unexpected nesting — keep a flat, conservative basename.
 */
function safeFilename(filename: string | undefined): string {
  const base = (filename ?? "").split(/[/\\]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 128) || "attachment";
}

/**
 * Verifies a Svix-signed webhook (the scheme Resend uses for inbound mail):
 * HMAC-SHA256 over `{id}.{timestamp}.{body}` keyed by the base64 secret,
 * compared against any of the space-separated `v1,<sig>` values.
 */
function verifySvixSignature(req: NextRequest, rawBody: string, secret: string): boolean {
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatureHeader = req.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(Date.now() / 1000 - sentAt) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signatureHeader
    .split(" ")
    .filter((part) => part.startsWith("v1,"))
    .some((part) => {
      const provided = Buffer.from(part.slice(3), "base64");
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    });
}
