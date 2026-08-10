import { Fragment } from "react";
import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Category {
  id: string;
  name: string;
  budget_target: number | string;
  notes: string | null;
}

interface CategoryGroup {
  groupName: string | null;
  combinedLabel: string | null;
  members: Category[];
}

// Categories whose budget target is combined with a sibling in the source
// spreadsheet carry a note like "...under 'Fundraising' ($295,000 combined)...".
// Parse that instead of hardcoding the grouping, so it stays correct if the
// underlying data changes.
const GROUP_NOTE_PATTERN = /under [''']([^''']+)[''']\s*\(([^)]+)\)/;

function groupCategories(categories: Category[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const byGroupName = new Map<string, CategoryGroup>();

  for (const c of categories) {
    const match = c.notes?.match(GROUP_NOTE_PATTERN);
    if (match) {
      const [, groupName, combinedLabel] = match;
      let group = byGroupName.get(groupName);
      if (!group) {
        group = { groupName, combinedLabel, members: [] };
        byGroupName.set(groupName, group);
        groups.push(group);
      }
      group.members.push(c);
    } else {
      groups.push({ groupName: null, combinedLabel: null, members: [c] });
    }
  }
  return groups;
}

export default async function CategoriesPage() {
  const { data: categories } = await supabaseAdmin()
    .from("budget_categories")
    .select("id, name, type, budget_target, notes")
    .order("name");

  const expenses = (categories ?? []).filter((c) => c.type === "expense");
  const income = (categories ?? []).filter((c) => c.type === "income");

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Budget Categories</h1>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Expenses</h2>
          <CategoryTable categories={expenses} emptyMessage="No expense categories yet." />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Income</h2>
          <CategoryTable categories={income} emptyMessage="No income categories yet." />
        </div>
      </main>
    </div>
  );
}

function CategoryTable({ categories, emptyMessage }: { categories: Category[]; emptyMessage: string }) {
  if (categories.length === 0) {
    return <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">{emptyMessage}</p>;
  }

  const groups = groupCategories(categories);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 pr-3 font-medium">Name</th>
          <th className="py-2 pr-3 text-right font-medium">Target</th>
          <th className="py-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) =>
          group.groupName ? (
            <Fragment key={group.groupName}>
              <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50">
                <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-neutral-50">{group.groupName}</td>
                <td className="py-2 pr-3 text-right text-neutral-500 dark:text-neutral-400">combined</td>
                <td className="py-2 text-neutral-500 dark:text-neutral-400">{group.combinedLabel}</td>
              </tr>
              {group.members.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-3 pl-6 text-neutral-600 dark:text-neutral-400">{c.name}</td>
                  <td className="py-2 pr-3 text-right text-neutral-400 dark:text-neutral-500">—</td>
                  <td className="py-2" />
                </tr>
              ))}
            </Fragment>
          ) : (
            group.members.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="py-2 pr-3">{c.name}</td>
                <td className="py-2 pr-3 text-right">{formatCurrency(Number(c.budget_target))}</td>
                <td className="py-2 text-neutral-500 dark:text-neutral-400">{c.notes}</td>
              </tr>
            ))
          )
        )}
      </tbody>
    </table>
  );
}
