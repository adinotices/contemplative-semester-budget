import { formatCurrency } from "@/lib/format";

interface DigestItem {
  id: string;
  submittedByName: string;
  description: string;
  amount: number;
  approveUrl: string;
}

export function weeklyDigestEmail(items: DigestItem[], appUrl: string) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${item.submittedByName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatCurrency(item.amount)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;">
            <a href="${item.approveUrl}" style="color:#111;font-weight:600;">Review &amp; approve</a>
          </td>
        </tr>`,
    )
    .join("");

  return {
    subject: `Reimbursements pending approval (${items.length})`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        <h2>Weekly Reimbursement Review</h2>
        <p>${items.length} request${items.length === 1 ? "" : "s"} awaiting your approval. Each link is single-use and expires in 7 days.</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;color:#666;">
              <th style="padding:8px 12px;">Submitted by</th>
              <th style="padding:8px 12px;">Description</th>
              <th style="padding:8px 12px;text-align:right;">Amount</th>
              <th style="padding:8px 12px;">Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:24px;color:#999;font-size:12px;">
          <a href="${appUrl}">${appUrl}</a>
        </p>
      </div>`,
  };
}

interface AccountantEmailPayload {
  payee: string;
  amount: number;
  description: string;
  receiptUrl?: string | null;
}

export function accountantReimbursementEmail(payload: AccountantEmailPayload) {
  return {
    subject: `Reimbursement approved: ${payload.payee} — ${formatCurrency(payload.amount)}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        <h2>Reimbursement Approved</h2>
        <table style="border-collapse:collapse;">
          <tbody>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Payee</td><td style="padding:4px 0;">${payload.payee}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Amount</td><td style="padding:4px 0;">${formatCurrency(payload.amount)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Description</td><td style="padding:4px 0;">${payload.description}</td></tr>
            ${
              payload.receiptUrl
                ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Receipt</td><td style="padding:4px 0;"><a href="${payload.receiptUrl}">View receipt</a></td></tr>`
                : ""
            }
          </tbody>
        </table>
      </div>`,
  };
}
