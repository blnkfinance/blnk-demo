# Recurring Payments Demo

This demo implements the **StreamFlow** recurring payments flow from the [recurring payments with Blnk](https://guide.cloud.blnkfinance.com) article:

- **Subscriptions Ledger** for customer balances used for recurring billing
- **Marcus** as the example customer: identity and one balance
- **Fund** Marcus’s balance from **`@World`** so the first charge can succeed
- **Schedule** a single future charge from Marcus’s balance to **`@Revenue`** using `scheduled_for`

When the scheduled time is reached, Blnk applies the transaction and sends a **`transaction.applied`** webhook. No extra “run” call is needed.

## Prerequisites

- A running Blnk Core instance (e.g. `http://localhost:5001`)
- A Blnk API key

Create a `.env` file in the **`resources/`** folder (or reuse one from another demo):

```bash
BLNK_API_KEY=your_api_key_here
BLNK_BASE_URL=http://localhost:5001
```

The demo uses the shared `@resources/utils.ts` client and `@resources/generator.ts` from the repo root.

## How to run

From the repository root:

```bash
bun install
bun run recurring-payments/index.ts
```

You should see:

1. Subscriptions Ledger created
2. Identity created for Marcus
3. Marcus’s balance created
4. Marcus funded with $20 from @World
5. A scheduled charge created ($10 to @Revenue) with status **QUEUED** and a `scheduled_for` time about **4 minutes** in the future

When that time is reached, Blnk applies the charge and Marcus’s balance decreases by $10.

**Optional: wait in the script for the charge to apply**

- **Default** (`RECURRING_WAIT_FOR_APPLY` not set or not `true`): the script exits right after creating the scheduled charge. The charge will still run at the scheduled time; you can check the balance later (e.g. via API or Blnk Cloud).
- **Set `RECURRING_WAIT_FOR_APPLY=true`**: the script waits ~4 minutes for the scheduled time to pass, then fetches Marcus’s balance again and prints it so you see the $10 deduction in the same run. Use this when you want to see the “after” balance without calling the API yourself.

```bash
RECURRING_WAIT_FOR_APPLY=true bun run recurring-payments/index.ts
```

## Cancelling a scheduled charge

To cancel the scheduled charge, create a **reversal** transaction: same amount and precision, **source** and **destination** swapped, and `scheduled_for` a few seconds **after** the original. See the article’s “Step 4: Cancelling a scheduled charge” for the exact request.

## Fetching Marcus’s balance

```bash
curl -X GET "http://localhost:5001/balances/MARCUS_BALANCE_ID" \
  -H "Content-Type: application/json" \
  -H "X-blnk-key: YOUR_API_KEY"
```

Use your Blnk base URL and API key. Amounts are in the smallest unit (e.g. cents); divide by `precision` (100 for USD) for display.
