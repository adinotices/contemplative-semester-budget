import { NavBar } from "@/components/nav-bar";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { formatCurrency } from "@/lib/format";
import {
  BCBS_GROSS_TUITION,
  BCBS_NET_TUITION,
  BCBS_SCHOLARSHIPS,
  LEDGER_TUITION_CASH,
} from "@/lib/data/program-costs-snapshot";
import {
  getDataQualityFlags,
  getLedgerCrossChecks,
  getStudentTuitionTotals,
  ORPHAN_TOTAL_NOTE,
  SNAPSHOT_DATE,
  SOURCE_FILE,
  STUDENTS,
  type StudentTuitionRow,
} from "@/lib/data/student-tuition-snapshot";

export const dynamic = "force-dynamic";

export default function StudentTuitionPage() {
  const totals = getStudentTuitionTotals();
  const flags = getDataQualityFlags();
  const crossChecks = getLedgerCrossChecks();

  const errors = flags.filter((f) => f.severity === "error");
  const warnings = flags.filter((f) => f.severity === "warning");

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <DashboardTabs />

        <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Student Tuition</h1>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Per-student tuition, scholarships and balances for the {totals.studentCount}-student CS 2026 cohort,
          from the accepted-student tracker.
        </p>

        <div className="mb-6 rounded-xl border border-neutral-300 bg-neutral-100 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-800/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-neutral-50 dark:bg-neutral-200 dark:text-neutral-900">
              Frozen snapshot
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              Last updated {formatDate(SNAPSHOT_DATE)}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Transcribed from {SOURCE_FILE}. Cells are shown exactly as the sheet has them, including the ones
            that look wrong — nothing here is corrected or filled in. Edit the sheet, then re-transcribe; this
            page will not change on its own.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Students" value={String(totals.studentCount)} />
          <Stat label="Gross tuition" value={formatCurrency(totals.grossTuition)} />
          <Stat label="Scholarships" value={formatCurrency(totals.scholarships)} />
          <Stat label="Net tuition" value={formatCurrency(totals.netTuition)} emphasis />
          <Stat label="Deposits collected" value={formatCurrency(totals.deposits)} />
          <Stat
            label="Still outstanding"
            value={formatCurrency(totals.outstanding)}
            tone={totals.outstanding > 0 ? "warn" : "good"}
          />
        </section>

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">
            Roster vs. BCBS&apos;s books
          </h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Both sides are accrual and both count the college-credit component, so these are directly
            comparable. The roster runs slightly higher across the board.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 pr-3 font-medium">Measure</th>
                  <th className="py-2 pr-3 text-right font-medium">Student tracker</th>
                  <th className="py-2 pr-3 text-right font-medium">BCBS accrual</th>
                  <th className="py-2 text-right font-medium">Difference</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Gross tuition" mine={totals.grossTuition} theirs={BCBS_GROSS_TUITION} />
                <CompareRow label="Scholarships awarded" mine={totals.scholarships} theirs={BCBS_SCHOLARSHIPS} />
                <CompareRow label="Net tuition" mine={totals.netTuition} theirs={BCBS_NET_TUITION} />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            The ledger&apos;s tuition cash of {formatCurrency(LEDGER_TUITION_CASH)} is deliberately left out of
            this table. It excludes college-credit and admin fees while the roster&apos;s totals include the
            college-credit component, so subtracting one from the other would produce a gap that means nothing.
          </p>
        </section>

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">
            Cross-checks against our ledger
          </h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Where the tracker and the transaction ledger describe the same thing, they should say the same
            thing. Two of these three do not.
          </p>
          <div className="space-y-3">
            {crossChecks.map((check) => (
              <div
                key={check.label}
                className={`rounded-lg border p-4 ${
                  check.agrees
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                    : "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
                }`}
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`text-sm font-medium ${
                      check.agrees
                        ? "text-emerald-900 dark:text-emerald-200"
                        : "text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    {check.agrees ? "Agrees" : "Differs"} — {check.label}
                  </span>
                  <span
                    className={`text-xs ${
                      check.agrees
                        ? "text-emerald-800/80 dark:text-emerald-300/80"
                        : "text-amber-800/80 dark:text-amber-300/80"
                    }`}
                  >
                    tracker: {check.sheetValue} · ledger: {check.ledgerValue}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    check.agrees
                      ? "text-emerald-900/90 dark:text-emerald-200/90"
                      : "text-amber-900/90 dark:text-amber-200/90"
                  }`}
                >
                  {check.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-50">
            Rows worth a second look
          </h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {errors.length} that cannot be right as entered, {warnings.length} worth confirming. Derived from
            the roster itself, so fixing the sheet and re-transcribing clears them.
          </p>
          <ul className="space-y-2">
            {flags.map((flag, i) => (
              <li
                key={`${flag.student}-${i}`}
                className="flex flex-col gap-1 border-b border-neutral-100 pb-2 last:border-0 last:pb-0 dark:border-neutral-800 sm:flex-row sm:gap-3"
              >
                <div className="flex shrink-0 items-baseline gap-2 sm:w-56">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      flag.severity === "error"
                        ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {flag.severity}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {flag.student}
                  </span>
                </div>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{flag.issue}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            {ORPHAN_TOTAL_NOTE}
          </p>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">Roster</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">College credit</th>
                  <th className="py-2 pr-3 text-right font-medium">Deposit</th>
                  <th className="py-2 pr-3 text-right font-medium">Scholarship</th>
                  <th className="py-2 pr-3 text-right font-medium">Tuition total</th>
                  <th className="py-2 pr-3 text-right font-medium">Balance due</th>
                  <th className="py-2 font-medium">Payment status</th>
                </tr>
              </thead>
              <tbody>
                {STUDENTS.map((row) => (
                  <RosterRow key={row.name} row={row} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-300 font-medium dark:border-neutral-700">
                  <td className="py-2 pr-3 text-neutral-900 dark:text-neutral-50">
                    {totals.studentCount} students
                  </td>
                  <td className="py-2 pr-3" />
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(totals.deposits)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(totals.scholarships)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(totals.grossTuition)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(totals.outstanding)}</td>
                  <td className="py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            A dash is a cell the sheet left empty; &ldquo;n/a&rdquo; is the sheet recording that the field does
            not apply. Net tuition of {formatCurrency(totals.netTuition)} is gross minus scholarships across the
            whole roster — it is not the sum of the per-student differences, because one row carries a
            scholarship with no tuition against it.
          </p>
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis = false,
  tone = "plain",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "plain" | "good" | "warn";
}) {
  const valueClass =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "good"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-neutral-900 dark:text-neutral-50";

  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasis
          ? "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function CompareRow({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const diff = Math.round((mine - theirs) * 100) / 100;
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(mine)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(theirs)}</td>
      <td
        className={`py-2 text-right tabular-nums ${
          diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
        }`}
      >
        {diff === 0 ? "—" : formatCurrency(diff)}
      </td>
    </tr>
  );
}

function RosterRow({ row }: { row: StudentTuitionRow }) {
  const owes = (row.balanceDue ?? 0) > 0;

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="py-2 pr-3 align-top">
        <span className="text-neutral-900 dark:text-neutral-50">{row.name}</span>
        {row.followUp && (
          <p className="mt-0.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">{row.followUp}</p>
        )}
      </td>
      <td className="py-2 pr-3 align-top text-neutral-600 dark:text-neutral-400">
        {row.collegeCredit || "—"}
        {row.collegeCreditStatus && row.collegeCreditStatus !== "N/A" && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{row.collegeCreditStatus}</p>
        )}
      </td>
      <td className="py-2 pr-3 text-right align-top tabular-nums">
        {row.deposit === null ? (
          <span className="text-neutral-400 dark:text-neutral-500">{row.depositRaw || "—"}</span>
        ) : (
          formatCurrency(row.deposit)
        )}
        {row.depositPaid && (
          <p className="mt-0.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">{row.depositPaid}</p>
        )}
      </td>
      <Cell value={row.scholarship} />
      <Cell value={row.tuitionTotal} />
      <td
        className={`py-2 pr-3 text-right align-top tabular-nums ${
          owes ? "font-medium text-amber-700 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        {row.balanceDue === null ? "—" : formatCurrency(row.balanceDue)}
      </td>
      <td className="py-2 align-top text-neutral-600 dark:text-neutral-400">{row.balanceStatus || "—"}</td>
    </tr>
  );
}

function Cell({ value }: { value: number | null }) {
  return (
    <td
      className={`py-2 pr-3 text-right align-top tabular-nums ${
        value === null ? "text-neutral-400 dark:text-neutral-500" : ""
      }`}
    >
      {value === null ? "—" : formatCurrency(value)}
    </td>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
