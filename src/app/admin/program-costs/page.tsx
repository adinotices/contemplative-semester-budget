import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { formatCurrency } from "@/lib/format";
import {
  BELOW_THE_LINE_ROWS,
  EXCLUDED_ROWS,
  GRAND_TOTAL,
  LEDGER_WINDOW_END,
  LEDGER_WINDOW_START,
  OPERATING_ROWS,
  OPERATING_SUBTOTAL,
  SNAPSHOT_DATE,
  TUITION_ROWS,
  type SnapshotRow,
} from "@/lib/data/program-costs-snapshot";

export const dynamic = "force-dynamic";

export default function ProgramCostsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <DashboardTabs />

        <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Program Costs</h1>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          What the second Contemplative Semester cohort cost, mapped onto the categories from the{" "}
          <em>Projected Income &amp; Expenses by Program Year 2025/2026</em> spreadsheet — a different scheme
          from the one the other tabs use.
        </p>

        <SnapshotBanner />

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Expenses by budget category</h2>
            <a
              href="/admin/program-costs/download"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-50"
            >
              Download CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                {OPERATING_ROWS.map((row) => (
                  <Row key={row.category} row={row} />
                ))}
                <Row row={OPERATING_SUBTOTAL} emphasis />
                <tr>
                  <td colSpan={8} className="h-4" />
                </tr>
                {BELOW_THE_LINE_ROWS.map((row) => (
                  <Row key={row.category} row={row} />
                ))}
                <Row row={GRAND_TOTAL} emphasis />
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            Variance is budget minus (actual + projected), so a positive number means under budget. Operating
            expenses come in {formatCurrency(OPERATING_SUBTOTAL.variance ?? 0)} under budget; the{" "}
            {formatCurrency(Math.abs(GRAND_TOTAL.variance ?? 0))} overage on the grand total is entirely the
            scholarship line.
          </p>
        </section>

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">Tuition context</h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            The scholarship figure above only makes sense next to the gross tuition it was discounted from. These
            four rows are why the scholarship expense has no matching cash outflow.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                {TUITION_ROWS.map((row) => (
                  <Row key={row.category} row={row} neutralVariance />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">
            Excluded from the figures above
          </h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Real ledger cash, deliberately left out because it is not a cost of running this cohort.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                {EXCLUDED_ROWS.map((row) => (
                  <Row key={row.category} row={row} neutralVariance />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <h2 className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            This table mixes two accounting bases — read before quoting the total
          </h2>
          <div className="space-y-2 text-sm text-amber-900/90 dark:text-amber-200/90">
            <p>
              Every operating row is <strong className="font-medium">cash</strong> from our own ledger:
              money that actually left an account between {formatDate(LEDGER_WINDOW_START)} and{" "}
              {formatDate(LEDGER_WINDOW_END)}.
            </p>
            <p>
              The Scholarships row is <strong className="font-medium">accrual</strong>, taken from BCBS&apos;s
              general ledger account 4301 — the same source the spreadsheet&apos;s 2024 column used. No money
              moved for it; a scholarship is a discount off tuition. That is why the Budget vs. Actual tab, which
              is pure cash, correctly shows a smaller expense total and is not in conflict with this page.
            </p>
            <p>
              So {formatCurrency(GRAND_TOTAL.actualPlusProjected ?? 0)} answers &ldquo;what did the program
              cost?&rdquo; It does not answer &ldquo;what left the bank?&rdquo; Do not add the scholarship figure
              to the dashboard&apos;s cash totals.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function SnapshotBanner() {
  return (
    <div className="mb-6 rounded-xl border border-neutral-300 bg-neutral-100 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-neutral-50 dark:bg-neutral-200 dark:text-neutral-900">
          Frozen snapshot
        </span>
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          Last updated {formatDate(SNAPSHOT_DATE)}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        These figures are hand-entered and do not update when the ledger changes. The other tabs are live; this
        one is a fixed restatement produced for an outside reader, and it will keep showing the numbers as of the
        date above until someone edits it.
      </p>
    </div>
  );
}

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <th className="py-2 pr-3 font-medium">Category</th>
        <th className="py-2 pr-3 text-right font-medium">Budget</th>
        <th className="py-2 pr-3 text-right font-medium">Actual 2025</th>
        <th className="py-2 pr-3 text-right font-medium">Actual 2026</th>
        <th className="py-2 pr-3 text-right font-medium">Total Actual</th>
        <th className="py-2 pr-3 text-right font-medium">Still Projected</th>
        <th className="py-2 pr-3 text-right font-medium">Actual + Projected</th>
        <th className="py-2 text-right font-medium">Variance</th>
      </tr>
    </thead>
  );
}

function Row({
  row,
  emphasis = false,
  neutralVariance = false,
}: {
  row: SnapshotRow;
  emphasis?: boolean;
  neutralVariance?: boolean;
}) {
  const varianceClass =
    row.variance === null || neutralVariance
      ? "text-neutral-500 dark:text-neutral-400"
      : row.variance < 0
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <tr
      className={`border-b border-neutral-100 dark:border-neutral-800 ${
        emphasis ? "bg-neutral-50 font-medium dark:bg-neutral-800/50" : ""
      }`}
    >
      <td className="py-2 pr-3 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <span className={emphasis ? "text-neutral-900 dark:text-neutral-50" : ""}>{row.category}</span>
          {row.basis !== "cash" && <BasisPill basis={row.basis} />}
        </div>
        {row.notes && (
          <p className="mt-0.5 max-w-md text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.notes}</p>
        )}
      </td>
      <Amount value={row.budget} />
      <Amount value={row.actual2025} muted />
      <Amount value={row.actual2026} muted />
      <Amount value={row.totalActual} />
      <Amount value={row.stillProjected} muted zeroAsDash />
      <Amount value={row.actualPlusProjected} />
      <td className={`py-2 text-right align-top tabular-nums ${varianceClass}`}>
        {row.variance === null ? "—" : formatCurrency(row.variance)}
      </td>
    </tr>
  );
}

function Amount({
  value,
  muted = false,
  zeroAsDash = false,
}: {
  value: number | null;
  muted?: boolean;
  zeroAsDash?: boolean;
}) {
  const dash = value === null || (zeroAsDash && value === 0);
  return (
    <td
      className={`py-2 pr-3 text-right align-top tabular-nums ${
        dash || muted ? "text-neutral-500 dark:text-neutral-400" : ""
      }`}
    >
      {dash ? "—" : formatCurrency(value as number)}
    </td>
  );
}

function BasisPill({ basis }: { basis: SnapshotRow["basis"] }) {
  return (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
      {basis === "mixed" ? "mixed basis" : "accrual"}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
