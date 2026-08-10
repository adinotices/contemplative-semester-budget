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
  notes: string | null;
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
      db.from("budget_categories").select("name, type, budget_target, notes"),
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

  const rows = (categories ?? []).map((c) => {
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
      notes: c.notes,
    };
  });

  return applyTuitionNetting(rows);
}

/**
 * The source spreadsheet's Budget vs Actual tab shows one "Tuition (net)"
 * income line rather than five separate ones — gross tuition (Tuition +
 * Admin Fees + College Credit Fees) minus the current-cohort Naropa
 * Pass-Through fee and student Refunds, against a $253,064 target. Those
 * five raw categories were imported as their own budget_categories rows
 * with no target (the netting can't be expressed as a flat per-category
 * number), which made Tuition look like it had no goal at all. Reproduce
 * the spreadsheet's own netting here instead.
 */
const TUITION_GROSS_CATEGORIES = ["Tuition", "Tuition — Admin Fees", "Tuition — College Credit Fees"];
const TUITION_NET_DEDUCTIONS = ["Naropa Pass-Through", "Refund"];
const TUITION_NET_TARGET = 253064;

function applyTuitionNetting(rows: CategoryActual[]): CategoryActual[] {
  const gross = rows.filter((r) => TUITION_GROSS_CATEGORIES.includes(r.category));
  if (gross.length === 0) return rows;
  const deductions = rows.filter((r) => TUITION_NET_DEDUCTIONS.includes(r.category));

  const sum = (list: CategoryActual[], key: "actual" | "projected") => list.reduce((s, r) => s + r[key], 0);
  const actual = sum(gross, "actual") - sum(deductions, "actual");
  const projected = sum(gross, "projected") - sum(deductions, "projected");
  const total = actual + projected;

  const netRow: CategoryActual = {
    category: "Tuition (net)",
    type: "income",
    budgetTarget: TUITION_NET_TARGET,
    actual,
    projected,
    total,
    variance: total - TUITION_NET_TARGET,
    notes: "Net of current-cohort Naropa Pass-Through fees and student Refunds, per the source spreadsheet's Budget vs Actual tab.",
  };

  const excluded = new Set([...TUITION_GROSS_CATEGORIES, ...TUITION_NET_DEDUCTIONS]);
  return [netRow, ...rows.filter((r) => !excluded.has(r.category))];
}
