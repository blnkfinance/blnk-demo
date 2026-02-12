# Loan Payments Demo

This demo shows how to build a simple loan workflow on top of the Blnk ledger. It matches the **LumenCredit** example from your blog post:

- Disburse a loan from a **Loan Wallet** to a **Main Wallet**
- Charge interest from the **Loan Wallet** to **`@InterestRevenue`**
- Collect repayments from the **Main Wallet** back to the **Loan Wallet**

All money movement is modeled as ledger transactions so you can see exactly how balances change at each step.

## Prerequisites

- A running instance of Blnk Core (for example at `http://localhost:5001`)
- A Blnk API key
- Node/Bun environment that can run the other demos in this repository

Create a `.env` file in the `resources/` folder (or reuse the one from other demos) with:

```bash
BLNK_API_KEY=your_api_key_here
BLNK_BASE_URL=http://localhost:5001
```

The demo reuses the shared `@resources/utils.ts` client and `@resources/generator.ts` reference helper from the root of this repository.

## How to run

From the repository root:

```bash
bun install
bun run loan-payments/index.ts
```

You should see log output for:

1. Creating ledgers
2. Creating a customer identity and wallets
3. Disbursing a $500 loan
4. Charging $5 interest
5. Recording a $200 repayment

After each step the script prints the current main and loan wallet balances so you can compare them with the examples in the article.

