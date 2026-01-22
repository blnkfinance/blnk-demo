# How to Generate Customer Statements From Your Ledger With Blnk + Postgres

Category: Articles
Created by: Praise
Created time: January 22, 2026 2:04 PM
Last edited by: Praise
Last edited time: January 22, 2026 6:19 PM
Status: Drafts

It’s the end of the quarter, and one of your customers wants a clear view of their transaction activity. They ask for a statement covering the period. What do you do?

Customer statements are simply a structured view of a balance’s activity over a specific period. They usually include an opening balance, in-period debits and credits, closing balance, and a list of transactions within the period.

In practice, customer statements can be more than bank account statements. Common examples include card statements, loan statements, invoice history, savings history, and stock activity reports.

How you generate a statement depends on how your ledger stores its balances and transactions. Blnk keeps both as first-class citizens, which makes statement generation super easy to implement.

If you’d like to follow along hands-on, you can try this end to end using our **example demo here.** 

Let’s get started. 

### Getting started

To generate a statement, you need the following inputs:

- `:balance_id`:  The customer’s account/wallet in your ledger.
- `:currency`: The currency of the balance.
- `:period_start`: Start date of the statement period (timestamp).
- `:period_end`: End date of the statement period (timestamp).

Blnk’s **Balances** and **Transactions** modules give you everything you need to build your customer statements. 

- **Balance:** Acts a store of value. Each balance tracks core attributes like `balance`, `credit_balance`, `debit_balance`. As a rule, balances are immutable and change only via transactions. [**Read docs.**](https://docs.blnkfinance.com/balances/introduction)
- **Transaction:** Represents events that happen on your balance via double-entry, e.g. deposits, withdrawals, currency conversion, etc.

### Prerequisites

Before you start building, make sure you have the following ready:

- Your Core instance is up and running.
- If it’s a new instance, ensure you have some data in it. Here’s a **demo population script** to get you started.
- Your DB credentials to connect and make queries from your code.

### Step 1: Get the statement table

First, we query our DB to get all transactions within the specified period:

```sql
SELECT
  t.effective_date,
  t.reference,
  t.description,
  t.source,
  t.destination
  t.amount,
  t.currency,
FROM transactions t
WHERE
  t.status = 'APPLIED'
  AND t.currency = :currency
  AND (t.source = :balance_id OR t.destination = :balance_id)
  AND t.effective_date >= :period_start
  AND t.effective_date <  :period_end
ORDER BY t.effective_date ASC;
```

Our raw response looks something like this. 

Later on, we’ll format fields like amount, direction, and counterparty when generating the final statement output

```sql
[
    {
      effective_date: '2024-01-03T10:12:00.000Z',
      reference: 'TRX_001',
      description: 'Wallet funding',
      source: 'bln_...',
      destination: 'bln_...',
      amount: '1000',
      currency: 'USD'
    },
    ...transactions
  ]
```

### Step 2: Credit & debit totals, opening & closing balances

Next, we want to compute our statement summary info:

- **Total credits:** Total sum received by the balance.
- **Total debits:** Total sum sent by the balance.
- **Opening balance:** How much was in the balance at the start of the statement period.
- **Closing balance:** How much was in the balance at the end of the statement period.

To compute this, we’ll use Blnk’s [**Historical Balances endpoint](https://docs.blnkfinance.com/balances/historical-balances).** This endpoint lets us resolve the exact state of a balance at a specific point in time.

We’ll call it twice:

1. Once at the start of the statement period.
2. Once at the end of the statement period.

**1. Fetch balances at the start and end of the period**

Blnk expects an ISO timestamp in the request.

```sql
curl -X GET 'http://localhost:5001/balances/{balance_id}/at?timestamp={iso_timestamp}' \
	-H 'X-Blnk-Key: BLNK_API_KEY' \
	-H 'Content-Type: application/json'
```

Each call returns a snapshot of the balance at that moment.

Example response:

```sql
{
  "balance": {
    "balance": 9620000,
    "balance_id": "bin_be16c4a1-b5a6-4b64-a733-de2f6b24813d",
    "credit_balance": 9620000,
    "currency": "NGN",
    "debit_balance": 0,
    "ledger_id": "ldg_383739-8383749-38380-83373630-373363d"
  },
  "timestamp": "2025-02-24T08:55:26Z"
}
```

**2. Identify opening and closing balances**

- **Opening balance:** This is `balance.balance` from the response when you queried the period start.
- **Closing balance:** This is `balance.balance` from the response when you queried the period end.

No calculations needed here. You’re simply reading the resolved balance values at two points in time. 

**3. Compute total credits for the period**

`credit_balance` is cumulative. So to get credits within the statement period, subtract the credit_balance at the start period from its value at the end period. 

```jsx
total_credits =
		period_end.balance.credit_balance
	- period_start.balance.credit_balance
```

**4. Compute total debits for the period**

The same logic as computing total credits applies to debits as well.

```jsx
total_debits =
		period_end.balance.debit_balance
	- period_start.balance.debit_balance
```

**5. Mental model**

This is how to think about this.

- Historical Balances give you snapshots.
- `credit_balance` and `debit_balance` always move forward.
- Period totals are just differences between two snapshots.

This is why you don’t need to scan transactions again from your DB to compute totals. Blnk has already done that work for you.

### Step 4: Apply formatting to make it user-friendly

**Convert amounts and balances to user-friendly units.**

Blnk returns amounts in **precise units** (usually the smallest unit, like cents). Before rendering CSV/PDF, convert them to the display unit using the currency’s precision.

```bash
function toDisplayAmount(amount_in_minor_units, precision):
  return amount_in_minor_units / precision
```

Apply this to `opening_balance`, `closing_balance`, each transaction `amount`, `total_credits`, and `total_debits`.

**Determine direction (DR vs CR)**

Rule:

- If `balance_id` is the source, it is DR.
- If `balance_id` is the destination, it is CR.

```bash
function getDirection(tx, balance_id):
  if tx.source == balance_id:
    return "DR"
  if tx.destination == balance_id:
    return "CR"
```

**Convert timestamps to the user’s local timezone.**

Convert `effective_date` to display in the user’s timezone.

```bash
function toUserTimezone(utc_timestamp, user_timezone):
  dt = parseISO(utc_timestamp)          // parse as UTC
  return convertTimezone(dt, user_timezone)
```

Also, decide your display format (important for statements):

```bash
function formatStatementTime(dt):
  return format(dt, "YYYY-MM-DD HH:mm:ss")
```

**Determine counterparty and fetch their details**

Rule:

- If `balance_id`  is source, counterparty is destination.
- If `balance_id`  is destination, counterparty is source.

Then resolve counterparty details (identity_id, metadata) by calling your balance or search endpoint. 

```bash
function getCounterpartyId(tx, balance_id):
  if tx.source == balance_id:
    return tx.destination
  if tx.destination == balance_id:
    return tx.source
  return null
  
function getCounterpartyName(counterparty_balance_id):
	api.get("/balances/" + counterparty_balance_id)
	return response.meta_data.name
```

### Step 5: Putting it together (per transaction row)

At this point, you already have everything you need to finalize your statement. The final step is formatting this data so that it can be cleanly presented to users in CSV or PDF.

```bash
for tx in transactions:
  direction = getDirection(tx, balance_id)
  counterparty_id = getCounterpartyId(tx, balance_id)
  counterparty = getCounterpartyName(counterparty_id)

  row = {
    timestamp: formatStatementTime(toUserTimezone(tx.effective_date, user_timezone)),
    reference: tx.reference,
    description: tx.description,
    direction: direction,
    counterparty: counterparty.name,              // or id if name not available
    amount: toDisplayAmount(tx.amount, tx.currency),
    currency: tx.currency
  }

  statement_rows.append(row)

```

Your statement should now look like this, and you can use it to prepare your CSV/JSON:

```jsx
{
	"statement": {
		"balance_id": "bln_...",
		"currency": "USD",
		"account_name": "Emily Whiskerson",
		"period": {
			"start": "2026-01-01T00:00:00Z"
			"end": "2026-01-31T23:59:59Z"
		},
		"opening_balance": "500.00",
		"closing_balance": "845.00",
		"totals": {
			"credits": "600.00",
			"debits": "255.00",
			"transaction_count": 10
		},
		"transactions": [
			{
				"timestamp": "2026-01-01T8:23:14Z",
				"reference": "payment_001",
				"description": "Card top-up",
				"direction": "CR",
				"amount": 10.00
			},
			...transactions
		]
	}
}
```

> Screenshot of a formatted PDF output (from the demo)
> 

### Give it a try

If you haven’t yet, install or deploy Blnk, and run the customer statements demo on [**github.com/blnkfinance/blnk-demo](http://github.com/blnkfinance/blnk-demo).**