# Bulk Payroll Demo

This demo demonstrates how to build a bulk payout system using Blnk ledger that handles hundreds or thousands of transfers efficiently. It showcases the complete payroll workflow from CSV input to processing and retrieval.

## What This Demo Shows

This demo illustrates the following Blnk concepts:

- **CSV Data Processing**: Reading employee payroll data from CSV files
- **Multi-currency Ledgers**: Creating country-specific ledgers for international payroll
- **Identity Management**: Creating employee identities to track payroll history
- **Balance Creation**: Setting up employee balances for payroll tracking
- **Internal Balances**: Using internal balances (like `@PayrollBalance`) for company accounts
- **Payroll Funding**: Calculating and funding the payroll account with total payroll amount
- **Bulk Transactions**: Processing hundreds of payroll payments efficiently
- **Synchronous Processing**: Processing transactions in batches of 100 with immediate feedback
- **Asynchronous Processing**: Processing all transactions at once in the background

## Workflow

The demo follows this sequence:

1. **Generate Sample CSV**: Creates a CSV file with 3,000 employees and their payroll data
2. **Parse CSV**: Reads and validates the employee data from CSV
3. **Setup Ledgers**: Creates country-specific ledgers for each unique country
4. **Create Employees**: Creates identities and balances for each employee
5. **Calculate Payroll**: Sums all salary amounts to determine total payroll
6. **Fund Payroll Account**: Deposits the total payroll amount into `@PayrollBalance`
7. **Process Payroll**: Processes payroll payments either:
   - **Synchronously**: In batches of 100 transactions
   - **Asynchronously**: All transactions at once in the background

## Prerequisites

Before running this demo, ensure you have:

- Your Blnk Core instance running
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
BLNK_BASE_URL=http://localhost:5001
PROCESSING_MODE=sync
```

**Processing Mode Options:**
- `sync` - Process transactions synchronously in batches of 100 (default)
- `async` - Process all transactions asynchronously in the background

## How to run

### Running with Synchronous Processing (Default)

We recommend using Bun to run this demo directly:

```bash
bun index.ts
```

Or set the processing mode explicitly:
```bash
PROCESSING_MODE=sync bun index.ts
```

### Running with Asynchronous Processing

To process all transactions asynchronously:

```bash
PROCESSING_MODE=async bun index.ts
```

Or set it in your `.env` file:
```
PROCESSING_MODE=async
```

**Note:** With async processing, the script will return immediately with a `batch_id`. Transactions continue processing in the background. Use webhooks to listen for `transaction.applied` events to track completion.

### Alternative: Using npx tsx

If you don't have Bun installed, install it first:
```bash
curl -fsSL https://bun.sh/install | bash
```

Alternatively, you can use:
```bash
npx tsx index.ts
```

For async mode:
```bash
PROCESSING_MODE=async npx tsx index.ts
```

## CSV Format

The demo generates a CSV file with the following format:

```csv
employee_id,name,country_code,currency,salary_amount
EMP001,John Doe,USA,USD,5000.00
EMP002,Jane Smith,ITA,EUR,4500.00
...
```

- `employee_id`: Unique identifier for the employee
- `name`: Employee's full name
- `country_code`: ISO country code (e.g., USA, ITA, GBR)
- `currency`: Currency code (e.g., USD, EUR, GBP)
- `salary_amount`: Salary in display units (dollars/cents)

## Processing Modes

The demo supports two processing modes:

### Synchronous Processing
- Processes transactions in batches of 100
- Waits for each batch to complete before proceeding
- Returns immediate feedback on success/failure
- Best for smaller batches or when you need immediate confirmation

### Asynchronous Processing
- Processes all transactions in a single request
- Returns immediately with a batch_id
- Processing continues in the background
- Best for large batches (thousands of transactions)
- Use webhooks to listen for `transaction.applied` events

## Configuration

You can modify the demo behavior via environment variables:

- `TOTAL_EMPLOYEES`: Total number of employees to generate (default: 3000)
- `SYNC_BATCH_SIZE`: Number of transactions per batch for sync processing (default: 100)
- `SALARY_MIN` / `SALARY_MAX`: Salary range in display units (default: 3000.00 - 15000.00)
- `PROCESSING_MODE`: Processing mode - `sync` or `async` (default: sync)
- `CSV_FILE`: Name of the CSV file to use or generate (default: employees.csv)

Example:
```bash
TOTAL_EMPLOYEES=1000 PROCESSING_MODE=async bun index.ts
```

## What You'll See

The demo will:

1. Generate a CSV file with employee data
2. Create ledgers for different countries
3. Create employee identities and balances
4. Calculate and fund the payroll account
5. Process payroll payments (sync or async)
6. Display batch IDs for tracking (for async mode, use webhooks to track completion)

## Notes

- The demo uses realistic employee data 
- Internal balances (prefixed with `@`) are automatically created by Blnk
- Async processing returns immediately with a `batch_id` for tracking
- Use webhooks to listen for `transaction.applied` events in production
- The demo generates a sample CSV automatically - you can also provide your own CSV file
- For async mode, transactions process in the background. Use the returned `batch_id` with the Search API to query transactions later, or set up webhooks for real-time updates
