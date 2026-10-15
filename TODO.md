# TODO

Open items for the budget app and the ledger. Newest first. Move finished items to the log in `agent_context.md`.

## Waiting on Aditya

- [ ] **Answer Jaycel about the D&O refund (since 2026-10-12).** Marsh sent two invoices on 10/7: a return premium for the cancelled D&O policy, and invoice 209774 for the 1-year D&O discovery period (ERP, $258 + surplus-lines tax). Jaycel asked whether the refund should be netted against 209774. Reply in the thread "Contemplative Semester Inc. - Invoices - D&O ERP Discovery Period - D&O Policy - Cancelled". Then add both to the ledger: the ERP cost as an expense and the return premium as `Insurance Refund` income.
- [ ] **Find the ~$234 insurance refund check** mailed to Aditya (lost). Lynn Trombly asked on 9/21 that he search before she arranges a stop-payment and reissue. Ledger row: projected, `Insurance Refund`, 2026-09-21.
- [ ] **BCBS 2026 admin fee**: Melissa proposed $15,000; Shea asked 10/13 to pro-rate Apr–Dec 2026. Ledger has it projected at $15,000 on 2026-04-01 (also in the Program Costs snapshot). Update both when Melissa confirms the amount.

- [ ] **Confirm or drop the remaining projected rows** ($50,229.19 expense, $7,034 income as of 2026-10-15). There's no email confirming any of these. The Gmail connector can't read attachments, so payment screenshots (the kind that confirmed Brent's) are invisible to it.
  - Naropa pass-through, 10 × $2,000 = $20,000: current-cohort credit fees owed to Naropa; nothing shows they were sent.
  - Backpay for Shea & Maya $12,235 (cut from $30,135 on 10/15); no email trail. Plus Maya's separate $2,100 backpay (projected, 2025-12-31, added 10/15).
  - Small items: Potash storage balance $400, Mailchimp $261.37 (Shea), stamps $65.60 (Maya), Luc media storage 2 × $1.99.
  - Income: Meera Kochhar $2,500 and Amiya Fornés-Sicam $3,300 (Aditya is chasing both, per Shea 10/13), Potash deposit refund $1,000, insurance refund ~$234.
- [ ] **Ask Meredith/Melissa for a BCBS ledger export after 2026-04-28.** The app's BCBS data stops there, and that export alone would settle most of the list above in one pass.

- [ ] **Maya's $1,715 coaching submission (form, 2026-10-15 13:05)**: not added. It came 41 s before a $1,750 submission for the same coach, and the ledger already has "Coaching (Venmo)" $1,714 actual for Maya (2026-05-21). Likely a duplicate or typo; Aditya to confirm before adding.
- Note: October form submissions (Shea Claude $65.34 + Zoom $190.86, Maya coaching $1,750) are in the ledger as projected but deliberately NOT in the Program Costs snapshot (post-cohort spending), so ledger projected ($52,235.39) now exceeds the snapshot ($50,229.19) by exactly $2,006.20.

## App

- [ ] **Stop the app from auto-pausing.** Still happening as of 2026-10-15. First find out which layer pauses: Supabase free-tier projects pause after ~7 days without DB activity (the likely cause), whereas Vercel Hobby doesn't pause deployments. Note: `vercel.json` already runs `/api/cron/weekly-digest` every Monday 13:00 UTC, which queries the DB. That should keep a 7-day idle timer from firing, so check the Supabase dashboard for the actual pause events before assuming that's the cause. Fixes, depending on the cause: a daily Vercel cron that runs a cheap query, or moving the Supabase project to a paid plan.
