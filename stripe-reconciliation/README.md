# Stripe Reconciliation Demo

This demo shows how to reconcile Stripe net settlements against Blnk ledger transactions in a live, operator-friendly workflow.

It creates Stripe test deposits, records net settlements in Blnk, exports Stripe data in Blnk external-data CSV format, and gives you expected mismatch counts before you run reconciliation in Blnk Cloud.

## What This Demo Shows

- Seed real Stripe test-mode settlements
- Record matching (or intentionally mismatching) Blnk ledger transactions
- Export external CSV in Blnk reconciliation format
- Run one-to-one reconciliation in Blnk Cloud
- Investigate unmatched external records and unreconciled ledger transactions

## Prerequisites

- Stripe account in **test mode**
- Blnk Cloud test workspace and API key
- Bun installed

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill in required values in `.env`:

```bash
BLNK_API_KEY=...
BLNK_BASE_URL=https://api.blnk.finance
STRIPE_SECRET_KEY=sk_test_...
```

3. Optional settings:
- `DEMO_DEPOSIT_COUNT` controls generated Stripe deposits (default `10`)
- `DEMO_IDENTITY_FIRST_NAME` and `DEMO_IDENTITY_LAST_NAME` set the demo identity name shown in Blnk
- `DEMO_MISMATCH_SCENARIOS` controls injected mismatches
- `DEMO_OUTPUT_DIR` controls output path (default `./output`)

## Commands

From this directory:

```bash
bun index.ts all
```

Or step-by-step:

```bash
bun index.ts seed
bun index.ts export
```

Run a local dry-run without Stripe/Blnk API calls:

```bash
bun index.ts dry-run
```

To export from a specific state file:

```bash
bun index.ts export --state ./output/<batch-id>-state.json
```

## Expected Output Artifacts

- `output/latest-state.json`
- `output/<batch-id>-state.json`
- `output/<batch-id>-stripe-external-data.csv`

## Blnk Cloud Reconciliation Configuration

Use these settings in Blnk Cloud:

- **External data:** upload `output/<batch-id>-stripe-external-data.csv`
- **Strategy:** one-to-one
- **Matching rule:**
  - amount -> exact
  - currency -> exact
  - reference -> contains
  - date -> equals with 30-minute drift

## 5-7 Minute Live Demo Script

### 0:00 - 1:00 Context and objective
- Explain the goal: prove every Stripe-settled net deposit is represented in Blnk.
- Mention mismatch cases are intentionally injected to demonstrate investigation.

### 1:00 - 2:30 Seed live test data

```bash
bun index.ts seed
```

Presenter callouts:
- Show generated `batchId`
- Show created Blnk `ledgerId` and `walletId`
- Mention Stripe payment intents are real test-mode records

### 2:30 - 3:30 Export external CSV

```bash
bun index.ts export
```

Presenter callouts:
- Show CSV path
- Show expected matched/unmatched counts printed by script

### 3:30 - 5:30 Run reconciliation in Blnk Cloud
- Upload generated CSV in External Data
- Choose one-to-one strategy
- Select matching rule (amount/currency/reference/date)
- Run reconciliation

Presenter callouts:
- Confirm matched counts align with script expectation
- Open one unmatched external record and diagnose by reference/date/amount

### 5:30 - 7:00 Fix and confirm
- Correct the mismatch (e.g., wrong reference or wrong amount) on ledger side
- Re-run reconciliation
- Confirm unresolved mismatches are zero

## Mismatch Scenarios

Configure with `DEMO_MISMATCH_SCENARIOS` as comma-separated values:

- `missing_ledger`: Stripe settlement exists, no ledger transaction created
- `wrong_reference`: Ledger reference does not contain Stripe payment intent id
- `wrong_amount`: Ledger amount differs by 0.01 from Stripe net

Example:

```bash
DEMO_MISMATCH_SCENARIOS=missing_ledger,wrong_reference,wrong_amount
```

## Notes

- The demo writes Stripe payment intent id into Blnk transaction metadata for fast debugging.
- `wrong_amount` intentionally introduces a one-cent mismatch to mimic rounding/fee drift issues.
