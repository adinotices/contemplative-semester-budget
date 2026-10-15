import { test } from "node:test";
import assert from "node:assert/strict";
import { receiptExtension, receiptPath } from "./receipt-paths.ts";

test("a stored path is used as-is", () => {
  assert.equal(receiptPath("web/abc.pdf"), "web/abc.pdf");
});

test("a legacy public URL maps back to its object path", () => {
  assert.equal(
    receiptPath("https://x.supabase.co/storage/v1/object/public/receipts/whatsapp/1555/abc"),
    "whatsapp/1555/abc",
  );
});

test("a URL outside the bucket is not treated as ours", () => {
  assert.equal(receiptPath("https://example.com/r.jpg"), null);
});

test("extension comes from the path, else the MIME type", () => {
  assert.equal(receiptExtension("web/a.PDF", "application/pdf"), "pdf");
  assert.equal(receiptExtension("whatsapp/1555/uuid", "image/jpeg"), "jpg");
  assert.equal(receiptExtension("whatsapp/1555/uuid", "application/octet-stream"), "bin");
});
