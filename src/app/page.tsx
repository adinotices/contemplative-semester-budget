import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { formatCurrency } from "@/lib/format";
import { getCashPosition, getProjectedTotals } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cash = await getCashPosition();
  const projected = await getProjectedTotals(cash);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <DashboardTabs />
        {/* Visually redundant with the "Overview" tab, but kept for screen
            readers and the document outline. */}
        <h1 className="sr-only">Budget Dashboard</h1>

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
