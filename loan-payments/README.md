# Loan Payments Demo

This demo implements the **Lumen Credit** lending flow from the [Blnk lending article](https://guide.cloud.blnkfinance.com/start/guide), so you don’t give customers access to credit until eligibility checks pass.

- **Ledgers:** **Customer Main Ledger** (main balances) and **Customers Loan Ledger** (loan balances), plus one identity and two balances per customer.
- **Disburse:** Create an **inflight** overdraft from the customer’s loan balance to their main balance; run eligibility checks (KYC, limit, credit score); then **commit** (approve) or **void** (reject) the inflight transaction. Funds only hit the main balance after commit.
- **Interest:** Move money from the **Loan balance** to **`@InterestRevenue`** (internal balance) with `allow_overdraft: true`.
- **Repayments:** Move money from **Main balance** back to **Loan balance** with `allow_overdraft: false` so repayments fail if the customer has insufficient funds.

All steps use ledger transactions so you can see how balances change and how inflight keeps disbursements safe.

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

1. Creating ledgers (Customer Main Ledger, Customers Loan Ledger)
2. Creating a customer identity and wallets (main + loan)
3. Creating an inflight disbursement for $500, then committing it (approve)
4. Charging $5 interest to @InterestRevenue
5. Recording a $200 repayment from main to loan

After each step the script prints the current main and loan wallet balances so you can compare them with the examples in the article.

