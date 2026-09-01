# Card Payments Demo

This demo implements the **“Building an Online Card Payment System”** tutorial from the Blnk docs using TypeScript.

It walks through:

- Creating a **card ledger**, **customer identity**, and **card balance**
- Funding the card balance so there is money to spend
- **Authorizing** a card payment using an **inflight transaction**
- **Committing** the inflight transaction to simulate settlement
- Creating a second authorization and **voiding** it to release reserved funds

All steps are recorded as Blnk ledger transactions so you can inspect the full history in your Blnk UI or API.

## Prerequisites

- A running Blnk Core instance (for example at `http://localhost:5001`) or a Blnk Cloud environment
- A Blnk API key with permission to create ledgers, identities, balances, and transactions
- Node/Bun environment that can run the other demos in this repository

Copy `.env.example` to `.env` (either in this folder or reuse the shared `resources/.env`) and set:

```bash
BLNK_API_KEY=your_api_key_here
BLNK_BASE_URL=http://localhost:5001   # or your Cloud URL
```

The script uses the shared `@resources/utils.ts` Axios client and `@resources/generator.ts` helper from the root `resources/` package.

## How to run

From the repo root, install dependencies if you haven’t already:

```bash
pnpm install
```

Then from the repo root, run:

```bash
bun card-payments/index.ts
```

Or, if you prefer `tsx`:

```bash
npx tsx card-payments/index.ts
```

You should see log output for:

1. Creating the card ledger, identity, and card balance
2. Funding the card balance with \$5,000
3. Authorizing a \$2,000 card transaction as an **inflight** transaction
4. Committing that inflight transaction to simulate settlement
5. Creating a second \$500 authorization and then voiding it

After each phase the script prints the current card balance so you can see how authorization, settlement, and voids affect the account. 

