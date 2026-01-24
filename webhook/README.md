# Webhook Receiver Demo (Notifications)

This demo runs a small HTTP server that receives **Blnk notification webhooks** and verifies the request using an **HMAC-SHA256 signature** computed from the **exact request body bytes**.

## What This Demo Shows

- Receiving Blnk notification webhooks (`{ event, data }`)
- Verifying authenticity using `x-blnk-signature` + `x-blnk-timestamp`
- Saving verified payloads to `output/`

## Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env`:

```bash
PORT=3000
WEBHOOK_PATH=/webhook
MAX_SKEW_SECONDS=300
BLNK_SECRET=your_strong_secret_key_here
```

`BLNK_SECRET` should match your Blnk Core `server.secret_key` (or `BLNK_SERVER_SECRET_KEY`) so both sides share the same signing key.

## How to run

We recommend using Bun to run this demo directly:

```bash
bun index.ts
```

The server will listen on `http://localhost:<PORT>` and expose:
- `GET /health`
- `POST <WEBHOOK_PATH>` (default `/webhook`)

## Configuring Blnk notifications

In your Blnk Core `blnk.json`, set the notification webhook URL to your server endpoint (and expose it publicly with a tunnel like ngrok if needed).

See Blnk docs:
- `https://docs.blnkfinance.com/advanced/notifications`
- `https://docs.blnkfinance.com/advanced/configuration`

## Signature verification

The receiver expects these headers on webhook requests:
- `x-blnk-timestamp`
- `x-blnk-signature`

It computes:

```text
signed = `${timestamp}.${rawBody}`
expected = HMAC_SHA256(BLNK_SECRET, signed)  // hex
```

Then compares `expected` vs `x-blnk-signature` using a constant-time comparison.

Optionally, the server rejects stale requests if the timestamp is outside `MAX_SKEW_SECONDS` (default 5 minutes).

