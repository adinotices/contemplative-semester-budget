import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resend, EMAIL_FROM, ACCOUNTANT_EMAILS } from "@/lib/email/resend";
import { accountantReimbursementEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "approve" | "reject" | undefined;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: approval, error: approvalError } = await db
    .from("reimbursement_approvals")
    .select("id, reimbursement_id, token_expires_at, approved_at")
    .eq("approval_token", token)
    .maybeSingle();

  if (approvalError || !approval) {
    return NextResponse.json({ error: "Invalid or unknown link" }, { status: 404 });
  }
  if (approval.approved_at) {
    return NextResponse.json({ error: "This link has already been used" }, { status: 410 });
  }
  if (new Date(approval.token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const { data: reimbursement, error: reimbursementError } = await db
    .from("reimbursement_requests")
    .select("id, submitted_by_name, description, amount, receipt_url, status")
    .eq("id", approval.reimbursement_id)
    .maybeSingle();

  if (reimbursementError || !reimbursement) {
    return NextResponse.json({ error: "Reimbursement request not found" }, { status: 404 });
  }
  if (reimbursement.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const { error: updateError } = await db
    .from("reimbursement_requests")
    .update({ status: newStatus })
    .eq("id", reimbursement.id);
  if (updateError) {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  await db
    .from("reimbursement_approvals")
    .update({ approved_by: "approver", approved_at: new Date().toISOString() })
    .eq("id", approval.id);

  if (action === "approve" && ACCOUNTANT_EMAILS.length > 0) {
    const { subject, html } = accountantReimbursementEmail({
      payee: reimbursement.submitted_by_name,
      amount: Number(reimbursement.amount),
      description: reimbursement.description,
      receiptUrl: reimbursement.receipt_url,
    });
    await resend().emails.send({
      from: EMAIL_FROM,
      to: ACCOUNTANT_EMAILS,
      subject,
      html,
    });
    await db
      .from("reimbursement_requests")
      .update({ status: "sent" })
      .eq("id", reimbursement.id);
    await db
      .from("reimbursement_approvals")
      .update({ sent_to_accountant_at: new Date().toISOString() })
      .eq("id", approval.id);
  }

  return NextResponse.json({ ok: true, status: action === "approve" ? "sent" : "rejected" });
}
