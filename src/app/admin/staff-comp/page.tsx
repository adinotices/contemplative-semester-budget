import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

interface StaffCompRow {
  id: string;
  staff_name: string;
  period: string;
  amount: number | string;
  notes: string | null;
}

interface StaffCompGroup {
  staffName: string;
  periodLabel: string;
  actual: number;
  projected: number;
  notes: string[];
}

// Source rows come as one line per staff member per period-type, e.g.
// "Actual to date (2025–26)" and "Projected remaining (2025–26)". Pivot
// those into a single row per person per period with Actual/Projected/Total
// columns instead of duplicating the name across rows.
const PERIOD_TYPE_PATTERN = /^(actual|projected)/i;
const PERIOD_LABEL_PATTERN = /\(([^)]+)\)\s*$/;

function groupStaffComp(rows: StaffCompRow[]): StaffCompGroup[] {
  const groups: StaffCompGroup[] = [];
  const byKey = new Map<string, StaffCompGroup>();

  for (const r of rows) {
    const isProjected = PERIOD_TYPE_PATTERN.test(r.period) && /^projected/i.test(r.period);
    const periodLabel = r.period.match(PERIOD_LABEL_PATTERN)?.[1] ?? r.period;
    const key = `${r.staff_name}::${periodLabel}`;

    let group = byKey.get(key);
    if (!group) {
      group = { staffName: r.staff_name, periodLabel, actual: 0, projected: 0, notes: [] };
      byKey.set(key, group);
      groups.push(group);
    }

    const amount = Number(r.amount);
    if (isProjected) group.projected += amount;
    else group.actual += amount;
    if (r.notes) group.notes.push(r.notes);
  }

  return groups.sort((a, b) => a.staffName.localeCompare(b.staffName));
}

export default async function StaffCompPage() {
  const db = supabaseAdmin();
  const [{ data: rows }, { data: ledger }] = await Promise.all([
    db.from("staff_compensation").select("id, staff_name, period, amount, notes").order("staff_name"),
    db.from("transactions").select("status, amount").eq("category", "Compensation"),
  ]);

  const groups = groupStaffComp(rows ?? []);

  // This table and the Compensation line on Budget vs. Actual describe the
  // same money from two tables, and they silently drifted apart once before
  // (staff_compensation was a frozen snapshot while transactions kept being
  // imported). Compare them on every render so a future drift is visible
  // here instead of being discovered by someone reconciling by hand.
  const totals = groups.reduce(
    (acc, g) => ({ actual: acc.actual + g.actual, projected: acc.projected + g.projected }),
    { actual: 0, projected: 0 },
  );
  const ledgerTotals = (ledger ?? []).reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.status === "projected") acc.projected += amount;
      else acc.actual += amount;
      return acc;
    },
    { actual: 0, projected: 0 },
  );
  const drift = {
    actual: totals.actual - ledgerTotals.actual,
    projected: totals.projected - ledgerTotals.projected,
  };
  const inSync = Math.abs(drift.actual) < 0.005 && Math.abs(drift.projected) < 0.005;

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Staff Compensation</h1>

        {inSync ? (
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
            Totals agree with the Compensation line in the ledger ({formatCurrency(totals.actual)} actual,{" "}
            {formatCurrency(totals.projected)} projected).
          </p>
        ) : (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              This table disagrees with the Compensation line in the ledger.
            </p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              Actual: {formatCurrency(totals.actual)} here vs {formatCurrency(ledgerTotals.actual)} in the ledger (
              {formatCurrency(drift.actual)}). Projected: {formatCurrency(totals.projected)} vs{" "}
              {formatCurrency(ledgerTotals.projected)} ({formatCurrency(drift.projected)}). Budget vs. Actual uses the
              ledger figure, so that one is authoritative until this table is brought back in line.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="py-2 pr-3 font-medium">Staff</th>
                <th className="py-2 pr-3 font-medium">Period</th>
                <th className="py-2 pr-3 text-right font-medium">Actual</th>
                <th className="py-2 pr-3 text-right font-medium">Projected</th>
                <th className="py-2 pr-3 text-right font-medium">Actual + Projected</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={`${g.staffName}::${g.periodLabel}`}
                  className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
                >
                  <td className="py-2 pr-3">{g.staffName}</td>
                  <td className="py-2 pr-3 text-neutral-500 dark:text-neutral-400">{g.periodLabel}</td>
                  <td className="py-2 pr-3 text-right">{g.actual !== 0 ? formatCurrency(g.actual) : "—"}</td>
                  <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                    {g.projected !== 0 ? formatCurrency(g.projected) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium">{formatCurrency(g.actual + g.projected)}</td>
                  <td className="py-2 text-neutral-500 dark:text-neutral-400">{g.notes.join("; ")}</td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-neutral-400 dark:text-neutral-500">
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
