import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, ACCOUNTANT_EMAILS } from "@/lib/email/resend";
import { reimbursementBatchEmail, type BatchEmailItem } from "@/lib/email/templates";
import { buildReceiptAttachments, toResendAttachments } from "@/lib/email/attachments";

interface BatchItemRow {
  sequence_number: number;
  reimbursement_requests: {
    id: string;
    submitted_by_name: string;
    description: string;
    amount: number;
    receipt_url: string | null;
    status: string;
  } | null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action !== "approve") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: batch, error: batchError } = await db
    .from("digest_batches")
    .select("id, token_expires_at, approved_at")
    .eq("approval_token", token)
    .maybeSingle();

  if (batchError || !batch) {
    return NextResponse.json({ error: "Invalid or unknown link" }, { status: 404 });
  }
  if (batch.approved_at) {
    return NextResponse.json({ error: "This batch has already been sent" }, { status: 410 });
  }
  if (new Date(batch.token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const { data: rows, error: itemsError } = await db
    .from("digest_batch_items")
    .select("sequence_number, reimbursement_requests(id, submitted_by_name, description, amount, receipt_url, status)")
    .eq("batch_id", batch.id)
    .order("sequence_number");

  if (itemsError || !rows) {
    return NextResponse.json({ error: "Failed to load batch items" }, { status: 500 });
  }

  const pendingRows = (rows as unknown as BatchItemRow[]).filter(
    (row) => row.reimbursement_requests?.status === "pending",
  );

  if (pendingRows.length === 0) {
    return NextResponse.json(
      { error: "Nothing left to send — these items were already processed" },
      { status: 409 },
    );
  }

  if (ACCOUNTANT_EMAILS.length === 0) {
    return NextResponse.json({ error: "ACCOUNTANT_EMAILS not configured" }, { status: 500 });
  }

  const attachments = await buildReceiptAttachments(
    pendingRows.map((row) => ({
      sequenceLabel: `R${row.sequence_number}`,
      receiptUrl: row.reimbursement_requests!.receipt_url,
    })),
  );

  // A receipt that failed to download is skipped rather than failing the
  // batch, so derive "has receipt" from what actually got attached — not
  // from receipt_url — or the accountant sees a row with no "(no receipt)"
  // warning and no attachment to match it.
  const attachedLabels = new Set(attachments.map((a) => a.sequenceLabel));
  const emailItems: BatchEmailItem[] = pendingRows.map((row) => ({
    sequenceLabel: `R${row.sequence_number}`,
    submitterName: row.reimbursement_requests!.submitted_by_name,
    description: row.reimbursement_requests!.description,
    amount: Number(row.reimbursement_requests!.amount),
    hasReceipt: attachedLabels.has(`R${row.sequence_number}`),
  }));

  const { subject, html } = reimbursementBatchEmail({
    items: emailItems,
    greeting: "Hey Jaycel, hope you're doing well. Here's the next batch of reimbursements.",
  });

  // Claim the batch BEFORE sending. Two concurrent clicks both passed the
  // approved_at check above, so gate on the database instead: the update is
  // conditional on approved_at still being null, and only the request that
  // actually flips a row proceeds to send. Without this the accountant gets
  // the batch twice.
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("digest_batches")
    .update({ approved_at: claimedAt })
    .eq("id", batch.id)
    .is("approved_at", null)
    .select("id");

  if (claimError) {
    return NextResponse.json({ error: "Failed to claim batch" }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: "This batch has already been sent" }, { status: 410 });
  }

  // The Resend SDK returns { data, error } and does NOT throw on API
  // failures, so an unchecked send silently "succeeds". Releasing the claim
  // on failure lets the approver retry the same link instead of stranding
  // the batch as sent-but-never-delivered.
  const { error: sendError } = await resend().emails.send({
    from: EMAIL_FROM,
    to: ACCOUNTANT_EMAILS,
    subject,
    html,
    attachments: toResendAttachments(attachments),
  });

  if (sendError) {
    console.error("Failed to send accountant batch email", sendError);
    await db.from("digest_batches").update({ approved_at: null }).eq("id", batch.id);
    return NextResponse.json(
      { error: "Could not send the email to the accountant. Nothing was sent — please try again." },
      { status: 502 },
    );
  }

  const reimbursementIds = pendingRows.map((row) => row.reimbursement_requests!.id);
  await db.from("reimbursement_requests").update({ status: "sent" }).in("id", reimbursementIds);
  await db
    .from("digest_batches")
    .update({ sent_to_accountant_at: new Date().toISOString() })
    .eq("id", batch.id);

  return NextResponse.json({ ok: true, count: pendingRows.length });
}
