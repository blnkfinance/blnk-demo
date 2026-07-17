# PayRecon

Accountant-facing bill payment and reconciliation platform backed by **Blnk Core**.

PayRecon follows the same structural patterns as `pro-loan-app`, adapted for:

- **Postgres** instead of MongoDB
- **Two independent Go services** (no shared DB, no cross-imports)
- **Admin-only UI** (merchants are payees, not platform users)

## Architecture

```
admin-web (8000) ──► backend API (8090) ──► postgres-main
                           │
                           └──► Blnk Cloud / Core (external HTTP)

mock-bank-web (8080) ──► mock-bank API (8081) ──► postgres-mock-bank
                              │
                              └── CSV bank statements ──► PayRecon reconciliation
```

### Services

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| `api` | 8090 | `postgres-main` | Bills, merchants, WHT, reconciliation, tax remittances, Blnk |
| `worker` | — | `postgres-main` | Idle placeholder (recon runs inline in the API) |
| `mock-bank` | 8081 | `postgres-mock-bank` | Simulated bank accounts, transfers, CSV statement export |
| `admin-web` | 8000 | — | Accountant portal (create merchants, bills, reconcile, remit) |
| `mock-bank-web` | 8080 | — | Separate corporate banking UI (pay + download statement) |

**Integration boundary:** the only contract between `backend` and `mock-bank` is the **CSV bank statement format**. No HTTP calls between them. Humans (or demos) move money in the mock bank UI, then upload the CSV in PayRecon.

## Quick start

```bash
cp .env.example .env
# Edit .env with your Blnk credentials

docker compose up --build -d

# Seed demo accountant + WHT categories
docker compose run --rm seed
```

| App | URL |
|-----|-----|
| PayRecon accountant UI | http://localhost:8000 |
| Mock bank UI | http://localhost:8080 |
| PayRecon API | http://localhost:8090/health |
| Mock bank API | http://localhost:8081/health |

Demo login: `accountant@payrecon.local` / `changeme123`

### Demo path (no Postman)

1. **Horizon Bank** → Fund account → top up the company operating account  
2. **PayRecon** → Merchants → add vendor (with TIN + bank account number)  
3. **Horizon Bank** → Beneficiaries → add the same vendor account number  
4. **PayRecon** → Bills → create bill → open Horizon to pay (or copy payment instruction)  
5. **Horizon Bank** → Transfers → pay net amount → copy bank transaction ID  
6. **PayRecon** → Bills → Confirm sent (paste bank transaction ID)  
7. **Horizon Bank** → Statements → pick date range → download CSV  
8. **PayRecon** → Reconciliation → upload CSV (syncs funding credits + matches payments)  
9. **PayRecon** → Remittances → create/confirm WHT remittance (optional)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ENV` | No | `development` or `production` |
| `BLNK_BASE_URL` | Yes | Blnk Core/Cloud base URL (from the `api` container use a reachable host, not `localhost` unless Blnk is in the same network) |
| `BLNK_API_KEY` | Yes | Blnk API key |
| `AUTH_SECRET` | Yes (prod) | HMAC secret for JWT sessions |
| `POSTGRES_DSN` | No | Main backend Postgres DSN |
| `MOCK_BANK_POSTGRES_DSN` | No | Mock bank Postgres DSN (mock-bank service only) |

PayRecon and Horizon (mock-bank) share **no HTTP API**. The only integration is the human-exported bank statement CSV.

## Bank statement CSV contract

Exported by Horizon (`mock-bank`) at:

`GET /mock-bank/statement/export?account_id=…&from=YYYY-MM-DD&to=YYYY-MM-DD`

Amounts are **integer kobo** (minor units). `Balance` is the **running balance after each line** within the selected range (opening balance = sum of activity before `from`).

```csv
Date,TransactionID,Narration,BeneficiaryAccount,Debit,Credit,Balance
2026-07-15,FND-20260715-A1B2C3D4,Account funding,,0,50000000,50000000
2026-07-15,BNK-20260715-E5F6G7H8,PR-20260715-0001,1234567890,47500000,0,2500000
```

- `Date`: `YYYY-MM-DD`
- `TransactionID`: unique bank reference (primary PayRecon match key)
- `Debit` / `Credit`: integer kobo (one side is usually zero)
- `Balance`: running balance after the line (kobo)
- `BeneficiaryAccount`: destination account number for transfers (operating account for funding credits)

Imported by PayRecon reconciliation (`POST /api/reconciliation/upload`).
## Backend layout

```
backend/internal/
├── app/              # Composition root
├── config/
├── middleware/
├── blnk/             # Blnk Core HTTP client
├── platform/         # postgres, id, settings
├── admin/            # Accountant users
├── auth/
├── merchants/
├── bills/
├── wht/
├── reconciliation/
└── remittances/
```

Each domain: `<domain>.go` (interfaces) + `model/`, `repository/`, `service/`, `api/`.

## Mock bank layout

```
mock-bank/internal/
├── app/
├── config/
├── platform/postgres/
├── accounts/
├── transfers/
└── statements/       # CSV export
```
