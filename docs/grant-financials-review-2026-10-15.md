# Grant application financials: accuracy review

**Reviewed:** 2026-10-15, against the Contemplative Semester budget app (budget.contemplativesemester.org), its live ledger, the BCBS exports from Melissa, and the student tuition roster.
**Reviewed material:** section "3.1 Program Financial Summary" (table), the "Budget vs. Actual by Category, 2025–26" chart with its two captions, and the "How Hemera's grant was used" paragraph.

## For the agent updating the report

Make these changes to the section 3.1 table, the chart and the captions. Every number below is copied from the sources listed in section 7. Don't round them differently or recompute them.

1. Change **Total program expenses (2025–26)** from $524,136 to **$509,529**.
2. Redraw the **chart** using the "Now" column in section 3.
3. Change the over-budget caption from "Two categories" to **three**: add Legal, Accounting & Insurance. Update the Salaries wording too (section 3).
4. Replace the **Naropa footnote** with the wording in section 4.
5. Replace **[DATE]** with **October 15, 2026**.
6. Decide on the label and footnote changes in section 5 (projected costs, net tuition basis, Hemera wording). Apply them if the author agrees.

Leave every other figure in the table as it is. They're verified.

---

## 1. Summary

Mostly accurate. The tuition, scholarship, contributed-revenue and Hemera figures all tie back to the books. Three things need fixing:

- The **expense total ($524,136) doesn't match any figure** in the books.
- The **chart uses figures from 2026-08-11**, before the 2026-10-15 ledger updates.
- The **Naropa footnote describes the wrong money**.

## 2. Line-by-line check of the 3.1 table

| Line item | Figure in report | Source / check | Verdict |
|---|---|---|---|
| Gross tuition income (31 confirmed students, full-pay value) | $477,400 | BCBS GL account 3600. Equals 31 × $15,400 base tuition. The roster has 31 students. | ✅ Correct |
| Total scholarship aid awarded (20 of 31 students) | $240,260 | BCBS GL account 4301. The roster has 20 recipients. | ✅ Correct (note 5a) |
| Net tuition revenue after aid | $237,140 | 477,400 − 240,260 | ✅ Correct (note 5b) |
| **Total program expenses (2025–26)** | **$524,136** | Program Costs operating total as of 2026-10-15 is **$509,529**. The report's own chart bars add up to $510,636 (the 2026-08-11 figure). The budget total is $524,416. | ❌ **Matches nothing; use $509,529** |
| Total contributed/philanthropic revenue (2025–26) | $337,773 | Exactly the sum of all actual "Individual Donations" + "Grants & Institutional Gifts" rows in the ledger (78 rows, 2025–2026). Salesforce shows $338,306.40; the $533 difference is donor-covered fees. | ✅ Correct |
| Hemera Foundation grant amount received | $60,000 | Salesforce gift dated 2025-10-09, and the ledger row "Grant - Hemera Foundation" on the same date | ✅ Correct (note 5c) |
| Hemera grant as % of total scholarship pool | ≈25% | 60,000 ÷ 240,260 = 24.97% | ✅ Correct |
| Narrative: "roughly 5 full or partial awards at our median award level of about $11,900" | | Roster median scholarship is exactly $11,900, and 60,000 ÷ 11,900 = 5.04 | ✅ Correct |

## 3. Chart: Budget vs. Actual by Category, 2025–26

Values are actual + projected, covering 2025-02-01 → 2026-08-09, plus the hand updates of 2026-10-15. They exclude Naropa pass-through and scholarships, as the chart already does.

| Category | Budget | Chart shows (stale, 2026-08-11) | **Now (use this)** | Over budget? |
|---|---|---|---|---|
| Salaries | $293,316 | $286,041 | **$269,770** | No (−$23,546) |
| Rent | $114,100 | $117,975 | **$117,975** | **Yes (+$3,875, +3.4%)** |
| Food | $53,000 | $48,775 | **$48,775** | No |
| Legal, Accounting, Insurance | $34,500 | $29,750 | **$44,750** | **Yes (+$10,250, +29.7%)** |
| Supplies & Subscriptions | $7,000 | $14,497 | **$14,508** | **Yes (+$7,508, +107%)** |
| Travel | $10,000 | $7,795 | **$7,795** | No |
| Other Overhead (Staff Dev, Misc) | $10,000 | $3,874 | **$3,874** | No |
| IT | $2,500 | $1,929 | **$2,082** | No |
| **Total** | **$524,416** | $510,636 | **$509,529** | Under by $14,887 overall |

### What changed since 2026-08-11

- **Salaries −$16,271** (286,041 → 269,770):
  - The projected Shea & Maya backpay was cut from $30,135 to $12,235 (−$17,900).
  - Maya's separate backpay was added, $2,100 projected (+$2,100).
  - Michelle Chai's bonus settled at the $4,069.90 actually paid instead of the $4,540.79 projected (−$470.89).
  - Several other rows moved from projected to actual with no change to the total: Rupert $15,746, Brent $800, Aditya Aug/Sep $4,000.
- **Legal, Accounting, Insurance +$15,000:** the BCBS 2026 fiscal-sponsorship admin fee was added as projected (dated 2026-04-01). It is still pending: Melissa proposed $15,000 and Shea asked her to pro-rate it for April–December 2026.
- **IT +$152.44:** Aditya's projected reimbursements for Dropbox Sign (June and July, $21.78 each) and half of a Claude usage charge ($108.88).
- **Supplies & Subscriptions +$10.80:** USPS postage, a projected reimbursement to Aditya.

### Caption corrections

- **Current caption:** "Two categories ran over budget: Rent (+3%…) and Supplies & Subscriptions (+107%…)."
  **Should say:** **three** categories ran over budget: Rent (+3%), Supplies & Subscriptions (+107%), and **Legal, Accounting & Insurance (+30%)**. The last one is driven entirely by the projected $15,000 BCBS admin fee.
- **Alternative:** if the author would rather not count the unconfirmed admin fee, that category is $29,750 (under budget). In that case the total becomes $494,529, and a footnote should say the 2026 admin fee is pending.
- **Salaries:** the gap is now $23,546 below budget (it was $7,275). The "real savings and the understaffing/under-investment" wording still fits, but the size of the gap changed.

## 4. Naropa footnote: wrong money

- **Current text:** "Total program expenses excludes a $28,375 Naropa pass-through line — students pay that amount to us and we pay it directly to Naropa, so it nets to zero…"
- **What it gets wrong:** the $28,375 is **the prior (first) cohort's** Naropa fees, which happened to be paid during this period. It isn't this cohort's pass-through. **This cohort's** pass-through is **$20,000** (10 students × $2,000, half of each $4,000 college-credit fee), and it is **still projected, not yet paid** to Naropa.
- **Suggested replacement:** "Total program expenses exclude Naropa college-credit pass-through fees ($28,375 paid for the prior cohort during this period; $20,000 due for this cohort). Students pay these fees to us and we remit them to Naropa, so they net to zero and aren't a CS programmatic expense."

## 5. Notes for the author to decide on

a. **Scholarship total:** the student roster adds up to $240,760, $500 more than BCBS's $240,260. The roster has two data-entry problems: Danyoung Kim's row has a scholarship but a blank tuition total, and Zenichi Moriki's scholarship exceeds tuition by $2,000. **Keep $240,260**, the figure from BCBS's books.

b. **Net tuition is billed, not received.** Tuition cash actually collected is $228,840, and **$5,800 is still owed** (Meera Kochhar $2,500, Amiya Fornés-Sicam $3,300). $237,140 is fine as "net tuition revenue after aid" as long as nothing implies it was all received.

c. **Hemera:** $60,000 is correct. BCBS's 2026 books show $50,311 of Hemera revenue, but that is the part of the **same** grant released from restriction in 2026, not a second grant. Don't add it. The sentence "Hemera's grant of $60,000 went directly to need-based tuition scholarships" is a description the ledger can't confirm or contradict, because scholarships are tuition discounts and no cash moves for them. Check that it matches the grant agreement or how BCBS applied the restricted funds.

d. **Projected costs inside the expense total:** about **$30,229** of the $509,529 is still projected (not yet paid):
- BCBS admin fee: $15,000
- Shea & Maya backpay: $12,235
- Maya's backpay: $2,100
- Potash storage balance: $400
- Mailchimp: $261.37
- Small reimbursements: about $233

A grant reviewer may read "actual" as paid. Consider labelling the column "Actual + committed", or add the footnote: "Includes $30,229 committed but not yet paid as of October 15, 2026."

e. **Scope of "2025–26":** expenses cover 2025-02-01 → 2026-08-09, including pre-semester costs. That is the same window as the budget, so it's consistent. Mention it only if the funder asks for a fiscal-year basis.

f. **[DATE]:** use **October 15, 2026**, the date all figures above were reconciled.

## 6. Corrected table, ready to paste

| Line item | Amount |
|---|---|
| Gross tuition income (31 confirmed students, full-pay value) | $477,400 |
| Total scholarship aid awarded (20 of 31 students) | $240,260 |
| Net tuition revenue after aid | $237,140 |
| Total program expenses (2025–26, actual + committed) | **$509,529** |
| Total contributed/philanthropic revenue (2025–26) | $337,773 |
| Hemera Foundation grant amount received | $60,000 |
| Hemera grant as % of total scholarship pool | ≈25% |

## 7. Sources

- **Budget app, Program Costs tab** (`src/lib/data/program-costs-snapshot.ts`, hand-updated 2026-10-15; commit `552e868` and later on `main`). Supplies the category budget and actual + projected figures and the expense total.
- **Budget app ledger** (Supabase `transactions` table). Supplies the donation and grant totals, Hemera, Naropa and the projected items.
- **BCBS general ledger** (accounts 3600, 4301 and 4355) and Melissa's Salesforce campaign export dated 2026-08-26 (`bcbs_gift_transactions`, 252 rows, $1,146,116.28). Supply gross tuition, scholarships and the cross-check of contributed revenue.
- **Student roster** ("CS 2026 Accepted Student Tracking", Tuition payments tab, `src/lib/data/student-tuition-snapshot.ts`). Supplies the 31 students, 20 recipients and the $11,900 median.
