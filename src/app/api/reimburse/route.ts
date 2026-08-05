import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const RECEIPT_BUCKET = "receipts";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB

const fieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const parsed = fieldsSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    description: form.get("description"),
    amount: form.get("amount"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  let receiptUrl: string | null = null;

  const receipt = form.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ error: "Receipt file is too large (max 10MB)" }, { status: 400 });
    }
    const ext = receipt.name.split(".").pop() || "bin";
    const path = `web/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage
      .from(RECEIPT_BUCKET)
      .upload(path, receipt, { contentType: receipt.type || undefined });
    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
    }
    const { data: publicUrl } = db.storage.from(RECEIPT_BUCKET).getPublicUrl(path);
    receiptUrl = publicUrl.publicUrl;
  }

  const { name, email, phone, description, amount } = parsed.data;

  const { error: insertError } = await db.from("reimbursement_requests").insert({
    submitted_by_name: name,
    submitted_by_email: email || null,
    submitted_by_phone: phone || null,
    description,
    amount,
    receipt_url: receiptUrl,
    status: "pending",
    submitted_via: "web",
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
