import { NavBar } from "@/components/nav-bar";
import { formatCurrency } from "@/lib/format";
import {
  getBudgetVsActual,
  getCashPosition,
  getCategoryBreakdown,
} from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cash, budgetVsActual, breakdown] = await Promise.all([
    getCashPosition(),
    getBudgetVsActual(),
    getCategoryBreakdown(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Budget Dashboard</h1>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Income" value={formatCurrency(cash.totalIncome)} />
          <StatCard label="Total Expense" value={formatCurrency(cash.totalExpense)} />
          <StatCard
            label="Net Cash Position"
            value={formatCurrency(cash.netCash)}
            highlight={cash.netCash >= 0 ? "positive" : "negative"}
          />
        </section>

        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Budget vs. Actual</h2>
          {budgetVsActual.length === 0 ? (
            <EmptyState message="No budget categories configured yet. Add them under Admin → Categories." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Budget</th>
                  <th className="py-2 text-right font-medium">Actual</th>
                  <th className="py-2 text-right font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {budgetVsActual.map((row) => (
                  <tr key={`${row.category}-${row.type}`} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{row.category}</td>
                    <td className="py-2 capitalize text-neutral-500 dark:text-neutral-400">{row.type}</td>
                    <td className="py-2 text-right">{formatCurrency(row.budgetTarget)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.actual)}</td>
                    <td
                      className={`py-2 text-right ${
                        row.variance < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatCurrency(row.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Category Breakdown</h2>
          {breakdown.length === 0 ? (
            <EmptyState message="No transactions recorded yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Direction</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={`${row.category}-${row.direction}`} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{row.category}</td>
                    <td className="py-2 capitalize text-neutral-500 dark:text-neutral-400">{row.direction}</td>
                    <td className="py-2 text-right">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
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
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>;
}
