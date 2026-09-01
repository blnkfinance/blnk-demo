# Follow-along notes: recurring payments article → demo

Notes from building this demo by following the blog article. Use these to tighten the article or fix the demo.

## What worked well

- **Step order** (ledger → identity → balance → fund → schedule) is clear and matches the API flow.
- **Single customer (Marcus)** and fixed names (Subscriptions Ledger, @Revenue, @World) make the demo reproducible and easy to map to the article.
- **Funding before charging** is explicit (Step 2); without it, the scheduled charge would fail with insufficient funds.
- **`scheduled_for`** with ISO 8601 and a near-future time (e.g. 15s) makes it easy to see QUEUED and then (optionally) wait to see APPLIED and balance update.
- **Internal balances** (@World, @Revenue): the article’s “Blnk creates them automatically” held; no need to create them beforehand.
- **allow_overdraft on the source of funding** (@World) only, not on the customer balance, matches the article and avoids debiting Marcus when he has no funds.

## Issues / confusion when following the article

1. **Base URL**  
   Article examples use `http://localhost:3000` for requests. Blnk Core’s default is port **5001**. The demo uses **BLNK_BASE_URL** from env (default 5001). Consider aligning the article to 5001 or “your Blnk instance URL”.

2. **Amount units**  
   Article says “$20 → 2000 with precision 100”. Blnk’s [precision docs](https://docs.blnkfinance.com/transactions/precision) say **amount** is a float (e.g. 20 for $20) and precision 100 converts to cents. The demo uses **amount: 20** and **amount: 10**; that matches the API and works. If the article means “2000” as the request value, it conflicts with the docs (would imply 2000 cents = $20 only if amount were in cents; the API expects dollars in `amount`).

3. **Step 3 response block**  
   In the article, the “Here is what a successful response looks like” under Step 3 is a second **curl** (reversal), not a JSON response. That’s easy to misread. The demo expects the first request’s response to be JSON (transaction_id, status: QUEUED, scheduled_for, etc.).

4. **Step 4 reference**  
   Step 4 says “Using the same example as **Step 2**” for cancelling Marcus’s March charge; it should say **Step 3** (the scheduled charge). The reversal’s `scheduled_for` must be a few seconds after the **original charge** (Step 3), not Step 2 (funding).

5. **Reversal dates**  
   Step 4’s reversal example uses `2026-02-01` while Step 3’s charge uses `2026-03-01`. For one cancellation flow, the reversal should be for the **same** charge (e.g. both March), so the reversal’s `scheduled_for` should be a few seconds after `2026-03-01T10:00:00+00:00` (e.g. `2026-03-01T10:00:05+00:00`). The “Here’s what happens” bullet already says March; the curl in Step 4 should use March dates for consistency.

## Demo behaviour

- **Default**: creates the scheduled transaction and exits; no wait. User can set **RECURRING_WAIT_FOR_APPLY=true** to wait ~16s and print Marcus’s balance after the charge applies.
- **No cancellation in script**: the article describes the reversal; the README points to the article and explains source/destination swap and `scheduled_for` a few seconds later. Implementing a full cancellation step in the demo would require storing the original `scheduled_for` and adding 5s, which we can add later if desired.
