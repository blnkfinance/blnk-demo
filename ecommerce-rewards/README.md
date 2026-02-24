# E-commerce Rewards Demo

This demo shows how to build a ledger-backed reward system for an e-commerce platform using Blnk. Customers earn points on purchase, accumulate them over time, and can redeem points back into their main wallet.

## What This Demo Shows

- **Ledgers**: Separate ledgers for customer real-money balances and reward balances
- **Internal balances**: Using `@MerchantRevenue` as the source of rewards (rewards are issued directly from merchant revenue)
- **Identities and balances**: One customer identity with a main wallet and a rewards wallet
- **Bulk atomic transactions**: Purchase and reward issuance happen atomically in one bulk transaction (both succeed or both fail)
- **Transactions**: Purchase (customer → merchant), reward issuance (@MerchantRevenue → rewards wallet), and redemption (rewards wallet → main wallet)
- **Search API**: Looking up balances by `identity_id` when you have the customer but not their balance IDs (as in a real app after login)
- **Balance lookup**: Reading the current reward balance via the balances API

## Workflow

1. Create "Customer Wallets" and "Rewards Accounts" ledgers
2. Create a customer identity (Sarah Shelton) and two balances (main and rewards)
3. Fund the customer's main wallet so they can make purchases
4. Process a purchase and issue rewards atomically: move $50 from customer to @MerchantRevenue, then move $2.50 (5%) from @MerchantRevenue to the customer's rewards wallet (using bulk transactions with `atomic: true`)
5. Fetch customer balances via the Search API (`POST /search/balances` with `filter_by: identity_id`) — in your app you often have the customer's identity from login but not their balance IDs
6. Redeem some rewards: move value from rewards wallet back to the main wallet (using the IDs from the search)
7. Fetch and log the customer's current reward balance

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
