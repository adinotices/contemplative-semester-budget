/**
 * FROZEN SNAPSHOT — transcribed from the "Tuition payments" tab of
 * "Copy of CS 2026 Accepted Student Tracking.xlsx", uploaded 2026-08-11.
 *
 * There *is* a `students` table in the schema (0001_init.sql) that this data
 * belongs in, and populating it would also give admin /chat real student
 * financials. It was left empty deliberately for now: the import puts student
 * names, scholarship awards and outstanding balances into Postgres, which is a
 * decision for the user rather than a side effect of adding a tab. Until then
 * this module is the single source of truth for the page.
 *
 * Cells are transcribed as they appear in the sheet, including the ones that
 * look wrong. Nothing here is corrected or back-filled — the anomalies are
 * surfaced by getDataQualityFlags() instead, so the page shows the tracker as
 * it actually stands rather than a tidied version of it.
 *
 * Blank vs "n/a" is meaningful and preserved: a blank is a cell nobody filled
 * in, "n/a" is someone recording that the field does not apply. Both come back
 * as a null amount, with the original text kept in `*Raw`.
 */

export const SNAPSHOT_DATE = "2026-08-11";
export const SOURCE_FILE = "Copy of CS 2026 Accepted Student Tracking.xlsx — “Tuition payments” tab";

/** Standard tuition, and the Naropa college-credit add-on that takes it to 19,400. */
export const BASE_TUITION = 15400;
export const COLLEGE_CREDIT_TUITION = 19400;
export const COLLEGE_CREDIT_FEE = COLLEGE_CREDIT_TUITION - BASE_TUITION;

/**
 * A stray cell in the sheet, sitting alone in a far-right column on the Dean
 * Baxter row with no formula context around it. Recorded because it is the
 * only summary figure the sheet states about itself — see ORPHAN_TOTAL_NOTE
 * for why it does not tie to anything on this page.
 */
export const SHEET_TOTAL_PROJECTED_TUITION = 83340;

export interface StudentTuitionRow {
  name: string;
  collegeCredit: string;
  deposit: number | null;
  depositRaw: string;
  adminFee: string;
  depositPaid: string;
  scholarship: number | null;
  tuitionTotal: number | null;
  balanceDue: number | null;
  balanceStatus: string;
  collegeCreditStatus: string;
  followUp: string;
}

export const STUDENTS: StudentTuitionRow[] = [
  {
    name: "Amiya Fornés-Sicam",
    collegeCredit: "No",
    deposit: 1200,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "paid 12/11",
    scholarship: 9400,
    tuitionTotal: 15400,
    balanceDue: 3300,
    balanceStatus: "Link to Balance Due",
    collegeCreditStatus: "",
    followUp: "*Agreed on a payment plan, added to actuals sheet - future payments made?",
  },
  {
    name: "Meera Kochhar",
    collegeCredit: "No",
    deposit: 500,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "",
    scholarship: 12900,
    tuitionTotal: 15400,
    balanceDue: 2500,
    balanceStatus: "Link to Balance Due",
    collegeCreditStatus: "",
    followUp: "*Paying later",
  },
  {
    name: "Dean Baxter",
    collegeCredit: "No",
    deposit: 1000,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/30",
    scholarship: 10400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/26",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Em Freedman",
    collegeCredit: "No",
    deposit: 600,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/28",
    scholarship: 12400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 1/2",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "John Fitzsimmons",
    collegeCredit: "No",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/07",
    scholarship: 0,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 1/1",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Jonathan Clarke",
    collegeCredit: "No",
    deposit: null,
    depositRaw: "n/a",
    adminFee: "No",
    depositPaid: "",
    scholarship: 13600,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 1/5",
    collegeCreditStatus: "",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Lauren Verhulst",
    collegeCredit: "No",
    deposit: null,
    depositRaw: "n/a",
    adminFee: "No",
    depositPaid: "n/a",
    scholarship: 9560,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/22",
    collegeCreditStatus: "",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Mason Cohen",
    collegeCredit: "No",
    deposit: null,
    depositRaw: "n/a",
    adminFee: "No",
    depositPaid: "n/a",
    scholarship: 14400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/22",
    collegeCreditStatus: "",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Rob Kellet",
    collegeCredit: "No",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/05",
    scholarship: 0,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 11/24",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Rosalie Jones",
    collegeCredit: "No",
    deposit: 800,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 12/03",
    scholarship: 11400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/30",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Sarah Sidorov",
    collegeCredit: "No",
    deposit: null,
    depositRaw: "n/a",
    adminFee: "No",
    depositPaid: "n/a",
    scholarship: 13400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/31",
    collegeCreditStatus: "",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Sofia Braun",
    collegeCredit: "No",
    deposit: 800,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/16",
    scholarship: 11400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 12/16",
    collegeCreditStatus: "N/A",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Tamasen Huseny-Sandoval",
    collegeCredit: "No",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 11/03",
    scholarship: 0,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 1/16",
    collegeCreditStatus: "N/A",
    followUp: "Last Followed Up on 1/11, added to actuals sheet",
  },
  {
    name: "Danyoung Kim",
    collegeCredit: "No",
    deposit: 100,
    depositRaw: "",
    adminFee: "Yes",
    depositPaid: "Paid 12/29",
    scholarship: 15400,
    tuitionTotal: null,
    balanceDue: 0,
    balanceStatus: "",
    collegeCreditStatus: "",
    followUp: "No Balance, added to actuals sheet",
  },
  {
    name: "Emma Kunz",
    collegeCredit: "No",
    deposit: 100,
    depositRaw: "",
    adminFee: "Yes",
    depositPaid: "Paid 10/23",
    scholarship: 15400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "N/A",
    collegeCreditStatus: "N/A",
    followUp: "No Balance, added to actuals sheet",
  },
  {
    name: "Maya Villalta",
    collegeCredit: "No",
    deposit: 100,
    depositRaw: "",
    adminFee: "Yes",
    depositPaid: "Paid 12/04",
    scholarship: 15400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "",
    collegeCreditStatus: "",
    followUp: "No Balance, added to actuals sheet",
  },
  {
    name: "Sophie Duerr",
    collegeCredit: "No",
    deposit: 100,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 12/15",
    scholarship: 15400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "N/A",
    collegeCreditStatus: "N/A",
    followUp: "No Balance, added to actuals sheet",
  },
  {
    name: "Zenichi Moriki",
    collegeCredit: "No",
    deposit: 100,
    depositRaw: "",
    adminFee: "Yes",
    depositPaid: "Paid 10/15",
    scholarship: 17400,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "N/A",
    collegeCreditStatus: "N/A",
    followUp: "No Balance, added to actuals sheet",
  },
  {
    name: "Oliver Coelho",
    collegeCredit: "No (previously, yes)",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 12/20",
    scholarship: 10800,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 1/12",
    collegeCreditStatus: "Paid 1/23",
    followUp: "$2k tuition fee refund, need to add to actuals sheet",
  },
  {
    name: "Malcolm Brown",
    collegeCredit: "No, moved pmt to tuition",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/08",
    scholarship: 0,
    tuitionTotal: 15400,
    balanceDue: 0,
    balanceStatus: "Paid 1/16",
    collegeCreditStatus: "",
    followUp: "Last Followed Up on 1/11, added to actuals sheet",
  },
  {
    name: "Malcolm Wilson-Ahlstrom",
    collegeCredit: "Yes",
    deposit: 3080,
    depositRaw: "",
    adminFee: "",
    depositPaid: "Paid 1/19",
    scholarship: 7400,
    tuitionTotal: 8000,
    balanceDue: 0,
    balanceStatus: "Paid 3/12",
    collegeCreditStatus: "",
    followUp: "*Payments made?",
  },
  {
    name: "Madelyn Huston",
    collegeCredit: "Yes",
    deposit: null,
    depositRaw: "",
    adminFee: "",
    depositPaid: "",
    scholarship: null,
    tuitionTotal: null,
    balanceDue: 0,
    balanceStatus: "Paid 2/17",
    collegeCreditStatus: "Paid 5/2",
    followUp: "*Need to follow up about college credits",
  },
  {
    name: "Kaila Brown",
    collegeCredit: "Yes",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 11/19",
    scholarship: 0,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 12/3",
    collegeCreditStatus: "Paid 12/04",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Ruby Bambsberger",
    collegeCredit: "Yes",
    deposit: 1080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/17",
    scholarship: 10000,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "paid 12/18",
    collegeCreditStatus: "paid 12/18",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Talia Mallah",
    collegeCredit: "Yes",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 11/05",
    scholarship: 0,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 12/19",
    collegeCreditStatus: "Paid 12/19",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Sean O'Neill (Dropped Out)",
    collegeCredit: "Yes",
    deposit: 2080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 11/14",
    scholarship: 5000,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 12/08",
    collegeCreditStatus: "Paid 12/26",
    followUp: "Already Paid, added to actuals sheet",
  },
  {
    name: "Rowan Bayson",
    collegeCredit: "Yes",
    deposit: 3080,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 11/01",
    scholarship: 0,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 12/29",
    collegeCreditStatus: "Paid 1/26",
    followUp: "Last Followed Up on 1/11, added to actuals sheet - Need to add to actuals sheet?",
  },
  {
    name: "Mintesinot Petersson",
    collegeCredit: "Yes",
    deposit: 1440,
    depositRaw: "",
    adminFee: "No",
    depositPaid: "Paid 10/21",
    scholarship: 9700,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 1/29",
    collegeCreditStatus: "Paid 12/31",
    followUp: "Last Followed Up on 1/11, added to actuals sheet - Need to add to actuals sheet?",
  },
  {
    name: "Trinity Churchill",
    collegeCredit: "Yes",
    deposit: null,
    depositRaw: "",
    adminFee: "",
    depositPaid: "",
    scholarship: 0,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 1/23",
    collegeCreditStatus: "Paid 1/23",
    followUp: "Need to add to actuals sheet?",
  },
  {
    name: "Geist Lourie",
    collegeCredit: "Yes",
    deposit: 3080,
    depositRaw: "",
    adminFee: "",
    depositPaid: "Paid 1/15",
    scholarship: 0,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 1/22",
    collegeCreditStatus: "Paid 1/26/2026",
    followUp: "Paid, need to update actuals sheet",
  },
  {
    name: "Abby Heckler",
    collegeCredit: "Yes",
    deposit: null,
    depositRaw: "",
    adminFee: "",
    depositPaid: "",
    scholarship: null,
    tuitionTotal: 19400,
    balanceDue: 0,
    balanceStatus: "Paid 3/9",
    collegeCreditStatus: "Paid 3/9/26",
    followUp: "",
  },
];

function sum(pick: (row: StudentTuitionRow) => number | null): number {
  // Rounded because JS floating point turns a column of clean dollar figures
  // into 240759.99999999997 often enough to matter in a reconciliation table.
  const total = STUDENTS.reduce((acc, row) => acc + (pick(row) ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export interface StudentTuitionTotals {
  studentCount: number;
  grossTuition: number;
  scholarships: number;
  netTuition: number;
  deposits: number;
  outstanding: number;
  /**
   * Rows billed at the 19,400 college-credit rate. Deliberately NOT the count of
   * students taking college credit — two who do are billed something else, which
   * getCollegeCreditDiff() surfaces against the ledger.
   */
  billedAtCollegeCreditRate: number;
}

export function getStudentTuitionTotals(): StudentTuitionTotals {
  const grossTuition = sum((r) => r.tuitionTotal);
  const scholarships = sum((r) => r.scholarship);

  return {
    studentCount: STUDENTS.length,
    grossTuition,
    scholarships,
    netTuition: Math.round((grossTuition - scholarships) * 100) / 100,
    deposits: sum((r) => r.deposit),
    outstanding: sum((r) => r.balanceDue),
    billedAtCollegeCreditRate: STUDENTS.filter((r) => r.tuitionTotal === COLLEGE_CREDIT_TUITION).length,
  };
}

export interface DataQualityFlag {
  severity: "error" | "warning";
  student: string;
  issue: string;
}

/**
 * Derived from the rows rather than hardcoded, so re-transcribing the sheet
 * cannot leave a stale list of problems behind.
 */
export function getDataQualityFlags(): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];

  for (const row of STUDENTS) {
    if (row.scholarship !== null && row.tuitionTotal !== null && row.scholarship > row.tuitionTotal) {
      flags.push({
        severity: "error",
        student: row.name,
        issue: `Scholarship of ${row.scholarship.toLocaleString("en-US")} exceeds the ${row.tuitionTotal.toLocaleString("en-US")} tuition by ${(row.scholarship - row.tuitionTotal).toLocaleString("en-US")}. A scholarship cannot discount more than the tuition it applies to, so one of the two cells is wrong.`,
      });
    }

    if (row.tuitionTotal === null) {
      flags.push({
        severity: "error",
        student: row.name,
        issue:
          row.scholarship !== null
            ? `Tuition total is blank while a scholarship of ${row.scholarship.toLocaleString("en-US")} is recorded, so this row contributes a discount with nothing to discount. It pulls the roster's net tuition down by that amount.`
            : "Tuition total is blank, so this student contributes nothing to gross tuition.",
      });
    }

    if (row.scholarship === null) {
      flags.push({
        severity: "warning",
        student: row.name,
        issue: "Scholarship is blank rather than 0, so it is unclear whether none was awarded or none was entered.",
      });
    }

    if (
      row.collegeCredit.startsWith("Yes") &&
      row.tuitionTotal !== null &&
      row.tuitionTotal !== COLLEGE_CREDIT_TUITION
    ) {
      flags.push({
        severity: "warning",
        student: row.name,
        issue: `Taking college credit but billed ${row.tuitionTotal.toLocaleString("en-US")} rather than the ${COLLEGE_CREDIT_TUITION.toLocaleString("en-US")} every other college-credit student was billed.`,
      });
    }

    if (row.balanceDue !== null && row.balanceDue > 0) {
      flags.push({
        severity: "warning",
        student: row.name,
        issue: `Still owes ${row.balanceDue.toLocaleString("en-US")}. ${row.followUp || "No follow-up note recorded."}`,
      });
    }
  }

  return flags;
}

/**
 * Ledger side of the cross-checks, read out of Postgres on 2026-08-11:
 *
 *   select category, status, count(*), sum(amount) from transactions
 *   where category like 'Tuition%' group by 1, 2;
 *
 * Kept as constants rather than queried live because the roster above is a
 * frozen transcription — pairing a frozen sheet against a moving ledger would
 * make the comparison drift out from under the commentary. Re-run the query
 * when the roster is refreshed.
 */
export const LEDGER_TUITION_ACTUAL = 228840.0;
export const LEDGER_TUITION_PROJECTED = 5800.0;
export const LEDGER_ADMIN_FEE_TOTAL = 500.0;
export const LEDGER_COLLEGE_CREDIT_FEE_TOTAL = 48000.0;
export const ADMIN_FEE_UNIT = 100;

/** Names on the ledger's `Tuition — Admin Fees` rows, in payment order. */
export const ADMIN_FEE_PAYERS = [
  "Zenichi Moriki",
  "Emma Kunz",
  "Maya Villalta",
  "Sophie Duerr",
  "Danyoung Kim",
];

/** Names on the ledger's `Tuition — College Credit Fees` rows, in payment order. */
export const COLLEGE_CREDIT_FEE_PAYERS = [
  "Kaila Brown",
  "Malcolm Brown",
  "Ruby Bambsberger",
  "Talia Mallah",
  "Sean O'Neill",
  "Mintesinot Petersson",
  "Trinity Churchill",
  "Oliver Coelho",
  "Rowan Bayson",
  "Geist Lourie",
  "Abby Heckler",
  "Madelyn Huston",
];

/** "Sean O'Neill (Dropped Out)" in the sheet is "Sean O'Neill" in the ledger. */
function normalizeName(name: string): string {
  return name
    .replace(/\s*\(.*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

export interface RosterLedgerDiff {
  /** Sheet says this student takes college credit; the ledger has no fee for them. */
  inSheetOnly: string[];
  /** Ledger has a college-credit fee; the sheet does not mark them as taking it. */
  inLedgerOnly: string[];
}

/**
 * "Yes" also catches Oliver's "No (previously, yes)", which is right: he shows a
 * paid college-credit link and is billed at the college-credit rate. It does not
 * catch Malcolm Brown's "No, moved pmt to tuition", which is the point.
 */
export function getCollegeCreditDiff(): RosterLedgerDiff {
  const sheetNames = STUDENTS.filter((r) => /yes/i.test(r.collegeCredit)).map((r) => r.name);
  const sheetKeys = new Set(sheetNames.map(normalizeName));
  const ledgerKeys = new Set(COLLEGE_CREDIT_FEE_PAYERS.map(normalizeName));

  return {
    inSheetOnly: sheetNames.filter((n) => !ledgerKeys.has(normalizeName(n))),
    inLedgerOnly: COLLEGE_CREDIT_FEE_PAYERS.filter((n) => !sheetKeys.has(normalizeName(n))),
  };
}

/** Students the ledger charged an admin fee whose sheet row does not say "Yes". */
export function getAdminFeeDiff(): string[] {
  const markedYes = new Set(
    STUDENTS.filter((r) => r.adminFee.trim().toLowerCase() === "yes").map((r) => normalizeName(r.name)),
  );
  return ADMIN_FEE_PAYERS.filter((n) => !markedYes.has(normalizeName(n)));
}

export interface CrossCheck {
  label: string;
  sheetValue: string;
  ledgerValue: string;
  agrees: boolean;
  detail: string;
}

export function getLedgerCrossChecks(): CrossCheck[] {
  const totals = getStudentTuitionTotals();
  const ccDiff = getCollegeCreditDiff();
  const adminDiff = getAdminFeeDiff();
  const sheetCollegeCredit = STUDENTS.filter((r) => /yes/i.test(r.collegeCredit)).length;
  const sheetAdminYes = STUDENTS.filter((r) => r.adminFee.trim().toLowerCase() === "yes").length;

  return [
    {
      label: "Outstanding balances",
      sheetValue: `${totals.outstanding.toLocaleString("en-US")} across 2 students`,
      ledgerValue: `${LEDGER_TUITION_PROJECTED.toLocaleString("en-US")} of projected Tuition, 2 rows`,
      agrees: totals.outstanding === LEDGER_TUITION_PROJECTED,
      detail:
        "The ledger already carries both open balances as projected income, named and dated. Nothing to chase here — the sheet and the dashboard agree that this money is still expected.",
    },
    {
      label: "College-credit fees",
      sheetValue: `${sheetCollegeCredit} students take college credit`,
      ledgerValue: `${COLLEGE_CREDIT_FEE_PAYERS.length} fees paid, ${LEDGER_COLLEGE_CREDIT_FEE_TOTAL.toLocaleString("en-US")}`,
      agrees: ccDiff.inSheetOnly.length === 0 && ccDiff.inLedgerOnly.length === 0,
      detail:
        ccDiff.inSheetOnly.length === 0 && ccDiff.inLedgerOnly.length === 0
          ? "Same students on both sides."
          : `The counts match but the names do not. ${ccDiff.inLedgerOnly.join(", ")} paid a college-credit fee without being marked for it in the sheet, while ${ccDiff.inSheetOnly.join(", ")} is marked for it with no fee on the ledger. Both are named Malcolm, so confirm which record is right before treating either as settled.`,
    },
    {
      label: "Admin fees",
      sheetValue: `${sheetAdminYes} students marked “Admin Fee? = Yes”`,
      ledgerValue: `${ADMIN_FEE_PAYERS.length} fees paid, ${LEDGER_ADMIN_FEE_TOTAL.toLocaleString("en-US")}`,
      agrees: adminDiff.length === 0,
      detail:
        adminDiff.length === 0
          ? "Same students on both sides."
          : `${adminDiff.join(", ")} paid the ${ADMIN_FEE_UNIT} admin fee on the ledger but the sheet marks the admin-fee column “No”. The ${ADMIN_FEE_UNIT} shows up as a deposit in the sheet either way, so no money is missing — the column is just mislabelled.`,
    },
  ];
}

export const ORPHAN_TOTAL_NOTE =
  "The sheet carries one summary figure of its own — “Total Projected Tuition $83,340” — sitting alone in a far-right column with nothing around it. It does not match any total on this page. It does match, to the dollar, the net tuition of the first 18 roster rows (Amiya through Zenichi) if Zenichi's scholarship were 13,400 rather than the 17,400 entered — which is the same cell flagged above. The likely reading is a SUM over a range that stopped being extended once Oliver's row was added, computed before that scholarship cell changed. Treat it as a lead to check in the source workbook, not as a figure to use.";
