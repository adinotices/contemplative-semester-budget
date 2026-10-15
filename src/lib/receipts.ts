import { supabaseAdmin } from "@/lib/supabase/server";
import { RECEIPT_BUCKET, receiptExtension, receiptPath } from "./receipt-paths";

/**
 * Receipts live in a PRIVATE Supabase Storage bucket. `reimbursement_requests.receipt_url`
 * stores the object path inside that bucket (e.g. `web/<uuid>.pdf`), not a URL:
 * anything that needs the file downloads it with the service role
 * (digest/approval emails) or mints a short-lived signed URL (approve page).
 *
 * Older rows may hold a full public URL from when the bucket was public;
 * `receiptPath` maps those back to a path so they keep working.
 */
export { RECEIPT_BUCKET, receiptPath, receiptExtension };

/** Downloads a receipt with the service role. Returns null when it can't be fetched. */
export async function downloadReceipt(
  ref: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  const path = receiptPath(ref);
  if (path) {
    const { data, error } = await supabaseAdmin().storage.from(RECEIPT_BUCKET).download(path);
    if (error || !data) return null;
    return { buffer: Buffer.from(await data.arrayBuffer()), ext: receiptExtension(path, data.type) };
  }
  // A URL outside our bucket (not produced by this app today): fetch it as-is.
  const res = await fetch(ref);
  if (!res.ok) return null;
  const ext = ref.split(".").pop()?.split("?")[0] || "bin";
  return { buffer: Buffer.from(await res.arrayBuffer()), ext };
}

/** A signed URL valid for `seconds`, for showing a receipt link to a reviewer. */
export async function signedReceiptUrl(ref: string, seconds = 3600): Promise<string | null> {
  const path = receiptPath(ref);
  if (!path) return /^https?:\/\//.test(ref) ? ref : null;
  const { data, error } = await supabaseAdmin().storage.from(RECEIPT_BUCKET).createSignedUrl(path, seconds);
  return error || !data ? null : data.signedUrl;
}
