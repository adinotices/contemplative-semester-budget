import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateApprovalToken } from "@/lib/tokens";
import { resend, EMAIL_FROM, APPROVER_EMAIL } from "@/lib/email/resend";
import { weeklyDigestEmail } from "@/lib/email/templates";

const TOKEN_TTL_DAYS = 7;

/**
 * Triggered by Vercel Cron (see vercel.json). Finds pending reimbursement
 * requests, issues a fresh single-use signed approval link for each, and
 * emails the digest to the approver. See §6 of the architecture doc —
 * approval is link-based only, never email-reply parsing.
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
    .select("id, submitted_by_name, description, amount")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load pending requests" }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "No pending requests" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://budget.contemplativesemester.org";
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const items = [];
  for (const request of pending) {
    const token = generateApprovalToken();
    const { error: tokenError } = await db.from("reimbursement_approvals").insert({
      reimbursement_id: request.id,
      approval_token: token,
      token_expires_at: expiresAt,
    });
    if (tokenError) continue;

    items.push({
      id: request.id,
      submittedByName: request.submitted_by_name,
      description: request.description,
      amount: Number(request.amount),
      approveUrl: `${appUrl}/approve/${token}`,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "Failed to create tokens" });
  }

  const { subject, html } = weeklyDigestEmail(items, appUrl);
  await resend().emails.send({
    from: EMAIL_FROM,
    to: APPROVER_EMAIL,
    subject,
    html,
  });

  return NextResponse.json({ ok: true, sent: true, count: items.length });
}
