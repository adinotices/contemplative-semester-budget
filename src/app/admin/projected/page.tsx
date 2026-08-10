import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

interface ProjectedTransaction {
  id: string;
  date: string;
  category: string;
  payee: string | null;
  description: string | null;
  amount: number | string;
  notes: string | null;
}

export default async function ProjectedTransactionsPage() {
  const { data: transactions } = await supabaseAdmin()
    .from("transactions")
    .select("id, date, direction, category, payee, description, amount, notes")
    .eq("status", "projected")
    .order("date");

  const income = (transactions ?? []).filter((t) => t.direction === "income");
  const expense = (transactions ?? []).filter((t) => t.direction === "expense");

  const incomeTotal = income.reduce((sum, t) => sum + Number(t.amount), 0);
  const expenseTotal = expense.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Projected Transactions</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Known but not yet paid or received — excluded from actuals-only totals elsewhere in the dashboard.
        </p>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Income</h2>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {formatCurrency(incomeTotal)}
            </span>
          </div>
          <ProjectedTable rows={income} emptyMessage="No projected income." />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Expense</h2>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {formatCurrency(expenseTotal)}
            </span>
          </div>
          <ProjectedTable rows={expense} emptyMessage="No projected expenses." />
        </div>
      </main>
    </div>
  );
}

function ProjectedTable({ rows, emptyMessage }: { rows: ProjectedTransaction[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">{emptyMessage}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 pr-3 font-medium">Date</th>
          <th className="py-2 pr-3 font-medium">Category</th>
          <th className="py-2 pr-3 font-medium">Description</th>
          <th className="py-2 pr-3 text-right font-medium">Amount</th>
          <th className="py-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr
            key={t.id}
            className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
          >
            <td className="py-2 pr-3 text-neutral-500 dark:text-neutral-400">{t.date}</td>
            <td className="py-2 pr-3">{t.category}</td>
            <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-300">{t.payee ?? t.description ?? "—"}</td>
            <td className="py-2 pr-3 text-right">{formatCurrency(Number(t.amount))}</td>
            <td className="py-2 text-neutral-500 dark:text-neutral-400">{t.notes ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
