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

export interface ReconciliationSummary {
  internal: {
    startingBalance: number;
    totalIncome: number;
    totalExpense: number;
    net: number;
    earliestDate: string | null;
    latestDate: string | null;
  };
  bcbs: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    earliestDate: string | null;
    latestDate: string | null;
  };
  /** BCBS cash-account totals restricted to the internal ledger's own date range, for an apples-to-apples comparison. */
  bcbsInRange: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
  /**
   * BCBS's full accrual-basis P&L for Contemplative Semester (not just the 2
   * cash accounts) vs. the internal cash-basis ledger, over the window where
   * we have both. See BCBS_ACCRUAL_* below for sourcing.
   */
  accrual: {
    windowStart: string;
    windowEnd: string;
    internalIncome: number;
    internalExpense: number;
    bcbsIncome: number;
    bcbsExpense: number;
    incomeGap: number;
    expenseGap: number;
  };
  /** BCBS's own balance sheet — cash actually sitting in the CS-restricted fund, per BCBS's books. */
  balanceSheetCash: {
    amount: number;
    asOf: string;
  };
  matchedCount: number;
  bcbsCount: number;
  transactionCount: number;
}

/** BCBS "Receive Money" lines are income; everything else (Payable Payment, Spend Money, etc.) is a cash outflow. */
function isBcbsIncome(description: string): boolean {
  return description.includes("Receive Money");
}

/**
 * BCBS's own books recognize Contemplative Semester revenue/expense on an
 * accrual basis (e.g. tuition is recognized in full at enrollment, not as
 * cash trickles in), while this ledger is strictly cash-basis (status =
 * 'actual' means cash actually received/paid). These figures come straight
 * from BCBS's official financials, not any table in this database — the
 * only way to see BCBS's full Contemplative-Semester-scoped P&L for periods
 * we haven't imported line-by-line:
 *  - 2025 portion: computed from BCBS's General Ledger Detail export
 *    (Nov 2023–Apr 30 2026) by summing BCBS's 9 income/expense-recognition
 *    accounts for Contemplative Semester over 2025-01-23–2025-12-31.
 *    Verified to reconcile exactly against BCBS's official lifetime P&L.
 *  - 2026 portion: BCBS's own "Location: Contemplative Semester" P&L
 *    summary for 2026 YTD, emailed by Melissa Gopnik on 2026-07-22 —
 *    accurate as of that date.
 */
const BCBS_ACCRUAL_WINDOW_START = "2025-01-23";
const BCBS_ACCRUAL_WINDOW_END = "2026-07-22";
const BCBS_ACCRUAL_2025 = { income: 291841.14, expense: 177708.04 };
const BCBS_ACCRUAL_2026_YTD = { income: 700860.46, expense: 583543.54 };
const BCBS_ACCRUAL = {
  income: BCBS_ACCRUAL_2025.income + BCBS_ACCRUAL_2026_YTD.income,
  expense: BCBS_ACCRUAL_2025.expense + BCBS_ACCRUAL_2026_YTD.expense,
};

/**
 * BCBS's balance sheet snapshot of actual cash held in the CS-restricted
 * fund, from the lifetime P&L export's Balance Sheet section.
 */
const BCBS_BALANCE_SHEET_CASH = 90453.73;
const BCBS_BALANCE_SHEET_ASOF = "2026-04-30";

export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const db = supabaseAdmin();
  const [
    { data: txns, error: txErr },
    { data: bcbs, error: bcbsErr },
    { count: matchedCount },
    startingBalance,
    { data: accrualWindowTxns, error: accrualWindowErr },
  ] = await Promise.all([
    db.from("transactions").select("date, direction, amount").eq("status", "actual"),
    db.from("bcbs_transactions").select("date, description, amount"),
    db.from("reconciliation_matches").select("id", { count: "exact", head: true }).eq("status", "matched"),
    getOrgSetting("starting_balance"),
    db
      .from("transactions")
      .select("direction, amount")
      .eq("status", "actual")
      .gte("date", BCBS_ACCRUAL_WINDOW_START)
      .lte("date", BCBS_ACCRUAL_WINDOW_END),
  ]);
  if (txErr) throw txErr;
  if (bcbsErr) throw bcbsErr;
  if (accrualWindowErr) throw accrualWindowErr;

  const txRows = txns ?? [];
  const bcbsRows = bcbs ?? [];

  let internalIncome = 0;
  let internalExpense = 0;
  const txDates = txRows.map((t) => t.date).sort();
  for (const t of txRows) {
    if (t.direction === "income") internalIncome += Number(t.amount);
    else internalExpense += Number(t.amount);
  }
  const earliestInternal = txDates[0] ?? null;
  const latestInternal = txDates[txDates.length - 1] ?? null;

  let bcbsIncome = 0;
  let bcbsExpense = 0;
  let bcbsIncomeInRange = 0;
  let bcbsExpenseInRange = 0;
  const bcbsDates = bcbsRows.map((b) => b.date).sort();
  for (const b of bcbsRows) {
    const amt = Number(b.amount);
    const income = isBcbsIncome(b.description ?? "");
    if (income) bcbsIncome += amt;
    else bcbsExpense += amt;
    if (earliestInternal && b.date >= earliestInternal) {
      if (income) bcbsIncomeInRange += amt;
      else bcbsExpenseInRange += amt;
    }
  }

  let internalAccrualWindowIncome = 0;
  let internalAccrualWindowExpense = 0;
  for (const t of accrualWindowTxns ?? []) {
    if (t.direction === "income") internalAccrualWindowIncome += Number(t.amount);
    else internalAccrualWindowExpense += Number(t.amount);
  }

  return {
    internal: {
      startingBalance,
      totalIncome: internalIncome,
      totalExpense: internalExpense,
      net: startingBalance + internalIncome - internalExpense,
      earliestDate: earliestInternal,
      latestDate: latestInternal,
    },
    bcbs: {
      totalIncome: bcbsIncome,
      totalExpense: bcbsExpense,
      net: bcbsIncome - bcbsExpense,
      earliestDate: bcbsDates[0] ?? null,
      latestDate: bcbsDates[bcbsDates.length - 1] ?? null,
    },
    bcbsInRange: {
      totalIncome: bcbsIncomeInRange,
      totalExpense: bcbsExpenseInRange,
      net: bcbsIncomeInRange - bcbsExpenseInRange,
    },
    accrual: {
      windowStart: BCBS_ACCRUAL_WINDOW_START,
      windowEnd: BCBS_ACCRUAL_WINDOW_END,
      internalIncome: internalAccrualWindowIncome,
      internalExpense: internalAccrualWindowExpense,
      bcbsIncome: BCBS_ACCRUAL.income,
      bcbsExpense: BCBS_ACCRUAL.expense,
      incomeGap: internalAccrualWindowIncome - BCBS_ACCRUAL.income,
      expenseGap: internalAccrualWindowExpense - BCBS_ACCRUAL.expense,
    },
    balanceSheetCash: {
      amount: BCBS_BALANCE_SHEET_CASH,
      asOf: BCBS_BALANCE_SHEET_ASOF,
    },
    matchedCount: matchedCount ?? 0,
    bcbsCount: bcbsRows.length,
    transactionCount: txRows.length,
  };
}
