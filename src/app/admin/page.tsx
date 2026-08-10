import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = supabaseAdmin();
  const [{ count: pendingCount }, { count: unmatchedCount }] = await Promise.all([
    db.from("reimbursement_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("reconciliation_matches").select("id", { count: "exact", head: true }).eq("status", "unmatched"),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Admin</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminCard
            href="/admin/categories"
            title="Categories"
            description="Manage budget categories and targets"
          />
          <AdminCard
            href="/admin/staff-comp"
            title="Staff Compensation"
            description="Track staff comp periods and status"
          />
          <AdminCard
            href="/admin/reconciliation"
            title="Reconciliation"
            description={`${unmatchedCount ?? 0} unmatched · ${pendingCount ?? 0} reimbursements pending`}
          />
        </div>
      </main>
    </div>
  );
}

function AdminCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
    >
      <h2 className="font-medium text-neutral-900 dark:text-neutral-50">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
    </Link>
  );
}
