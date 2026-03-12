# Savings Goal Demo

This demo implements the **Kite** savings goal story from your article:

- **Savings Ledger** to group all customer savings balances
- **Mia** as the example customer: identity and one savings balance
- **Schedule 3 deposits** in a single `/transactions/bulk` request using `scheduled_for`
- Use **`@BankDeposits`** as the source (internal balance representing external inflows)

When Mia activates her goal ($200/month for 3 months), all three deposits are scheduled upfront. Blnk applies each one automatically when its `scheduled_for` time is reached.

## Prerequisites

- A running Blnk Core instance (e.g. `http://localhost:5001`)
- A Blnk API key

Create a `.env` file in the **`resources/`** folder (or reuse one from another demo):

```bash
BLNK_API_KEY=your_api_key_here
BLNK_BASE_URL=http://localhost:5001
```

The demo uses the shared `@resources/utils.ts` client from the repo root.

## How to run

From the repository root:

```bash
bun install
bun run recurring-payments/index.ts
```

You should see:

1. Savings Ledger created
2. Identity created for Mia
3. Mia's savings balance created
4. Bulk batch created with 3 scheduled deposits from `@BankDeposits` to Mia's balance
5. Current savings balance fetched (will be $0.00 initially)

All three deposits are scheduled for future dates (March, April, May 2026). They'll be applied automatically by Blnk as those dates arrive.

## Tracking goal progress

### Fetch Mia's savings balance

```bash
curl -X GET "http://localhost:5001/balances/MIA_SAVINGS_BALANCE_ID" \
  -H "Content-Type: application/json" \
  -H "X-blnk-key: YOUR_API_KEY"
```

Divide `balance` by `precision` (100) for display. `credit_balance` shows total deposits received; `debit_balance` shows withdrawals (stays at 0 for savings-only balances).

### Query transactions by goal_id

To see which deposits have run (`APPLIED`) vs which are still scheduled (`QUEUED`), query transactions by the `goal_id` in `meta_data`:

```bash
curl -X POST "http://localhost:5001/search/transactions" \
  -H "Content-Type: application/json" \
  -H "X-blnk-key: YOUR_API_KEY" \
  -d '{
    "q": "goal_mia_001",
    "query_by": "meta_data.goal_id"
  }'
```

Each transaction shows its `status` (`QUEUED` vs `APPLIED`) and `scheduled_for`, which you can use to build a goal progress view.

## What this demo shows

- **Fixed-duration recurring**: When you know the amount, frequency, and count upfront (e.g. "3 months"), you can schedule all occurrences in one bulk request
- **Internal balances**: `@BankDeposits` is created automatically by Blnk when first referenced; it represents external funding sources
- **Scheduled transactions**: Each deposit has its own `scheduled_for` timestamp; Blnk applies them automatically without additional API calls
- **Goal tracking**: Use `goal_id` in `meta_data` to group and query all transactions for a specific savings goal

This pattern works for any recurring payment with a **known duration**: installment plans, fixed-term subscriptions, scheduled loan repayments, or any flow where you know the amount and count upfront.
