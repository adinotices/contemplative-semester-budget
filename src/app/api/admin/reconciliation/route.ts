import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  transaction_id: z.string().uuid(),
  bcbs_transaction_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("reconciliation_matches").insert({
    transaction_id: parsed.data.transaction_id,
    bcbs_transaction_id: parsed.data.bcbs_transaction_id,
    status: "matched",
    matched_by: session.user?.email ?? "admin",
    matched_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
