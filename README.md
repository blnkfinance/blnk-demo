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

Each demo lives in its own folder at the root (e.g., `basic-wallet/`, `customer-statements/`) and can be run with:

```bash
bun <demo-name>
```