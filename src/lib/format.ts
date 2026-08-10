/**
 * Always renders exact cents. These figures appear in documents people pay
 * from — the accountant email, the approval screen, the reconciliation
 * tables — where rounding to whole dollars both misstates the amount and
 * makes line items stop summing to their own total (three $10.40 rows
 * displayed as "$10" each under a "$31" total).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
