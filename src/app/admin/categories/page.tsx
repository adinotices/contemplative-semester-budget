import { NavBar } from "@/components/nav-bar";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { CategoryForm } from "./category-form";

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
        <h1 className="mb-6 text-2xl font-semibold">Budget Categories</h1>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
          <CategoryForm />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Target</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 capitalize text-neutral-500">{c.type}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(c.budget_target))}</td>
                  <td className="py-2 text-neutral-500">{c.notes}</td>
                </tr>
              ))}
              {(categories ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-400">
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
