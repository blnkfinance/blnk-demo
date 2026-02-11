# E-commerce Rewards Demo

This demo shows how to build a ledger-backed reward system for an e-commerce platform using Blnk. Customers earn points on purchase, accumulate them over time, and can redeem points back into their main wallet.

## What This Demo Shows

- **Ledgers**: Separate ledgers for customer real-money balances and reward balances
- **Internal balances**: Using `@RewardsPool` and `@MerchantRevenue` as the source and destination of value
- **Identities and balances**: One customer identity with a main wallet and a rewards wallet
- **Transactions**: Purchase (customer → merchant), reward issuance (@RewardsPool → rewards wallet), and redemption (rewards wallet → main wallet)
- **Balance lookup**: Reading the current reward balance via the balances API

## Workflow

1. Create "Customer Wallets" and "Rewards Accounts" ledgers
2. Create a customer identity and two balances (main and rewards)
3. Fund the customer’s main wallet and the @RewardsPool so the demo can run
4. Process a purchase: move money from customer to @MerchantRevenue
5. Issue rewards: move 5% of the purchase from @RewardsPool to the customer’s rewards wallet
6. Redeem some rewards: move value from rewards wallet back to the main wallet
7. Fetch and log the customer’s current reward balance

## How to run

From the repo root, install dependencies (if needed):

```bash
pnpm install
```

From this directory:

```bash
bun index.ts
```

If you don't have Bun:

```bash
npx tsx index.ts
```

## Setup

Copy `.env.example` to `.env` in this directory and set:

- `BLNK_API_KEY` – your Blnk API key
- `BLNK_BASE_URL` – e.g. `http://localhost:5001` for Blnk Core, or your Blnk Cloud URL

Ensure your Blnk instance is running before running the demo.
