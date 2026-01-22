# Wallets Demo

This demo demonstrates the core wallet management workflow using Blnk Finance. It showcases how to create and manage wallets (balances) for users, handle deposits and withdrawals, and transfer funds between wallets.

## What This Demo Shows

This demo illustrates the following Blnk concepts:

- **Ledgers**: Creating a ledger to group related wallets together
- **Identities**: Creating user identities to link multiple wallets to the same customer
- **Balances (Wallets)**: Creating multiple wallets (main wallet and card wallet) for a single identity
- **Transactions**: Performing deposits, withdrawals, and internal transfers between wallets
- **Metadata**: Using metadata to add custom information to resources

## Workflow

The demo follows this sequence:

1. Creates a ledger for customer wallets
2. Creates an identity for a customer (Sarah Chen)
3. Creates two wallets (main wallet and card wallet) linked to the identity
4. Deposits $100.00 to the main wallet from an external source
5. Withdraws $50.00 from the main wallet to an external destination
6. Transfers $25.00 from the main wallet to the card wallet
7. Displays the final balances for both wallets

## How to run

We recommend using Bun to run this demo directly:

```bash
bun index.ts
```

If you don't have Bun installed, install it first:
```bash
curl -fsSL https://bun.sh/install | bash
```

Alternatively, you can use:
```bash
npx tsx index.ts
```

## Setup

Before running, set up your environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Blnk API credentials:
   ```
   BLNK_API_KEY=your_blnk_api_key_here
   BLNK_BASE_URL=https://api.blnk.finance
   ```
