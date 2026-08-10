import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { data: categories } = await supabaseAdmin()
    .from("budget_categories")
    .select("id, name, type, budget_target, notes")
    .order("name");

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Budget Categories</h1>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 text-right font-medium">Target</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{c.type}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(Number(c.budget_target))}</td>
                  <td className="py-2 text-neutral-500 dark:text-neutral-400">{c.notes}</td>
                </tr>
              ))}
              {(categories ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-400 dark:text-neutral-500">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
