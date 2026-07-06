# loan-app

Monorepo for a loan custom app to embed on Blnk Cloud.

| Package | Purpose |
|---------|---------|
| [`backend/`](backend/) | Omni harness — install/uninstall callback, portal session minting, Omni API client |
| [`frontend/`](frontend/) | Iframe portal UI — loan management shell |

## Backend quick start

```bash
cd backend
npm install
npm run dev
```

Update `backend/.env` → `BACKEND_PUBLIC_URL` with your ngrok HTTPS URL before registering the app in Omni Cloud.

Manifest URLs (no `/api` prefix):

- Registration callback: `{BACKEND_PUBLIC_URL}/callback`
- Portal generator: `{BACKEND_PUBLIC_URL}/portal`

See [`backend/README.md`](backend/README.md) for curl examples and verification steps.

## Frontend quick start

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3001/products?token=dev` (backend must be running on `:4721`).
