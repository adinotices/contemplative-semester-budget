"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
}

export function MatchForm({
  transactions,
  bcbsTransactions,
}: {
  transactions: Option[];
  bcbsTransactions: Option[];
}) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState("");
  const [bcbsId, setBcbsId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!transactionId || !bcbsId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId, bcbs_transaction_id: bcbsId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save match");
      setTransactionId("");
      setBcbsId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save match");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Internal transaction</label>
        <select
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          className="w-64 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        >
          <option value="">Select…</option>
          {transactions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">BCBS export line</label>
        <select
          value={bcbsId}
          onChange={(e) => setBcbsId(e.target.value)}
          className="w-64 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
        >
          <option value="">Select…</option>
          {bcbsTransactions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !transactionId || !bcbsId}
        className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Mark matched
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
