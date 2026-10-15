# TODO

Open items for the budget app and the ledger. Newest first. Move finished items to the log in `agent_context.md`.

## Waiting on Aditya

- [ ] **Answer Jaycel about the D&O refund (since 2026-10-12).** Marsh sent two invoices on 10/7: a return premium for the cancelled D&O policy, and invoice 209774 for the 1-year D&O discovery period (ERP, $258 + surplus-lines tax). Jaycel asked whether the refund should be netted against 209774. Reply in the thread "Contemplative Semester Inc. - Invoices - D&O ERP Discovery Period - D&O Policy - Cancelled". Then add both to the ledger: the ERP cost as an expense and the return premium as `Insurance Refund` income.
- [ ] **Find the ~$234 insurance refund check** mailed to Aditya (lost). Lynn Trombly asked on 9/21 that he search before she arranges a stop-payment and reissue. Ledger row: projected, `Insurance Refund`, 2026-09-21.
- [ ] **BCBS 2026 admin fee**: Melissa proposed $15,000; Shea asked 10/13 to pro-rate Apr–Dec 2026. Ledger has it projected at $15,000 on 2026-04-01 (also in the Program Costs snapshot). Update both when Melissa confirms the amount.

## App

- [ ] **Stop the app from auto-pausing.** Still happening as of 2026-10-15. First find out which layer pauses: Supabase free-tier projects pause after ~7 days without DB activity (the likely cause), whereas Vercel Hobby doesn't pause deployments. Note: `vercel.json` already runs `/api/cron/weekly-digest` every Monday 13:00 UTC, which queries the DB. That should keep a 7-day idle timer from firing, so check the Supabase dashboard for the actual pause events before assuming that's the cause. Fixes, depending on the cause: a daily Vercel cron that runs a cheap query, or moving the Supabase project to a paid plan.
