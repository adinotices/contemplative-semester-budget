import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { ApproveActions } from "./approve-actions";

export const dynamic = "force-dynamic";

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

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: batch } = await db
    .from("digest_batches")
    .select("id, token_expires_at, approved_at")
    .eq("approval_token", token)
    .maybeSingle();

  if (!batch) {
    return <StatusCard title="Link not found" message="This approval link is invalid." />;
  }
  if (batch.approved_at) {
    return <StatusCard title="Already sent" message="This batch has already been sent to the accountant." />;
  }
  if (new Date(batch.token_expires_at) < new Date()) {
    return <StatusCard title="Link expired" message="This approval link has expired." />;
  }

  const { data: rows } = await db
    .from("digest_batch_items")
    .select("sequence_number, reimbursement_requests(id, submitted_by_name, description, amount, receipt_url, status)")
    .eq("batch_id", batch.id)
    .order("sequence_number");

  const pendingRows = ((rows as unknown as BatchItemRow[]) ?? []).filter(
    (row) => row.reimbursement_requests?.status === "pending",
  );

  if (pendingRows.length === 0) {
    return (
      <StatusCard
        title="Nothing to review"
        message="These items were already processed via a different batch."
      />
    );
  }

  const groups = new Map<string, BatchItemRow[]>();
  for (const row of pendingRows) {
    const name = row.reimbursement_requests!.submitted_by_name;
    const existing = groups.get(name);
    if (existing) existing.push(row);
    else groups.set(name, [row]);
  }

  const grandTotal = pendingRows.reduce((sum, row) => sum + Number(row.reimbursement_requests!.amount), 0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">Review Reimbursement Batch</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          {pendingRows.length} item{pendingRows.length === 1 ? "" : "s"} — this is exactly what will be
          emailed to the accountant, receipts attached, if you approve.
        </p>

        <div className="mb-6 space-y-6">
          {Array.from(groups.entries()).map(([name, groupRows]) => {
            const subtotal = groupRows.reduce((sum, row) => sum + Number(row.reimbursement_requests!.amount), 0);
            return (
              <div key={name}>
                <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{name}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      <th className="py-1.5 pr-2 font-medium">ID</th>
                      <th className="py-1.5 pr-2 font-medium">Description</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Amount</th>
                      <th className="py-1.5 pl-2 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.reimbursement_requests!.id} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-1.5 pr-2 font-mono text-neutral-500 dark:text-neutral-400">R{row.sequence_number}</td>
                        <td className="py-1.5 pr-2">{row.reimbursement_requests!.description}</td>
                        <td className="py-1.5 pr-2 text-right">
                          {formatCurrency(Number(row.reimbursement_requests!.amount))}
                        </td>
                        <td className="py-1.5 pl-2">
                          {row.reimbursement_requests!.receipt_url ? (
                            <a
                              href={row.reimbursement_requests!.receipt_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">none</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-1.5 pr-2" colSpan={2}>
                        Total — {name}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{formatCurrency(subtotal)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <p className="mb-6 text-lg font-bold text-neutral-900 dark:text-neutral-50">Grand total: {formatCurrency(grandTotal)}</p>

        <ApproveActions token={token} />
      </div>
    </div>
  );
}

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
      </div>
    </div>
  );
}
