import { formatCurrency } from "@/lib/format";

export interface BatchEmailItem {
  sequenceLabel: string;
  submitterName: string;
  description: string;
  amount: number;
  hasReceipt: boolean;
}

interface BatchEmailOptions {
  items: BatchEmailItem[];
  /** Shown at the top, above the tables. Omit for the internal review email. */
  greeting?: string;
  /** If set, renders a single Approve button at the bottom (the review email only). */
  approveUrl?: string;
}

/**
 * One shared template for both the internal review email (Aditya, with the
 * Approve button) and the final accountant email (Jaycel, no button, with a
 * greeting) — same grouped-by-submitter tables and the same receipt
 * attachments either way, so what gets reviewed is exactly what gets sent.
 */
export function reimbursementBatchEmail(opts: BatchEmailOptions) {
  const { items, greeting, approveUrl } = opts;

  const groups = new Map<string, BatchEmailItem[]>();
  for (const item of items) {
    const existing = groups.get(item.submitterName);
    if (existing) existing.push(item);
    else groups.set(item.submitterName, [item]);
  }

  const groupBlocks = Array.from(groups.entries())
    .map(([submitterName, groupItems]) => {
      const subtotal = groupItems.reduce((sum, i) => sum + i.amount, 0);
      const rows = groupItems
        .map(
          (item) => `
            <tr>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;font-family:monospace;color:#666;">${item.sequenceLabel}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${item.description}${item.hasReceipt ? "" : ' <span style="color:#b45309;">(no receipt)</span>'}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatCurrency(item.amount)}</td>
            </tr>`,
        )
        .join("");

      return `
        <h3 style="margin:20px 0 8px;">${submitterName}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;color:#666;font-size:12px;">
              <th style="padding:6px 12px;">ID</th>
              <th style="padding:6px 12px;">Description</th>
              <th style="padding:6px 12px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="font-weight:600;">
              <td style="padding:6px 12px;" colspan="2">Total — ${submitterName}</td>
              <td style="padding:6px 12px;text-align:right;">${formatCurrency(subtotal)}</td>
            </tr>
          </tbody>
        </table>`;
    })
    .join("");

  const grandTotal = items.reduce((sum, i) => sum + i.amount, 0);

  return {
    subject: `Reimbursements — batch of ${items.length}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        ${greeting ? `<p>${greeting}</p>` : "<h2>Weekly Reimbursement Review</h2>"}
        <p style="color:#666;">${items.length} item${items.length === 1 ? "" : "s"} — receipts are attached to this email, filenames match the ID column.</p>
        ${groupBlocks}
        <p style="margin-top:16px;font-size:16px;font-weight:700;">Grand total: ${formatCurrency(grandTotal)}</p>
        ${
          approveUrl
            ? `<p style="margin-top:24px;">
                <a href="${approveUrl}" style="display:inline-block;background:#111;color:#fff;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">Approve &amp; send to accountant</a>
              </p>
              <p style="margin-top:8px;color:#999;font-size:12px;">This link is single-use and expires in 7 days.</p>`
            : ""
        }
      </div>`,
  };
}
