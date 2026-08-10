import { NavBar } from "@/components/nav-bar";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { MatchForm } from "./match-form";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const db = supabaseAdmin();

  const { data: matched } = await db
    .from("reconciliation_matches")
    .select("transaction_id, bcbs_transaction_id")
    .neq("status", "unmatched");

  const matchedTxIds = new Set((matched ?? []).map((m) => m.transaction_id));
  const matchedBcbsIds = new Set((matched ?? []).map((m) => m.bcbs_transaction_id));

  const [{ data: transactions }, { data: bcbsTransactions }] = await Promise.all([
    db.from("transactions").select("id, date, description, amount").order("date", { ascending: false }).limit(100),
    db
      .from("bcbs_transactions")
      .select("id, date, description, amount")
      .order("date", { ascending: false })
      .limit(100),
  ]);

  const unmatchedTx = (transactions ?? []).filter((t) => !matchedTxIds.has(t.id));
  const unmatchedBcbs = (bcbsTransactions ?? []).filter((b) => !matchedBcbsIds.has(b.id));

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Reconciliation</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Match internal ledger transactions against BCBS export lines. Requires BCBS exports to be
          imported first (§5, Phase 5 — blocked on a standing monthly export from Meredith).
        </p>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-neutral-700">Manual match</h2>
          <MatchForm
            transactions={unmatchedTx.map((t) => ({
              id: t.id,
              label: `${t.date} — ${t.description ?? "(no description)"} — ${formatCurrency(Number(t.amount))}`,
            }))}
            bcbsTransactions={unmatchedBcbs.map((b) => ({
              id: b.id,
              label: `${b.date} — ${b.description ?? "(no description)"} — ${formatCurrency(Number(b.amount))}`,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <UnmatchedTable title="Unmatched — internal ledger" rows={unmatchedTx} />
          <UnmatchedTable title="Unmatched — BCBS export" rows={unmatchedBcbs} />
        </div>
      </main>
    </div>
  );
}

function UnmatchedTable({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; date: string; description: string | null; amount: number | string }[];
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-neutral-700">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100">
              <td className="py-2 text-neutral-500">{r.date}</td>
              <td className="py-2">{r.description}</td>
              <td className="py-2 text-right">{formatCurrency(Number(r.amount))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-4 text-center text-neutral-400">Nothing unmatched.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
