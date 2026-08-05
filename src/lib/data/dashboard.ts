import { supabaseAdmin } from "@/lib/supabase/server";

export interface CashPosition {
  totalIncome: number;
  totalExpense: number;
  netCash: number;
}

export interface CategoryActual {
  category: string;
  type: "income" | "expense";
  budgetTarget: number;
  actual: number;
  variance: number;
}

/**
 * Server-only dashboard queries. Callers must already be authorized
 * (enforced by middleware + the admin-only page wrapper); these queries
 * use the service role and do not re-check RLS.
 */
export async function getCashPosition(): Promise<CashPosition> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("transactions").select("direction, amount");
  if (error) throw error;

  let totalIncome = 0;
  let totalExpense = 0;
  for (const row of data ?? []) {
    if (row.direction === "income") totalIncome += Number(row.amount);
    else totalExpense += Number(row.amount);
  }

  return { totalIncome, totalExpense, netCash: totalIncome - totalExpense };
}

export async function getBudgetVsActual(): Promise<CategoryActual[]> {
  const db = supabaseAdmin();
  const [{ data: categories, error: catErr }, { data: transactions, error: txErr }] =
    await Promise.all([
      db.from("budget_categories").select("name, type, budget_target"),
      db.from("transactions").select("category, direction, amount"),
    ]);
  if (catErr) throw catErr;
  if (txErr) throw txErr;

  const actualsByCategory = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const key = tx.category;
    actualsByCategory.set(key, (actualsByCategory.get(key) ?? 0) + Number(tx.amount));
  }

  return (categories ?? []).map((c) => {
    const actual = actualsByCategory.get(c.name) ?? 0;
    return {
      category: c.name,
      type: c.type as "income" | "expense",
      budgetTarget: Number(c.budget_target),
      actual,
      variance: c.type === "income" ? actual - Number(c.budget_target) : Number(c.budget_target) - actual,
    };
  });
}

export interface CategoryBreakdownRow {
  category: string;
  direction: "income" | "expense";
  total: number;
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdownRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("transactions").select("category, direction, amount");
  if (error) throw error;

  const totals = new Map<string, CategoryBreakdownRow>();
  for (const row of data ?? []) {
    const key = `${row.category}::${row.direction}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.amount);
    } else {
      totals.set(key, {
        category: row.category,
        direction: row.direction as "income" | "expense",
        total: Number(row.amount),
      });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}
