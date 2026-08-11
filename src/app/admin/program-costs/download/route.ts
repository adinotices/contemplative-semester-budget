import { buildSnapshotCsv, CSV_FILENAME } from "@/lib/data/program-costs-snapshot";

// Under /admin, so proxy.ts has already required an admin session.
export async function GET() {
  // Excel reads a BOM-less UTF-8 CSV as Latin-1 and mangles the em dashes.
  const body = `﻿${buildSnapshotCsv()}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${CSV_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
