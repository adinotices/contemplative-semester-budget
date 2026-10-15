import { supabaseAdmin } from "@/lib/supabase/server";
import { selectAll } from "@/lib/supabase/select-all";

/**
 * Builds the data context handed to Claude for /chat, scoped per §7:
 * general staff only ever see category-level aggregates (no payee names,
 * no per-line detail, no staff comp / student financial data); admins get
 * full table access. This mirrors the Postgres RLS split in
 * supabase/migrations/0001_init.sql — even though this path uses the
 * service role, it must not fetch more than the caller's role allows.
 */
// Serialized compact (no indentation): the same rows pretty-printed cost ~30%
// more input tokens, and this string is re-sent (or cache-read) on every turn.
export async function buildChatContext(role: string): Promise<string> {
  const db = supabaseAdmin();
  const isAdmin = role === "admin";

  const { data: categories } = await db.from("budget_categories").select("name, type, budget_target");

  if (!isAdmin) {
    const { data: summary } = await db
      .from("category_summary")
      .select("category, direction, month, total_amount")
      .order("month", { ascending: false })
      .limit(200);

    return JSON.stringify(
      {
        scope: "general_staff_aggregate",
        budget_categories: categories ?? [],
        category_summary: summary ?? [],
      },
    );
  }

  const [{ data: transactions }, { data: staffComp }, { data: students }, { data: reimbursements }] =
    await Promise.all([
      selectAll((from, to) =>
        db
          .from("transactions")
          .select("date, direction, category, payee, description, amount, status")
          .order("date", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      db.from("staff_compensation").select("staff_name, period, amount, status"),
      db
        .from("students")
        .select("name, tuition_total, tuition_paid, scholarship_amount, balance_outstanding"),
      db
        .from("reimbursement_requests")
        .select("submitted_by_name, description, amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  return JSON.stringify(
    {
      scope: "admin_full",
      budget_categories: categories ?? [],
      transactions: transactions ?? [],
      staff_compensation: staffComp ?? [],
      students: students ?? [],
      reimbursement_requests: reimbursements ?? [],
    },
    null,
    2,
  );
}
