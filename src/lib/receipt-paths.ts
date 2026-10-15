/** Pure helpers for receipt references; see lib/receipts.ts for the storage side. */
export const RECEIPT_BUCKET = "receipts";

const PUBLIC_URL_MARKER = `/storage/v1/object/public/${RECEIPT_BUCKET}/`;

/** The object path for a stored receipt reference, or null if it isn't in our bucket. */
export function receiptPath(ref: string): string | null {
  if (!/^https?:\/\//.test(ref)) return ref;
  const i = ref.indexOf(PUBLIC_URL_MARKER);
  return i === -1 ? null : decodeURIComponent(ref.slice(i + PUBLIC_URL_MARKER.length).split("?")[0]);
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Extension for an attachment filename: from the path if it has one, else from the MIME type. */
export function receiptExtension(path: string, contentType: string | undefined): string {
  const last = path.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  if (dot > 0) return last.slice(dot + 1).toLowerCase();
  return (contentType && EXT_BY_TYPE[contentType.split(";")[0].trim()]) || "bin";
}
