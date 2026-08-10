import { Fragment } from "react";
import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { formatCurrency } from "@/lib/format";
import { getBudgetVsActual, type CategoryActual } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

interface BudgetGroup {
  groupName: string | null;
  combinedTarget: number | null;
  members: CategoryActual[];
}

// Same convention as the admin Categories page: categories whose target is
// combined with a sibling carry a note like "...under 'Fundraising'
// ($295,000 combined)...". Parse it instead of hardcoding the grouping.
const GROUP_NOTE_PATTERN = /under [''']([^''']+)[''']\s*\(([^)]+)\)/;

function parseCombinedTarget(label: string): number | null {
  const match = label.match(/\$([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function groupBudgetVsActual(rows: CategoryActual[]): BudgetGroup[] {
  const groups: BudgetGroup[] = [];
  const byGroupName = new Map<string, BudgetGroup>();

  for (const row of rows) {
    const match = row.notes?.match(GROUP_NOTE_PATTERN);
    if (match) {
      const [, groupName, combinedLabel] = match;
      let group = byGroupName.get(groupName);
      if (!group) {
        group = { groupName, combinedTarget: parseCombinedTarget(combinedLabel), members: [] };
        byGroupName.set(groupName, group);
        groups.push(group);
      }
      group.members.push(row);
    } else {
      groups.push({ groupName: null, combinedTarget: null, members: [row] });
    }
  }
  return groups;
}

export default async function BudgetVsActualPage() {
  const budgetVsActual = await getBudgetVsActual();

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Budget vs. Actual</h1>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          {budgetVsActual.length === 0 ? (
            <EmptyState message="No budget categories found. They come from the ledger import — see the Categories tab for what each one means." />
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
                  {groupBudgetVsActual(budgetVsActual).map((group) => {
                    if (!group.groupName) {
                      const row = group.members[0];
                      return (
                        <tr
                          key={`${row.category}-${row.type}`}
                          className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
                        >
                          <td className="py-2 pr-3">{row.category}</td>
                          <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{row.type}</td>
                          <td className="py-2 pr-3 text-right">{formatCurrency(row.budgetTarget)}</td>
                          <td className="py-2 pr-3 text-right">{formatCurrency(row.actual)}</td>
                          <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                            {row.projected !== 0 ? formatCurrency(row.projected) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">{formatCurrency(row.total)}</td>
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
                      );
                    }

                    const type = group.members[0].type;
                    const actual = group.members.reduce((sum, m) => sum + m.actual, 0);
                    const projected = group.members.reduce((sum, m) => sum + m.projected, 0);
                    const total = actual + projected;
                    const budgetTarget = group.combinedTarget ?? 0;
                    const variance = type === "income" ? total - budgetTarget : budgetTarget - total;

                    return (
                      <Fragment key={group.groupName}>
                        <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
                          <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-neutral-50">
                            {group.groupName}
                          </td>
                          <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{type}</td>
                          <td className="py-2 pr-3 text-right">
                            {budgetTarget > 0 ? formatCurrency(budgetTarget) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right">{formatCurrency(actual)}</td>
                          <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                            {projected !== 0 ? formatCurrency(projected) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">{formatCurrency(total)}</td>
                          <td
                            className={`py-2 text-right ${
                              budgetTarget === 0
                                ? "text-neutral-400 dark:text-neutral-500"
                                : variance < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {budgetTarget > 0 ? formatCurrency(variance) : "no target"}
                          </td>
                        </tr>
                        {group.members.map((row) => (
                          <tr key={`${row.category}-${row.type}`} className="border-b border-neutral-100 dark:border-neutral-800">
                            <td className="py-2 pr-3 pl-6 text-neutral-600 dark:text-neutral-400">{row.category}</td>
                            <td className="py-2 pr-3 capitalize text-neutral-500 dark:text-neutral-400">{row.type}</td>
                            <td className="py-2 pr-3 text-right text-neutral-400 dark:text-neutral-500">—</td>
                            <td className="py-2 pr-3 text-right">{formatCurrency(row.actual)}</td>
                            <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">
                              {row.projected !== 0 ? formatCurrency(row.projected) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-right font-medium">{formatCurrency(row.total)}</td>
                            <td className="py-2 text-right text-neutral-400 dark:text-neutral-500">—</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>;
}
