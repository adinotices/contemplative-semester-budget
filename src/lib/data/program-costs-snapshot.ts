/**
 * FROZEN SNAPSHOT — do not wire this to the database.
 *
 * This is a point-in-time restatement of Contemplative Semester 2025-26 spend
 * mapped onto the budget categories from the "Projected Income & Expenses by
 * Program Year 2025/2026" CSV, which is a *different* category scheme from the
 * one the rest of the dashboard uses. It was produced for an external reader
 * who asked for that specific format.
 *
 * It is deliberately static for two reasons:
 *   1. The CSV's categories do not exist in `budget_categories`, so there is no
 *      live query that would reproduce these rows. The mapping was done by hand
 *      (e.g. "Supplies & Subscriptions" = our Supplies + Marketing & Outreach).
 *   2. The Scholarships row is BCBS accrual data (their GL account 4301), not
 *      ledger cash. It has no counterpart in `transactions` and never will,
 *      because a scholarship is a tuition discount — no money leaves an account.
 *
 * Every other row on this page is cash from our ledger over 2025-02-01 to
 * 2026-08-09. That makes the grand total a MIXED-BASIS figure. It is correct
 * for the question "what did the program cost", and wrong for the question
 * "what left the bank" — which is what the Budget vs. Actual tab answers.
 *
 * To refresh it: re-derive the numbers, bump SNAPSHOT_DATE, and edit the rows
 * below. Do not add the scholarship figure to the dashboard's cash totals.
 */

export const SNAPSHOT_DATE = "2026-08-11";
export const LEDGER_WINDOW_START = "2025-02-01";
export const LEDGER_WINDOW_END = "2026-08-09";
export const CSV_FILENAME = "cs_2025-26_actuals_by_budget_category.csv";

/**
 * The tuition figures, named so the Student Tuition tab can compare its roster
 * against exactly the same numbers this page prints rather than re-typing them.
 * All four also appear in the rows below — change them here, not there.
 */
export const BCBS_GROSS_TUITION = 477400.0;
export const BCBS_SCHOLARSHIPS = 240260.0;
export const BCBS_NET_TUITION = 237140.0;
export const LEDGER_TUITION_CASH = 228840.0;

export type Basis = "cash" | "accrual (BCBS)" | "mixed";

export interface SnapshotRow {
  category: string;
  budget: number | null;
  actual2025: number | null;
  actual2026: number | null;
  totalActual: number | null;
  stillProjected: number | null;
  actualPlusProjected: number | null;
  variance: number | null;
  basis: Basis;
  notes: string;
}

/**
 * Sign convention, applied uniformly: variance = budget − (actual + projected).
 * For expenses, positive means under budget. For the tuition rows below, which
 * are income, that same formula makes a negative number the *good* one — so
 * those are rendered without win/loss coloring.
 */
export const OPERATING_ROWS: SnapshotRow[] = [
  {
    category: "Salaries",
    budget: 293316.0,
    actual2025: 57629.0,
    actual2026: 173190.52,
    totalActual: 230819.52,
    stillProjected: 55221.79,
    actualPlusProjected: 286041.31,
    variance: 7274.69,
    basis: "cash",
    notes: "incl. pre-semester; budget = 183,316 semester + 110,000 pre-semester",
  },
  {
    category: "Rent",
    budget: 114100.0,
    actual2025: 62695.0,
    actual2026: 54880.2,
    totalActual: 117575.2,
    stillProjected: 400.0,
    actualPlusProjected: 117975.2,
    variance: -3875.2,
    basis: "cash",
    notes: "",
  },
  {
    category: "Food",
    budget: 53000.0,
    actual2025: 0.0,
    actual2026: 48774.89,
    totalActual: 48774.89,
    stillProjected: 0.0,
    actualPlusProjected: 48774.89,
    variance: 4225.11,
    basis: "cash",
    notes: "",
  },
  {
    category: "Legal, Accounting, Insurance",
    budget: 34500.0,
    actual2025: 20017.5,
    actual2026: 7495.13,
    totalActual: 27512.63,
    stillProjected: 2237.5,
    actualPlusProjected: 29750.13,
    variance: 4749.87,
    basis: "cash",
    notes: "",
  },
  {
    category: "Supplies & Subscriptions",
    budget: 7000.0,
    actual2025: 2170.34,
    actual2026: 12326.38,
    totalActual: 14496.72,
    stillProjected: 0.0,
    actualPlusProjected: 14496.72,
    variance: -7496.72,
    basis: "cash",
    notes: "Supplies + Marketing & Outreach",
  },
  {
    category: "IT",
    budget: 2500.0,
    actual2025: 1192.94,
    actual2026: 470.8,
    totalActual: 1663.74,
    stillProjected: 265.35,
    actualPlusProjected: 1929.09,
    variance: 570.91,
    basis: "cash",
    notes: "",
  },
  {
    category: "Travel",
    budget: 10000.0,
    actual2025: 67.98,
    actual2026: 7726.94,
    totalActual: 7794.92,
    stillProjected: 0.0,
    actualPlusProjected: 7794.92,
    variance: 2205.08,
    basis: "cash",
    notes: "",
  },
  {
    category: "Other Overhead",
    budget: 10000.0,
    actual2025: 1958.9,
    actual2026: 1849.5,
    totalActual: 3808.4,
    stillProjected: 65.6,
    actualPlusProjected: 3874.0,
    variance: 6126.0,
    basis: "cash",
    notes: "Other Expense + Staff Development",
  },
];

export const OPERATING_SUBTOTAL: SnapshotRow = {
  category: "Total Operating Expenses (excl. Naropa & Scholarships)",
  budget: 524416.0,
  actual2025: 145731.66,
  actual2026: 306714.36,
  totalActual: 452446.02,
  stillProjected: 58190.24,
  actualPlusProjected: 510636.26,
  variance: 13779.74,
  basis: "cash",
  notes: "",
};

export const BELOW_THE_LINE_ROWS: SnapshotRow[] = [
  {
    category: "Naropa Accreditation",
    budget: 24680.0,
    actual2025: 0.0,
    actual2026: 0.0,
    totalActual: 0.0,
    stillProjected: 20000.0,
    actualPlusProjected: 20000.0,
    variance: 4680.0,
    basis: "cash",
    notes: "current cohort pass-through, not yet paid",
  },
  {
    category: "Scholarships",
    budget: 200000.0,
    actual2025: 0.0,
    actual2026: BCBS_SCHOLARSHIPS,
    totalActual: BCBS_SCHOLARSHIPS,
    stillProjected: 0.0,
    actualPlusProjected: BCBS_SCHOLARSHIPS,
    variance: -40260.0,
    basis: "accrual (BCBS)",
    notes:
      "BCBS acct 4301. Same source your 2024 column used (that year: 130,550.00). No cash moves — it is a tuition discount.",
  },
];

export const GRAND_TOTAL: SnapshotRow = {
  category: "TOTAL incl. Naropa & Scholarships",
  budget: 749096.0,
  actual2025: 145731.66,
  actual2026: 546974.36,
  totalActual: 692706.02,
  stillProjected: 78190.24,
  actualPlusProjected: 770896.26,
  variance: -21800.26,
  basis: "mixed",
  notes: "",
};

export const TUITION_ROWS: SnapshotRow[] = [
  {
    category: "Tuition, if all students paid in full",
    budget: 462000.0,
    actual2025: null,
    actual2026: BCBS_GROSS_TUITION,
    totalActual: BCBS_GROSS_TUITION,
    stillProjected: null,
    actualPlusProjected: null,
    variance: -15400.0,
    basis: "accrual (BCBS)",
    notes: "BCBS acct 3600, recognised 2026-02-28",
  },
  {
    category: "Less: scholarships awarded",
    budget: null,
    actual2025: null,
    actual2026: -BCBS_SCHOLARSHIPS,
    totalActual: -BCBS_SCHOLARSHIPS,
    stillProjected: null,
    actualPlusProjected: null,
    variance: null,
    basis: "accrual (BCBS)",
    notes: "",
  },
  {
    category: "Tuition, net of scholarships",
    budget: 253064.0,
    actual2025: null,
    actual2026: BCBS_NET_TUITION,
    totalActual: BCBS_NET_TUITION,
    stillProjected: null,
    actualPlusProjected: null,
    variance: 15924.0,
    basis: "accrual (BCBS)",
    notes: "2024 equivalent was 284,850.00",
  },
  {
    category: "Tuition cash actually collected",
    budget: null,
    actual2025: 19000.0,
    actual2026: 209840.0,
    totalActual: LEDGER_TUITION_CASH,
    stillProjected: 0.0,
    actualPlusProjected: LEDGER_TUITION_CASH,
    variance: null,
    basis: "cash",
    notes: "our ledger; excl. college-credit & admin fees",
  },
];

export const EXCLUDED_ROWS: SnapshotRow[] = [
  {
    category: "Naropa Pass-Through — Prior Cohort",
    budget: null,
    actual2025: 0.0,
    actual2026: 28375.0,
    totalActual: 28375.0,
    stillProjected: null,
    actualPlusProjected: null,
    variance: null,
    basis: "cash",
    notes: "first cohort; non-program per the Budget vs Actual tab",
  },
  {
    category: "Student refunds",
    budget: null,
    actual2025: 0.0,
    actual2026: 7000.0,
    totalActual: 7000.0,
    stillProjected: null,
    actualPlusProjected: null,
    variance: null,
    basis: "cash",
    notes: "nets against tuition income",
  },
];

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "number" ? value.toFixed(2) : value;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(row: SnapshotRow): string {
  return [
    row.category,
    row.budget,
    row.actual2025,
    row.actual2026,
    row.totalActual,
    row.stillProjected,
    row.actualPlusProjected,
    row.variance,
    row.basis,
    row.notes,
  ]
    .map(csvCell)
    .join(",");
}

/** Built from the same constants the page renders, so the two cannot drift. */
export function buildSnapshotCsv(): string {
  const lines: string[] = [
    csvCell("Contemplative Semester 2025-26 — actual spend by CSV budget category"),
    csvCell(
      `Frozen snapshot, last updated ${SNAPSHOT_DATE}. Operating rows are CASH from our ledger (${LEDGER_WINDOW_START} to ${LEDGER_WINDOW_END}). Scholarships is ACCRUAL from BCBS — see note.`,
    ),
    csvCell("Excludes prior-cohort Naropa (28,375.00) and student refunds (7,000.00)."),
    "",
    "Category,Budget,Actual 2025,Actual 2026,Total Actual,Still Projected,Actual + Projected,Variance vs Budget,Basis,Notes",
    ...OPERATING_ROWS.map(csvRow),
    csvRow(OPERATING_SUBTOTAL),
    "",
    ...BELOW_THE_LINE_ROWS.map(csvRow),
    csvRow(GRAND_TOTAL),
    "",
    csvCell("Tuition context (BCBS accrual, pairs with the scholarship figure)"),
    ...TUITION_ROWS.map(csvRow),
    "",
    csvCell("Excluded from the figures above"),
    ...EXCLUDED_ROWS.map(csvRow),
    "",
    csvCell(
      "IMPORTANT: do not add the scholarship figure to the dashboard's cash totals. It is BCBS's accrual entry;",
    ),
    csvCell("no money left an account, so the dashboard's cash expense total correctly excludes it."),
  ];
  return `${lines.join("\n")}\n`;
}
