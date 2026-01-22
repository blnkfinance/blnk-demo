# Blnk Demo Repository

This repository contains lightweight, end-to-end Blnk demos designed to help developers understand how Blnk works in practice.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Blnk API credentials.

## Running Demos

Each demo lives in its own folder at the root (e.g., `basic-wallet/`, `customer-statements/`, `populate/`) and can be run with:

```bash
bun <demo-name>
```

## Populate Configuration

The `populate` demo uses the following environment variables for configuration:

### Required Variables

- **`POPULATE_LEDGER_NAME`** (required)
  - Name of the ledger to create or use. If a ledger with this name exists, it will be reused; otherwise, a new one will be created.
  - Example: `POPULATE_LEDGER_NAME=Populate Demo Ledger`

### Optional Variables

- **`POPULATE_IDENTITIES_COUNT`** (default: `10`)
  - Number of identities (customers) to create during the onboarding phase. Each identity will have balances created in the specified currencies.
  - Example: `POPULATE_IDENTITIES_COUNT=10`

- **`POPULATE_BALANCES_PER_IDENTITY`** (default: `USD,EUR`)
  - Comma-separated list of currencies to create for each identity. For example, `"USD,EUR"` creates both USD and EUR balances for each identity.
  - Example: `POPULATE_BALANCES_PER_IDENTITY=USD,EUR,GBP`

- **`POPULATE_TRANSACTION_COUNT`** (default: `100`)
  - Total number of transactions to generate and execute. Transactions will be randomly distributed as Deposits, Withdrawals, and Inter-account transfers.
  - Example: `POPULATE_TRANSACTION_COUNT=100`

- **`POPULATE_AMOUNT_MIN`** (default: `100`)
  - Minimum transaction amount (in the currency's base units, e.g., cents for USD). Used when generating random transaction amounts.
  - Example: `POPULATE_AMOUNT_MIN=100`

- **`POPULATE_AMOUNT_MAX`** (default: `50000`)
  - Maximum transaction amount (in the currency's base units, e.g., cents for USD). Used when generating random transaction amounts.
  - Example: `POPULATE_AMOUNT_MAX=50000`

- **`POPULATE_USE_INTERNAL_BALANCES`** (default: `false`)
  - If `true`, skips creating real identities and balances, and instead generates unique internal balance IDs for each transaction. This is useful for quickly generating large volumes of transactions without the overhead of creating balances first.
  - If `false`, creates real identities and balances first, then generates transactions between them.
  - Example: `POPULATE_USE_INTERNAL_BALANCES=false`