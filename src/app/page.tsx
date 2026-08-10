import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { formatCurrency } from "@/lib/format";
import {
  getBudgetVsActual,
  getCashPosition,
  getCategoryBreakdown,
  getProjectedTotals,
  type CategoryBreakdownRow,
} from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cash, budgetVsActual, breakdown] = await Promise.all([
    getCashPosition(),
    getBudgetVsActual(),
    getCategoryBreakdown(),
  ]);
  const projected = await getProjectedTotals(cash);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Budget Dashboard</h1>

        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Starting Balance (Jan 2025)" value={formatCurrency(cash.startingBalance)} small />
          <StatCard label="Total Income (actual)" value={formatCurrency(cash.totalIncome)} small />
          <StatCard label="Total Expense (actual)" value={formatCurrency(cash.totalExpense)} small />
          <StatCard
            label="Current Money in Bank (actuals only)"
            value={formatCurrency(cash.currentMoneyInBank)}
            highlight={cash.currentMoneyInBank >= 0 ? "positive" : "negative"}
          />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Projected Net (not yet paid/received)"
            value={formatCurrency(projected.projectedNet)}
            highlight={projected.projectedNet >= 0 ? "positive" : "negative"}
            small
          />
          <StatCard
            label="Projected Remaining After All Obligations"
            value={formatCurrency(projected.projectedEndingBalance)}
            highlight={projected.projectedEndingBalance >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label={`Variance vs ${formatCurrency(cash.remainingBalanceTarget)} Target`}
            value={formatCurrency(projected.varianceVsTarget)}
            highlight={projected.varianceVsTarget >= 0 ? "positive" : "negative"}
            small
          />
        </section>

        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Budget vs. Actual</h2>
          {budgetVsActual.length === 0 ? (
            <EmptyState message="No budget categories configured yet. Add them under Admin → Categories." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 text-right font-medium">Budget</th>
                    <th className="py-2 pr-3 text-right font-medium">Actual</th>
                    <th className="py-2 pr-3 text-right font-medium">Projected</th>
                    <th className="py-2 pr-3 text-right font-medium">Total</th>
                    <th className="py-2 text-right font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetVsActual.map((row) => (
                    <tr
                      key={`${row.category}-${row.type}`}
                      className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
                    >
                      <td className="py-2 pr-3">{row.category}</td>
                      <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{row.type}</td>
                      <td className="py-2 pr-3 text-right">
                        {row.budgetTarget > 0 ? formatCurrency(row.budgetTarget) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(row.actual)}</td>
                      <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                        {row.projected !== 0 ? formatCurrency(row.projected) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">{formatCurrency(row.total)}</td>
                      <td
                        className={`py-2 text-right ${
                          row.budgetTarget === 0
                            ? "text-neutral-400 dark:text-neutral-500"
                            : row.variance < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {row.budgetTarget > 0 ? formatCurrency(row.variance) : "no target"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Category Breakdown — Income (actual)</h2>
          <CategoryBreakdownTable
            rows={breakdown.filter((row) => row.direction === "income")}
            emptyMessage="No income transactions recorded yet."
          />
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Category Breakdown — Expense (actual)</h2>
          <CategoryBreakdownTable
            rows={breakdown.filter((row) => row.direction === "expense")}
            emptyMessage="No expense transactions recorded yet."
          />
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
  small?: boolean;
}) {
  const color =
    highlight === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-900 dark:text-neutral-50";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 font-semibold ${small ? "text-xl" : "text-2xl"} ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>;
}

function CategoryBreakdownTable({ rows, emptyMessage }: { rows: CategoryBreakdownRow[]; emptyMessage: string }) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 pr-3 font-medium">Category</th>
          <th className="py-2 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.category}
            className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
          >
            <td className="py-2 pr-3">{row.category}</td>
            <td className="py-2 text-right">{formatCurrency(row.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
