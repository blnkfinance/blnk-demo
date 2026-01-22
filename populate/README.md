# Populate Demo

This demo populates a running Blnk instance with test data including identities, balances, and transactions. It's useful for testing, development, and creating sample data for demos.

## What This Demo Shows

This demo illustrates the following Blnk concepts:

- **Ledger Management**: Automatically creates or reuses ledgers by name
- **Identity Creation**: Generates realistic identities using faker-js
- **Balance Creation**: Creates balances in multiple currencies for each identity
- **Transaction Generation**: Creates various transaction types (Deposits, Withdrawals, Inter-account transfers)
- **Bulk Operations**: Efficiently processes large numbers of transactions in batches
- **Rich Metadata**: Adds comprehensive metadata to transactions for better testing and analysis

## Workflow

The demo follows this sequence:

1. Ensures ledger exists (searches by name, creates if not found)
2. Creates identities and balances (if not using internal balances mode)
3. Generates and executes transactions in batches
4. Prints summary statistics

## Prerequisites

Before running this demo, ensure you have:

- Your Blnk Core instance running
- Environment variables configured (see below)

## Required Environment Variables

Add these to your `.env` file:

```
BLNK_API_KEY=your_blnk_api_key_here
BLNK_BASE_URL=https://api.blnk.finance
POPULATE_LEDGER_NAME=Populate Demo Ledger
POPULATE_IDENTITIES_COUNT=10
POPULATE_BALANCES_PER_IDENTITY=USD,EUR
POPULATE_TRANSACTION_COUNT=100
POPULATE_AMOUNT_MIN=100
POPULATE_AMOUNT_MAX=50000
POPULATE_USE_INTERNAL_BALANCES=false
```

## Running the Demo

```bash
bun populate
```

The script will:
1. Validate configuration
2. Ensure ledger exists (search by name, create if needed)
3. Create identities and balances (if not using internal balances)
4. Generate and execute transactions
5. Print summary statistics

## Configuration Options

See the root `README.md` for detailed documentation of all populate configuration variables.
