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
            {formatDate(accrual.windowStart)}–{formatDate(accrual.windowEnd)}. The two figures below are{" "}
            <strong className="font-medium text-neutral-700 dark:text-neutral-300">expected to be large</strong> —
            they compare a cash-basis ledger to an accrual-basis one, which is a units mismatch, not a shortfall.
            BCBS books scholarships as an expense ($240,260 here) where we have no row at all, because a scholarship
            is a discount rather than money leaving an account; that single line accounts for most of the expense
            gap. Likewise BCBS recognized $477,400 of course income in one entry when the course ran, while we
            recorded tuition payment by payment as it arrived. Neither side is wrong. Gaps near zero here would be
            the surprising result.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GapCard
              label="Income Gap (Internal cash − BCBS accrual)"
              value={accrual.incomeGap}
              detail={`${formatCurrency(accrual.internalIncome)} vs ${formatCurrency(accrual.bcbsIncome)}`}
              lines={summary.bridge.income}
            />
            <GapCard
              label="Expense Gap (Internal cash − BCBS accrual)"
              value={accrual.expenseGap}
              detail={`${formatCurrency(accrual.internalExpense)} vs ${formatCurrency(accrual.bcbsExpense)}`}
              lines={summary.bridge.expense}
            />
          </div>

          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Fund Balance Gap at {formatDate(summary.fundBalance.asOf)} (Internal − BCBS)
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                Math.abs(summary.fundBalance.gap) < 0.5
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {formatCurrency(summary.fundBalance.gap)}
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {formatCurrency(summary.fundBalance.internal)} in this ledger vs{" "}
              {formatCurrency(summary.fundBalance.bcbsRestrictedFund)} in BCBS&apos;s restricted fund at the one date
              both sets of books cover. Unlike the two gaps above, both sides here are answering the same question —
              what the program holds at a moment in time — which makes this the one worth asking BCBS about.{" "}
              <strong className="font-medium">It is still not a pure like-for-like:</strong> ours is cash in minus
              cash out, while theirs is a net-asset balance that also reflects bills incurred but unpaid ($38,565.80
              in payables) and cash collected but not yet earned ($115,300 deferred), both of which legitimately push
              our figure higher than theirs. Treat this as a question for Melissa, not a proven discrepancy.
            </p>
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
                label={`Restricted Fund Balance (${formatDate(summary.fundBalance.asOf)})`}
                value={formatCurrency(summary.fundBalance.bcbsRestrictedFund)}
              />
              <StatRow label="Accrual Total Income (P&L)" value={formatCurrency(accrual.bcbsIncome)} />
              <StatRow label="Accrual Total Expense (P&L)" value={formatCurrency(accrual.bcbsExpense)} />
            </dl>
            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              Fund balance is BCBS&apos;s closing balance on &ldquo;Temporarily Restricted Fund: Contemplative
              Semester&rdquo; at {formatDate(summary.fundBalance.asOf)}, where their general ledger ends. BCBS&apos;s
              books hold no cash-in-bank figure scoped to this program. Accrual P&amp;L covers{" "}
              {formatDate(accrual.windowStart)}–{formatDate(accrual.windowEnd)}.
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

interface BridgeLine {
  label: string;
  amount: number;
  detail: string;
}

/**
 * Hover/focus disclosure. Deliberately CSS-only (group-hover + focus-within)
 * so this page stays a server component and the explanation is reachable by
 * keyboard, not just mouse.
 */
function GapTooltip({ lines, total }: { lines: BridgeLine[]; total: number }) {
  return (
    <span className="group relative inline-block align-middle">
      <button
        type="button"
        aria-label="Explain this gap"
        className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-neutral-400 text-[10px] font-semibold leading-none text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-400 dark:hover:text-neutral-200"
      >
        i
      </button>
      <span className="pointer-events-none invisible absolute left-0 top-6 z-20 w-[22rem] max-w-[80vw] rounded-lg border border-neutral-200 bg-white p-3 text-left opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-neutral-700 dark:bg-neutral-900">
        <span className="mb-2 block text-xs font-medium text-neutral-700 dark:text-neutral-200">
          What makes up this gap
        </span>
        {lines.map((line) => (
          <span key={line.label} className="mb-2 block border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{line.label}</span>
              <span className="shrink-0 font-mono text-xs text-neutral-900 dark:text-neutral-50">
                {formatCurrency(-line.amount)}
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
              {line.detail}
            </span>
          </span>
        ))}
        <span className="flex items-baseline justify-between gap-3 pt-1">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">Total</span>
          <span className="shrink-0 font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-50">
            {formatCurrency(total)}
          </span>
        </span>
      </span>
    </span>
  );
}

function GapCard({
  label,
  value,
  detail,
  lines,
}: {
  label: string;
  value: number;
  detail?: string;
  lines?: BridgeLine[];
}) {
  const isZero = Math.abs(value) < 0.5;
  const color = isZero ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
  // The bridge is stated as BCBS-minus-ours; the card shows ours-minus-BCBS.
  const bridgeTotal = lines ? -lines.reduce((sum, l) => sum + l.amount, 0) : 0;
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
      <p className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
        {label}
        {lines && lines.length > 0 && <GapTooltip lines={lines} total={bridgeTotal} />}
      </p>
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
