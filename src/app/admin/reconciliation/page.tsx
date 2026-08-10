import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getReconciliationSummary } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const db = supabaseAdmin();

  const [summary, { data: matched }] = await Promise.all([
    getReconciliationSummary(),
    db.from("reconciliation_matches").select("transaction_id, bcbs_transaction_id").neq("status", "unmatched"),
  ]);

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

  const { accrual } = summary;

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Reconciliation</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Internal ledger vs. BCBS&apos;s full Contemplative Semester books (not just cash accounts).
        </p>

        {/* Top: merged discrepancy panel */}
        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">Discrepancy</h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {formatDate(accrual.windowStart)}–{formatDate(accrual.windowEnd)}: our cash-basis ledger (money actually
            received/paid) vs. BCBS&apos;s accrual-basis P&amp;L for Contemplative Semester (revenue/expense
            recognized when earned, e.g. tuition booked in full at enrollment — not when cash moves). Most of this
            gap is timing, not missing money.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GapCard
              label="Income Gap (Internal cash − BCBS accrual)"
              value={accrual.incomeGap}
              detail={`${formatCurrency(accrual.internalIncome)} vs ${formatCurrency(accrual.bcbsIncome)}`}
            />
            <GapCard
              label="Expense Gap (Internal cash − BCBS accrual)"
              value={accrual.expenseGap}
              detail={`${formatCurrency(accrual.internalExpense)} vs ${formatCurrency(accrual.bcbsExpense)}`}
            />
          </div>
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            Separately, on a pure cash basis restricted to the internal ledger&apos;s own date range,{" "}
            {summary.matchedCount} of {summary.bcbsCount} BCBS cash-account lines have been matched to a specific
            internal transaction so far (see Unmatched detail below).
          </p>
        </section>

        {/* Bottom-left / bottom-right */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">
              High Level Internal Numbers
            </h2>
            <dl className="space-y-3">
              <StatRow label="Starting Balance" value={formatCurrency(summary.internal.startingBalance)} />
              <StatRow label="Total Income (actual)" value={formatCurrency(summary.internal.totalIncome)} />
              <StatRow label="Total Expense (actual)" value={formatCurrency(summary.internal.totalExpense)} />
              <StatRow
                label="Current Money in Bank"
                value={formatCurrency(summary.internal.net)}
                highlight={summary.internal.net >= 0 ? "positive" : "negative"}
              />
            </dl>
            <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
              {formatDate(summary.internal.earliestDate)} – {formatDate(summary.internal.latestDate)} ·{" "}
              {summary.transactionCount} transactions
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">
              BCBS High Level Numbers
            </h2>
            <dl className="space-y-3">
              <StatRow
                label="Money in the Bank (BCBS balance sheet)"
                value={formatCurrency(summary.balanceSheetCash.amount)}
                highlight="positive"
              />
              <StatRow label="Accrual Total Income (P&L)" value={formatCurrency(accrual.bcbsIncome)} />
              <StatRow label="Accrual Total Expense (P&L)" value={formatCurrency(accrual.bcbsExpense)} />
            </dl>
            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              Money in the bank as of {formatDate(summary.balanceSheetCash.asOf)} (BCBS balance sheet). Accrual P&amp;L
              covers {formatDate(accrual.windowStart)}–{formatDate(accrual.windowEnd)}.
            </p>
            <dl className="mt-4 space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <StatRow label="Cash-Account Income (all-time)" value={formatCurrency(summary.bcbs.totalIncome)} />
              <StatRow label="Cash-Account Expense (all-time)" value={formatCurrency(summary.bcbs.totalExpense)} />
            </dl>
            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              {formatDate(summary.bcbs.earliestDate)} – {formatDate(summary.bcbs.latestDate)} · {summary.bcbsCount}{" "}
              lines, Bill.com + Fidelity Checking only
            </p>
          </div>
        </div>

        <h2 className="mb-3 text-lg font-medium text-neutral-900 dark:text-neutral-50">Unmatched detail</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <UnmatchedTable title="Unmatched — internal ledger" rows={unmatchedTx} />
          <UnmatchedTable title="Unmatched — BCBS export" rows={unmatchedBcbs} />
        </div>
      </main>
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return date;
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  const color =
    highlight === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-900 dark:text-neutral-50";
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-sm text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className={`text-lg font-semibold ${color}`}>{value}</dd>
    </div>
  );
}

function GapCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const isZero = Math.abs(value) < 0.5;
  const color = isZero ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{formatCurrency(value)}</p>
      {detail && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{detail}</p>}
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
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
            >
              <td className="py-2 text-neutral-500 dark:text-neutral-400">{r.date}</td>
              <td className="py-2">{r.description}</td>
              <td className="py-2 text-right">{formatCurrency(Number(r.amount))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-4 text-center text-neutral-400 dark:text-neutral-500">Nothing unmatched.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
