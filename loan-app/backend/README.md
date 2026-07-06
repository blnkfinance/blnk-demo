# loan-app backend

Omni Cloud Custom App backend harness for the loan app.

## Setup

```bash
npm install
```

Environment is configured in `.env` (created at scaffold time). Update `BACKEND_PUBLIC_URL` to your public HTTPS origin before registering with Omni Cloud (use ngrok in development):

```bash
ngrok http 4721
```

## Run

```bash
npm run dev      # development with hot reload
npm run build    # compile to dist/
npm start        # run compiled output
npm run typecheck
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/callback` | Install / uninstall events from Omni Cloud |
| `POST` | `/portal` | Portal generator — returns `{ portal_url }` |
| `GET` | `/portal` | Harness stub — validates portal token |
| `GET` | `/health` | Liveness check |

## Manifest URLs

Register these in Omni Cloud (replace with your `BACKEND_PUBLIC_URL`):

- Registration callback: `{BACKEND_PUBLIC_URL}/callback`
- Portal generator: `{BACKEND_PUBLIC_URL}/portal`

When `frontend/` is ready, set `PORTAL_BASE_URL` in `.env` to the frontend public origin so `portal_url` points at the iframe UI.

## Local verification (curl)

Start the server, then:

```bash
# Health
curl -s http://localhost:4721/health

# Install (uses examples/install.json — adjust IDs if re-running)
curl -s -X POST http://localhost:4721/callback \
  -H 'Content-Type: application/json' \
  -d @examples/install.json

# Idempotent replay
curl -s -X POST http://localhost:4721/callback \
  -H 'Content-Type: application/json' \
  -d @examples/install.json

# Launch portal session
curl -s -X POST http://localhost:4721/portal \
  -H 'Content-Type: application/json' \
  -d @examples/portal-launch.json

# Dev portal stub (seeded when NODE_ENV=development)
curl -s 'http://localhost:4721/portal?token=dev'

# Uninstall
curl -s -X POST http://localhost:4721/callback \
  -H 'Content-Type: application/json' \
  -d @examples/uninstall.json
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_PUBLIC_URL` | yes | Public origin for Cloud callbacks |
| `PORTAL_BASE_URL` | no | Frontend origin for `portal_url` and CORS (defaults to `BACKEND_PUBLIC_URL`) |
| `PORT` | no | Server port (default `4721`) |
| `SQLITE_DB_PATH` | no | SQLite file path (default `./data/app.db`) |
| `ENCRYPTION_KEY_HEX` | yes | 32-byte hex key for API key encryption |
| `BLNK_CLOUD_API_ORIGIN` | no | Omni Cloud API base URL |
| `NODE_ENV` | no | `development` enables dev portal seed |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` |
| `LOG_FORMAT` | no | `pretty` \| `json` |
