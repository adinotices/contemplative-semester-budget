import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";

// Verbatim from the org's internal ledger spreadsheet ("Category Reference"
// and "Budget Mapping Reference" sections) — this is documentation, not
// queried data, so it's kept as static content rather than round-tripped
// through the database.

interface CategoryRef {
  name: string;
  whatGoesHere: string;
  examples?: string;
}

const INCOME_CATEGORIES: CategoryRef[] = [
  {
    name: "Tuition",
    whatGoesHere: "Deposits, remaining balances, full payments from enrolled students",
    examples: "Student: Talia Mallah - Remaining Balance",
  },
  {
    name: "Tuition — Admin Fees",
    whatGoesHere: "Non-refundable application/admin fees",
    examples: "Student: Zenichi Moriki - Admin Fee",
  },
  {
    name: "Tuition — College Credit Fees",
    whatGoesHere: "The $4K fee students pay for Naropa college credit",
    examples: "Student: Kaila Brown - College Credit Fee",
  },
  {
    name: "Individual Donations",
    whatGoesHere: "Gifts from individual people",
    examples: "Donation - Bruce Levine, Donation - Mirra Bank",
  },
  {
    name: "Grants & Institutional Gifts",
    whatGoesHere: "Foundations, DAFs, corporate gifts, grants",
    examples: "Hemera Foundation, FP Worthen Foundation",
  },
];

const EXPENSE_CATEGORIES: CategoryRef[] = [
  {
    name: "Compensation",
    whatGoesHere: "All staff/contractor pay — salaries, monthly comp, backpay",
    examples: "May Compensation - Sarah Cole",
  },
  {
    name: "Facilities",
    whatGoesHere: "Potash Hill rent, deposits, campus logistics, PO Box",
    examples: "Potash Hill 50% payment",
  },
  {
    name: "Professional Services",
    whatGoesHere: "BCBS sponsorship, Cornerstone insurance, grant writing, VT licensing, CPR cert",
    examples: "Cornerstone first quarter payment",
  },
  {
    name: "Technology",
    whatGoesHere: "Software: ClickUp, Asana, Canva, Zoom, video editing tools",
    examples: "April ClickUp Payment, Asana additional users",
  },
  {
    name: "Marketing & Outreach",
    whatGoesHere: "Business cards, flyers, fundraiser supplies, directory listings (Gap Year Assoc, TeenLife)",
    examples: "Flyers for Ella, Gap Year Association",
  },
  {
    name: "Staff Development",
    whatGoesHere: "Retreat costs, training (Sociocracy, etc.)",
    examples: "IMS Retreat payment for Sarah Cole",
  },
  {
    name: "Travel",
    whatGoesHere: "Transportation for staff or students",
    examples: "Bus ticket for Ashlynne",
  },
  {
    name: "Naropa Pass-Through",
    whatGoesHere:
      "The $2K per current-cohort student that goes back to Naropa for credit processing (nets against current tuition)",
    examples: "PLANNED Kaila Brown - 1/2 College Credit Fee to Naropa",
  },
  {
    name: "Naropa Pass-Through — Prior Cohort",
    whatGoesHere:
      "Prior-year (Fall 2024) Naropa credit-transcription invoice. Non-program; shown as its own expense line and does NOT net against current-year tuition",
    examples: "Naropa Invoice INV-2024-CS-001 ($28,375)",
  },
  {
    name: "Other Expense",
    whatGoesHere: "Anything that doesn&apos;t fit above — flag for review",
  },
  {
    name: "Food",
    whatGoesHere: "All food purchases: grocery orders, restaurant/pizza orders, food co-op, specialty ingredients",
    examples: "Marty's Local food order, BJs food, Brattleboro Co-op, Friday pizza dinner",
  },
  {
    name: "Supplies",
    whatGoesHere:
      "Non-food physical items: cleaning supplies, books, medical supplies, furniture, kitchen equipment, bedding, decor",
    examples: "First aid kit, slippers for students, coat racks, epipen, mouse habitat supplies",
  },
  {
    name: "Refund",
    whatGoesHere: "Money returned to students or families — tuition refunds, fee reversals, overpayment corrections",
    examples: "Oliver Coelho college credit fee refund to family",
  },
];

interface BudgetMappingRef {
  budgetLine: string;
  ledgerCategories: string;
  notes?: string;
}

const INCOME_BUDGET_LINES: BudgetMappingRef[] = [
  {
    budgetLine: "Tuition (net)",
    ledgerCategories:
      "Tuition + Tuition — Admin Fees + Tuition — College Credit Fees, minus current-cohort Naropa Pass-Through and Refund",
    notes: "Naropa fees and student refunds are deducted from gross tuition to show net tuition income",
  },
  {
    budgetLine: "Fundraising",
    ledgerCategories: "Individual Donations + Grants & Institutional Gifts",
  },
];

const EXPENSE_BUDGET_LINES: BudgetMappingRef[] = [
  {
    budgetLine: "Compensation (incl. pre-semester)",
    ledgerCategories: "Compensation",
    notes: "Budget of $293,316 = $183,316 during-semester + $110,000 pre-semester merged into one line",
  },
  {
    budgetLine: "Rent / Facilities",
    ledgerCategories: "Facilities",
    notes: "Includes Potash Hill rent, deposits, laundry, PO Box",
  },
  {
    budgetLine: "Food",
    ledgerCategories: "Food",
    notes: "All grocery orders, restaurant/pizza, co-op purchases",
  },
  {
    budgetLine: "Legal, Accounting, Insurance",
    ledgerCategories: "Professional Services",
    notes: "BCBS sponsorship, Cornerstone, immigration lawyer, VT licensing, CPR cert",
  },
  {
    budgetLine: "Supplies & Subscriptions",
    ledgerCategories: "Supplies + Marketing & Outreach",
    notes: "Physical supplies + business cards, flyers, directory listings",
  },
  {
    budgetLine: "IT / Technology",
    ledgerCategories: "Technology",
    notes: "ClickUp, Asana, Canva, Zoom, Claude AI, media storage, iPad",
  },
  {
    budgetLine: "Travel",
    ledgerCategories: "Travel",
    notes: "Gas, EV charging, tolls, car rental, flights, Uber, mileage",
  },
  {
    budgetLine: "Other (Staff Dev, Misc)",
    ledgerCategories: "Staff Development + Other Expense",
    notes:
      "Retreats, trainings, and anything that doesn't fit above. Naropa and Refunds are NOT here — they are netted against Tuition income",
  },
  {
    budgetLine: "Naropa Pass-Through — Prior Cohort (non-program)",
    ledgerCategories: "Naropa Pass-Through — Prior Cohort",
    notes: "Prior-year liability on its own line; excluded from current-cohort tuition netting",
  },
];

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <DashboardTabs />
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Category Reference Guide</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          What each ledger category means and how it rolls up into the Budget vs. Actual lines. Reproduced from the
          org&apos;s internal ledger spreadsheet.
        </p>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Income Categories</h2>
          <ReferenceTable rows={INCOME_CATEGORIES} />
        </div>

        <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Expense Categories</h2>
          <ReferenceTable rows={EXPENSE_CATEGORIES} />
        </div>

        <h2 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">Budget Mapping Reference</h2>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          How the ledger categories above map onto the Budget vs. Actual tab&apos;s budget lines.
        </p>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Income</h2>
          <MappingTable rows={INCOME_BUDGET_LINES} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Expenses</h2>
          <MappingTable rows={EXPENSE_BUDGET_LINES} />
        </div>
      </main>
    </div>
  );
}

function ReferenceTable({ rows }: { rows: CategoryRef[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 pr-3 font-medium">Category</th>
          <th className="py-2 pr-3 font-medium">What Goes Here</th>
          <th className="py-2 font-medium">Examples</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.name}
            className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
          >
            <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-neutral-50">{r.name}</td>
            <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-300">{r.whatGoesHere}</td>
            <td className="py-2 text-neutral-500 dark:text-neutral-400">{r.examples ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MappingTable({ rows }: { rows: BudgetMappingRef[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <th className="py-2 pr-3 font-medium">Budget Line</th>
          <th className="py-2 pr-3 font-medium">Ledger Categories Included</th>
          <th className="py-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.budgetLine}
            className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 dark:border-neutral-800 dark:odd:bg-neutral-900 dark:even:bg-white/[0.03]"
          >
            <td className="py-2 pr-3 font-medium text-neutral-900 dark:text-neutral-50">{r.budgetLine}</td>
            <td className="py-2 pr-3 text-neutral-600 dark:text-neutral-300">{r.ledgerCategories}</td>
            <td className="py-2 text-neutral-500 dark:text-neutral-400">{r.notes ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
