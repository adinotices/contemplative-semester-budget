# TODO

Open items for the budget app and the ledger. Newest first. Move finished items to the log in `agent_context.md`.

## Waiting on Aditya

- [ ] **Answer Jaycel about the D&O refund (since 2026-10-12).** Marsh sent two invoices on 10/7: a return premium for the cancelled D&O policy, and invoice 209774 for the 1-year D&O discovery period (ERP, $258 + surplus-lines tax). Jaycel asked whether the refund should be netted against 209774. Reply in the thread "Contemplative Semester Inc. - Invoices - D&O ERP Discovery Period - D&O Policy - Cancelled". Then add both to the ledger: the ERP cost as an expense and the return premium as `Insurance Refund` income.
- [ ] **Find the ~$234 insurance refund check** mailed to Aditya (lost). Lynn Trombly asked on 9/21 that he search before she arranges a stop-payment and reissue. Ledger row: projected, `Insurance Refund`, 2026-09-21.
- [ ] **BCBS 2026 admin fee**: Melissa proposed $15,000; Shea asked 10/13 to pro-rate Apr–Dec 2026. Ledger has it projected at $15,000 on 2026-04-01 (also in the Program Costs snapshot). Update both when Melissa confirms the amount.

- [ ] **Confirm or drop the remaining projected rows** ($70,406.74 expense, $7,034 income as of 2026-10-15). There's no email confirming any of these. The Gmail connector can't read attachments, so payment screenshots (the kind that confirmed Brent's) are invisible to it.
  - Michelle Chai bonus $4,540.79: email shows ONE payment, $4,069.90 for extra semester hours (requested 2026-06-08, Jaycel posted same day). The remaining $470.89 has no email trail. Waiting on Aditya: was it a second payment, or should the row be $4,069.90?
  - Naropa pass-through, 10 × $2,000 = $20,000: current-cohort credit fees owed to Naropa; nothing shows they were sent.
  - Backpay for Shea & Maya $30,135: biggest open item; no email trail.
  - Small items: Potash storage balance $400, Mailchimp $261.37 (Shea), stamps $65.60 (Maya), Luc media storage 2 × $1.99.
  - Income: Meera Kochhar $2,500 and Amiya Fornés-Sicam $3,300 (Aditya is chasing both, per Shea 10/13), Potash deposit refund $1,000, insurance refund ~$234.
- [ ] **Ask Meredith/Melissa for a BCBS ledger export after 2026-04-28.** The app's BCBS data stops there, and that export alone would settle most of the list above in one pass.

## App

- [ ] **Stop the app from auto-pausing.** Still happening as of 2026-10-15. First find out which layer pauses: Supabase free-tier projects pause after ~7 days without DB activity (the likely cause), whereas Vercel Hobby doesn't pause deployments. Note: `vercel.json` already runs `/api/cron/weekly-digest` every Monday 13:00 UTC, which queries the DB. That should keep a 7-day idle timer from firing, so check the Supabase dashboard for the actual pause events before assuming that's the cause. Fixes, depending on the cause: a daily Vercel cron that runs a cheap query, or moving the Supabase project to a paid plan.
