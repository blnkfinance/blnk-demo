# Pro Loan App

A semi-production-grade containerized loan platform built with Go, MongoDB, Redis, and Next.js.
Blnk Cloud/Core is used as the external ledger — only your own application infrastructure runs locally.

## Architecture

```
Admin Next.js App (port 3100)  ─┐
Customer Next.js App (port 3101) ─┤─► Go API (port 8080) ─► MongoDB + Redis
Go Worker (background)           ─┘         │
                                             └─► Blnk Cloud/Core API (external)
```

### Services

| Service        | Port  | Description                                       |
|----------------|-------|---------------------------------------------------|
| `api`          | 8080  | Go HTTP API — auth, customers, loans, products    |
| `worker`       | —     | Daily cron: marks due/overdue schedule lines      |
| `admin-web`    | 3100  | Next.js admin dashboard                           |
| `customer-web` | 3101  | Next.js customer portal                           |
| `mongo`        | 27017 | MongoDB 7 — primary application database          |
| `redis`        | 6379  | Redis 7 — caching and rate limiting               |

Blnk Cloud/Core is **external** — configure `BLNK_BASE_URL` and `BLNK_API_KEY` in `.env`.

---

## Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- A Blnk Cloud account with a base URL and API key

### 1. Clone and configure

```bash
cd pro-loan-app
cp .env.example .env
# Edit .env — fill in BLNK_BASE_URL, BLNK_API_KEY, AUTH_SECRET
```

### 2. Start all services

```bash
docker compose up --build -d
```

### 3. Seed demo data (first run)

```bash
docker compose run --rm seed
```

This creates three loan products, a demo customer (`demo@example.com` / `demo1234`), and a
seed admin account (`admin@example.com` / `Admin1234!`).

### 4. Open the apps

- **Admin dashboard**: http://localhost:3100 — log in with `admin@example.com` / `Admin1234!`
- **Customer portal**: http://localhost:3101 — register or use `demo@example.com` / `demo1234`
- **API health**: http://localhost:8080/health

---

## Environment Variables

| Variable               | Required | Default              | Description                                          |
|------------------------|----------|----------------------|------------------------------------------------------|
| `BLNK_BASE_URL`        | ✓        | —                    | Your Blnk Cloud base URL                             |
| `BLNK_API_KEY`         | ✓        | —                    | Scoped Blnk API key                                  |
| `BLNK_WEBHOOK_SECRET`  |          | —                    | HMAC secret for Blnk webhook signature verification  |
| `MONGO_URI`            |          | `mongodb://mongo:27017` | Full MongoDB connection URI                       |
| `MONGO_DATABASE`       |          | `pro_loan_app`       | MongoDB database name                                |
| `REDIS_ADDR`           |          | `redis:6379`         | Redis address                                        |
| `REDIS_PASSWORD`       |          | —                    | Redis password (empty = no auth)                     |
| `AUTH_SECRET`          | ✓        | `change-me-in-production` | HMAC secret for JWT session tokens. **Must be set in production.** |
| `ENVIRONMENT`          |          | `development`        | Set to `production` to enforce secret validation     |

> **Note:** `ADMIN_EMAIL` and `ADMIN_PASSWORD` are no longer used.  Admin accounts are managed
> through the API. Use `POST /api/v1/admins/bootstrap` to create the first admin, or run the
> seed command (`docker compose run --rm seed`) which creates `admin@example.com / Admin1234!`.

---

## Admin Account Management

Admin credentials are stored in MongoDB — there are no hard-coded credentials in environment
variables.

| Endpoint                         | Auth        | Description                                       |
|----------------------------------|-------------|---------------------------------------------------|
| `POST /api/v1/admins/bootstrap`  | Public*     | Create the very first admin account               |
| `POST /api/v1/auth/admin/login`  | Public      | Get a JWT token for an admin                      |
| `POST /api/v1/admins`            | Admin token | Create additional admin accounts                  |
| `GET  /api/v1/admins`            | Admin token | List all admins                                   |
| `GET  /api/v1/admins/me`         | Admin token | Get the currently authenticated admin             |
| `PATCH /api/v1/admins/:id`       | Admin token | Update name / status                              |

\* The bootstrap endpoint returns `409 Conflict` once any admin exists.

---

## Loan Lifecycle

```
draft ──► submitted ──► approved ──► active (inflight) ──► active (committed) ──► closed
                   └──► rejected          └──► approved (voided)
```

| State                   | Who      | Action                                                       |
|-------------------------|----------|--------------------------------------------------------------|
| `draft`                 | Customer | `POST /api/v1/loans` — creates application                   |
| `submitted`             | Customer | `POST /api/v1/loans/:id/submit` — sends for review           |
| `approved`              | Admin    | `POST /api/v1/loans/:id/approve` — generates amortisation schedule |
| `active` (inflight)     | Admin    | `POST /api/v1/loans/:id/disburse` — creates Blnk **inflight** transaction |
| `active` (committed)    | Admin    | `POST /api/v1/loans/:id/disburse/commit` — commits the Blnk inflight tx |
| `approved` (re-entered) | Admin    | `POST /api/v1/loans/:id/disburse/void` — voids the inflight tx, reverts status |
| `rejected`              | Admin    | `POST /api/v1/loans/:id/reject` — `{ reason }`               |

Repayments: `POST /api/v1/loans/:id/schedule/:schedule_id/pay`

---

## Blnk Ledger Model

The following Blnk ledgers are created automatically on first startup:

| Ledger                   | Purpose                                      |
|--------------------------|----------------------------------------------|
| Platform Funding Ledger  | Source balance for loan disbursements        |
| Customer Lending Ledger  | One receivable balance per approved loan     |
| Interest Income Ledger   | Recognised interest income                  |
| Fee Income Ledger        | Origination and late fees                   |
| Suspense/Clearing Ledger | Payments awaiting reconciliation            |

Ledger IDs are stored in MongoDB (`platform_settings` collection) and reused across restarts.

---

## API Reference

### Auth
```
POST /api/v1/auth/admin/login       { email, password } → { token, role, subject_id }
POST /api/v1/auth/customer/login    { email, password } → { token, role, subject_id }
```

### Customers
```
POST   /api/v1/customers                      Register new customer (public)
GET    /api/v1/customers                      List customers (admin)
GET    /api/v1/customers/:id                  Get customer (admin or owner)
PATCH  /api/v1/customers/:id                  Update customer (admin or owner)
POST   /api/v1/customers/:id/sync-identity    Create Blnk identity for customer
```

### Loan Products
```
POST   /api/v1/products                       Create product (admin)
GET    /api/v1/products                       List products
GET    /api/v1/products/:id                   Get product
PATCH  /api/v1/products/:id                   Update product (admin)
POST   /api/v1/products/:id/archive           Archive product (admin)
POST   /api/v1/products/:id/unarchive         Restore product (admin)
```

### Loans
```
POST   /api/v1/loans                              Apply for loan (customer)
GET    /api/v1/loans                              List loans (admin: all, customer: own)
GET    /api/v1/loans/:id                          Get loan detail + schedule
POST   /api/v1/loans/:id/submit                   Submit for review (owner only)
POST   /api/v1/loans/:id/approve                  Approve + generate schedule (admin)
POST   /api/v1/loans/:id/reject                   { reason } (admin)
POST   /api/v1/loans/:id/disburse                 Create inflight Blnk tx (admin)
POST   /api/v1/loans/:id/disburse/commit          Commit inflight Blnk tx (admin)
POST   /api/v1/loans/:id/disburse/void            Void inflight Blnk tx (admin)
POST   /api/v1/loans/:id/schedule/:sid/pay        Record repayment + Blnk tx
```

### System
```
GET    /health                         Liveness probe
GET    /ready                          Readiness probe (mongo + redis)
GET    /api/v1/system/status           Service metadata
POST   /api/v1/blnk/webhooks           Blnk webhook receiver (HMAC verified)
```

---

## Development

### Run backend locally (outside Docker)

```bash
cd backend
export BLNK_BASE_URL=https://your-blnk-instance.example.com
export BLNK_API_KEY=your-key
export AUTH_SECRET=dev-secret
go run .
```

### Run tests

```bash
cd backend
go test ./...
```

### Run seed locally

```bash
cd backend
MONGO_URI=mongodb://localhost:27017 go run ./cmd/seed
```

---

## Security Notes

- **`AUTH_SECRET`** must be a long random string in production. If `ENVIRONMENT=production`
  and the value is still `change-me-in-production`, the API will refuse to start.
- **`BLNK_WEBHOOK_SECRET`** should be set in production so that incoming Blnk webhook
  payloads are HMAC-verified. Missing it in production emits a startup warning.
- Admin and customer passwords are hashed with bcrypt — no plaintext credentials are stored.
- All mutating customer-facing loan endpoints enforce ownership: a customer JWT can only
  access that customer's own loans.
- Rate limiting is applied per-IP via Redis (login: 5 req/min, apply: 3 req/min).

## Production Considerations

- Set a strong `AUTH_SECRET` and `BLNK_WEBHOOK_SECRET`.
- Set `ENVIRONMENT=production` to enable secret validation at startup.
- Enable MongoDB authentication and TLS for non-local deployments.
- Pin `NEXT_PUBLIC_API_URL` to your public API hostname.
- Use a reverse proxy (nginx/Caddy) to terminate TLS in front of all services.
