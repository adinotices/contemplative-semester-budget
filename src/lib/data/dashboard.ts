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

/** Server-side currency formatting for prose baked into the data layer. */
function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
  /**
   * Line-by-line decomposition of each gap above. Each list sums exactly to
   * its gap, so the explanation on screen is always arithmetic rather than
   * commentary.
   */
  bridge: {
    income: Array<{ label: string; amount: number; detail: string }>;
    expense: Array<{ label: string; amount: number; detail: string }>;
    /** Already-incurred obligations we carry as `projected` — context for the expense residual. */
    projectedExpenseTotal: number;
  };
  /**
   * Fund balance at the one date both sets of books cover. This replaces an
   * earlier "money in the bank" card that misread BCBS's accumulated net
   * assets as cash — see BCBS_RESTRICTED_FUND below.
   */
  fundBalance: {
    asOf: string;
    internal: number;
    bcbsRestrictedFund: number;
    gap: number;
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

/**
 * Kept as individual account lines rather than pre-summed totals so the
 * gap breakdown shown on the page is computed from the same figures as the
 * gap itself and cannot drift out of agreement with it.
 */
const BCBS_2025 = {
  creditCardFees: 809.07,
  restrictedRevenue: 271032.07,
  collegeAccreditation: 20000.0,
  csExpense: 177708.04,
};
const BCBS_2026_YTD = {
  creditCardFees: 1266.7,
  newCourseIncome: 477400.0, // one entry, 2026-02-28, when the course ran
  hemeraGrant: 50311.0,
  restrictedRevenue: 171882.76,
  legalServices: 1250.0,
  csExpense: 342033.54,
  scholarships: 240260.0, // a discount on tuition — no cash ever leaves, so no row exists on our side
};

const BCBS_ACCRUAL = {
  income:
    BCBS_2025.creditCardFees +
    BCBS_2025.restrictedRevenue +
    BCBS_2025.collegeAccreditation +
    BCBS_2026_YTD.creditCardFees +
    BCBS_2026_YTD.newCourseIncome +
    BCBS_2026_YTD.hemeraGrant +
    BCBS_2026_YTD.restrictedRevenue,
  expense:
    BCBS_2025.csExpense +
    BCBS_2026_YTD.legalServices +
    BCBS_2026_YTD.csExpense +
    BCBS_2026_YTD.scholarships,
};

/**
 * BCBS's closing balance on account `2827 - Temporarily Restricted Fund:
 * Contemplative Semester` in the General Ledger Detail export, which ends
 * 2026-04-30. This is the closest thing BCBS's books offer to "what the
 * program has", and 2026-04-30 is the only date both sets of books cover.
 *
 * DO NOT substitute the lifetime P&L's "Balance Sheet" figures here. Those
 * three lines (Restricted Contemplative Semester 90,453.73 + Restricted
 * College Accreditation 30,305.00 + Unrestricted 215,009.84) sum to exactly
 * 335,768.57 — the lifetime Net Income — because they partition accumulated
 * net income by fund class. They are not cash. An earlier version of this
 * page showed the 90,453.73 as "Money in the Bank (BCBS balance sheet)",
 * which was wrong.
 */
const BCBS_RESTRICTED_FUND = 192567.71;
const BCBS_RESTRICTED_FUND_ASOF = "2026-04-30";

export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const db = supabaseAdmin();
  const [
    { data: txns, error: txErr },
    { data: bcbs, error: bcbsErr },
    { count: matchedCount },
    startingBalance,
    { data: accrualWindowTxns, error: accrualWindowErr },
    { data: asOfTxns, error: asOfErr },
    { data: incomeSplitTxns, error: incomeSplitErr },
    { data: projectedExpTxns, error: projectedExpErr },
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
    db
      .from("transactions")
      .select("direction, amount")
      .eq("status", "actual")
      .lte("date", BCBS_RESTRICTED_FUND_ASOF),
    db
      .from("transactions")
      .select("category, direction, amount")
      .eq("status", "actual")
      .eq("direction", "income")
      .gte("date", BCBS_ACCRUAL_WINDOW_START)
      .lte("date", BCBS_ACCRUAL_WINDOW_END),
    db.from("transactions").select("amount").eq("status", "projected").eq("direction", "expense"),
  ]);
  if (txErr) throw txErr;
  if (bcbsErr) throw bcbsErr;
  if (accrualWindowErr) throw accrualWindowErr;
  if (asOfErr) throw asOfErr;
  if (incomeSplitErr) throw incomeSplitErr;
  if (projectedExpErr) throw projectedExpErr;

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
  const bcbsDates = bcbsRows.map((b) => b.date).sort();
  for (const b of bcbsRows) {
    const amt = Number(b.amount);
    if (isBcbsIncome(b.description ?? "")) bcbsIncome += amt;
    else bcbsExpense += amt;
  }

  let internalAccrualWindowIncome = 0;
  let internalAccrualWindowExpense = 0;
  for (const t of accrualWindowTxns ?? []) {
    if (t.direction === "income") internalAccrualWindowIncome += Number(t.amount);
    else internalAccrualWindowExpense += Number(t.amount);
  }

  // Our own position as of the date BCBS's ledger stops, so the two sides
  // describe the same moment.
  let asOfIncome = 0;
  let asOfExpense = 0;
  for (const t of asOfTxns ?? []) {
    if (t.direction === "income") asOfIncome += Number(t.amount);
    else asOfExpense += Number(t.amount);
  }
  const internalAtAsOf = startingBalance + asOfIncome - asOfExpense;

  // Decompose each gap. Both lists are built as (BCBS line − our matching
  // cash) so they sum to the gap by construction rather than by hand.
  let internalGrossTuition = 0;
  let internalFundraising = 0;
  for (const t of incomeSplitTxns ?? []) {
    if (TUITION_GROSS_CATEGORIES.includes(t.category)) internalGrossTuition += Number(t.amount);
    else internalFundraising += Number(t.amount);
  }
  const projectedExpenseTotal = (projectedExpTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);

  const bcbsGrantsAndDonations =
    BCBS_2025.restrictedRevenue +
    BCBS_2025.collegeAccreditation +
    BCBS_2026_YTD.restrictedRevenue +
    BCBS_2026_YTD.hemeraGrant;
  const bcbsCreditCardFees = BCBS_2025.creditCardFees + BCBS_2026_YTD.creditCardFees;
  const bcbsOperatingExpense = BCBS_ACCRUAL.expense - BCBS_2026_YTD.scholarships;

  const bridge = {
    income: [
      {
        label: "Course income recognised up front",
        amount: BCBS_2026_YTD.newCourseIncome - internalGrossTuition,
        detail: `BCBS booked ${formatUsd(BCBS_2026_YTD.newCourseIncome)} in a single entry when the course ran; we collected ${formatUsd(internalGrossTuition)} in tuition as students paid, net of scholarships.`,
      },
      {
        label: "Grants & donations recognised on BCBS's schedule",
        amount: bcbsGrantsAndDonations - internalFundraising,
        detail: `Restricted money counts as revenue when it is spent on its purpose, not when the cheque arrives — e.g. the Hemera grant reached us as ${formatUsd(60000)} of cash in Oct 2025 but appears as ${formatUsd(BCBS_2026_YTD.hemeraGrant)} of 2026 revenue on their books.`,
      },
      {
        label: "Donor-paid credit card fees",
        amount: bcbsCreditCardFees,
        detail: "When a donor covers processing fees BCBS records it as income. It never reaches us as a separate line.",
      },
    ],
    expense: [
      {
        label: "Scholarships",
        amount: BCBS_2026_YTD.scholarships,
        detail:
          "A scholarship is a discount on tuition, not a payment. BCBS records full tuition as revenue and the discount as an expense; no money leaves an account, so we have no row at all. This will never reconcile, and should not.",
      },
      {
        label: "Everything else",
        amount: bcbsOperatingExpense - internalAccrualWindowExpense,
        detail: `BCBS ${formatUsd(bcbsOperatingExpense)} of operating expense vs our ${formatUsd(internalAccrualWindowExpense)} of cash paid. Expenses are recognised when incurred, so anything already owed but unpaid sits here — compare with the ${formatUsd(projectedExpenseTotal)} of obligations we already carry as projected, most of which is for work that has happened (backpay, end-of-semester lump sums, Naropa fees). Likely a subset of that rather than new spending, but only a general ledger export can confirm it.`,
      },
    ],
    projectedExpenseTotal,
  };

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
    bridge,
    fundBalance: {
      asOf: BCBS_RESTRICTED_FUND_ASOF,
      internal: internalAtAsOf,
      bcbsRestrictedFund: BCBS_RESTRICTED_FUND,
      gap: internalAtAsOf - BCBS_RESTRICTED_FUND,
    },
    matchedCount: matchedCount ?? 0,
    bcbsCount: bcbsRows.length,
    transactionCount: txRows.length,
  };
}
