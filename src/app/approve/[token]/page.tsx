import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { ApproveActions } from "./approve-actions";

export const dynamic = "force-dynamic";

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: approval } = await db
    .from("reimbursement_approvals")
    .select("id, token_expires_at, approved_at, reimbursement_id")
    .eq("approval_token", token)
    .maybeSingle();

  if (!approval) {
    return <StatusCard title="Link not found" message="This approval link is invalid." />;
  }

  const { data: request } = await db
    .from("reimbursement_requests")
    .select("submitted_by_name, submitted_by_email, submitted_by_phone, description, amount, receipt_url, status, submitted_via")
    .eq("id", approval.reimbursement_id)
    .maybeSingle();

  if (!request) {
    return <StatusCard title="Request not found" message="The linked reimbursement request no longer exists." />;
  }

  if (request.status !== "pending") {
    return (
      <StatusCard
        title="Already reviewed"
        message={`This request has already been marked "${request.status}".`}
      />
    );
  }

  if (new Date(approval.token_expires_at) < new Date()) {
    return <StatusCard title="Link expired" message="This approval link has expired." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Review Reimbursement</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Submitted via {request.submitted_via === "web" ? "web form" : "WhatsApp"}
        </p>

        <dl className="mb-6 space-y-2 text-sm">
          <Row label="Submitted by" value={request.submitted_by_name} />
          {request.submitted_by_email && <Row label="Email" value={request.submitted_by_email} />}
          {request.submitted_by_phone && <Row label="Phone" value={request.submitted_by_phone} />}
          <Row label="Description" value={request.description} />
          <Row label="Amount" value={formatCurrency(Number(request.amount))} />
          {request.receipt_url && (
            <Row
              label="Receipt"
              value={
                <a href={request.receipt_url} target="_blank" rel="noreferrer" className="underline">
                  View receipt
                </a>
              }
            />
          )}
        </dl>

        <ApproveActions token={token} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{value}</dd>
    </div>
  );
}

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-neutral-900">{title}</h1>
        <p className="text-sm text-neutral-500">{message}</p>
      </div>
    </div>
  );
}
