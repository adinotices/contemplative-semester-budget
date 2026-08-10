import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffCompPage() {
  const { data: rows } = await supabaseAdmin()
    .from("staff_compensation")
    .select("id, staff_name, period, amount, status, notes")
    .order("period", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Staff Compensation</h1>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="py-2 pr-3 font-medium">Staff</th>
                <th className="py-2 pr-3 font-medium">Period</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-3">{r.staff_name}</td>
                  <td className="py-2 pr-3">{r.period}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(Number(r.amount))}</td>
                  <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{r.status}</td>
                  <td className="py-2 text-neutral-500 dark:text-neutral-400">{r.notes}</td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-neutral-400 dark:text-neutral-500">
                    No staff compensation records yet.
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
