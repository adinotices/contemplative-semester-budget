import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateApprovalToken } from "@/lib/tokens";
import { resend, EMAIL_FROM, APPROVER_EMAIL } from "@/lib/email/resend";
import { reimbursementBatchEmail, type BatchEmailItem } from "@/lib/email/templates";
import { buildReceiptAttachments, toResendAttachments } from "@/lib/email/attachments";

const TOKEN_TTL_DAYS = 7;

/**
 * Triggered by Vercel Cron (see vercel.json). Bundles every pending
 * reimbursement into a single batch: one review email to the approver,
 * grouped by submitter with receipts attached, one signed link that
 * forwards the identical email to the accountant on approval. See §6 of
 * the architecture doc — approval is link-based only, never email-reply
 * parsing.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APPROVER_EMAIL) {
    return NextResponse.json({ error: "APPROVER_EMAIL not configured" }, { status: 500 });
  }

  const db = supabaseAdmin();
  const { data: pending, error } = await db
    .from("reimbursement_requests")
    .select("id, submitted_by_name, description, amount, receipt_url")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load pending requests" }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "No pending requests" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://budget.contemplativesemester.org";
  const token = generateApprovalToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: batch, error: batchError } = await db
    .from("digest_batches")
    .insert({ approval_token: token, token_expires_at: expiresAt })
    .select("id")
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }

  const batchItems = pending.map((request, index) => ({
    batch_id: batch.id,
    reimbursement_id: request.id,
    sequence_number: index + 1,
  }));

  const { error: itemsError } = await db.from("digest_batch_items").insert(batchItems);
  if (itemsError) {
    return NextResponse.json({ error: "Failed to save batch items" }, { status: 500 });
  }

  const attachments = await buildReceiptAttachments(
    pending.map((request, index) => ({
      sequenceLabel: `R${index + 1}`,
      receiptUrl: request.receipt_url,
    })),
  );

  // Derive "has receipt" from what actually downloaded, not from
  // receipt_url — see buildReceiptAttachments.
  const attachedLabels = new Set(attachments.map((a) => a.sequenceLabel));
  const emailItems: BatchEmailItem[] = pending.map((request, index) => ({
    sequenceLabel: `R${index + 1}`,
    submitterName: request.submitted_by_name,
    description: request.description,
    amount: Number(request.amount),
    hasReceipt: attachedLabels.has(`R${index + 1}`),
  }));

  const { subject, html } = reimbursementBatchEmail({
    items: emailItems,
    approveUrl: `${appUrl}/approve/${token}`,
  });

  // Resend returns { data, error } rather than throwing, so an unchecked
  // send would report ok:true for an email that never left. Delete the
  // batch we just created on failure — otherwise its approval token is
  // live but nobody was ever sent the link, and the next cron run creates
  // a second batch covering the same requests.
  const { error: sendError } = await resend().emails.send({
    from: EMAIL_FROM,
    to: APPROVER_EMAIL,
    subject,
    html,
    attachments: toResendAttachments(attachments),
  });

  if (sendError) {
    console.error("Failed to send weekly digest email", sendError);
    await db.from("digest_batches").delete().eq("id", batch.id);
    return NextResponse.json({ error: "Failed to send digest email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true, count: pending.length });
}
