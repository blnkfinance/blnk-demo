# Customer Statements Demo

This demo demonstrates how to generate customer statements from your Blnk ledger by querying transactions from Postgres, fetching historical balances, and exporting formatted statements as CSV or PDF.

## What This Demo Shows

This demo illustrates the following Blnk concepts:

- **Database Integration**: Querying transactions directly from Postgres database
- **Historical Balances**: Using Blnk's historical balance endpoint to get balance snapshots at specific timestamps
- **Search API**: Using Blnk's Search API with JOINs to fetch identity information for counterparties
- **Statement Generation**: Building complete customer statements with opening/closing balances, totals, and transaction history
- **Export Formats**: Generating professional CSV and PDF statement outputs

## Workflow

The demo follows this sequence:

1. Queries transactions from Postgres database for the specified balance and period
2. Fetches historical balances at the start and end of the period
3. Calculates opening/closing balances and period totals (credits/debits)
4. Formats transaction data (amounts, timestamps, directions, counterparties)
5. Generates and exports the statement as CSV or PDF

## Prerequisites

**Important**: If you don't have transaction data in your Blnk instance, use the [populate demo](../populate/) to create sample data before running this demo.

Before running this demo, ensure you have:

- Your Blnk Core instance running
- Postgres database with transaction data
- Environment variables configured (see below)

## Setup

Before running, set up your environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:

```
BLNK_API_KEY=your_blnk_api_key_here
BLNK_BASE_URL=https://api.blnk.finance
BLNK_DB_URL=postgresql://user:password@localhost:5432/blnk
```

## Configuration

Edit the configuration values at the top of `index.ts`:

```typescript
const BALANCE_ID = "bln_...";
const CURRENCY = "USD";
const PERIOD_START = "2026-01-01T00:00:00Z";
const PERIOD_END = "2026-01-31T23:59:59Z";
```

## How to run

We recommend using Bun to run this demo directly:

```bash
bun index.ts
```

Generate a PDF statement:
```bash
bun index.ts --format=pdf
```

If you don't have Bun installed, install it first:
```bash
curl -fsSL https://bun.sh/install | bash
```

Alternatively, you can use:
```bash
npx tsx index.ts
```

Or for PDF:
```bash
npx tsx index.ts --format=pdf
```

The generated statement file will be saved in the current working directory with a filename like:
- `statement_bln_..._2026-01-01T00-00-00Z_2026-01-31T23-59-59Z.csv`
- `statement_bln_..._2026-01-01T00-00-00Z_2026-01-31T23-59-59Z.pdf`
