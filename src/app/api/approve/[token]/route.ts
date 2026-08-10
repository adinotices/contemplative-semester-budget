import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, ACCOUNTANT_EMAILS } from "@/lib/email/resend";
import { reimbursementBatchEmail, type BatchEmailItem } from "@/lib/email/templates";
import { buildReceiptAttachments } from "@/lib/email/attachments";

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

  const emailItems: BatchEmailItem[] = pendingRows.map((row) => ({
    sequenceLabel: `R${row.sequence_number}`,
    submitterName: row.reimbursement_requests!.submitted_by_name,
    description: row.reimbursement_requests!.description,
    amount: Number(row.reimbursement_requests!.amount),
    hasReceipt: Boolean(row.reimbursement_requests!.receipt_url),
  }));

  const attachments = await buildReceiptAttachments(
    pendingRows.map((row) => ({
      sequenceLabel: `R${row.sequence_number}`,
      receiptUrl: row.reimbursement_requests!.receipt_url,
    })),
  );

  if (ACCOUNTANT_EMAILS.length === 0) {
    return NextResponse.json({ error: "ACCOUNTANT_EMAILS not configured" }, { status: 500 });
  }

  const { subject, html } = reimbursementBatchEmail({
    items: emailItems,
    greeting: "Hey Jaycel, hope you're doing well. Here's the next batch of reimbursements.",
  });

  await resend().emails.send({
    from: EMAIL_FROM,
    to: ACCOUNTANT_EMAILS,
    subject,
    html,
    attachments,
  });

  const reimbursementIds = pendingRows.map((row) => row.reimbursement_requests!.id);
  await db.from("reimbursement_requests").update({ status: "sent" }).in("id", reimbursementIds);
  await db
    .from("digest_batches")
    .update({ approved_at: new Date().toISOString(), sent_to_accountant_at: new Date().toISOString() })
    .eq("id", batch.id);

  return NextResponse.json({ ok: true, count: pendingRows.length });
}
