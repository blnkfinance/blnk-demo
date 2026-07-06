# loan-app frontend

Omni Cloud Custom App iframe UI for the loan app.

## Setup

```bash
npm install
cp .env.example .env.local   # if .env.local does not exist
```

## Run

```bash
npm run dev      # http://localhost:3001
npm run build
npm run start
npm run typecheck
```

Start the [backend](../backend/) on port `4721` before loading the app — the browser verifies portal tokens directly against it.

## Environment

| Variable | Default (local) | Description |
|----------|-----------------|-------------|
| `PORT` | `3001` | Next.js dev/server port |
| `NEXT_PUBLIC_BACKEND_PUBLIC_URL` | `http://localhost:4721` | Backend origin for browser API calls |

Primary brand colour is configured per workspace in **Settings → Branding** (stored in SQLite, default `#0979c6`).

## Local URLs

- App: `http://localhost:3001/loans?token=dev`
- Cloud entry: `http://localhost:3001/portal?token=dev` (verifies, then redirects to `/loans`)

The `dev` token works when the backend runs with `NODE_ENV=development` (seeded session).

## Architecture

- **No Next.js API routes** — the browser calls the backend directly.
- **`PortalGate`** verifies `?token=` via `GET /portal` on the backend before rendering the app shell.
- Backend **`PORTAL_BASE_URL`** must match this frontend origin (`http://localhost:3001` in local dev).

See [CONTEXT.md](./CONTEXT.md) for design system porting notes.
