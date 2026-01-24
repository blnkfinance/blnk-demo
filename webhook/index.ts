import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.BLNK_SECRET;
if (!secret) {
    throw new Error(
        "BLNK_SECRET environment variable is required. " +
            "Create webhook/.env from webhook/.env.example and set BLNK_SECRET to match your Blnk server secret."
    );
}

const port = parseInt(process.env.PORT || "3000", 10);
const webhookPathRaw = process.env.WEBHOOK_PATH || "/webhook";
const webhookPath = webhookPathRaw.startsWith("/") ? webhookPathRaw : `/${webhookPathRaw}`;

/**
 * Shorten long strings before logging.
 *
 * Why this exists:
 * - Webhook payloads can be large, and printing megabytes makes the demo hard to read.
 * - We still want enough content in the log to understand what happened.
 */
function truncateForLog(input: string, maxChars: number): string {
    if (input.length <= maxChars) return input;
    return `${input.slice(0, maxChars)}… (truncated, len=${input.length})`;
}

/**
 * Compare two hex strings in constant time.
 *
 * Why this exists:
 * - Naive string comparison can leak information via timing differences.
 * - `timingSafeEqual` requires buffers of equal length, so we guard length first.
 */
function constantTimeEqualsHex(a: string, b: string): boolean {
    // timingSafeEqual throws if lengths differ.
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Small helper to return JSON consistently from this demo server.
 */
function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

const server = Bun.serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        if (req.method === "GET" && url.pathname === "/health") {
            return jsonResponse(200, { ok: true });
        }

        if (req.method !== "POST" || url.pathname !== webhookPath) {
            return jsonResponse(404, { error: "Not found" });
        }

        const signature = req.headers.get("x-blnk-signature");
        const timestamp = req.headers.get("x-blnk-timestamp");
        if (!signature || !timestamp) {
            return jsonResponse(400, {
                error: "Missing required headers",
                required: ["x-blnk-signature", "x-blnk-timestamp"],
            });
        }

        /**
         * Signature verification must be done against the *exact raw bytes* received.
         *
         * Why:
         * - If you parse JSON and then re-stringify it, whitespace and key order can change.
         * - That would produce a different signature and make valid webhooks fail verification.
         */
        const rawBytes = Buffer.from(await req.arrayBuffer());
        const rawBody = rawBytes.toString("utf8");

        /**
         * Blnk signs `${timestamp}.${rawBody}` using HMAC-SHA256, hex encoded.
         *
         * We recompute the expected signature and compare it to `x-blnk-signature`.
         */
        const signed = `${timestamp}.${rawBody}`;
        const expectedSignature = createHmac("sha256", secret).update(signed).digest("hex");

        // Constant-time comparison avoids leaking information via timing side channels.
        const ok = constantTimeEqualsHex(signature, expectedSignature);
        if (!ok) {
            return jsonResponse(401, { error: "Invalid signature" });
        }

        let payload: unknown = rawBody;
        let eventName = "unknown";
        try {
            payload = JSON.parse(rawBody);
            if (payload && typeof payload === "object" && "event" in payload) {
                const maybeEvent = (payload as any).event;
                if (typeof maybeEvent === "string") eventName = maybeEvent;
            }
        } catch {
            // Keep rawBody as payload if it's not valid JSON
        }

        const logBody =
            typeof payload === "string"
                ? truncateForLog(payload, 4_000)
                : truncateForLog(JSON.stringify(payload), 4_000);

        console.log(`[webhook] verified event=${eventName}`);
        console.log(logBody);

        /**
         * Webhook endpoints should respond quickly (2xx) once verified.
         *
         * If you need to do heavy work (DB writes, API calls), consider doing it asynchronously
         * so you don't cause retries due to timeouts.
         */
        return jsonResponse(200, { ok: true, event: eventName });
    },
});

console.log(`Listening on http://localhost:${server.port}${webhookPath}`);
console.log("Health check at GET /health");

