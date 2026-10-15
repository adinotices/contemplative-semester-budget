# TODO

Open items for the budget app and the ledger. Newest first. Move finished items to the log in `agent_context.md`.

## Waiting on Aditya

- [ ] **Michelle Chai was likely reimbursed twice, about $722 (found in the 2026-10-15 review).** On 2/18, "Reimbursements 2" re-submitted six items already in "Reimbursements 1" from the same day: first aid kit $141.23, NVC books 2 × $21.45, Sweetgrass $27.22, Muji slippers $113.40, folding screen $74.55 ($399.30; different Drive receipt files, same amounts). Jaycel posted both batches. The 2/13 pizza dinner $322.74 was also paid on 2/18 and again on 3/5. The ledger records what was paid, so it is correct as is. Decide whether to ask Michelle to repay or write it off. Lower confidence: Aditya's 3/5 batch has "Paper" $31.02 × 2 and "Supplies" $18.18 × 2; check those receipts.
- [ ] **Khalila's $1,000 mentoring (from the mentor-pay table: Chas $250 / Brent $800 / Sarah $1,715 / Victoria $350 / Khalila $1,000).** It was paid as a reimbursement to Maya for Khalila coaching her, but no $1,000 row exists. Aditya thinks the May "Coaching (Venmo)" $1,714 actual (Maya, 2026-05-21) may be Khalila's. He's checking with Maya. If it is, relabel that row and decide how $1,714 relates to the $1,000 in the table; if not, add $1,000 for Khalila. Also confirm that the 10/15 $1,715 Sarah Leibel submission isn't the May payment again. Chas is settled at $150 (3 hrs).
- [ ] **Answer Jaycel about the D&O refund (since 2026-10-12).** Marsh sent two invoices on 10/7: a return premium for the cancelled D&O policy, and invoice 209774 for the 1-year D&O discovery period (ERP, $258 + surplus-lines tax). Jaycel asked whether the refund should be netted against 209774. Reply in the thread "Contemplative Semester Inc. - Invoices - D&O ERP Discovery Period - D&O Policy - Cancelled". Then add both to the ledger: the ERP cost as an expense and the return premium as `Insurance Refund` income.
- [ ] **Find the ~$234 insurance refund check** mailed to Aditya (lost). Lynn Trombly asked on 9/21 that he search before she arranges a stop-payment and reissue. Ledger row: projected, `Insurance Refund`, 2026-09-21.
- [ ] **BCBS 2026 admin fee**: Melissa proposed $15,000; Shea asked 10/13 to pro-rate Apr–Dec 2026. Ledger has it projected at $15,000 on 2026-04-01 (also in the Program Costs snapshot). Update both when Melissa confirms the amount.

- [ ] **Confirm or drop the remaining projected rows** ($50,229.19 expense, $7,034 income as of 2026-10-15). There's no email confirming any of these. The Gmail connector can't read attachments, so payment screenshots (the kind that confirmed Brent's) are invisible to it.
  - Naropa pass-through, 10 × $2,000 = $20,000: current-cohort credit fees owed to Naropa; nothing shows they were sent.
  - Backpay for Shea & Maya $12,235 (cut from $30,135 on 10/15); no email trail. Plus Maya's separate $2,100 backpay (projected, 2025-12-31, added 10/15).
  - Small items: Potash storage balance $400, Mailchimp $261.37 (Shea), stamps $65.60 (Maya), Luc media storage 2 × $1.99.
  - Income: Meera Kochhar $2,500 and Amiya Fornés-Sicam $3,300 (Aditya is chasing both, per Shea 10/13), Potash deposit refund $1,000, insurance refund ~$234.
- [ ] **Ask Meredith/Melissa for a BCBS ledger export after 2026-04-28.** The app's BCBS data stops there, and that export alone would settle most of the list above in one pass.

- Note: October form submissions (Shea Claude $65.34 + Zoom $190.86, Maya coaching $1,750 + $1,715) are in the ledger as projected but deliberately NOT in the Program Costs snapshot (post-cohort spending), so ledger projected ($53,950.39) now exceeds the snapshot ($50,229.19) by exactly $3,721.20.

## App

- [ ] **Auto-pause: likely cause found and fixed 2026-10-15.** The weekly-digest cron (`vercel.json`, Mondays 13:00 UTC) was being redirected to /login by the proxy, so it never touched the DB. With that fixed (commit de1cba4), it now runs a DB query weekly, inside Supabase's 7-day idle window. Confirm after Monday 2026-10-19 that `/api/cron/weekly-digest` shows a 200 in the Vercel logs and that the project doesn't pause again. If it still pauses, add a daily cron.
- [ ] **End-to-end test of the reimbursement flow** (now that /api/reimburse and the cron work). Submit one real request on /reimburse, then wait for Monday's digest or trigger it with the CRON_SECRET bearer, approve via the link, and confirm the accountant email. This sends real email to the approver/accountant, so do it deliberately.
- [ ] **Small data cleanups (need Aditya's OK):** trim trailing spaces on payees "Theo Richter " and "Betsabe Luna " (they split from the un-spaced names in per-person totals); set payee "Shea Riester & Maya Park" on the projected backpay row (currently null).
- [ ] **Receipts bucket is public.** Receipt files are readable by anyone who has the (unguessable, UUID-based) URL. Consider making the bucket private and serving signed URLs; the digest already downloads server-side.
