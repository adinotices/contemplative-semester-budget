import { supabaseAdmin } from "@/lib/supabase/server";

export interface CashPosition {
  startingBalance: number;
  totalIncome: number;
  totalExpense: number;
  /** Starting balance + net actual activity — "Current Money in Bank" in the org's own ledger. */
  currentMoneyInBank: number;
  remainingBalanceTarget: number;
}

export interface ProjectedTotals {
  projectedIncome: number;
  projectedExpense: number;
  projectedNet: number;
  /** Current Money in Bank + projected net — "Projected Remaining After All Obligations". */
  projectedEndingBalance: number;
  varianceVsTarget: number;
}

export interface CategoryActual {
  category: string;
  type: "income" | "expense";
  budgetTarget: number;
  actual: number;
  projected: number;
  total: number;
  variance: number;
}

async function getOrgSetting(key: string): Promise<number> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("org_settings")
    .select("value_numeric")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.value_numeric ?? 0);
}

/**
 * Server-only dashboard queries. Callers must already be authorized
 * (enforced by middleware + the admin-only page wrapper); these queries
 * use the service role and do not re-check RLS.
 */
export async function getCashPosition(): Promise<CashPosition> {
  const db = supabaseAdmin();
  const [{ data, error }, startingBalance, remainingBalanceTarget] = await Promise.all([
    db.from("transactions").select("direction, amount").eq("status", "actual"),
    getOrgSetting("starting_balance"),
    getOrgSetting("remaining_balance_target"),
  ]);
  if (error) throw error;

  let totalIncome = 0;
  let totalExpense = 0;
  for (const row of data ?? []) {
    if (row.direction === "income") totalIncome += Number(row.amount);
    else totalExpense += Number(row.amount);
  }

  return {
    startingBalance,
    totalIncome,
    totalExpense,
    currentMoneyInBank: startingBalance + totalIncome - totalExpense,
    remainingBalanceTarget,
  };
}

/**
 * Projected (known but not yet paid/received) totals — mirrors the
 * Actual / Projected / Total(A+P) split in the org's own internal ledger.
 */
export async function getProjectedTotals(cash: CashPosition): Promise<ProjectedTotals> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("transactions")
    .select("direction, amount")
    .eq("status", "projected");
  if (error) throw error;

  let projectedIncome = 0;
  let projectedExpense = 0;
  for (const row of data ?? []) {
    if (row.direction === "income") projectedIncome += Number(row.amount);
    else projectedExpense += Number(row.amount);
  }

  const projectedNet = projectedIncome - projectedExpense;
  const projectedEndingBalance = cash.currentMoneyInBank + projectedNet;
  return {
    projectedIncome,
    projectedExpense,
    projectedNet,
    projectedEndingBalance,
    varianceVsTarget: projectedEndingBalance - cash.remainingBalanceTarget,
  };
}

export async function getBudgetVsActual(): Promise<CategoryActual[]> {
  const db = supabaseAdmin();
  const [{ data: categories, error: catErr }, { data: transactions, error: txErr }] =
    await Promise.all([
      db.from("budget_categories").select("name, type, budget_target"),
      db.from("transactions").select("category, direction, amount, status"),
    ]);
  if (catErr) throw catErr;
  if (txErr) throw txErr;

  const actualsByCategory = new Map<string, number>();
  const projectedByCategory = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const map = tx.status === "projected" ? projectedByCategory : actualsByCategory;
    map.set(tx.category, (map.get(tx.category) ?? 0) + Number(tx.amount));
  }

  return (categories ?? []).map((c) => {
    const actual = actualsByCategory.get(c.name) ?? 0;
    const projected = projectedByCategory.get(c.name) ?? 0;
    const total = actual + projected;
    const budgetTarget = Number(c.budget_target);
    return {
      category: c.name,
      type: c.type as "income" | "expense",
      budgetTarget,
      actual,
      projected,
      total,
      variance: c.type === "income" ? total - budgetTarget : budgetTarget - total,
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
  const { data, error } = await db
    .from("transactions")
    .select("category, direction, amount")
    .eq("status", "actual");
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
